// Reconciliation export for platform (OTA) bookings.
//
// When a Boatsetter/GetMyBoat booking is entered, the amount typed is the payout
// the platform sends us — but the server treats it as a pre-tax subtotal and adds
// 7.5% on top, so the recorded total is higher than we were ever paid. This dumps
// every platform booking with both numbers so they can be checked line by line
// against the platform's own payout report before anything is corrected.

export type OtaRow = {
  bookingRef: string;
  charterDate: string;
  endDate?: string | null;
  source?: string | null;
  specialRequests?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  subtotal?: number | null;
  captainFee?: number | null;
  tax?: number | null;
  total?: number | null;
  paymentStatus?: string | null;
  depositStatus?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

const OTA_SOURCES = ['boatsetter', 'getmyboat'];

// Older rows pre-date the source column and only carry a "Via Boatsetter" note
// in special requests, so match those too or the export silently misses them.
export function detectPlatform(b: OtaRow): { platform: string; from: string } | null {
  const src = (b.source ?? '').toLowerCase();
  if (OTA_SOURCES.includes(src)) return { platform: src, from: 'source column' };
  const note = b.specialRequests ?? '';
  if (note.startsWith('Via ')) {
    const label = note.replace('Via ', '').split('\n')[0].trim();
    if (OTA_SOURCES.includes(label.toLowerCase().replace(/[^a-z]/g, ''))) {
      return { platform: label, from: 'special requests note' };
    }
  }
  return null;
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const n2 = (v: number | null | undefined) => (typeof v === 'number' ? v.toFixed(2) : '');

export function buildOtaReconciliationCsv(bookings: OtaRow[]): { csv: string; count: number; overstated: number } {
  const rows = bookings
    .map(b => ({ b, hit: detectPlatform(b) }))
    .filter((r): r is { b: OtaRow; hit: { platform: string; from: string } } => r.hit !== null)
    .sort((a, b) => (a.b.charterDate ?? '').localeCompare(b.b.charterDate ?? ''));

  const header = [
    'Booking Ref', 'Charter Date', 'End Date', 'Platform', 'Platform Read From',
    'Customer', 'Email', 'Amount Entered (payout)', 'Captain Fee', 'Tax Added',
    'Recorded Total', 'Difference vs Entered', 'Payment Status', 'Deposit Status',
    'Booking Status', 'Created',
    'ACTUAL PAYOUT (fill in from platform report)', 'NOTES',
  ];

  let overstated = 0;
  const lines = rows.map(({ b, hit }) => {
    const entered = b.subtotal ?? 0;
    const total = b.total ?? 0;
    const diff = total - entered;
    overstated += diff;
    return [
      b.bookingRef, b.charterDate, b.endDate ?? '', hit.platform, hit.from,
      b.customerName ?? '', b.customerEmail ?? '', n2(entered), n2(b.captainFee), n2(b.tax),
      n2(total), n2(diff), b.paymentStatus ?? '', b.depositStatus ?? '',
      b.status ?? '', (b.createdAt ?? '').slice(0, 10),
      '', '',
    ].map(csvCell).join(',');
  });

  return {
    csv: [header.map(csvCell).join(','), ...lines].join('\n') + '\n',
    count: rows.length,
    overstated: Math.round(overstated * 100) / 100,
  };
}

export function downloadOtaReconciliationCsv(bookings: OtaRow[]) {
  const { csv, count, overstated } = buildOtaReconciliationCsv(bookings);
  if (!count) {
    alert('No Boatsetter or GetMyBoat bookings found.');
    return;
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ota-payout-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  alert(
    `Exported ${count} platform booking${count === 1 ? '' : 's'}.\n\n` +
    `Recorded totals are $${overstated.toLocaleString(undefined, { minimumFractionDigits: 2 })} higher than the amounts entered — ` +
    `that is the tax added on top of payouts.\n\n` +
    `Fill in the ACTUAL PAYOUT column from the Boatsetter / GetMyBoat report and send the file back.`,
  );
}
