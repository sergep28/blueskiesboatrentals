import { useState, useMemo } from 'react';
import { trpc } from '../../lib/trpc';
import { ClipboardCheck, Copy, MessageCircle, Mail, Check, X, Search } from 'lucide-react';

export default function AdminInspections() {
  const { data: bookings } = trpc.bookings.list.useQuery();
  const { data: inspections } = trpc.inspections.adminList.useQuery();
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const detail = trpc.inspections.adminByBooking.useQuery(selected, { enabled: !!selected });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = selected ? `${origin}/inspection/${selected}` : '';

  const signedRefs = useMemo(() => new Set((inspections ?? []).map(i => i.bookingRef)), [inspections]);
  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    return (bookings ?? [])
      .filter(b => b.status !== 'cancelled' && (b.charterDate >= today || signedRefs.has(b.bookingRef)))
      .filter(b => !search || b.customerName.toLowerCase().includes(search.toLowerCase()) || b.bookingRef.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.charterDate.localeCompare(a.charterDate));
  }, [bookings, signedRefs, search, today]);

  const selectedBooking = bookings?.find(b => b.bookingRef === selected);

  const copy = (text: string, which: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(which); setTimeout(() => setCopied(''), 2000); });
  };

  const msg = selectedBooking
    ? `Hi ${selectedBooking.customerName?.split(' ')[0] ?? ''}! Before boarding, please complete your Blue Skies vessel inspection: ${link}`
    : '';

  const checklist: { area: string; condition: string; notes?: string }[] = (() => {
    try { return detail.data?.inspection?.checklist ? JSON.parse(detail.data.inspection.checklist) : []; }
    catch { return []; }
  })();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2"><ClipboardCheck className="w-6 h-6" /> Inspections</h1>
      <p className="text-slate-500 text-sm mb-6">Send the pre-departure conditional inspection link and review signed inspections (with photos).</p>

      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        {/* Trip list */}
        <div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or trip code"
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
            {rows.map(b => (
              <button key={b.bookingRef} onClick={() => setSelected(b.bookingRef)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm ${selected === b.bookingRef ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{b.customerName}</span>
                  {signedRefs.has(b.bookingRef)
                    ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Signed</span>
                    : <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Pending</span>}
                </div>
                <div className="text-xs text-slate-400">{b.charterDate} · {b.bookingRef}</div>
              </button>
            ))}
            {rows.length === 0 && <p className="text-slate-400 text-sm px-1">No trips found.</p>}
          </div>
        </div>

        {/* Detail */}
        <div>
          {!selectedBooking && <div className="text-slate-400 text-sm">Select a trip to send the inspection link or view a submitted inspection.</div>}
          {selectedBooking && (
            <div className="space-y-5">
              {/* Send link */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="font-semibold text-slate-900 mb-3">Send inspection link</h2>
                <div className="flex items-center gap-2 mb-3">
                  <input readOnly value={link} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" />
                  <button onClick={() => copy(link, 'link')} className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex items-center gap-1">
                    {copied === 'link' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <a href={`sms:${selectedBooking.customerPhone ?? ''}&body=${encodeURIComponent(msg)}`}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5"><MessageCircle className="w-4 h-4" /> Text</a>
                  <a href={`mailto:${selectedBooking.customerEmail ?? ''}?subject=${encodeURIComponent('Your Blue Skies Vessel Inspection')}&body=${encodeURIComponent(msg)}`}
                    className="flex-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1.5"><Mail className="w-4 h-4" /> Email</a>
                </div>
              </div>

              {/* Submitted inspection */}
              {detail.data?.inspection ? (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">Submitted inspection</h2>
                    <span className="text-xs text-slate-400">Signed {detail.data.inspection.signedAt}</span>
                  </div>

                  <div>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-slate-400 text-xs"><th className="pb-1">Area</th><th className="pb-1">Condition</th><th className="pb-1">Notes</th></tr></thead>
                      <tbody>
                        {checklist.map((c, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="py-1.5 text-slate-700">{c.area}</td>
                            <td className="py-1.5">
                              <span className={c.condition === 'damage' ? 'text-red-600 font-medium' : 'text-green-600'}>
                                {c.condition === 'damage' ? 'Damage' : 'Good'}
                              </span>
                            </td>
                            <td className="py-1.5 text-slate-500">{c.notes ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {detail.data.inspection.damageNotes && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-1">Additional damage notes</h3>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{detail.data.inspection.damageNotes}</p>
                    </div>
                  )}

                  {/* Photos */}
                  {detail.data.photos.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-500 mb-2">Photos ({detail.data.photos.length})</h3>
                      <div className="flex flex-wrap gap-2">
                        {detail.data.photos.map(p => (
                          <button key={p.id} onClick={() => setLightbox(p.imageData)} className="relative">
                            <img src={p.imageData} alt={p.area ?? ''} className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1 py-0.5 rounded-b-lg truncate">{p.area}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagrams */}
                  {(detail.data.inspection.hullDiagram || detail.data.inspection.outboardDiagram) && (
                    <div className="grid grid-cols-2 gap-3">
                      {detail.data.inspection.hullDiagram && (
                        <div><h3 className="text-xs font-medium text-slate-500 mb-1">Hull</h3>
                          <button onClick={() => setLightbox(detail.data!.inspection!.hullDiagram!)}><img src={detail.data.inspection.hullDiagram} alt="hull" className="w-full border border-slate-200 rounded-lg" /></button></div>
                      )}
                      {detail.data.inspection.outboardDiagram && (
                        <div><h3 className="text-xs font-medium text-slate-500 mb-1">Outboard</h3>
                          <button onClick={() => setLightbox(detail.data!.inspection!.outboardDiagram!)}><img src={detail.data.inspection.outboardDiagram} alt="outboard" className="w-full border border-slate-200 rounded-lg" /></button></div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="text-sm">
                      <span className="text-slate-400">Signed by </span>
                      <span className="text-slate-700 font-medium">{detail.data.inspection.signaturePrinted}</span>
                      {detail.data.inspection.operatorName && <span className="text-slate-400"> · operator: {detail.data.inspection.operatorName}</span>}
                    </div>
                    {detail.data.inspection.signatureData && <img src={detail.data.inspection.signatureData} alt="signature" className="h-12" />}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-sm bg-white border border-slate-200 rounded-xl p-5">No inspection submitted yet for this trip.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-7 h-7" /></button>
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
