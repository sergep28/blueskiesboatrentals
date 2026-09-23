import { Router } from 'express';

interface LegacyDepositBooking {
  id: number;
  depositStatus: string;
  depositAmount: number | null;
}

export function createLegacyDepositRouter(deps: {
  loadBooking(ref: string): Promise<LegacyDepositBooking | undefined>;
  isEnrolled(id: number): Promise<boolean>;
  createLink(id: number, amount: number): Promise<string>;
}) {
  const router = Router();
  // Email previewers and link scanners GET this URL. Do not touch Stripe, the
  // booking record, or the attempt ledger until a person submits the form.
  router.get('/:ref', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Frame-Options', 'DENY');
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'");
    return res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Refundable security deposit</title>
<style>body{font:16px system-ui,sans-serif;background:#f0f9ff;color:#15324a;min-height:100vh;display:grid;place-items:center;margin:0}main{max-width:430px;padding:32px;background:white;border-radius:16px;text-align:center;box-shadow:0 8px 30px #15324a18}button{border:0;border-radius:8px;padding:14px 22px;background:#087cad;color:white;font:inherit;cursor:pointer}</style></head><body><main><h1>Refundable security deposit</h1><p>Continue to Stripe's secure checkout to pay the deposit for your booking.</p><form method="post"><button type="submit">Continue to secure payment</button></form></main></body></html>`);
  });
  router.post('/:ref', async (req, res) => {
    const ref = String(req.params.ref).toUpperCase();
    try {
      const booking = await deps.loadBooking(ref);
      if (!booking) return res.redirect(302, '/?deposit=notfound');
      if (await deps.isEnrolled(booking.id)) return res.status(409).send('Please use your private collection link or contact Blue Skies.');
      if (['paid', 'partially_refunded', 'refunded'].includes(booking.depositStatus)) {
        return res.redirect(302, `/booking/success/${encodeURIComponent(ref)}?deposit=1`);
      }
      const checkoutUrl = await deps.createLink(booking.id, booking.depositAmount ?? 1000);
      return res.redirect(303, checkoutUrl);
    } catch (err) {
      console.error(`[deposit] link failed for ${ref}:`, err);
      return res.redirect(302, '/?deposit=error');
    }
  });
  return router;
}
