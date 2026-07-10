import { useState, useEffect, useRef } from 'react';
import { trpc } from '../../lib/trpc';
import { Search, X, Phone, Mail, MessageCircle, Plus, Upload, Check, List, CalendarDays, ChevronLeft, ChevronRight, Trash2, FileSignature, Download, AlertTriangle, DollarSign, Copy, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { getTier, getDiscount } from '../../../lib/loyalty';
import jsPDF from 'jspdf';
import { RENTAL_AGREEMENT_SECTIONS, AGREEMENT_INTRO, AGREEMENT_ACKNOWLEDGMENT } from '../../lib/rentalAgreementText';
import { resizeImage } from '../../lib/resizeImage';

// Compact Copy / Text / Email resend controls for a renter-facing link.
function ResendLinks({ url, phone, email, name, label }: { url: string; phone?: string | null; email?: string | null; name?: string | null; label: string }) {
  const msg = `Hi ${name?.split(' ')[0] ?? 'there'}, here's your Blue Skies ${label} link: ${url}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }} title="Copy link" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">{copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}</button>
      {phone && <a href={`sms:${phone}&body=${encodeURIComponent(msg)}`} title="Text link" className="p-1.5 rounded-lg text-green-500 hover:bg-green-50"><MessageCircle className="w-3.5 h-3.5" /></a>}
      {email && <a href={`mailto:${email}?subject=${encodeURIComponent(`Your Blue Skies ${label}`)}&body=${encodeURIComponent(msg)}`} title="Email link" className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-50"><Mail className="w-3.5 h-3.5" /></a>}
    </div>
  );
}

// Builds a self-contained PDF of the signed bareboat rental agreement: the full
// terms (shared with the public /rental-agreement page) plus this booking's
// details and the renter's captured signature. Mirrors generateWaiverPdf in
// AdminWaivers so the two documents look like one family.
function generateAgreementPdf(booking: any) {
  const doc = new jsPDF();
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
  ];
  details.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val ?? ''), margin + 30, y);
    y += 5;
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
  RENTAL_AGREEMENT_SECTIONS.forEach(section => {
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

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Blue Skies Charter LLC — Rental Agreement ${booking.bookingRef} — page ${p} of ${pageCount}`, margin, 288);
  }

  return doc;
}

function downloadAgreementPdf(booking: any) {
  const doc = generateAgreementPdf(booking);
  doc.save(`rental-agreement-${booking.bookingRef}-${(booking.customerName || 'renter').replace(/\s+/g, '-')}.pdf`);
}

// ✓/⚠ pre-boarding readiness dot for a booking list row. Only shows for
// upcoming, non-cancelled trips (readiness is moot for past/completed ones).
function ReadinessDot({ b, r }: { b: any; r?: { agreement: boolean; id: boolean; waivers: boolean; inspection: boolean; deposit: boolean } }) {
  const lastDay = b.endDate || b.charterDate;
  const today = new Date().toISOString().slice(0, 10);
  const relevant = b.status !== 'cancelled' && b.status !== 'completed' && lastDay >= today;
  if (!relevant || !r) return null;
  const labels: [keyof typeof r, string][] = [['agreement', 'agreement'], ['id', 'ID'], ['waivers', 'waivers'], ['inspection', 'inspection'], ['deposit', 'deposit']];
  const missing = labels.filter(([k]) => !r[k]).map(([, l]) => l);
  const ready = missing.length === 0;
  return (
    <span
      title={ready ? 'Ready to board ✓' : `Missing: ${missing.join(', ')}`}
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${ready ? 'bg-green-500' : 'bg-amber-400'}`}
    />
  );
}

// Maps the "Booked via" dropdown labels to the bookings.source enum.
const SOURCE_MAP: Record<string, 'direct' | 'website' | 'boatsetter' | 'getmyboat' | 'phone' | 'walkin' | 'other'> = {
  '': 'direct',
  'Boatsetter': 'boatsetter',
  'GetMyBoat': 'getmyboat',
  'Phone': 'phone',
  'Walk-in': 'walkin',
  'Other': 'other',
};

// Quote-aware CSV splitter — handles commas inside "quoted, fields"
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').trim().split('\n');
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').replace(/^["']|["']$/g, ''); });
    return row;
  }).filter(row => Object.values(row).some(v => v));
}

// Parse "$ 1,450.00" or "1,450" or "1450.00" into a number
function parseMoney(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[$,\s]/g, '').replace(/^-$/, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Parse "7/31/2025" or "2025-07-31" → ISO "2025-07-31"
function toISODate(s: string): string {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, mo, d, y] = m;
    const yyyy = y.length === 2 ? `20${y}` : y;
    return `${yyyy}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}

function normalizeStatus(s: string): 'completed' | 'cancelled' | 'pending' | undefined {
  const t = s.toLowerCase().trim();
  if (!t) return undefined;
  if (t.includes('cancel')) return 'cancelled';
  if (t.includes('pend')) return 'pending';
  if (t.includes('complete') || t.includes('paid') || t.includes('confirm')) return 'completed';
  return undefined;
}

// Try to extract an end date from a freeform description like:
//   "Sharon O Power - Boat Rental - July 31 to August 16"
//   "Bryan Stone - Boat Rental - Dec 6 10:00am to 6:00PM"  (same-day, just times)
//   "Jared Proffitt - Boat Rental - Dec 4 8:00am to Dec 5 6:00pm"
// Returns ISO date or undefined when it's clearly a single-day booking.
function extractEndDate(action: string, startDateISO: string): string | undefined {
  if (!action || !startDateISO || !/^\d{4}-\d{2}-\d{2}/.test(startDateISO)) return undefined;
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];

  // Find the LAST "to" — handles "Boat Rental ... 8:00am to Dec 5 6:00pm"
  const parts = action.split(/\s+to\s+/i);
  if (parts.length < 2) return undefined;
  const endPart = parts[parts.length - 1].trim();

  // If end starts with a time (no month name), it's a same-day rental like "6:00PM"
  if (/^\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(endPart)) return undefined;

  const m = endPart.match(/^([A-Za-z]{3,})\s+(\d{1,2})/);
  if (!m) return undefined;

  const monthIdx = months.findIndex(n => n.startsWith(m[1].toLowerCase().slice(0, 3)));
  if (monthIdx === -1) return undefined;

  const day = parseInt(m[2], 10);
  if (day < 1 || day > 31) return undefined;

  // Inherit year from start; bump if end-month wraps past start-month (Dec → Jan)
  const startYear = parseInt(startDateISO.slice(0, 4), 10);
  const startMonth0 = parseInt(startDateISO.slice(5, 7), 10) - 1;
  const year = monthIdx < startMonth0 ? startYear + 1 : startYear;

  const endISO = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  // Only treat as multi-day if end > start
  return endISO > startDateISO ? endISO : undefined;
}

const platformColors: Record<string, string> = {
  Boatsetter: 'bg-orange-100 text-orange-700',
  GetMyBoat: 'bg-blue-100 text-blue-700',
  Internal: 'bg-slate-100 text-slate-600',
  Direct: 'bg-green-100 text-green-700',
};

function getPlatform(specialRequests: string | null | undefined): string {
  if (specialRequests && specialRequests.startsWith('Via ')) {
    return specialRequests.replace('Via ', '');
  }
  return 'Direct';
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const paymentColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-red-100 text-red-700',
};

function tripDays(b: { duration: string; charterDate: string; endDate?: string | null }): number {
  if (b.endDate && b.endDate > b.charterDate) {
    const start = new Date(b.charterDate).getTime();
    const end = new Date(b.endDate).getTime();
    return Math.max(1, Math.round((end - start) / 86400000) + 1);
  }
  if (b.duration === 'half_day_am' || b.duration === 'half_day_pm') return 0.5;
  return 1;
}

export default function AdminBookings() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '',
    boatId: 0, charterDate: '', endDate: '', duration: 'full_day',
    pickupTime: '08:00', dropoffTime: '17:00',
    charterType: 'cruising', guestCount: 4, captainRequested: false,
    departurePort: 'Islamorada', specialRequests: '',
    source: '',
    customPrice: '' as string,
    applyLoyaltyDiscount: true,
  });
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: bookings, refetch } = trpc.bookings.list.useQuery();
  const { data: readinessMap, refetch: refetchReadinessList } = trpc.bookings.readinessList.useQuery();
  const { data: captains } = trpc.captains.list.useQuery();
  const { data: boats } = trpc.boats.list.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();
  const updateStatus = trpc.bookings.updateStatus.useMutation({ onSuccess: () => refetch() });
  const assignCaptain = trpc.bookings.assignCaptain.useMutation({ onSuccess: () => refetch() });
  const updateBooking = trpc.bookings.update.useMutation({
    onSuccess: () => { refetch(); setBookingDirty(false); },
  });
  const deleteBooking = trpc.bookings.delete.useMutation({
    onSuccess: () => { refetch(); setSelectedBooking(null); },
  });

  // Security deposit. depositLink holds the freshly-minted Stripe URL to text the
  // renter (not persisted — regenerate for a new one). We patch selectedBooking
  // optimistically so the drawer reflects the new status without a round-trip.
  const [depositLink, setDepositLink] = useState<string | null>(null);
  const [ded, setDed] = useState({ fuel: '', damage: '', misc: '' });
  // Reset the transient deposit UI only when a DIFFERENT booking is opened
  // (keyed on id, so optimistic same-booking patches below don't wipe the link).
  useEffect(() => { setDepositLink(null); setDed({ fuel: '', damage: '', misc: '' }); setShowId(false); }, [selectedBooking?.id]);
  const requestDeposit = trpc.bookings.requestDeposit.useMutation({
    onSuccess: (r) => { setDepositLink(r.checkoutUrl ?? null); refetch(); setSelectedBooking((b: any) => b ? { ...b, depositStatus: 'requested', depositAmount: r.amount } : b); },
  });
  const markDepositPaid = trpc.bookings.markDepositPaid.useMutation({
    onSuccess: () => { refetch(); refetchReadinessList(); setSelectedBooking((b: any) => b ? { ...b, depositStatus: 'paid', depositPaidAt: new Date().toISOString() } : b); },
  });
  const settleDeposit = trpc.bookings.settleDeposit.useMutation({
    onSuccess: (r) => { refetch(); readinessQuery.refetch(); setDed({ fuel: '', damage: '', misc: '' }); setSelectedBooking((b: any) => b ? { ...b, depositStatus: r.deductions > 0 ? 'partially_refunded' : 'refunded', depositRefundedAmount: r.refundAmount } : b); },
  });

  // Trip Readiness — aggregated pre-boarding status for the open booking.
  const readinessQuery = trpc.bookings.readiness.useQuery(selectedBooking?.bookingRef ?? '', { enabled: !!selectedBooking?.bookingRef });
  const readiness = readinessQuery.data;
  const [showId, setShowId] = useState(false);
  const adminIdInputRef = useRef<HTMLInputElement>(null);
  const uploadIdMut = trpc.bookings.uploadId.useMutation({
    onSuccess: () => { readinessQuery.refetch(); refetchReadinessList(); refetch(); },
  });
  const handleAdminIdUpload = async (files: FileList | null) => {
    if (!files || !files.length || !selectedBooking) return;
    try {
      const front = await resizeImage(files[0], 1600, 0.72);
      const back = files[1] ? await resizeImage(files[1], 1600, 0.72) : undefined;
      uploadIdMut.mutate({ bookingRef: selectedBooking.bookingRef, idFront: front, idBack: back });
    } catch { /* ignore bad image */ }
  };

  const [bookingEdit, setBookingEdit] = useState<any>({});
  const [bookingDirty, setBookingDirty] = useState(false);
  useEffect(() => {
    if (selectedBooking) {
      setBookingEdit({
        charterDate: selectedBooking.charterDate ?? '',
        endDate: selectedBooking.endDate ?? '',
        pickupTime: selectedBooking.pickupTime ?? '',
        dropoffTime: selectedBooking.dropoffTime ?? '',
        duration: selectedBooking.duration ?? 'full_day',
        charterType: selectedBooking.charterType ?? 'cruising',
        guestCount: selectedBooking.guestCount ?? 1,
        departurePort: selectedBooking.departurePort ?? '',
        boatId: selectedBooking.boatId ?? 0,
        subtotal: selectedBooking.subtotal ?? 0,
        total: selectedBooking.total ?? 0,
        specialRequests: selectedBooking.specialRequests ?? '',
      });
      setBookingDirty(false);
    }
  }, [selectedBooking]);
  const patchBooking = <K extends string>(k: K, v: any) => {
    setBookingEdit((f: any) => ({ ...f, [k]: v }));
    setBookingDirty(true);
  };
  const createBooking = trpc.bookings.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); setAddForm({ customerName: '', customerEmail: '', customerPhone: '', boatId: 0, charterDate: '', endDate: '', duration: 'full_day', pickupTime: '08:00', dropoffTime: '17:00', charterType: 'cruising', guestCount: 4, captainRequested: false, departurePort: 'Islamorada', specialRequests: '', source: '', customPrice: '', applyLoyaltyDiscount: true }); },
  });
  const importBookings = trpc.bookings.importBookings.useMutation({
    onSuccess: (result) => { setImportResult(result); setImportPreview(null); refetch(); },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      const mapped = rows.map(row => {
        const charterDate = toISODate(row.date || row.charter_date || '');
        const description = row.description || row.action || '';
        return {
          customerName: row.name || row.customer_name || '',
          customerEmail: row.email || row.customer_email || '',
          customerPhone: row.phone || row.customer_phone || row.phone_number || '',
          charterDate,
          endDate: extractEndDate(description, charterDate),
          total: parseMoney(row.credit || row.amount || row.total || row.total_spent || ''),
          platform: row.platform || row.source || '',
          description,
          ref: row.ref || row.reference || row.ref_no_source || row.ref_no || row.booking_ref || '',
          status: normalizeStatus(row.status || row.l || ''),
        };
      }).filter(r => r.customerName && r.charterDate && r.total > 0);
      setImportPreview(mapped);
    };
    reader.readAsText(file);
  };

  const [sortBy, setSortBy] = useState<'createdAt' | 'charterDate' | 'total' | 'customerName' | 'status'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir(col === 'customerName' ? 'asc' : 'desc'); }
  };
  const sortArrow = (col: typeof sortBy) => sortBy === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const [platformFilter, setPlatformFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState(new Date());
  const today = new Date().toISOString().slice(0, 10);

  const filtered = bookings?.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (dateFilter === 'upcoming') {
      const lastDay = b.endDate ?? b.charterDate;
      if (lastDay < today) return false;
    } else if (dateFilter === 'past') {
      const lastDay = b.endDate ?? b.charterDate;
      if (lastDay >= today) return false;
    }
    if (platformFilter !== 'all' && getPlatform(b.specialRequests) !== platformFilter) return false;
    if (search && !b.customerName.toLowerCase().includes(search.toLowerCase()) && !b.bookingRef.toLowerCase().includes(search.toLowerCase()) && !b.customerEmail.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  })?.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'createdAt') return dir * (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    if (sortBy === 'charterDate') return dir * a.charterDate.localeCompare(b.charterDate);
    if (sortBy === 'total') return dir * (a.total - b.total);
    if (sortBy === 'customerName') return dir * a.customerName.localeCompare(b.customerName);
    if (sortBy === 'status') return dir * a.status.localeCompare(b.status);
    return 0;
  });

  const getBoatName = (id: number) => boats?.find(b => b.id === id)?.name ?? 'Unknown';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Bookings</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowImport(true); setImportResult(null); setImportPreview(null); }} className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={() => { setShowAdd(true); if (boats?.length) setAddForm(f => ({ ...f, boatId: boats.filter(b => b.status === 'active')[0]?.id || 0 })); }} className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Booking
          </button>
        </div>
      </div>

      {/* Add Booking Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-slate-900">Add Manual Booking</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                  <input value={addForm.customerName} onChange={e => setAddForm(f => ({ ...f, customerName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input type="email" value={addForm.customerEmail} onChange={e => setAddForm(f => ({ ...f, customerEmail: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input value={addForm.customerPhone} onChange={e => setAddForm(f => ({ ...f, customerPhone: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Boat *</label>
                  <select value={addForm.boatId} onChange={e => setAddForm(f => ({ ...f, boatId: Number(e.target.value) }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                    {boats?.filter(b => b.status === 'active').map(b => <option key={b.id} value={b.id}>{b.name} — {b.model}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {(addForm.duration === 'multi_day' || addForm.duration === 'custom') ? 'Start Date *' : 'Date *'}
                  </label>
                  <input type="date" value={addForm.charterDate} onChange={e => setAddForm(f => ({ ...f, charterDate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                  <select value={addForm.duration} onChange={e => setAddForm(f => ({ ...f, duration: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="half_day_am">Half Day — Morning</option>
                    <option value="half_day_pm">Half Day — Afternoon</option>
                    <option value="full_day">Full Day</option>
                    <option value="multi_day">Multi-Day</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              {/* End date for any multi-day span — Multi-Day, or Custom used as a range */}
              {(addForm.duration === 'multi_day' || addForm.duration === 'custom') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date {addForm.duration === 'multi_day' ? '*' : <span className="text-slate-400 font-normal">(optional)</span>}</label>
                    <input type="date" value={addForm.endDate} onChange={e => setAddForm(f => ({ ...f, endDate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Time</label>
                  <input type="time" value={addForm.pickupTime} onChange={e => setAddForm(f => ({ ...f, pickupTime: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Drop-off Time</label>
                  <input type="time" value={addForm.dropoffTime} onChange={e => setAddForm(f => ({ ...f, dropoffTime: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Negotiated Price <span className="text-slate-400 font-normal">(leave blank to use boat's standard rate)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={(() => {
                      const boat = boats?.find(b => b.id === addForm.boatId);
                      if (!boat) return '';
                      const base = addForm.duration === 'full_day' || addForm.duration === 'multi_day' ? boat.priceFullDay : boat.priceHalfDay;
                      return base.toString();
                    })()}
                    value={addForm.customPrice}
                    onChange={e => setAddForm(f => ({ ...f, customPrice: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Enter the subtotal before tax. Tax (7.5%) and captain fee will be added automatically.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Charter Type</label>
                  <select value={addForm.charterType} onChange={e => setAddForm(f => ({ ...f, charterType: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="cruising">Cruising</option>
                    <option value="fishing">Fishing</option>
                    <option value="snorkeling">Snorkeling</option>
                    <option value="sandbar">Sandbar</option>
                    <option value="sunset">Sunset</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Guests</label>
                  <input type="number" min={1} max={10} value={addForm.guestCount} onChange={e => setAddForm(f => ({ ...f, guestCount: parseInt(e.target.value) || 1 }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={addForm.captainRequested} onChange={e => setAddForm(f => ({ ...f, captainRequested: e.target.checked }))} className="w-4 h-4 rounded text-sky-500" />
                    <span className="text-sm text-slate-700">Captain</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Booked via</label>
                <select value={addForm.source} onChange={e => setAddForm(f => ({ ...f, source: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="">Direct / Website</option>
                  <option value="Boatsetter">Boatsetter</option>
                  <option value="GetMyBoat">GetMyBoat</option>
                  <option value="Phone">Phone</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Other">Other</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">For external bookings (Boatsetter/GetMyBoat), then send the client their agreement + waiver link from the Waivers tab.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Special Requests / Notes</label>
                <textarea value={addForm.specialRequests} onChange={e => setAddForm(f => ({ ...f, specialRequests: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              {(() => {
                const matchedUser = allUsers?.find(u => u.email?.toLowerCase() === addForm.customerEmail.toLowerCase());
                if (!matchedUser) return null;
                const discount = getDiscount(matchedUser.loyaltyPoints);
                const tier = getTier(matchedUser.loyaltyPoints);
                if (discount === 0) {
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600">
                      Existing customer: {matchedUser.name} — {tier.name} tier ({matchedUser.loyaltyPoints.toLocaleString()} lifetime spend, no discount yet).
                    </div>
                  );
                }
                return (
                  <label className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={addForm.applyLoyaltyDiscount} onChange={e => setAddForm(f => ({ ...f, applyLoyaltyDiscount: e.target.checked }))} className="w-4 h-4 mt-0.5 rounded text-sky-600" />
                    <div className="text-sm">
                      <p className="font-medium text-sky-900">Apply {Math.round(discount * 100)}% {tier.name} loyalty discount</p>
                      <p className="text-xs text-sky-700">{matchedUser.name} has ${matchedUser.loyaltyPoints.toLocaleString()} lifetime spend.</p>
                    </div>
                  </label>
                );
              })()}
              <button
                onClick={() => createBooking.mutate({
                  customerName: addForm.customerName,
                  customerEmail: addForm.customerEmail,
                  customerPhone: addForm.customerPhone || undefined,
                  boatId: addForm.boatId,
                  charterDate: addForm.charterDate,
                  endDate: (addForm.duration === 'multi_day' || addForm.duration === 'custom') && addForm.endDate ? addForm.endDate : undefined,
                  pickupTime: addForm.pickupTime || undefined,
                  dropoffTime: addForm.dropoffTime || undefined,
                  duration: addForm.duration as any,
                  charterType: addForm.charterType as any,
                  guestCount: addForm.guestCount,
                  departurePort: addForm.departurePort,
                  specialRequests: [addForm.source ? `Via ${addForm.source}` : '', addForm.specialRequests].filter(Boolean).join('\n') || undefined,
                  source: SOURCE_MAP[addForm.source] ?? 'direct',
                  captainRequested: addForm.captainRequested,
                  customPrice: addForm.customPrice ? parseFloat(addForm.customPrice) : undefined,
                  skipPayment: true,
                  applyLoyaltyDiscount: addForm.applyLoyaltyDiscount,
                })}
                disabled={!addForm.customerName || !addForm.customerEmail || !addForm.charterDate || !addForm.boatId || (addForm.duration === 'multi_day' && !addForm.endDate) || createBooking.isPending}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                {createBooking.isPending ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Bookings Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowImport(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-slate-900">Import Booking History</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6">
              {importResult ? (
                <div className="text-center py-8">
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Import Complete!</h3>
                  <p className="text-slate-500">{importResult.imported} bookings imported out of {importResult.total}.</p>
                  <button onClick={() => setShowImport(false)} className="mt-6 bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium">Done</button>
                </div>
              ) : !importPreview ? (
                <div>
                  <div className="bg-slate-50 rounded-xl p-6 text-center mb-6">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium mb-1">Upload booking history CSV</p>
                    <p className="text-slate-400 text-sm mb-4">CSV with columns like Date, Name, Email, Phone, Credit (or Amount), Platform, Ref No./Source, Status. Column names are flexible.</p>
                    <input ref={fileRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
                      Choose CSV File
                    </button>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 text-sm font-medium mb-2">Expected CSV format:</p>
                    <code className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1 block overflow-x-auto">
                      date,name,email,phone,amount,platform,description,ref<br/>
                      2025-04-14,Matthew Forman,forman@gmail.com,516-428-0160,750,Internal,Full day rental,Zelle
                    </code>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-slate-700 font-medium mb-4">Preview — {importPreview.length} bookings found</p>
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Date</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Customer</th>
                          <th className="text-right px-3 py-2 font-medium text-slate-600">Amount</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Platform</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((b, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              {b.charterDate}
                              {b.endDate && <span className="block text-slate-400 text-xs">→ {b.endDate}</span>}
                            </td>
                            <td className="px-3 py-2">
                              <p>{b.customerName}</p>
                              {b.customerEmail && <p className="text-slate-400 text-xs">{b.customerEmail}</p>}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">${b.total.toLocaleString()}</td>
                            <td className="px-3 py-2 text-slate-500">{b.platform}</td>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>{b.status ?? 'completed'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-slate-400 text-xs mt-3">Cancelled rows are imported but won't count toward customer loyalty stats. Customer accounts and loyalty points are created/updated automatically. Re-uploads are safe — duplicates (same Ref No.) are skipped.</p>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setImportPreview(null); if (fileRef.current) fileRef.current.value = ''; }} className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium">Back</button>
                    <button onClick={() => importBookings.mutate(importPreview)} disabled={importBookings.isPending} className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
                      {importBookings.isPending ? 'Importing...' : `Import ${importPreview.length} Bookings`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by name, email, or ref..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
          </div>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Dates</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setView('list')} className={`px-3 py-2 text-sm flex items-center gap-1 ${view === 'list' ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <List className="w-4 h-4" /> List
            </button>
            <button onClick={() => setView('calendar')} className={`px-3 py-2 text-sm flex items-center gap-1 ${view === 'calendar' ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <CalendarDays className="w-4 h-4" /> Calendar
            </button>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Platforms</option>
            <option value="Boatsetter">Boatsetter</option>
            <option value="GetMyBoat">GetMyBoat</option>
            <option value="Internal">Internal</option>
            <option value="Direct">Direct</option>
          </select>
        </div>

        {view === 'list' && <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-sky-600 select-none" onClick={() => handleSort('createdAt')}>Booked{sortArrow('createdAt')}</th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-sky-600 select-none" onClick={() => handleSort('customerName')}>Customer{sortArrow('customerName')}</th>
                <th className="text-left px-4 py-3 font-medium">Boat</th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-sky-600 select-none" onClick={() => handleSort('charterDate')}>Trip Date{sortArrow('charterDate')}</th>
                <th className="text-center px-4 py-3 font-medium">Days</th>
                <th className="text-left px-4 py-3 font-medium">Platform</th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-sky-600 select-none" onClick={() => handleSort('total')}>Total{sortArrow('total')}</th>
                <th className="text-right px-4 py-3 font-medium">Avg/Day</th>
                <th className="text-left px-4 py-3 font-medium">Payment</th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-sky-600 select-none" onClick={() => handleSort('status')}>Status{sortArrow('status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(b => {
                const days = tripDays(b);
                const avgPerDay = days > 0 ? b.total / days : 0;
                return (
                <tr key={b.id} className="border-t border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <p>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}</p>
                      <p className="font-mono text-sky-600 text-[10px]">{b.bookingRef}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-1.5"><ReadinessDot b={b} r={readinessMap?.[b.bookingRef]} /></span>
                      <div>
                        <p className="font-medium text-sm">{b.customerName}</p>
                        <p className="text-slate-400 text-xs">{b.customerEmail}</p>
                        {b.customerPhone && <p className="text-slate-400 text-xs">{b.customerPhone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{getBoatName(b.boatId)}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(b.charterDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    {b.endDate && b.endDate !== b.charterDate && (
                      <span className="block text-slate-400 text-xs">→ {new Date(b.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">{days % 1 === 0 ? days : days.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    {(() => { const p = getPlatform(b.specialRequests); return (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${platformColors[p] || platformColors.Direct}`}>{p}</span>
                    ); })()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">${b.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-500">${avgPerDay.toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${paymentColors[b.paymentStatus]}`}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={b.status}
                      onChange={e => { e.stopPropagation(); updateStatus.mutate({ id: b.id, status: e.target.value as any }); }}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${statusColors[b.status]}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>}

        {view === 'calendar' && (() => {
          const y = calMonth.getFullYear();
          const m = calMonth.getMonth();
          const firstDow = new Date(y, m, 1).getDay();
          const daysInMonth = new Date(y, m + 1, 0).getDate();
          const monthLabel = calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          // Group bookings by date (every day in their span)
          const byDate: Record<string, typeof bookings extends (infer T)[] | undefined ? T[] : never[]> = {};
          (filtered ?? []).forEach(b => {
            if (b.status === 'cancelled') return;
            const start = new Date(b.charterDate);
            const end = new Date(b.endDate ?? b.charterDate);
            for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
              const ds = d.toISOString().slice(0, 10);
              (byDate[ds] ??= []).push(b);
            }
          });
          // Monthly revenue total
          const monthPrefix = `${y}-${String(m+1).padStart(2,'0')}`;
          const monthRevenue = (filtered ?? [])
            .filter(b => b.status !== 'cancelled' && b.paymentStatus === 'paid' && b.charterDate.startsWith(monthPrefix))
            .reduce((sum, b) => sum + b.total, 0);
          const monthPending = (filtered ?? [])
            .filter(b => b.status !== 'cancelled' && b.paymentStatus === 'pending' && b.charterDate.startsWith(monthPrefix))
            .reduce((sum, b) => sum + b.total, 0);
          const monthBookingCount = (filtered ?? [])
            .filter(b => b.status !== 'cancelled' && b.charterDate.startsWith(monthPrefix)).length;

          const cells: (number | null)[] = [];
          for (let i = 0; i < firstDow; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          const statusColor: Record<string, string> = {
            pending: 'bg-yellow-200 text-yellow-900',
            confirmed: 'bg-green-200 text-green-900',
            completed: 'bg-blue-200 text-blue-900',
            cancelled: 'bg-red-200 text-red-900',
          };
          return (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCalMonth(new Date(y, m - 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                <div className="text-center">
                  <h3 className="font-heading text-xl">{monthLabel}</h3>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <span className="text-sm font-semibold text-green-600">${monthRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    {monthPending > 0 && <span className="text-sm text-amber-500">${monthPending.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending</span>}
                    <span className="text-xs text-slate-400">{monthBookingCount} booking{monthBookingCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCalMonth(new Date())} className="text-xs px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg">Today</button>
                  <button onClick={() => setCalMonth(new Date(y, m + 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (d === null) return <div key={i} className="min-h-[100px]" />;
                  const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                  const items = byDate[ds] ?? [];
                  const isToday = ds === today;
                  return (
                    <div key={i} className={`min-h-[100px] border rounded-lg p-1.5 flex flex-col gap-1 ${isToday ? 'border-sky-400 bg-sky-50/40' : 'border-slate-100 bg-white'}`}>
                      <div className={`text-xs font-medium ${isToday ? 'text-sky-600' : 'text-slate-500'}`}>{d}</div>
                      {items.slice(0, 3).map(b => (
                        <button
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          title={`${b.customerName} • $${b.total.toFixed(0)} • ${b.status}`}
                          className={`${statusColor[b.status]} rounded px-1 py-0.5 text-[10px] text-left truncate hover:opacity-80`}
                        >
                          {b.customerName.split(' ')[0]}
                        </button>
                      ))}
                      {items.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{items.length - 3} more</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-slate-500">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200"></span>Confirmed</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200"></span>Pending</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200"></span>Completed</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Booking Detail Drawer */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedBooking(null)} />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Booking {selectedBooking.bookingRef}</h3>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-6 space-y-6">
              {/* Trip Readiness — one-glance pre-boarding status */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Trip Readiness — before boarding</p>
                {!readiness ? (
                  <div className="text-sm text-slate-400 py-3">Loading status…</div>
                ) : (() => {
                  const ref = selectedBooking.bookingRef;
                  const origin = window.location.origin;
                  const renterLink = `${origin}/waiver/${ref}?renter=1`;
                  const crewLink = `${origin}/waiver/${ref}`;
                  const inspectionLink = `${origin}/inspection/${ref}`;
                  const phone = readiness.customerPhone, email = readiness.customerEmail, name = readiness.customerName;
                  const waiversOk = readiness.waivers.required > 0 && readiness.waivers.signed >= readiness.waivers.required;
                  const depositOk = ['paid', 'partially_refunded', 'refunded'].includes(readiness.deposit.status);
                  const allOk = readiness.agreement.signed && readiness.id.uploaded && waiversOk && readiness.inspection.signed && depositOk;
                  const Row = ({ ok, partial, label, detail, children }: { ok: boolean; partial?: boolean; label: string; detail: string; children?: React.ReactNode }) => (
                    <div className="px-3 py-2.5 flex items-center gap-3">
                      <span className="flex-shrink-0">{ok ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : partial ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <XCircle className="w-5 h-5 text-red-400" />}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{label}</p>
                        <p className="text-xs text-slate-500">{detail}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">{children}</div>
                    </div>
                  );
                  return (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className={`px-3 py-2 text-sm font-semibold flex items-center gap-2 ${allOk ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {allOk ? <><CheckCircle2 className="w-4 h-4" /> Cleared to board</> : <><AlertTriangle className="w-4 h-4" /> Not fully ready to board</>}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {/* Rental agreement */}
                        <Row ok={readiness.agreement.signed} label="Rental agreement"
                          detail={readiness.agreement.signed ? `Signed ${readiness.agreement.at ? new Date(readiness.agreement.at).toLocaleDateString() : ''}` : 'Not signed'}>
                          {readiness.agreement.signed && <button onClick={() => downloadAgreementPdf(selectedBooking)} title="Download signed agreement PDF" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Download className="w-3.5 h-3.5" /></button>}
                          <ResendLinks url={renterLink} phone={phone} email={email} name={name} label="rental agreement" />
                        </Row>
                        {/* Government ID */}
                        <Row ok={readiness.id.uploaded} label="Government ID (renter)"
                          detail={readiness.id.uploaded ? `Uploaded ${readiness.id.at ? new Date(readiness.id.at).toLocaleDateString() : ''}` : 'ID required — not uploaded'}>
                          {readiness.id.uploaded
                            ? <button onClick={() => setShowId(s => !s)} title="View ID" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Eye className="w-3.5 h-3.5" /></button>
                            : <button onClick={() => adminIdInputRef.current?.click()} disabled={uploadIdMut.isPending} title="Upload ID for renter" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Upload className="w-3.5 h-3.5" /></button>}
                          <ResendLinks url={renterLink} phone={phone} email={email} name={name} label="ID upload" />
                        </Row>
                        {showId && readiness.id.uploaded && (
                          <div className="px-3 py-3 bg-slate-50 flex gap-3">
                            {readiness.id.front && <img src={readiness.id.front} alt="ID front" className="h-28 rounded-lg border border-slate-200 object-contain bg-white" />}
                            {readiness.id.back && <img src={readiness.id.back} alt="ID back" className="h-28 rounded-lg border border-slate-200 object-contain bg-white" />}
                          </div>
                        )}
                        {/* Safety waivers */}
                        <Row ok={waiversOk} partial={!waiversOk && readiness.waivers.signed > 0} label="Safety waivers"
                          detail={`${readiness.waivers.signed} of ${readiness.waivers.required} passenger${readiness.waivers.required === 1 ? '' : 's'} signed`}>
                          <ResendLinks url={crewLink} phone={phone} email={email} name={name} label="waiver" />
                        </Row>
                        {/* Conditional inspection */}
                        <Row ok={readiness.inspection.signed} label="Conditional inspection"
                          detail={readiness.inspection.signed ? `Signed ${readiness.inspection.at ? new Date(readiness.inspection.at).toLocaleDateString() : ''}` : 'Not signed'}>
                          <ResendLinks url={inspectionLink} phone={phone} email={email} name={name} label="pre-boarding inspection" />
                        </Row>
                        {/* Security deposit */}
                        <Row ok={depositOk} partial={readiness.deposit.status === 'requested'} label="Security deposit"
                          detail={depositOk ? `Paid $${(readiness.deposit.amount ?? 1000).toLocaleString()}${readiness.deposit.status !== 'paid' ? ' · settled' : ''}` : readiness.deposit.status === 'requested' ? 'Link sent — awaiting payment' : 'Not collected'}>
                          <span className="text-[11px] text-slate-400">manage below ↓</span>
                        </Row>
                      </div>
                      <input ref={adminIdInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleAdminIdUpload(e.target.files)} />
                    </div>
                  );
                })()}
              </div>

              {/* Customer */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Customer</p>
                <p className="text-slate-900 font-semibold text-lg">{selectedBooking.customerName}</p>
                <div className="flex items-center gap-4 mt-2">
                  <a href={`mailto:${selectedBooking.customerEmail}`} className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700">
                    <Mail className="w-3 h-3" /> {selectedBooking.customerEmail}
                  </a>
                </div>
                {selectedBooking.customerPhone && (
                  <div className="flex items-center gap-4 mt-1">
                    <a href={`tel:${selectedBooking.customerPhone}`} className="flex items-center gap-1 text-sm text-slate-600">
                      <Phone className="w-3 h-3" /> {selectedBooking.customerPhone}
                    </a>
                    <a href={`sms:${selectedBooking.customerPhone}`} className="flex items-center gap-1 text-sm text-green-600">
                      <MessageCircle className="w-3 h-3" /> Text
                    </a>
                  </div>
                )}
              </div>

              {/* Trip */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Trip Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Boat</label>
                    <select value={bookingEdit.boatId} onChange={e => patchBooking('boatId', Number(e.target.value))} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                      {boats?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Duration</label>
                    <select value={bookingEdit.duration} onChange={e => patchBooking('duration', e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                      <option value="half_day_am">Half Day — AM</option>
                      <option value="half_day_pm">Half Day — PM</option>
                      <option value="full_day">Full Day</option>
                      <option value="multi_day">Multi-Day</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{(bookingEdit.duration === 'multi_day' || bookingEdit.duration === 'custom') ? 'Start Date' : 'Date'}</label>
                    <input type="date" value={bookingEdit.charterDate} onChange={e => patchBooking('charterDate', e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  {(bookingEdit.duration === 'multi_day' || bookingEdit.duration === 'custom') ? (
                    <div>
                      <label className="text-xs text-slate-500">End Date{bookingEdit.duration === 'custom' ? ' (optional)' : ''}</label>
                      <input type="date" value={bookingEdit.endDate} onChange={e => patchBooking('endDate', e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ) : <div />}
                  <div>
                    <label className="text-xs text-slate-500">Pickup Time</label>
                    <input type="time" value={bookingEdit.pickupTime} onChange={e => patchBooking('pickupTime', e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Drop-off Time</label>
                    <input type="time" value={bookingEdit.dropoffTime} onChange={e => patchBooking('dropoffTime', e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Charter Type</label>
                    <select value={bookingEdit.charterType} onChange={e => patchBooking('charterType', e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                      <option value="cruising">Cruising</option>
                      <option value="fishing">Fishing</option>
                      <option value="snorkeling">Snorkeling</option>
                      <option value="sandbar">Sandbar</option>
                      <option value="sunset">Sunset</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Guests</label>
                    <input type="number" min={1} max={20} value={bookingEdit.guestCount} onChange={e => patchBooking('guestCount', parseInt(e.target.value) || 1)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">Departure Port</label>
                    <input value={bookingEdit.departurePort} onChange={e => patchBooking('departurePort', e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">Base price — pre-tax ($)</label>
                    <input type="number" min={0} step="0.01" value={bookingEdit.subtotal} onChange={e => patchBooking('subtotal', parseFloat(e.target.value) || 0)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold" />
                    <div className="mt-2 space-y-1 text-sm bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex justify-between text-slate-500"><span>Tax (7.5%)</span><span>${((bookingEdit.subtotal || 0) * 0.075).toFixed(2)}</span></div>
                      <div className="flex justify-between font-semibold text-slate-900"><span>Total</span><span>${((bookingEdit.subtotal || 0) * 1.075).toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-slate-500">Special Requests</label>
                  <textarea value={bookingEdit.specialRequests} onChange={e => patchBooking('specialRequests', e.target.value)} rows={2} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <button
                  onClick={() => updateBooking.mutate({
                    id: selectedBooking.id,
                    boatId: bookingEdit.boatId,
                    charterDate: bookingEdit.charterDate,
                    endDate: (bookingEdit.duration === 'multi_day' || bookingEdit.duration === 'custom') ? (bookingEdit.endDate || null) : null,
                    pickupTime: bookingEdit.pickupTime || null,
                    dropoffTime: bookingEdit.dropoffTime || null,
                    duration: bookingEdit.duration,
                    charterType: bookingEdit.charterType,
                    guestCount: bookingEdit.guestCount,
                    departurePort: bookingEdit.departurePort || undefined,
                    subtotal: bookingEdit.subtotal,
                    specialRequests: bookingEdit.specialRequests || undefined,
                  })}
                  disabled={!bookingDirty || updateBooking.isPending}
                  className="mt-3 w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2 rounded-lg text-sm font-semibold"
                >
                  {updateBooking.isPending ? 'Saving...' : updateBooking.isSuccess && !bookingDirty ? 'Saved ✓' : 'Save Trip Details'}
                </button>
              </div>

              {/* Captain */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Captain</p>
                <select
                  value={selectedBooking.captainId ?? ''}
                  onChange={e => { assignCaptain.mutate({ id: selectedBooking.id, captainId: Number(e.target.value) }); setSelectedBooking({ ...selectedBooking, captainId: Number(e.target.value) }); }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">No captain (bareboat)</option>
                  {captains?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Pricing</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>${selectedBooking.subtotal.toFixed(2)}</span></div>
                  {selectedBooking.captainFee > 0 && (
                    <div className="flex justify-between"><span className="text-slate-500">Captain</span><span>${selectedBooking.captainFee.toFixed(2)}</span></div>
                  )}
                  {selectedBooking.referralDiscount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Referral Discount</span><span>-${selectedBooking.referralDiscount.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-slate-500">Tax (7.5%)</span><span>${selectedBooking.tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-slate-100">
                    <span>Total</span><span>${selectedBooking.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Booking Status</p>
                  <select
                    value={selectedBooking.status}
                    onChange={e => { updateStatus.mutate({ id: selectedBooking.id, status: e.target.value as any }); setSelectedBooking({ ...selectedBooking, status: e.target.value }); }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Payment</p>
                  <span className={`text-xs px-3 py-1.5 rounded-full inline-block ${paymentColors[selectedBooking.paymentStatus]}`}>
                    {selectedBooking.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Security Deposit */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Security Deposit</p>
                {(() => {
                  const ds: string = selectedBooking.depositStatus ?? 'none';
                  const amt: number = selectedBooking.depositAmount ?? 1000;
                  const refunded: number = selectedBooking.depositRefundedAmount ?? 0;
                  const busy = requestDeposit.isPending || markDepositPaid.isPending || settleDeposit.isPending;

                  if (ds === 'none') {
                    return (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm text-slate-600 mb-3">No deposit collected yet. Charge a refundable ${amt.toLocaleString()} hold, then refund the remainder after the offboarding inspection.</p>
                        <button
                          onClick={() => requestDeposit.mutate({ bookingId: selectedBooking.id })}
                          disabled={busy}
                          className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                        >
                          <DollarSign className="w-4 h-4" /> {requestDeposit.isPending ? 'Creating link…' : `Request $${amt.toLocaleString()} Deposit Link`}
                        </button>
                        <button
                          onClick={() => { if (confirm(`Mark the $${amt.toLocaleString()} deposit as collected off-platform (Zelle/Venmo/cash)?`)) markDepositPaid.mutate({ bookingId: selectedBooking.id }); }}
                          disabled={busy}
                          className="mt-2 w-full text-xs text-slate-500 hover:text-slate-700"
                        >
                          or mark collected manually
                        </button>
                      </div>
                    );
                  }

                  if (ds === 'requested') {
                    return (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center gap-2 text-amber-700 text-sm font-medium"><AlertTriangle className="w-4 h-4" /> Awaiting deposit payment</div>
                        {depositLink ? (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-amber-800/80">Send this payment link to the renter:</p>
                            <div className="flex gap-2">
                              <input readOnly value={depositLink} className="flex-1 min-w-0 border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white" />
                              <button onClick={() => navigator.clipboard?.writeText(depositLink)} className="px-2 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-100" title="Copy"><Copy className="w-4 h-4" /></button>
                            </div>
                            {selectedBooking.customerPhone && (
                              <a href={`sms:${selectedBooking.customerPhone}&body=${encodeURIComponent(`Hi ${selectedBooking.customerName?.split(' ')[0] || ''}, here's the secure link for your refundable $${amt.toLocaleString()} Blue Skies security deposit: ${depositLink}`)}`}
                                 className="block text-center bg-green-500 hover:bg-green-600 text-white py-1.5 rounded-lg text-xs font-semibold">Text link to {selectedBooking.customerPhone}</a>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-amber-800/80">A link was already generated. Stripe links expire in ~24h — regenerate for a fresh one.</p>
                        )}
                        <button onClick={() => requestDeposit.mutate({ bookingId: selectedBooking.id })} disabled={busy} className="mt-2 w-full text-xs bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 py-1.5 rounded-lg">{requestDeposit.isPending ? 'Regenerating…' : 'Regenerate link'}</button>
                        <button onClick={() => { if (confirm('Mark deposit collected off-platform?')) markDepositPaid.mutate({ bookingId: selectedBooking.id }); }} disabled={busy} className="mt-2 w-full text-xs text-amber-700/70 hover:text-amber-900">or mark collected manually</button>
                      </div>
                    );
                  }

                  if (ds === 'paid') {
                    const fuel = parseFloat(ded.fuel) || 0;
                    const damage = parseFloat(ded.damage) || 0;
                    const misc = parseFloat(ded.misc) || 0;
                    const deduct = Math.min(fuel + damage + misc, amt);
                    const refund = Math.max(0, amt - deduct);
                    const note = [fuel ? `Fuel $${fuel.toFixed(2)}` : '', damage ? `Damage $${damage.toFixed(2)}` : '', misc ? `Misc $${misc.toFixed(2)}` : ''].filter(Boolean).join(', ');
                    return (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="flex items-center gap-2 text-green-700 text-sm font-medium"><Check className="w-4 h-4" /> ${amt.toLocaleString()} deposit held</div>
                        {selectedBooking.depositPaidAt && <p className="mt-1 text-xs text-green-800/80">Paid {new Date(selectedBooking.depositPaidAt).toLocaleString()}</p>}
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-xs font-medium text-slate-600 mb-2">Settle after inspection — deduct what you're keeping:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {(['fuel', 'damage', 'misc'] as const).map(k => (
                              <div key={k}>
                                <label className="text-[11px] text-slate-500 capitalize">{k} ($)</label>
                                <input type="number" min={0} step="0.01" value={ded[k]} onChange={e => setDed(d => ({ ...d, [k]: e.target.value }))} placeholder="0" className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 space-y-0.5 text-sm">
                            <div className="flex justify-between text-slate-500"><span>Total deductions</span><span>${deduct.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between font-semibold text-slate-800"><span>Refund to renter</span><span className="text-green-700">${refund.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                          </div>
                          <button
                            onClick={() => { if (confirm(`Refund $${refund.toFixed(2)} to the renter and keep $${deduct.toFixed(2)}${note ? ` (${note})` : ''}?`)) settleDeposit.mutate({ bookingId: selectedBooking.id, deductions: deduct, deductionsNote: note || undefined }); }}
                            disabled={busy}
                            className="mt-2 w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-2 rounded-lg text-sm font-semibold"
                          >
                            {settleDeposit.isPending ? 'Processing refund…' : `Settle & Refund $${refund.toFixed(2)}`}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // refunded / partially_refunded
                  const kept = Math.max(0, amt - refunded);
                  return (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-slate-700 text-sm font-medium"><Check className="w-4 h-4" /> Deposit settled</div>
                      <p className="mt-1 text-xs text-slate-500">Refunded ${refunded.toLocaleString(undefined, { minimumFractionDigits: 2 })} of ${amt.toLocaleString()}{kept > 0 ? ` · kept $${kept.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}</p>
                      {selectedBooking.depositDeductionsNote && <p className="mt-0.5 text-[11px] text-slate-400">Deductions: {selectedBooking.depositDeductionsNote}</p>}
                    </div>
                  );
                })()}
              </div>

              {/* Delete */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    if (confirm(`Delete booking ${selectedBooking.bookingRef} for ${selectedBooking.customerName}? This cannot be undone.`)) {
                      deleteBooking.mutate(selectedBooking.id);
                    }
                  }}
                  className="w-full border border-red-200 hover:bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
