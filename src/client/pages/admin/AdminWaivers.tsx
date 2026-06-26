import { trpc } from '../../lib/trpc';
import { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { ShieldCheck, X, Printer, Trash2, Search, Users, Droplets, AlertTriangle, Copy, Check, FileSignature, Download } from 'lucide-react';

const WAIVER_TEXT = [
  { heading: 'Release of Liability, Waiver of Claims, Assumption of Risk & Indemnity', body: 'By signing below you acknowledge that boating and in-water activities carry inherent risks — including serious injury or death — and you voluntarily assume all such risks. To the fullest extent permitted by law, you waive and release Blue Skies Charter LLC and its owners, operators, agents, and insurers from any and all claims, and agree to indemnify and hold them harmless, arising out of your participation, except where caused by gross negligence or intentional misconduct.' },
  { heading: 'In-Water Activities', body: 'If you participate in in-water activities (swimming, snorkeling, kayaking), you confirm you will wear a flotation aid at all times, stay within the permitted area, and accept the additional risks of those activities. Scuba and use of oxygen tanks are not permitted.' },
  { heading: 'Acknowledgment', body: 'You confirm you are physically able to participate, are not under the influence of alcohol or drugs, and have read and understand this agreement. By signing you are aware that you are waiving certain legal rights, including the right to sue.' },
];

function generateWaiverPdf(waiver: any, booking: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Blue Skies Boat Rentals', margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Islamorada, Florida Keys | blueskiesboatrentals.com | (516) 587-0438', margin, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Signed Liability Waiver', margin, y);
  y += 10;

  // Trip details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Trip Details', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const details = [
    ['Booking Ref:', booking.bookingRef],
    ['Renter:', booking.customerName],
    ['Charter Date:', booking.charterDate],
    ['Guests:', String(booking.guestCount)],
  ];
  details.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val, margin + 30, y);
    y += 5;
  });
  y += 5;

  // Waiver text
  WAIVER_TEXT.forEach(section => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const headingLines = doc.splitTextToSize(section.heading, contentWidth);
    if (y + headingLines.length * 5 > 270) { doc.addPage(); y = 20; }
    doc.text(headingLines, margin, y);
    y += headingLines.length * 5 + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const bodyLines = doc.splitTextToSize(section.body, contentWidth);
    if (y + bodyLines.length * 4 > 270) { doc.addPage(); y = 20; }
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 4 + 6;
  });

  // Signer info
  y += 5;
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Signed By', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');

  const signerDetails = [
    ['Name:', waiver.participantName],
    ['Email:', waiver.participantEmail || 'Not provided'],
    ...(waiver.isMinor ? [['Minor:', 'Yes'], ['Guardian:', waiver.guardianName || 'N/A']] : []),
    ['In-Water Activities:', waiver.inWaterActivity ? 'Yes' : 'No'],
    ['Role:', waiver.isRenter ? 'Renter' : 'Crew/Passenger'],
    ['Signed At:', waiver.signedAt?.replace('T', ' ').slice(0, 19) || 'Unknown'],
    ['Waiver Version:', waiver.waiverVersion || 'Unknown'],
    ...(waiver.ipAddress ? [['IP Address:', waiver.ipAddress]] : []),
  ];
  signerDetails.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label as string, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val as string, margin + 35, y);
    y += 5;
  });

  // Signature image
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Signature:', margin, y);
  y += 3;
  if (waiver.signatureData) {
    try {
      doc.addImage(waiver.signatureData, 'PNG', margin, y, 60, 25);
      y += 28;
    } catch { y += 5; }
  }
  doc.setFont('helvetica', 'normal');
  doc.text(`Printed name: ${waiver.signaturePrinted || waiver.participantName}`, margin, y);
  y += 10;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated ${new Date().toLocaleString()} — Blue Skies Boat Rentals`, margin, 285);

  return doc;
}

function downloadWaiverPdf(waiver: any, booking: any) {
  const doc = generateWaiverPdf(waiver, booking);
  doc.save(`waiver-${booking.bookingRef}-${waiver.participantName.replace(/\s+/g, '-')}.pdf`);
}

function downloadAllWaiversPdf(waivers: any[], booking: any) {
  if (waivers.length === 0) return;
  const doc = generateWaiverPdf(waivers[0], booking);
  for (let i = 1; i < waivers.length; i++) {
    doc.addPage();
    const singleDoc = generateWaiverPdf(waivers[i], booking);
    // Merge pages — simpler to just build each as separate page in one doc
  }
  // Rebuild as multi-page
  const multiDoc = new jsPDF();
  waivers.forEach((w, i) => {
    if (i > 0) multiDoc.addPage();
    const single = generateWaiverPdf(w, booking);
    const pageData = single.output('arraybuffer');
    // jsPDF doesn't support merging, so we'll generate fresh for each
  });
  // Actually, simplest approach: generate each waiver as pages in one doc
  const finalDoc = new jsPDF();
  waivers.forEach((w, idx) => {
    if (idx > 0) finalDoc.addPage();
    let y = 20;
    const pageWidth = finalDoc.internal.pageSize.getWidth();
    const m = 20;
    const cw = pageWidth - m * 2;

    finalDoc.setFontSize(18);
    finalDoc.setFont('helvetica', 'bold');
    finalDoc.text('Blue Skies Boat Rentals', m, y); y += 8;
    finalDoc.setFontSize(10);
    finalDoc.setFont('helvetica', 'normal');
    finalDoc.setTextColor(100);
    finalDoc.text('Islamorada, Florida Keys | blueskiesboatrentals.com | (516) 587-0438', m, y); y += 4;
    finalDoc.setDrawColor(200);
    finalDoc.line(m, y, pageWidth - m, y); y += 10;
    finalDoc.setTextColor(0);

    finalDoc.setFontSize(14);
    finalDoc.setFont('helvetica', 'bold');
    finalDoc.text(`Signed Liability Waiver (${idx + 1} of ${waivers.length})`, m, y); y += 10;

    finalDoc.setFontSize(10);
    finalDoc.setFont('helvetica', 'bold');
    finalDoc.text('Trip Details', m, y); y += 6;
    finalDoc.setFont('helvetica', 'normal');
    [['Booking Ref:', booking.bookingRef], ['Renter:', booking.customerName], ['Charter Date:', booking.charterDate], ['Guests:', String(booking.guestCount)]].forEach(([l, v]) => {
      finalDoc.setFont('helvetica', 'bold'); finalDoc.text(l, m, y);
      finalDoc.setFont('helvetica', 'normal'); finalDoc.text(v, m + 30, y); y += 5;
    });
    y += 5;

    WAIVER_TEXT.forEach(s => {
      finalDoc.setFont('helvetica', 'bold'); finalDoc.setFontSize(10);
      const hl = finalDoc.splitTextToSize(s.heading, cw);
      if (y + hl.length * 5 > 270) { finalDoc.addPage(); y = 20; }
      finalDoc.text(hl, m, y); y += hl.length * 5 + 2;
      finalDoc.setFont('helvetica', 'normal'); finalDoc.setFontSize(9);
      const bl = finalDoc.splitTextToSize(s.body, cw);
      if (y + bl.length * 4 > 270) { finalDoc.addPage(); y = 20; }
      finalDoc.text(bl, m, y); y += bl.length * 4 + 6;
    });

    y += 5;
    if (y > 240) { finalDoc.addPage(); y = 20; }
    finalDoc.setDrawColor(200); finalDoc.line(m, y, pageWidth - m, y); y += 8;
    finalDoc.setFontSize(10);
    finalDoc.setFont('helvetica', 'bold'); finalDoc.text('Signed By', m, y); y += 7;
    finalDoc.setFont('helvetica', 'normal');
    const sd = [['Name:', w.participantName], ['Email:', w.participantEmail || 'Not provided'], ...(w.isMinor ? [['Minor:', 'Yes'], ['Guardian:', w.guardianName || 'N/A']] : []), ['In-Water:', w.inWaterActivity ? 'Yes' : 'No'], ['Role:', w.isRenter ? 'Renter' : 'Crew/Passenger'], ['Signed:', w.signedAt?.replace('T', ' ').slice(0, 19) || 'Unknown']];
    sd.forEach(([l, v]) => { finalDoc.setFont('helvetica', 'bold'); finalDoc.text(l as string, m, y); finalDoc.setFont('helvetica', 'normal'); finalDoc.text(v as string, m + 35, y); y += 5; });

    y += 5;
    finalDoc.setFont('helvetica', 'bold'); finalDoc.text('Signature:', m, y); y += 3;
    if (w.signatureData) { try { finalDoc.addImage(w.signatureData, 'PNG', m, y, 60, 25); y += 28; } catch {} }
    finalDoc.setFont('helvetica', 'normal');
    finalDoc.text(`Printed name: ${w.signaturePrinted || w.participantName}`, m, y);

    finalDoc.setFontSize(8); finalDoc.setTextColor(150);
    finalDoc.text(`Generated ${new Date().toLocaleString()} — Blue Skies Boat Rentals`, m, 285);
    finalDoc.setTextColor(0);
  });
  finalDoc.save(`waivers-${booking.bookingRef}-all.pdf`);
}

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

  // Count unique participants per trip code (not total signatures)
  const countByRef = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    (waivers ?? []).forEach(w => {
      if (!m[w.bookingRef]) m[w.bookingRef] = new Set();
      m[w.bookingRef].add(w.participantName.toLowerCase().trim());
    });
    const counts: Record<string, number> = {};
    Object.entries(m).forEach(([ref, names]) => { counts[ref] = names.size; });
    return counts;
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
                {selectedWaivers.length > 0 && (
                  <button onClick={() => downloadAllWaiversPdf(selectedWaivers, selectedBooking)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600">
                    <Download className="w-4 h-4" /> Download All PDFs
                  </button>
                )}
                <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600 mb-4">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" /> {new Set(selectedWaivers.map(w => w.participantName.toLowerCase().trim())).size} of {selectedBooking.guestCount} participants signed</span>
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
                      <div className="flex items-center gap-2 print:hidden">
                        <button onClick={() => downloadWaiverPdf(w, selectedBooking)} title="Download PDF"
                          className="text-slate-300 hover:text-sky-500"><Download className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm(`Delete ${w.participantName}'s waiver?`)) deleteWaiver.mutate(w.id); }}
                          className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
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
