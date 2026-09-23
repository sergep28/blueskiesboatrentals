import { jsPDF } from 'jspdf';
import { agreementSectionsForVersion, AGREEMENT_INTRO, AGREEMENT_ACKNOWLEDGMENT } from './rentalAgreementText';

// Builds a self-contained PDF of the signed bareboat rental agreement: the full
// terms (shared with the public /rental-agreement page) plus this booking's
// details and the renter's captured signature. Mirrors generateWaiverPdf in
// AdminWaivers so the two documents look like one family.
export function renderAgreement(booking: any, target?: jsPDF) {
  const doc = target ?? new jsPDF();
  if (target) doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const ensureRoom = (needed: number) => {
    if (y + needed > 275) { doc.addPage(); y = 20; }
  };

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Blue Skies Boat Rentals', margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Islamorada, Florida Keys | blueskiesboatrentals.com | (754) 254-2293', margin, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Signed Bareboat Rental Agreement', margin, y);
  y += 9;

  // Trip details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Trip Details', margin, y);
  y += 6;
  const details = [
    ['Booking Ref:', booking.bookingRef],
    ['Renter:', booking.customerName],
    ['Charter Date:', booking.endDate && booking.endDate > booking.charterDate ? `${booking.charterDate} – ${booking.endDate}` : booking.charterDate],
    ['Guests:', String(booking.guestCount)],
    ...(booking.stayAddress ? [['Overnight boat address:', booking.stayAddress]] : []),
  ];
  details.forEach(([label, val]) => {
    const lines = doc.splitTextToSize(String(val ?? ''), contentWidth - 45);
    ensureRoom(lines.length * 5 + 2);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 45, y);
    y += lines.length * 5;
  });
  y += 4;

  // Intro
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80);
  const introLines = doc.splitTextToSize(AGREEMENT_INTRO, contentWidth);
  ensureRoom(introLines.length * 3.6);
  doc.text(introLines, margin, y);
  y += introLines.length * 3.6 + 6;
  doc.setTextColor(0);

  // Full agreement text
  agreementSectionsForVersion(booking.agreementVersion).forEach(section => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const headingLines = doc.splitTextToSize(section.title, contentWidth);
    ensureRoom(headingLines.length * 5 + 4);
    doc.text(headingLines, margin, y);
    y += headingLines.length * 5 + 2;

    if (section.subtitle) {
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(8.5);
      const sub = doc.splitTextToSize(section.subtitle, contentWidth);
      ensureRoom(sub.length * 4);
      doc.text(sub, margin, y);
      y += sub.length * 4 + 1;
    }
    if (section.intro) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      const intro = doc.splitTextToSize(section.intro, contentWidth);
      ensureRoom(intro.length * 4);
      doc.text(intro, margin, y);
      y += intro.length * 4 + 1;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    section.items.forEach(item => {
      const lines = doc.splitTextToSize(item, contentWidth - 3);
      ensureRoom(lines.length * 4 + 2);
      doc.text(lines, margin + 3, y);
      y += lines.length * 4 + 2;
    });

    if (section.footer) {
      doc.setFont('helvetica', 'italic');
      const footer = doc.splitTextToSize(section.footer, contentWidth - 3);
      ensureRoom(footer.length * 4 + 2);
      doc.text(footer, margin + 3, y);
      y += footer.length * 4 + 2;
    }
    y += 4;
  });

  // Acknowledgment
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  ensureRoom(8);
  doc.text('Acknowledgment', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const ackLines = doc.splitTextToSize(AGREEMENT_ACKNOWLEDGMENT, contentWidth);
  ensureRoom(ackLines.length * 4);
  doc.text(ackLines, margin, y);
  y += ackLines.length * 4 + 6;

  // Signature block
  ensureRoom(60);
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Signed By Renter', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  [
    ['Renter:', booking.customerName],
    ['Signed At:', booking.agreementSignedAt ? booking.agreementSignedAt.replace('T', ' ').slice(0, 19) : 'Not signed'],
    ['Agreement Version:', booking.agreementVersion || 'Unknown'],
    ['Agreed to Terms:', booking.agreedToTerms ? 'Yes' : 'No'],
  ].forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(String(label), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val ?? ''), margin + 40, y);
    y += 5;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Signature:', margin, y);
  y += 3;
  const sig: string | undefined = booking.signature;
  if (sig && sig.startsWith('data:image')) {
    try {
      doc.addImage(sig, 'PNG', margin, y, 60, 25);
      y += 28;
    } catch { y += 5; }
  } else if (sig) {
    // Typed/printed-name signature
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(14);
    doc.text(sig, margin, y + 8);
    y += 14;
    doc.setFontSize(10);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text('— no signature on file —', margin, y + 6);
    y += 12;
  }

  if (!target) {
    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Blue Skies Charter LLC — Rental Agreement ${booking.bookingRef} — page ${p} of ${pageCount}`, margin, 288);
    }
  }

  return doc;
}

export function downloadAgreementPdf(booking: any) {
  const doc = renderAgreement(booking);
  doc.save(`rental-agreement-${booking.bookingRef}-${(booking.customerName || 'renter').replace(/\s+/g, '-')}.pdf`);
}

const WAIVER_TEXT = [
  { heading: 'Release of Liability, Waiver of Claims, Assumption of Risk & Indemnity', body: 'By signing below you acknowledge that boating and in-water activities carry inherent risks — including serious injury or death — and you voluntarily assume all such risks. To the fullest extent permitted by law, you waive and release Blue Skies Charter LLC and its owners, operators, agents, and insurers from any and all claims, and agree to indemnify and hold them harmless, arising out of your participation, except where caused by gross negligence or intentional misconduct.' },
  { heading: 'In-Water Activities', body: 'If you participate in in-water activities (swimming, snorkeling, kayaking), you confirm you will wear a flotation aid at all times, stay within the permitted area, and accept the additional risks of those activities. Scuba and use of oxygen tanks are not permitted.' },
  { heading: 'Acknowledgment', body: 'You confirm you are physically able to participate, are not under the influence of alcohol or drugs, and have read and understand this agreement. By signing you are aware that you are waiving certain legal rights, including the right to sue.' },
];

export function renderWaivers(waivers: any[], booking: any, target?: jsPDF) {
  if (!waivers.length) return target ?? new jsPDF();
  const doc = target ?? new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const m = 20;
  const cw = pageWidth - m * 2;

  waivers.forEach((w, idx) => {
    if (idx > 0 || target) doc.addPage();
    let y = 20;

    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Blue Skies Boat Rentals', m, y); y += 8;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text('Islamorada, Florida Keys | blueskiesboatrentals.com | (754) 254-2293', m, y); y += 4;
    doc.setDrawColor(200); doc.line(m, y, pageWidth - m, y); y += 10;
    doc.setTextColor(0);

    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(`Signed Liability Waiver (${idx + 1} of ${waivers.length})`, m, y); y += 10;

    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Trip Details', m, y); y += 6;
    doc.setFont('helvetica', 'normal');
    [['Booking Ref:', booking.bookingRef], ['Renter:', booking.customerName], ['Charter Date:', booking.charterDate], ['Guests:', String(booking.guestCount)]].forEach(([l, v]) => {
      doc.setFont('helvetica', 'bold'); doc.text(l, m, y);
      doc.setFont('helvetica', 'normal'); doc.text(v, m + 30, y); y += 5;
    });
    y += 5;

    WAIVER_TEXT.forEach(s => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      const hl = doc.splitTextToSize(s.heading, cw);
      if (y + hl.length * 5 > 270) { doc.addPage(); y = 20; }
      doc.text(hl, m, y); y += hl.length * 5 + 2;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const bl = doc.splitTextToSize(s.body, cw);
      if (y + bl.length * 4 > 270) { doc.addPage(); y = 20; }
      doc.text(bl, m, y); y += bl.length * 4 + 6;
    });

    y += 5;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setDrawColor(200); doc.line(m, y, pageWidth - m, y); y += 8;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Signed By', m, y); y += 7;
    doc.setFont('helvetica', 'normal');
    const sd: [string, string][] = [['Name:', w.participantName], ['Phone:', w.participantPhone || 'Not provided'], ['Email:', w.participantEmail || 'Not provided'], ['DOB:', w.dateOfBirth || 'Not provided'], ['Role:', w.isRenter ? 'Renter' : 'Crew/Passenger'], ['Signed:', w.signedAt?.replace('T', ' ').slice(0, 19) || 'Unknown']];
    sd.forEach(([l, v]) => { doc.setFont('helvetica', 'bold'); doc.text(l, m, y); doc.setFont('helvetica', 'normal'); doc.text(v, m + 35, y); y += 5; });

    y += 5;
    doc.setFont('helvetica', 'bold'); doc.text('Signature:', m, y); y += 3;
    if (w.signatureData) { try { doc.addImage(w.signatureData, 'PNG', m, y, 60, 25); y += 28; } catch {} }
    doc.setFont('helvetica', 'normal');
    doc.text(`Printed name: ${w.signaturePrinted || w.participantName}`, m, y);

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Generated ${new Date().toLocaleString()} — Blue Skies Boat Rentals`, m, 285);
    doc.setTextColor(0);
  });
  return doc;
}

export function downloadAllWaiversPdf(waivers: any[], booking: any) {
  if (!waivers.length) return;
  renderWaivers(waivers, booking).save(`waivers-${booking.bookingRef}-all.pdf`);
}

export function renderInspection(inspection: any, photos: any[], booking: any, target?: jsPDF) {
  const doc = target ?? new jsPDF();
  if (target) doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const m = 20;
  const cw = pageWidth - m * 2;
  let y = 20;

  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Blue Skies Boat Rentals', m, y); y += 8;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text('Islamorada, Florida Keys | blueskiesboatrentals.com | (754) 254-2293', m, y); y += 4;
  doc.setDrawColor(200); doc.line(m, y, pageWidth - m, y); y += 10;
  doc.setTextColor(0);

  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Signed Conditional Inspection', m, y); y += 10;

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('Trip Details', m, y); y += 6;
  doc.setFont('helvetica', 'normal');
  const details: [string, string][] = [
    ['Booking Ref:', booking.bookingRef],
    ['Renter:', booking.customerName],
    ['Charter Date:', booking.charterDate + (booking.endDate && booking.endDate !== booking.charterDate ? ` → ${booking.endDate}` : '')],
    ['Operator:', inspection.operatorName || booking.customerName],
    ['Starting boat hour-meter reading:', inspection.startMeterHours == null ? 'Not recorded' : `${inspection.startMeterHours} hours`],
    ['Signed At:', inspection.signedAt?.replace('T', ' ').slice(0, 19) || 'Unknown'],
  ];
  details.forEach(([l, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(l, m, y);
    doc.setFont('helvetica', 'normal'); doc.text(v, l.startsWith('Starting boat') ? m + 65 : m + 30, y); y += 5;
  });
  y += 5;

  // Checklist
  const checklist = inspection.checklist ? JSON.parse(inspection.checklist) : [];
  if (checklist.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Vessel Condition Checklist', m, y); y += 7;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    checklist.forEach((item: any) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const icon = item.condition === 'good' ? '✓' : '✗';
      const color = item.condition === 'good' ? [0, 128, 0] : [200, 0, 0];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(icon, m, y);
      doc.setTextColor(0);
      doc.text(`${item.area}${item.notes ? ` — ${item.notes}` : ''}`, m + 8, y);
      y += 5;
    });
    y += 5;
  }

  // Damage notes
  if (inspection.damageNotes) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Damage Notes', m, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const lines = doc.splitTextToSize(inspection.damageNotes, cw);
    doc.text(lines, m, y); y += lines.length * 4 + 5;
  }

  // Diagrams
  if (inspection.hullDiagram) {
    if (y > 180) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Hull Diagram', m, y); y += 4;
    try { doc.addImage(inspection.hullDiagram, 'PNG', m, y, cw * 0.6, 60); y += 65; } catch {}
  }
  if (inspection.outboardDiagram) {
    if (y > 180) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Outboard Diagram', m, y); y += 4;
    try { doc.addImage(inspection.outboardDiagram, 'PNG', m, y, cw * 0.6, 60); y += 65; } catch {}
  }

  // Signature
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setDrawColor(200); doc.line(m, y, pageWidth - m, y); y += 8;
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('Signature', m, y); y += 7;
  if (inspection.signatureData) {
    try { doc.addImage(inspection.signatureData, 'PNG', m, y, 60, 25); y += 28; } catch {}
  }
  doc.setFont('helvetica', 'normal');
  doc.text(`Printed name: ${inspection.signaturePrinted || ''}`, m, y); y += 7;
  if (inspection.acknowledged) {
    doc.text('Renter acknowledged vessel condition and accepted responsibility.', m, y);
  }

  // Photos on separate pages
  photos.forEach((p, i) => {
    doc.addPage();
    let py = 20;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`Inspection Photo ${i + 1}${p.area ? ` — ${p.area}` : ''}`, m, py); py += 8;
    try { doc.addImage(p.imageData, 'JPEG', m, py, cw, 0); } catch {}
  });

  if (!target) {
    doc.setFontSize(8); doc.setTextColor(150);
    const pc = doc.internal.pages.length - 1;
    for (let p = 1; p <= pc; p++) { doc.setPage(p); doc.text(`Blue Skies Charter — Inspection ${booking.bookingRef} — page ${p} of ${pc}`, m, 288); }
  }
  return doc;
}

export function downloadInspectionPdf(inspection: any, photos: any[], booking: any) {
  renderInspection(inspection, photos, booking).save(`inspection-${booking.bookingRef}.pdf`);
}

// ---------------------------------------------------------------------------
// Closeout packet — the whole paper trail for one trip in a single PDF:
// summary + agreement + waivers + ID photos + inspection + what we emailed.
// Built for records: an insurance claim, a deposit dispute, a chargeback, or
// the accountant at year end. Sections reuse the same renderers as the
// individual downloads, so the documents stay identical.
// ---------------------------------------------------------------------------

const money = (n: number | null | undefined) =>
  typeof n === 'number' ? `$${n.toFixed(2)}` : '—';

// Database values are snake_case ('partially_refunded'); a records document
// should read in plain English.
const humanize = (v: string | null | undefined) =>
  v ? String(v).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : '—';

const stamp = (s: string | null | undefined) =>
  s ? String(s).replace('T', ' ').slice(0, 19) : '—';

// Data-URL images can be PNG or JPEG; jsPDF needs to be told which.
const imgFormat = (src: string) => (/^data:image\/png/i.test(src) ? 'PNG' : 'JPEG');

export type CloseoutInput = {
  booking: any;
  boatName?: string;
  readiness?: any;
  waivers?: any[];
  inspection?: any;
  inspectionPhotos?: any[];
  emails?: any[];
};

function renderCover(doc: jsPDF, input: CloseoutInput) {
  const { booking, boatName, readiness, waivers = [], inspection, emails = [] } = input;
  const pageWidth = doc.internal.pageSize.getWidth();
  const m = 20;
  const cw = pageWidth - m * 2;
  let y = 20;

  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Blue Skies Boat Rentals', m, y); y += 8;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text('Islamorada, Florida Keys | blueskiesboatrentals.com | (754) 254-2293', m, y); y += 4;
  doc.setDrawColor(200); doc.line(m, y, pageWidth - m, y); y += 10;
  doc.setTextColor(0);

  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.text(`Trip Closeout Packet — ${booking.bookingRef}`, m, y); y += 6;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, m, y); y += 8;
  doc.setTextColor(0);

  const block = (title: string, rows: [string, string][]) => {
    if (y + rows.length * 5 + 12 > 275) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(title, m, y); y += 6;
    doc.setFontSize(9.5);
    rows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold'); doc.text(label, m, y);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(val ?? '—', cw - 45), m + 45, y);
      y += 5;
    });
    y += 4;
  };

  const dates = booking.endDate && booking.endDate !== booking.charterDate
    ? `${booking.charterDate} → ${booking.endDate}`
    : booking.charterDate;

  block('Trip', [
    ['Booking Ref:', booking.bookingRef],
    ['Renter:', booking.customerName],
    ['Contact:', [booking.customerEmail, booking.customerPhone].filter(Boolean).join('  ·  ')],
    ['Vessel:', boatName ?? '—'],
    ['Date(s):', dates],
    ['Time:', [booking.pickupTime, booking.dropoffTime].filter(Boolean).join(' – ') || '—'],
    ['Guests:', String(booking.guestCount ?? '—')],
    ['Departure:', booking.departurePort || '—'],
    ['Charter Type:', humanize(booking.charterType)],
    ['Captain:', booking.captainRequested ? 'Yes' : 'Bareboat (no captain)'],
    ['Booked Via:', humanize(booking.source || 'direct')],
    ['Status:', humanize(booking.status)],
  ]);

  block('Payment', [
    ['Subtotal:', money(booking.subtotal)],
    ['Captain Fee:', money(booking.captainFee)],
    ['Tax:', money(booking.tax)],
    ['Total:', money(booking.total)],
    ['Payment Status:', humanize(booking.paymentStatus)],
  ]);

  const depositRows: [string, string][] = [
    ['Deposit Amount:', money(booking.depositAmount)],
    ['Deposit Status:', humanize(booking.depositStatus || 'none')],
    ['Paid At:', stamp(booking.depositPaidAt)],
    ['Refunded:', money(booking.depositRefundedAmount)],
  ];
  if (booking.depositDeductionsNote) depositRows.push(['Deductions:', booking.depositDeductionsNote]);
  block('Security Deposit', depositRows);

  // The record checklist: what is on file and, just as importantly, what is not.
  const waiversRequired = readiness?.waivers?.required ?? booking.guestCount ?? 0;
  const waiversSigned = readiness?.waivers?.signed ?? waivers.length;
  const checks: [string, boolean, string][] = [
    ['Rental agreement signed', !!booking.agreementSignedAt, stamp(booking.agreementSignedAt)],
    ['Photo ID — front', !!readiness?.id?.front, readiness?.id?.front ? 'on file' : 'not uploaded'],
    ['Photo ID — back', !!readiness?.id?.back, readiness?.id?.back ? 'on file' : 'not uploaded'],
    ['Crew waivers', waiversRequired > 0 && waiversSigned >= waiversRequired, `${waiversSigned} of ${waiversRequired} signed`],
    ['Vessel inspection', !!inspection?.signedAt, inspection?.signedAt ? stamp(inspection.signedAt) : 'not signed'],
    ['Deposit settled', ['refunded', 'partially_refunded'].includes(booking.depositStatus), humanize(booking.depositStatus || 'none')],
  ];

  if (y + checks.length * 5 + 20 > 275) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Records on File', m, y); y += 6;
  doc.setFontSize(9.5);
  checks.forEach(([label, ok, note]) => {
    doc.setTextColor(ok ? 0 : 200, ok ? 128 : 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(ok ? 'ON FILE' : 'MISSING', m, y);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(label, m + 22, y);
    doc.setTextColor(120);
    doc.text(note, m + 80, y);
    doc.setTextColor(0);
    y += 5;
  });
  y += 3;

  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  if (missing.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(200, 0, 0);
    const lines = doc.splitTextToSize(`Missing from this packet: ${missing.join(', ')}.`, cw);
    doc.text(lines, m, y); y += lines.length * 4.5 + 3;
    doc.setTextColor(0);
  }
  if (inspection?.damageNotes) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('Damage noted at inspection — see inspection section.', m, y); y += 6;
  }

  // Contents, so a reader knows what should be in here.
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Contents', m, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  [
    'Signed bareboat rental agreement',
    waivers.length ? `Signed liability waivers (${waivers.length})` : 'Signed liability waivers — none on file',
    readiness?.id?.front || readiness?.id?.back ? 'Photo ID' : 'Photo ID — none on file',
    inspection ? 'Signed vessel inspection' : 'Vessel inspection — none on file',
    emails.length ? `Email record (${emails.length} sent)` : 'Email record — none logged',
  ].forEach(line => { doc.text(`•  ${line}`, m, y); y += 5; });
}

function renderIdPhotos(doc: jsPDF, booking: any, readiness: any) {
  const sides: [string, string | null | undefined][] = [
    ['Photo ID — Front', readiness?.id?.front],
    ['Photo ID — Back', readiness?.id?.back],
  ];
  const pageWidth = doc.internal.pageSize.getWidth();
  const m = 20;
  const cw = pageWidth - m * 2;

  sides.forEach(([title, src]) => {
    if (!src) return;
    doc.addPage();
    let y = 20;
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text(title, m, y); y += 6;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
    doc.text(`${booking.customerName} — uploaded ${stamp(readiness?.id?.at)}`, m, y); y += 6;
    doc.setTextColor(0);
    // height 0 lets jsPDF preserve the aspect ratio.
    try { doc.addImage(src, imgFormat(src), m, y, cw, 0); } catch {
      doc.setTextColor(200, 0, 0);
      doc.text('Image could not be rendered.', m, y + 6);
      doc.setTextColor(0);
    }
  });
}

function renderEmailLog(doc: jsPDF, booking: any, emails: any[]) {
  if (!emails.length) return;
  const pageWidth = doc.internal.pageSize.getWidth();
  const m = 20;
  const cw = pageWidth - m * 2;
  doc.addPage();
  let y = 20;

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('Email Record', m, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
  doc.text(`Every message sent for booking ${booking.bookingRef}.`, m, y); y += 7;
  doc.setTextColor(0);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('Sent', m, y); doc.text('Type', m + 34, y); doc.text('Subject', m + 66, y);
  doc.text('Status', pageWidth - m - 14, y);
  y += 3;
  doc.setDrawColor(210); doc.line(m, y, pageWidth - m, y); y += 4;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  emails.forEach(e => {
    if (y > 275) {
      doc.addPage(); y = 20;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    }
    const subject = doc.splitTextToSize(String(e.subject ?? ''), cw - 60)[0] ?? '';
    doc.text(stamp(e.createdAt).slice(0, 16), m, y);
    doc.text(humanize(e.type), m + 34, y);
    doc.text(subject, m + 66, y);
    if (e.status !== 'sent') doc.setTextColor(200, 0, 0);
    doc.text(humanize(e.status), pageWidth - m - 14, y);
    doc.setTextColor(0);
    y += 4.5;
  });
}

export function buildCloseoutPacket(input: CloseoutInput): jsPDF {
  const { booking, readiness, waivers = [], inspection, inspectionPhotos = [], emails = [] } = input;
  const doc = new jsPDF();

  renderCover(doc, input);
  renderAgreement(booking, doc);
  if (waivers.length) renderWaivers(waivers, booking, doc);
  renderIdPhotos(doc, booking, readiness);
  if (inspection) renderInspection(inspection, inspectionPhotos, booking, doc);
  renderEmailLog(doc, booking, emails);

  // One footer across the whole packet, so a loose page can be traced back.
  const pageCount = doc.getNumberOfPages();
  const generated = new Date().toLocaleDateString();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Blue Skies Charter LLC — Closeout Packet ${booking.bookingRef} — page ${p} of ${pageCount} — generated ${generated}`,
      20, 293,
    );
    doc.setTextColor(0);
  }
  return doc;
}

export function downloadCloseoutPacket(input: CloseoutInput) {
  const name = (input.booking.customerName || 'renter').replace(/\s+/g, '-');
  buildCloseoutPacket(input).save(`closeout-${input.booking.bookingRef}-${name}.pdf`);
}
