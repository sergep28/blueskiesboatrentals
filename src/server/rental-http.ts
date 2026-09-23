import { Router } from 'express';
import { rentalSnapshot, type RentalFlow, type FlowDependencies } from './rental-flow.js';
export function createRentalRouter(flow: RentalFlow, locked: FlowDependencies['locked']) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'" });
    next();
  });
  // Email crawlers/GET never create payment sessions. Capability is a random 256-bit token.
  for (const suffix of ['', '/deposit']) {
    const type = suffix ? 'deposit' : 'rental_balance';
    router.get(`/:token${suffix}`, async (req, res) => {
      try {
        const token = String(req.params.token);
        if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid capability');
        const view = await locked(token, async s => {
          const p = s.plan;
          if (!p || p.snapshot !== rentalSnapshot(s.booking) || s.booking.status === 'cancelled' || !['direct', 'phone', 'walkin'].includes(s.booking.source)) throw new Error('Unavailable');
          const settled = type === 'deposit' ? !['none', 'requested'].includes(s.booking.depositStatus) : s.booking.paymentStatus !== 'pending';
          return { cents: settled ? 0 : type === 'deposit' ? p.depositCents : p.rentalCents, dueDate: p.dueDate, settled };
        });
        res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Blue Skies payment</title></head><body><h1>${type === 'deposit' ? 'Refundable security deposit' : 'Rental balance'}</h1><p>Balance: $${(view.cents / 100).toFixed(2)}</p><p>Rental deadline: ${view.dueDate} (America/New_York). Due immediately on or after this date.</p><p>The refundable security deposit is held separately and is not applied toward rental balance.</p>${view.settled ? '<p>No payment requested. Contact Blue Skies if you need help.</p>' : '<form method="post"><button type="submit">Continue to secure payment</button></form>'}</body></html>`);
      } catch { res.status(409).send('Collection unavailable. Please contact Blue Skies.'); }
    });
    router.post(`/:token${suffix}`, async (req, res) => {
      try {
        const token = String(req.params.token);
        if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid capability');
        const url = await flow.checkout(token, type);
        res.redirect(303, url);
      } catch { res.status(409).send('Collection unavailable or payment awaiting verification. Please contact Blue Skies; do not pay again.'); }
    });
  }
  return router;
}
