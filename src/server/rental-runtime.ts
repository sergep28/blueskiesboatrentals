import { randomBytes } from 'node:crypto';
import pg from 'pg';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { guardResend } from './staging.js';
import { RentalFlow, CollectionDeliveryError } from './rental-flow.js';
import { createRentalStore } from './rental-store.js';
import { createRentalCheckout } from './rental-checkout.js';

let runtime: Promise<ReturnType<typeof buildRuntime>> | undefined;
function buildRuntime(pool: pg.Pool) {
  const store = createRentalStore(pool);
  const appUrl = (process.env.APP_URL || 'https://www.blueskiesboatrentals.com').replace(/\/$/, '');
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  const mailer = guardResend(process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);
  // Separate pool guarantees attempt reservation can commit even while main pool holds booking locks.
  const attempts = new pg.Pool({ ...pool.options, max: 2, connectionTimeoutMillis: 5000 });
  const flow = new RentalFlow({ ...store, token: () => randomBytes(32).toString('hex'), now: () => new Date(), appUrl,
    checkout: async request => {
      if (!stripe) throw new Error('Stripe not configured');
      return createRentalCheckout(attempts, stripe, appUrl)(request);
    },
    retrieve: async id => {
      if (!stripe) throw new Error('Stripe not configured');
      return stripe.checkout.sessions.retrieve(id, {}, { timeout: 15000 });
    },
    send: async message => {
      if (!mailer) throw new Error('Email provider not configured');
      const response = await mailer.emails.send({
        from: process.env.FROM_EMAIL || 'bookings@blueskiesboatrentals.com',
        to: message.to === 'owner' ? 'info@blueskiescharter.com' : message.to,
        subject: message.subject, text: message.text,
      }, { idempotencyKey: message.key });
      if (response.error || !response.data?.id) throw new Error('Collection email was not accepted');
    },
  });
  return { ...store, flow, appUrl, configured: !!stripe && !!mailer };
}
export function getRentalRuntime() {
  return runtime ??= import('../db/index.js').then(({ pool }) => buildRuntime(pool));
}
export async function rentalCollectionStatus(id: number) {
  const r = await getRentalRuntime();
  return r.locked(id, async s => collectionStatus(s, r.appUrl));
}
function collectionStatus(s: import('./rental-flow.js').CollectionState, appUrl: string) {
  return s.plan ? {
    enrolled: true as const, mode: s.plan.mode, dueDate: s.plan.dueDate,
    rentalTotalCents: s.plan.rentalCents,
    rentalBalanceCents: s.booking.paymentStatus === 'paid' ? 0 : s.plan.rentalCents,
    depositCents: s.plan.depositCents, depositStatus: s.booking.depositStatus,
    rentalUrl: `${appUrl}/rental/${s.plan.token}`,
    depositUrl: `${appUrl}/rental/${s.plan.token}/deposit`,
    messages: s.plan.messages,
  } : { enrolled: false as const };
}
export async function enrollRentalCollection(id: number, isAdmin: boolean) {
  if (!isAdmin) throw new Error('Admin login required');
  if (process.env.RENTAL_COLLECTION_ENROLLMENT_ENABLED !== 'true') throw new Error('Rental collection enrollment is disabled by release gate');
  const r = await getRentalRuntime();
  if (!r.configured) throw new Error('Stripe and email must be configured before enrollment');
  // Enrollment commits before email. A send failure is inspectable, never reported as rollback.
  let communicationError = false;
  try { await r.flow.authorize(id, 'deposit_first', isAdmin); }
  catch (error) {
    if (!(error instanceof CollectionDeliveryError)) throw error;
    communicationError = true;
  }
  return { ...await rentalCollectionStatus(id), communicationError };
}
export async function createRentalCollectionBooking(create: import('./rental-store.js').CollectionCreation, isAdmin: boolean) {
  if (!isAdmin) throw new Error('Admin login required');
  if (process.env.RENTAL_COLLECTION_ENROLLMENT_ENABLED !== 'true') throw new Error('Rental collection enrollment is disabled by release gate');
  const r = await getRentalRuntime();
  if (!r.configured) throw new Error('Stripe and email must be configured before enrollment');
  const saved = await r.locked(create, async s => {
    if (!s.plan) r.flow.enrollState(s, 'deposit_first', isAdmin);
    return { booking: s.booking, collection: collectionStatus(s, r.appUrl) };
  });
  const { booking } = saved;
  let communicationError = false;
  try { await r.flow.sendInitial(booking.id); }
  catch { communicationError = true; } // Booking is committed; never report this as a creation failure.
  let collection = saved.collection;
  let statusUnavailable = false;
  try { collection = await rentalCollectionStatus(booking.id); }
  catch { statusUnavailable = true; communicationError = true; }
  return { bookingId: booking.id, bookingRef: booking.bookingRef, total: booking.total, checkoutUrl: null, checkoutUnavailable: false,
    collection: { ...collection, communicationError, statusUnavailable } };
}
export async function sendPendingRentalReminders() {
  if (process.env.RENTAL_COLLECTION_REMINDERS_ENABLED !== 'true') return { scanned: 0 };
  const leadDays = Number(process.env.RENTAL_COLLECTION_REMINDER_LEAD_DAYS || '1');
  if (!Number.isInteger(leadDays) || leadDays < 1 || leadDays > 30) throw new Error('Invalid rental reminder lead days');
  const { pool } = await import('../db/index.js');
  const r = await getRentalRuntime();
  const result = await pool.query('SELECT booking_id FROM rental_collections');
  for (const row of result.rows) {
    try { await r.flow.remind(row.booking_id, leadDays); }
    catch { console.error('[rental] reminder failed for booking', row.booking_id); }
  }
  return { scanned: result.rowCount ?? 0 };
}
