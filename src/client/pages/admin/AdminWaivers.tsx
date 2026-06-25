import { trpc } from '../../lib/trpc';
import { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, X, Printer, Trash2, Search, Users, Droplets, AlertTriangle, Copy, Check, FileSignature } from 'lucide-react';

function getSource(specialRequests: string | null | undefined): string | null {
  return specialRequests?.startsWith('Via ') ? specialRequests.replace('Via ', '').split('\n')[0].trim() : null;
}

export default function AdminWaivers() {
  const { data: bookings } = trpc.bookings.list.useQuery();
  const { data: waivers, refetch } = trpc.waivers.adminList.useQuery();
  const deleteWaiver = trpc.waivers.delete.useMutation({ onSuccess: () => refetch() });
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const renterLink = selected ? `${origin}/waiver/${selected}?renter=1` : '';
  const crewLink = selected ? `${origin}/waiver/${selected}` : '';

  useEffect(() => {
    if (crewLink) QRCode.toDataURL(crewLink, { width: 200, margin: 1 }).then(setQr).catch(() => {});
    else setQr('');
  }, [crewLink]);

  const copy = (text: string, which: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(which); setTimeout(() => setCopied(''), 2000); });
  };

  // Count signed waivers per trip code
  const countByRef = useMemo(() => {
    const m: Record<string, number> = {};
    (waivers ?? []).forEach(w => { m[w.bookingRef] = (m[w.bookingRef] ?? 0) + 1; });
    return m;
  }, [waivers]);

  const today = new Date().toISOString().slice(0, 10);

  // Trips to show: any booking that is upcoming OR already has waivers. Newest first.
  const rows = useMemo(() => {
    return (bookings ?? [])
      .filter(b => b.status !== 'cancelled' && (b.charterDate >= today || (countByRef[b.bookingRef] ?? 0) > 0))
      .filter(b => !search || b.customerName.toLowerCase().includes(search.toLowerCase()) || b.bookingRef.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.charterDate.localeCompare(a.charterDate));
  }, [bookings, countByRef, search, today]);

  const selectedBooking = bookings?.find(b => b.bookingRef === selected);
  const selectedWaivers = (waivers ?? []).filter(w => w.bookingRef === selected);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-heading text-3xl font-normal text-slate-900">Waivers</h1>
          <p className="text-slate-500 text-sm mt-1">Signed liability waivers, organized by trip. Keep available for insurance inspection.</p>
        </div>
      </div>

      <div className="relative max-w-xs mb-5">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or trip code"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3">Trip</th>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Renter</th>
              <th className="text-left px-5 py-3">Signed</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(b => {
              const signed = countByRef[b.bookingRef] ?? 0;
              const complete = signed >= b.guestCount;
              return (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(b.bookingRef)}>
                  <td className="px-5 py-3 font-mono text-sky-600">{b.bookingRef}</td>
                  <td className="px-5 py-3 text-slate-600">{b.charterDate}</td>
                  <td className="px-5 py-3 text-slate-900">{b.customerName}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      complete ? 'bg-green-100 text-green-700' : signed > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {!complete && signed >= 0 && <AlertTriangle className="w-3 h-3" />}
                      {signed} / {b.guestCount}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-400 text-xs">View →</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No trips to show.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Trip detail modal */}
      {selected && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static">
          <div className="absolute inset-0 bg-black/30 print:hidden" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:rounded-none">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl print:hidden">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-500" />
                <h3 className="font-semibold text-slate-900">Trip {selectedBooking.bookingRef} — {selectedBooking.customerName}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600 mb-4">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" /> {selectedWaivers.length} of {selectedBooking.guestCount} signed</span>
                <span>Date: {selectedBooking.charterDate}</span>
                {getSource(selectedBooking.specialRequests) && <span>Booked via: <span className="font-medium text-slate-800">{getSource(selectedBooking.specialRequests)}</span></span>}
                <span className="flex items-center gap-1.5">
                  <FileSignature className="w-4 h-4 text-slate-400" /> Rental agreement:{' '}
                  {selectedBooking.agreedToTerms
                    ? <span className="text-green-600 font-medium">signed</span>
                    : <span className="text-amber-600 font-medium">not signed</span>}
                </span>
              </div>

              {/* Send to client */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-5 print:hidden">
                <p className="text-sm font-semibold text-slate-900 mb-2">Send this trip's packet to the client</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  {qr && <img src={qr} alt="Crew waiver QR" className="w-24 h-24 rounded border border-sky-100 bg-white mx-auto sm:mx-0" />}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div>
                      <div className="text-[11px] text-slate-500 mb-0.5">Renter link — signs rental agreement + waiver</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2 py-1.5 truncate">{renterLink}</div>
                        <button onClick={() => copy(renterLink, 'renter')} className="flex-shrink-0 p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-white">{copied === 'renter' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</button>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 mb-0.5">Crew link / QR — each passenger signs the waiver</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2 py-1.5 truncate">{crewLink}</div>
                        <button onClick={() => copy(crewLink, 'crew')} className="flex-shrink-0 p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-white">{copied === 'crew' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedWaivers.length === 0 && (
                <p className="text-slate-400 text-sm py-6 text-center">No waivers signed for this trip yet.</p>
              )}

              <div className="space-y-4">
                {selectedWaivers.map(w => (
                  <div key={w.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {w.participantName}
                          {w.isRenter && <span className="ml-2 text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">RENTER</span>}
                          {w.isMinor && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">MINOR</span>}
                          {w.inWaterActivity && <span className="ml-2 text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Droplets className="w-2.5 h-2.5" /> IN-WATER</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {w.participantEmail || 'no email'}
                          {w.isMinor && w.guardianName && <> · Guardian: {w.guardianName}</>}
                          {' · '}signed {w.signedAt?.replace('T', ' ').slice(0, 16)}
                        </p>
                      </div>
                      <button onClick={() => { if (confirm(`Delete ${w.participantName}'s waiver?`)) deleteWaiver.mutate(w.id); }}
                        className="text-slate-300 hover:text-red-500 print:hidden"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="mt-3 flex items-end gap-4">
                      {w.signatureData
                        ? <img src={w.signatureData} alt="signature" className="h-16 border-b border-slate-300" />
                        : <span className="text-xs text-slate-400">no drawn signature</span>}
                      {w.signaturePrinted && <span className="text-xs text-slate-500">Printed: <span className="font-medium text-slate-700">{w.signaturePrinted}</span></span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
