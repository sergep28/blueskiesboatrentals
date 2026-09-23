import { easternDate, shiftCalendarDate } from './rental-policy.js';
import { authorizeCollection, outstandingRentalCents, verifyCollectionPayment, type RentalBooking, type RentalPlan } from './rental-collection.js';
export interface CollectionPlan extends RentalPlan {
  snapshot: string;
  token: string; startDate: string; depositCents: number;
  messages: Record<string, 'sending' | 'sent' | 'uncertain'>;
  rentalSession?: string; depositSession?: string;
  rentalGeneration: number; depositGeneration: number;
  rentalPaid?: boolean; depositReceived?: boolean;
}
export interface CollectionState { booking: RentalBooking; plan: CollectionPlan | null; payment?: { type: 'deposit' | 'rental_balance'; sessionId: string; intentId: string } }
export function rentalSnapshot(b: RentalBooking) {
  return JSON.stringify([b.id, b.bookingRef, b.source, b.total, b.charterDate, b.endDate ?? null, b.boatId ?? null, b.depositAmount, b.customerEmail]);
}
interface Message { to: string; subject: string; text: string; key: string }
export interface FlowDependencies {
  // Adapter must lock the booking and plan, persist changes and commit before returning.
  locked<T>(key: number | string, fn: (state: CollectionState) => Promise<T>): Promise<T>;
  send(message: Message): Promise<void>;
  checkout(request: { cents: number; type: 'deposit' | 'rental_balance'; booking: RentalBooking; idempotencyKey: string }): Promise<{ id: string; url: string | null; status: string | null }>;
  retrieve(id: string): Promise<{ id: string; url: string | null; status: string | null }>;
  token(): string; now(): Date; appUrl: string;
}
export class CollectionDeliveryError extends Error {}
export class RentalFlow {
  constructor(private deps: FlowDependencies) {}
  async authorize(id: number, mode: RentalPlan['mode'], isAdmin: boolean) {
    if (!isAdmin) throw new Error('Admin login required');
    await this.deps.locked(id, async s => this.enrollState(s, mode, isAdmin));
    await this.sendInitial(id);
  }
  /** Pure transition; caller MUST persist this state in its booking transaction. */
  enrollState(s: CollectionState, mode: RentalPlan['mode'], isAdmin: boolean) {
      const authorized = authorizeCollection(s.booking, mode, isAdmin, this.deps.now());
      if (s.plan) {
        if (s.plan.mode !== mode) throw new Error('Collection already authorized; cannot switch modes');
        if (s.plan.snapshot !== rentalSnapshot(s.booking)) throw new Error('Booking changed; manual review required');
        return;
      }
      if (s.booking.legacyDepositAttempt) throw new Error('Legacy deposit attempt requires reconciliation before enrollment');
      if (s.booking.stripeSessionId || (s.booking.depositStripeSessionId && ['none', 'requested'].includes(s.booking.depositStatus))) throw new Error('Existing checkout requires manual review before enrollment');
      if (!Number.isSafeInteger(Math.round(s.booking.depositAmount * 100)) || s.booking.depositAmount <= 0) throw new Error('Invalid deposit amount');
      s.plan = { ...authorized, token: this.deps.token(), startDate: s.booking.charterDate,
        snapshot: rentalSnapshot(s.booking), depositReceived: ['paid', 'partially_refunded', 'refunded'].includes(s.booking.depositStatus),
        depositCents: Math.round(s.booking.depositAmount * 100), messages: {}, rentalGeneration: 0, depositGeneration: 0 };
  }
  async sendInitial(id: number) {
    await this.notify(id, 'initial');
    await this.deps.locked(id, async s => {
      if (s.plan?.messages.initial !== 'sent') throw new CollectionDeliveryError('Collection saved, but email delivery is uncertain; manual review required');
    });
  }
  async checkout(key: number | string, type: 'deposit' | 'rental_balance') {
    return this.deps.locked(key, async s => {
      const p = s.plan;
      if (!p || s.booking.status === 'cancelled' || rentalSnapshot(s.booking) !== p.snapshot) throw new Error('Collection unavailable; booking changed');
      if (!['direct', 'phone', 'walkin'].includes(s.booking.source)) throw new Error('Not a direct booking');
      const isRental = type === 'rental_balance';
      if (isRental && p.mode === 'deposit_first' && (!p.depositReceived || !['paid', 'partially_refunded', 'refunded'].includes(s.booking.depositStatus))) {
        throw new Error('Refundable deposit must be received before rental balance payment');
      }
      const cents = isRental ? outstandingRentalCents(s.booking, p) : p.depositCents;
      if (!isRental && (p.depositReceived || !['none', 'requested'].includes(s.booking.depositStatus))) throw new Error('Deposit already settled');
      const field = isRental ? 'rentalSession' : 'depositSession';
      const generation = isRental ? 'rentalGeneration' : 'depositGeneration';
      if (p[field]) {
        const current = await this.deps.retrieve(p[field]!);
        if (current.status === 'open' && current.url) return current.url;
        if (current.status !== 'expired') throw new Error('Payment awaiting verification; do not pay again');
        p[generation]++;
      }
      const session = await this.deps.checkout({ cents, type, booking: s.booking,
        idempotencyKey: `collection-${s.booking.id}-${type}-${p[generation]}` });
      if (!session.url) throw new Error('Checkout unavailable');
      p[field] = session.id;
      return session.url;
    });
  }
  async paid(id: number, session: Parameters<typeof verifyCollectionPayment>[0], type: 'deposit' | 'rental_balance') {
    await this.deps.locked(id, async s => {
      const p = s.plan;
      if (!p) throw new Error('Collection not authorized');
      const rental = type === 'rental_balance';
      const intentId = verifyCollectionPayment(session, (rental ? p.rentalSession : p.depositSession) ?? '', rental ? p.rentalCents : p.depositCents);
      if (rental ? p.rentalPaid : p.depositReceived) return;
      if (s.booking.status === 'cancelled' || rentalSnapshot(s.booking) !== p.snapshot) throw new Error('Booking changed; payment requires manual review');
      if (rental) {
        if (p.mode === 'deposit_first' && (!p.depositReceived || !['paid', 'partially_refunded', 'refunded'].includes(s.booking.depositStatus))) {
          throw new Error('Deposit status changed; captured rental payment requires manual review');
        }
        outstandingRentalCents(s.booking, p);
        p.rentalPaid = true;
        s.booking.paymentStatus = 'paid';
      } else {
        if (!['none', 'requested'].includes(s.booking.depositStatus)) throw new Error('Deposit already settled; manual review required');
        p.depositReceived = true;
        s.booking.depositStatus = 'paid';
      }
      // Adapter persists the payment intent in the SAME transaction as the transition.
      s.payment = { type, sessionId: session.id, intentId };
    });
    if (type === 'deposit') await Promise.all([this.notify(id, 'deposit_owner'), this.notify(id, 'deposit_receipt')]);
    else await this.notify(id, 'rental_receipt');
  }
  // One day is an implementation default, NOT an owner-specified timing policy.
  async remind(id: number, leadDays = 1) {
    if (!Number.isInteger(leadDays) || leadDays < 1 || leadDays > 30) throw new Error('Invalid reminder lead days');
    const kind = await this.deps.locked(id, async s => {
      const p = s.plan;
      if (!p || rentalSnapshot(s.booking) !== p.snapshot || s.booking.status === 'cancelled' || s.booking.paymentStatus !== 'pending' || !['direct', 'phone', 'walkin'].includes(s.booking.source)) return null;
      const today = easternDate(this.deps.now());
      if (today >= p.dueDate) return 'due_owner';
      if (today >= shiftCalendarDate(p.dueDate, -leadDays)) return 'reminder';
      return null;
    });
    if (kind) await this.notify(id, kind);
  }
  async notify(key: number | string, kind: string) {
    const message = await this.deps.locked(key, async s => {
      const p = s.plan;
      if (!p || p.messages[kind] || rentalSnapshot(s.booking) !== p.snapshot) return null;
      if (s.booking.status === 'cancelled' || !['direct', 'phone', 'walkin'].includes(s.booking.source)) return null;
      if ((kind === 'reminder' || kind === 'due_owner') && s.booking.paymentStatus !== 'pending') return null;
      p.messages[kind] = 'sending';
      const link = `${this.deps.appUrl}/rental/${p.token}`;
      const balance = s.booking.paymentStatus === 'paid' ? 0 : p.rentalCents;
      return { to: kind === 'due_owner' || kind === 'deposit_owner' ? 'owner' : s.booking.customerEmail, key: `rental-${s.booking.id}-${kind}`,
        subject: `${kind === 'deposit_owner' ? 'Security deposit received' : kind === 'due_owner' ? 'Unpaid rental due' : 'Rental payment details'} — ${s.booking.bookingRef}`,
        text: `${kind === 'deposit_receipt' ? `Deposit received: $${(p.depositCents / 100).toFixed(2)}. ` : ''}${kind === 'rental_receipt' ? 'Rental payment received. ' : ''}Rental total: $${(p.rentalCents / 100).toFixed(2)}. Refundable security deposit: $${(p.depositCents / 100).toFixed(2)}. The refundable security deposit is held separately and is not applied toward rental balance. Rental balance due: $${(balance / 100).toFixed(2)}. Deadline: ${p.dueDate} (America/New_York); due immediately if today is on or after that date. ${p.mode === 'deposit_first' && ['none', 'requested'].includes(s.booking.depositStatus) ? `Pay refundable security deposit: ${link}/deposit. ` : ''}${balance > 0 && (p.mode !== 'deposit_first' || p.depositReceived) ? `Pay Rental Balance: ${link}` : ''}${kind === 'initial' ? `\nRenter paperwork (agreement and ID): ${this.deps.appUrl}/waiver/${encodeURIComponent(s.booking.bookingRef)}?renter=1\nCrew waivers: ${this.deps.appUrl}/waiver/${encodeURIComponent(s.booking.bookingRef)}` : ''}` };
    });
    if (!message) return;
    try {
      await this.deps.send(message);
      await this.deps.locked(key, async s => { s.plan!.messages[kind] = 'sent'; });
    } catch (error) {
      await this.deps.locked(key, async s => { s.plan!.messages[kind] = 'uncertain'; });
      throw new CollectionDeliveryError('Collection saved, but email delivery is uncertain; manual review required');
    }
  }
}

/** Actual collection formatter, but no booking, database, payment API, or mail provider. */
export async function sampleCollectionEmail(kind: 'initial' | 'deposit_receipt' | 'rental_receipt' | 'reminder') {
  const now = new Date();
  const charterDate = shiftCalendarDate(easternDate(now), 14);
  const deposited = kind !== 'initial';
  const booking: RentalBooking = {
    id: 0, bookingRef: 'SAMPLE-DO-NOT-PAY', source: 'direct', status: 'confirmed',
    paymentStatus: kind === 'rental_receipt' ? 'paid' : 'pending', total: 537.50,
    charterDate, depositStatus: deposited ? 'paid' : 'requested', depositAmount: 1000,
    customerEmail: 'sample@example.invalid',
  };
  const state: CollectionState = { booking, plan: {
    mode: 'deposit_first', rentalCents: 53750, dueDate: shiftCalendarDate(charterDate, -5),
    snapshot: rentalSnapshot(booking), token: 'sample-no-real-payment', startDate: charterDate,
    depositCents: 100000, depositReceived: deposited, rentalPaid: kind === 'rental_receipt',
    rentalGeneration: 0, depositGeneration: 0, messages: {},
  } };
  let captured: Message | undefined;
  const flow = new RentalFlow({
    locked: async (_key, fn) => fn(state),
    send: async message => { captured = message; },
    checkout: async () => { throw new Error('Sample cannot charge'); },
    retrieve: async () => { throw new Error('Sample cannot retrieve a payment'); },
    token: () => { throw new Error('Sample cannot issue a live token'); },
    now: () => now, appUrl: 'https://example.invalid',
  });
  await flow.notify(0, kind);
  if (!captured) throw new Error('Sample email could not be rendered');
  const message = captured as Message;
  return {
    subject: `[SAMPLE — no real booking] ${message.subject}`,
    text: `SAMPLE ONLY — no real booking or payment. Links below are disabled.\n\n${message.text}`,
  };
}
