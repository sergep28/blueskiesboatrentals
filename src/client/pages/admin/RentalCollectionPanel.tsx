import { useRef, useState } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../server/router';
import { trpc } from '../../lib/trpc';

type CollectionStatus = inferRouterOutputs<AppRouter>['bookings']['rentalCollectionStatus'];
interface Booking {
  id: number; source: string; status: string; paymentStatus: string;
  total: number; depositAmount: number; depositStatus: string;
  stripeSessionId?: string | null; depositStripeSessionId?: string | null;
}
const buttonClass = 'rounded-lg border border-sky-300 bg-white px-3 py-2 text-sky-800 disabled:opacity-50';
const dollars = (cents: number) => (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// Mounted only inside authenticated booking details; key by booking ID. Reads do not send mail or create checkout.
export default function RentalCollectionPanel({ booking, blocked = false, enrollmentAttempted = false, onEnrollmentStarted }: {
  booking: Booking; blocked?: boolean; enrollmentAttempted?: boolean; onEnrollmentStarted?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState<CollectionStatus | null>(null);
  const [communicationError, setCommunicationError] = useState(false);
  const [failure, setFailure] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const submitted = useRef(false);
  const status = trpc.bookings.rentalCollectionStatus.useQuery({ bookingId: booking.id });
  const enroll = trpc.bookings.enrollRentalCollection.useMutation({
    onSuccess: result => {
      setSaved(result);
      setCommunicationError(result.communicationError);
      setConfirming(false);
      void status.refetch();
    },
    onError: error => {
      // A lost response can follow a committed enrollment. Never automatically retry a send.
      setFailure(error.message);
      setConfirming(false);
      void status.refetch();
    },
  });
  const current = status.data?.enrolled ? status.data : saved ?? status.data;
  const reason = enrollmentAttempted ? 'Enrollment was already attempted in this session. Refresh status and obtain manual review before trying again.'
    : blocked ? 'Save booking changes and finish pending actions before enrollment.'
    : !['direct', 'phone', 'walkin'].includes(booking.source) || booking.paymentStatus !== 'pending' || booking.status === 'cancelled'
      ? 'Booking not eligible: only verified direct, phone or walk-in bookings with unpaid rental may enroll. Platform rentals stay with the platform; website checkout stays upfront.'
    : !Number.isFinite(booking.total) || booking.total <= 0 || !Number.isFinite(booking.depositAmount) || booking.depositAmount <= 0
      ? 'Booking not eligible: positive rental and refundable security deposit amounts are required.'
    : booking.stripeSessionId || (booking.depositStripeSessionId && ['none', 'requested'].includes(booking.depositStatus))
      ? 'Existing checkout requires manual review: reconcile or expire outstanding legacy payment requests before enrollment.' : null;
  const copy = async (url: string) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setCopyNotice('Link copied. Share only with the intended customer.');
    } catch { setCopyNotice('Could not copy. Clipboard access is unavailable; no link was sent.'); }
  };
  return <section aria-label="Rental collection" className="rounded-lg border border-sky-200 bg-sky-50 p-4 space-y-3 text-sm">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-semibold">Deposit-first rental collection</h3>
      <button type="button" className={buttonClass} disabled={status.isFetching || enroll.isPending} onClick={() => { void status.refetch(); }}>Refresh status</button>
    </div>
    {status.error && <p role="alert">Cannot verify collection status: {status.error.message}. Shown values may be stale.</p>}
    {failure && <p role="alert" className="text-amber-900">{failure}. Enrollment may already be saved. Refresh status and request manual review before another enrollment or message; do not resend blindly.</p>}
    {enroll.isPending && <p role="status">Saving enrollment and attempting initial customer email… Do not send another payment request.</p>}
    {current?.enrolled ? <>
      <p>Enrollment saved — {current.mode === 'deposit_first' ? 'deposit-first' : current.mode}. This does not prove email delivery or payment.</p>
      <p className="text-amber-900">Refresh status updates only this collection panel. The surrounding booking, payment, deposit and trip-readiness widgets may be stale; they refresh independently. Refresh this panel after deposit settlement. If values disagree, reload the booking before taking further financial action; save any unsaved edits first.</p>
      <div className="space-y-1">
        <p>Rental total: <strong>{dollars(current.rentalTotalCents)}</strong></p>
        <p>Rental balance: <strong>{dollars(current.rentalBalanceCents)}</strong></p>
        <p>Rental status: <strong>{current.rentalBalanceCents === 0 ? 'paid' : 'unpaid'}</strong></p>
        <p>Rental due date: <strong>{current.dueDate}</strong></p>
        <p>Refundable security deposit: <strong>{dollars(current.depositCents)}</strong></p>
        <p>Deposit status: <strong>{current.depositStatus}</strong></p>
        <p>The refundable security deposit is held separately and is not applied toward the rental balance.</p>
      </div>
      <p>Private payment links grant access to this booking. Copy only for the intended customer; never publish them. Copying does not send email or create a checkout.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={() => copy(current.rentalUrl)}>Copy private rental link</button>
        <button type="button" className={buttonClass} onClick={() => copy(current.depositUrl)}>Copy private deposit link</button>
      </div>
      <p role="status">{copyNotice}</p>
      <h4 className="font-semibold">Collection communication status</h4>
      {Object.entries(current.messages).length === 0 && <p>No communication state recorded. Delivery is not confirmed; request manual review.</p>}
      <ul>{Object.entries(current.messages).map(([kind, value]) => <li key={kind}>{kind.replaceAll('_', ' ')}: {value}</li>)}</ul>
      {(communicationError || Object.values(current.messages).some(value => value === 'sending' || value === 'uncertain')) &&
        <p role="alert" className="text-amber-900">{communicationError ? 'Initial communication failed or could not be confirmed. ' : ''}Sending / uncertain communication requires manual delivery review. Automatic resends are suppressed; no retry or reconciliation tool is available here.</p>}
      <p className="text-xs text-slate-600">Recorded “sent” is not proof of inbox delivery. Reminder scheduling and owner alerts require separate launch verification.</p>
    </> : !current && !status.error ? <p>Loading rental collection status…</p>
      : !failure && !status.error && !enroll.isPending && !submitted.current && current ? <>
        {reason ? <p>{reason}</p> : <>
          <p>For a verified direct unpaid booking only. Rental is due five calendar days before departure; bookings within five days are due immediately. An already-paid refundable security deposit remains separate.</p>
          {!confirming ? <button type="button" className={buttonClass} disabled={status.isFetching} onClick={() => setConfirming(true)}>Set up deposit-first rental collection</button> : <div className="space-y-3 border border-amber-300 bg-amber-50 p-3 rounded-lg">
            <p>I confirm this is a direct booking and the rental is unpaid. Enrollment sends the initial customer email when live, with rental total, refundable security deposit and due date. Check prior emails and reconcile or expire existing checkout links first to avoid duplicate payment requests.</p>
            <div className="flex gap-2">
              <button type="button" className={buttonClass} onClick={() => setConfirming(false)}>Cancel</button>
              <button type="button" className={buttonClass} disabled={enroll.isPending || status.isFetching} onClick={() => {
                if (submitted.current || blocked || status.isFetching || status.error || reason) return;
                submitted.current = true;
                onEnrollmentStarted?.();
                enroll.mutate({ bookingId: booking.id, mode: 'deposit_first', confirmDirectUnpaid: true });
              }}>Confirm enrollment &amp; send initial email</button>
            </div>
          </div>}
        </>}
      </> : null}
  </section>;
}
