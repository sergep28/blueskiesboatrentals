import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RENTAL_AGREEMENT_SECTIONS } from '../src/client/lib/rentalAgreementText.ts';
import { renderAgreement } from '../src/client/lib/bookingPdfs.ts';
import { readFileSync } from 'node:fs';

const booking = { bookingRef: 'SYNTHETIC', customerName: 'Test Renter', charterDate: '2026-12-26', guestCount: 2, agreementVersion: '2026-09-22', agreedToTerms: true };

test('current rental agreement shows the owner-supplied equipment damage and loss schedule before acknowledgment', () => {
  const sections = RENTAL_AGREEMENT_SECTIONS;
  const schedule = sections.find(s => s.title === 'Equipment Damage & Loss Pricing');
  assert.ok(schedule, 'the new schedule must appear in the rental agreement that renters read');
  const text = [schedule.intro, ...schedule.items, schedule.footer].join('\n');
  for (const [item, amount] of [
    ['Engine Powerhead Failure', '$8,000'], ['Engine Submersion', '$12,000'],
    ['Excessive Cleaning Fee', '$125.00'], ['Fire Extinguisher', '$50'],
    ['PFD - Children', '$50'], ['Lower Unit / Gearcase', '$5,000'],
    ['Complete Outboard Replacement', '$28,000'], ['Anchor w/ Chain & Line', '$500'],
    ['GPS / Chartplotter', '$2,500'], ['Lost Keys', '$150'], ['Towing Fee', '$250'],
    ['Fuel Misuse / Wrong Fuel', 'Full repair cost'],
  ]) {
    assert.ok(text.includes(item) && text.includes(amount), `${item} / ${amount} omitted`);
  }
  assert.match(text, /shallow waters/i);
  const doc = renderAgreement(booking);
  const pdf = doc.output();
  assert.match(pdf, /Equipment Damage & Loss Pricing/);
  assert.match(pdf, /Fire Extinguisher/);
  assert.match(pdf, /Complete Outboard Replacement/);
  assert.ok(pdf.indexOf('Equipment Damage & Loss Pricing') < pdf.lastIndexOf('(Acknowledgment)'));
});

test('a previously signed June agreement PDF does not retroactively include the new pricing schedule', () => {
  const historical = renderAgreement({ ...booking, agreementVersion: '2026-06-07' }).output();
  assert.doesNotMatch(historical, /Equipment Damage & Loss Pricing/);
  assert.match(historical, /Equipment & Responsibility Notice/);
});

test('signed agreement PDF retains the submitted multi-day overnight boat address', () => {
  const pdf = renderAgreement({ ...booking, endDate: '2026-12-28', stayAddress: '123 Marina Way, Slip B-2' }).output();
  assert.match(pdf, /Overnight boat address:/);
  assert.match(pdf, /123 Marina Way, Slip B-2/);
});

test('admin waiver page downloads the same version-aware complete agreement PDF', () => {
  const admin = readFileSync(new URL('../src/client/pages/admin/AdminWaivers.tsx', import.meta.url), 'utf8');
  assert.match(admin, /import\s*\{\s*renderAgreement\s*\}\s*from\s*['"]\.\.\/\.\.\/lib\/bookingPdfs['"]/);
  assert.match(admin, /renderAgreement\(selectedBooking\)/);
  assert.doesNotMatch(admin, /const AGREEMENT_SECTIONS\s*=/);
});

test('new bookings and renter signatures stamp the current agreement version', () => {
  const route = readFileSync(new URL('../src/server/routes/bookings.ts', import.meta.url), 'utf8');
  assert.match(route, /import\s*\{\s*AGREEMENT_VERSION\s*\}/);
  assert.equal((route.match(/agreementVersion:\s*AGREEMENT_VERSION/g) ?? []).length, 2);
});
