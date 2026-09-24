/** Calendar dates, never elapsed 24-hour periods (DST must not shift a deadline). */
export function easternDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}
export function shiftCalendarDate(date: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid calendar date');
  const value = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== date) throw new Error('Invalid calendar date');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function rentalDeadline(startDate: string, now = new Date()) {
  const regularDueDate = shiftCalendarDate(startDate, -5);
  const today = easternDate(now);
  return { dueDate: regularDueDate <= today ? today : regularDueDate, dueNow: regularDueDate <= today };
}
