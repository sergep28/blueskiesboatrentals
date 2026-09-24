import { useRef, useState } from 'react';
import type { inferRouterInputs } from '@trpc/server';
import type { AppRouter } from '../../../server/router';
import { trpc } from '../../lib/trpc';

type Payload = inferRouterInputs<AppRouter>['bookings']['create'];
const STORAGE_KEY = 'admin.deposit-first.pending.v1';
function restore(): { pending: Payload | null; blocked: boolean } {
  try {
    if (typeof sessionStorage === 'undefined') return { pending: null, blocked: false };
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (!value) return { pending: null, blocked: false };
    const request = JSON.parse(value);
    if (request.collectionMode !== 'deposit_first' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.creationRequestKey)
      || !['direct', 'phone', 'walkin'].includes(request.source ?? 'direct') || typeof request.customerEmail !== 'string' || typeof request.customerName !== 'string' || typeof request.boatId !== 'number' || typeof request.charterDate !== 'string') throw Error('Invalid recovery record');
    return { pending: request, blocked: false };
  } catch { return { pending: null, blocked: true }; }
}

// Mounted at page scope so closing the create modal cannot discard a pending request.
export function useNewBookingCreate(payload: Payload, valid: boolean, onSaved: () => void) {
  const [optInSource, setOptInSource] = useState<string | null>(null);
  const eligible = ['direct', 'phone', 'walkin'].includes(payload.source ?? 'direct');
  const optIn = eligible && optInSource === (payload.source ?? 'direct');
  const [consent, setConsent] = useState(false);
  const [recovery, setRecovery] = useState(restore);
  const { pending, blocked } = recovery;
  const recoveryRef = useRef(recovery);
  const [reconciled, setReconciled] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const [sending, setSending] = useState(false);
  // Deliberately keep capability URLs out of the receipt and browser storage.
  const [receipt, setReceipt] = useState<{ bookingId: number; bookingRef: string; communicationError: boolean; statusUnavailable: boolean; initial?: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const status = trpc.bookings.rentalCollectionStatus.useQuery({ bookingId: receipt?.bookingId ?? 0 }, { enabled: false, retry: false });
  const reset = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    recoveryRef.current = { pending: null, blocked: false };
    setRecovery(recoveryRef.current);
    setReconciled(false); setOptInSource(null); setConsent(false); setError('');
  };
  const create = trpc.bookings.create.useMutation({
    retry: false,
    onSuccess: (result) => {
      if ('collection' in result && result.collection) {
        setReceipt({ bookingId: result.bookingId, bookingRef: result.bookingRef, communicationError: result.collection.communicationError, statusUnavailable: result.collection.statusUnavailable, initial: result.collection.messages?.initial });
        setStatusMessage('');
      }
      busy.current = false; setSending(false);
      if (recoveryRef.current.pending) {
        try { reset(); } catch {
          // A known success must never become a create failure if cleanup is denied.
          recoveryRef.current = { pending: null, blocked: true }; setRecovery(recoveryRef.current);
          setError('Booking saved, but recovery storage could not be cleared. Reconcile and clear before creating another booking.');
        }
      } else { setOptInSource(null); setConsent(false); setError(''); }
      onSaved();
    },
    onError: (e) => { busy.current = false; setSending(false); setError(e.message); },
  });
  const send = (request: Payload) => {
    if (busy.current) return;
    busy.current = true; setSending(true); setError('');
    create.mutate(request);
  };
  const submit = () => {
    if (busy.current || recoveryRef.current.pending || recoveryRef.current.blocked || !valid || (optIn && !consent)) return;
    if (!optIn) { send(payload); return; }
    try {
      // Persist only on explicit submit, not drafts. JSON normalization matches the sent fields.
      const request: Payload = JSON.parse(JSON.stringify({ ...payload, collectionMode: 'deposit_first', creationRequestKey: crypto.randomUUID() }));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(request));
      recoveryRef.current = { pending: request, blocked: false }; setRecovery(recoveryRef.current);
      send(request);
    } catch { setError('Request not sent: secure UUID or session storage unavailable. Restore browser storage before submitting.'); }
  };
  const lock = !!pending || blocked || sending;
  return {
    controls: <div className="space-y-3 text-sm">
      <label className="flex gap-2"><input type="checkbox" aria-label="Use deposit-first" disabled={!eligible || lock} checked={optIn} onChange={e => { setOptInSource(e.target.checked ? (payload.source ?? 'direct') : null); setConsent(false); }} />Use deposit-first: refundable security deposit first, rental balance separately</label>
      {!eligible && <p>Deposit-first is available only for direct, phone and walk-in bookings.</p>}
      {optIn ? <>
        <p>Creates a confirmed reservation with pending rental payment and a separate refundable security deposit request. No payment is recorded by creation.</p>
        <label className="flex gap-2"><input type="checkbox" aria-label="Authorize initial email" disabled={lock} checked={consent} onChange={e => setConsent(e.target.checked)} />I authorize the initial email with deposit, rental balance, agreement/ID and crew-waiver links.</label>
        <p className="text-xs text-slate-600">On submit, the exact request (including contact details and any notes) is kept in this tab’s session storage only until confirmed success or explicit reconciliation. Drafts and private payment links are not stored. Avoid unnecessary sensitive notes. Server enrollment must be enabled by an authorized rollout; this UI does not enable it.</p>
      </> : <p>Creating a booking does not collect or record payment. Payment starts as pending. The legacy flow sends a boarding packet and may create a refundable security deposit checkout.</p>}
      <button type="button" disabled={!valid || lock || create.isPending || (optIn && !consent)} onClick={submit} className="w-full bg-sky-500 disabled:bg-slate-300 text-white py-2.5 rounded-lg font-semibold text-sm">{sending ? 'Submitting…' : optIn ? 'Create confirmed reservation & send initial email' : 'Create Booking'}</button>
      {(pending || blocked) && <p>New creation is paused. Close this modal to inspect the pending submission and recovery controls above the booking list.</p>}
      {error && !pending && !blocked && <p role="alert">{error}</p>}
    </div>,
    notice: <div aria-live="polite" className="space-y-2 text-sm">
      {error && <p role="alert">{error}</p>}
      {receipt && <section className="bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold">Booking saved — {receipt.bookingRef} (#{receipt.bookingId})</h3>
        <p>Confirmed reservation; pending rental at creation. The refundable security deposit is separate from rental payment. Saving does not collect money.</p>
        <p>Initial email: {receipt.initial ?? 'status unknown'}. “Sent” means provider accepted, not inbox delivery.</p>
        {receipt.communicationError && <p role="alert">Initial communication failed or is uncertain; manual review is required. The booking is saved. Do not create another booking or automatically resend.</p>}
        {receipt.statusUnavailable && <p role="alert">Status unavailable: the response is the last committed snapshot, not a fresh read. Refresh saved collection status or inspect booking details.</p>}
        <button type="button" onClick={async () => {
          setStatusMessage('Refreshing…');
          try {
            const result = await status.refetch();
            if (result.error || !result.data?.enrolled) { setStatusMessage('Could not verify current collection status. Inspect booking details; do not recreate.'); return; }
            const data = result.data;
            setStatusMessage(`Current rental balance: $${(data.rentalBalanceCents / 100).toFixed(2)}; refundable security deposit: ${data.depositStatus}; due ${data.dueDate}; initial email: ${data.messages.initial ?? 'not recorded'}. Sending or uncertain messages require manual review.`);
          } catch { setStatusMessage('Status refresh failed. The booking remains saved.'); }
        }} className="border rounded px-3 py-2">Refresh saved collection status</button>
        {statusMessage && <p>{statusMessage}</p>}
      </section>}
      {(pending || blocked) && <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold">Pending submission — booking may already be saved</h3>
        {pending ? <>
          <p>{pending.customerName} · {pending.customerEmail} · {pending.charterDate} · Boat {pending.boatId}</p>
          <p className="break-all">Request: {pending.creationRequestKey}</p>
          <p>The exact submitted fields are retained only in this admin tab’s session storage for reload recovery. No automatic retry. Do not close this tab or create another booking until reconciled.</p>
          <p>Form edits cannot change this pending request. Retry only the original submission, or reconcile its booking and communication status before starting a different booking. An exact retry may initiate an initial email that was never reserved; uncertain/sending messages require manual review, not automatic resend.</p>
          <button type="button" disabled={sending} onClick={() => { if (recoveryRef.current.pending) send(recoveryRef.current.pending); }} className="border rounded px-3 py-2">Retry exact pending submission</button>
        </> : <p role="alert">Submission recovery is unavailable or corrupt. Creation is paused. Reconcile recent bookings and communication status before clearing this record.</p>}
        <label className="flex gap-2"><input type="checkbox" aria-label="Reconciliation complete" disabled={sending} checked={reconciled} onChange={e => setReconciled(e.target.checked)} />I independently verified that no booking was saved, or located the saved booking and will manage it there without recreating it. Reconciliation is complete.</label>
        <button type="button" disabled={!reconciled || sending} onClick={() => {
          if (!reconciled || busy.current) return;
          try { reset(); } catch { setError('Could not clear session storage. Creation remains paused.'); }
        }} className="border rounded px-3 py-2">Clear reconciled submission</button>
      </section>}
    </div>,
  };
}
