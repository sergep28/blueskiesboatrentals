import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bookingPage = readFileSync(new URL('../src/client/pages/BookingPage.tsx', import.meta.url), 'utf8');

test('quote checkout submits code for server price binding rather than a client price', () => {
  const submit = bookingPage.slice(bookingPage.indexOf('const handleSubmit ='), bookingPage.indexOf('const stepIndex ='));
  assert.match(submit, /quoteCode:\s*hasQuote\s*\?\s*quoteCode/);
  assert.doesNotMatch(submit, /customPrice:/);
});

test('existing quote status timing remains on checkout redirect, not changed by security hotfix', () => {
  assert.match(bookingPage, /markQuoteBooked\.mutate\(quoteCode\)/);
});
