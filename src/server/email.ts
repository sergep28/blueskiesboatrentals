import { Resend } from 'resend';
import { db, schema } from '../db/index.js';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'bookings@blueskiesboatrentals.com';
const ADMIN_EMAIL = 'info@blueskiescharter.com';

// Log every customer-facing email to the database for transparency.
async function logEmail(data: {
  bookingRef?: string | null;
  customerEmail: string;
  customerName?: string | null;
  type: typeof schema.emailLogs.$inferInsert['type'];
  subject: string;
  htmlBody?: string | null;
  resendId?: string | null;
  status: 'sent' | 'failed';
  error?: string | null;
}) {
  try {
    await db.insert(schema.emailLogs).values({
      bookingRef: data.bookingRef ?? null,
      customerEmail: data.customerEmail,
      customerName: data.customerName ?? null,
      type: data.type,
      subject: data.subject,
      htmlBody: data.htmlBody ?? null,
      resendId: data.resendId ?? null,
      status: data.status,
      error: data.error ?? null,
    });
  } catch (err) {
    console.error('Failed to log email:', err);
  }
}

const durationLabels: Record<string, string> = {
  half_day_am: 'Half Day (Morning)',
  half_day_pm: 'Half Day (Afternoon)',
  full_day: 'Full Day',
  multi_day: 'Multi-Day',
  custom: 'Custom',
};

const charterTypeLabels: Record<string, string> = {
  fishing: 'Fishing',
  cruising: 'Cruising',
  snorkeling: 'Snorkeling',
  sunset: 'Sunset Cruise',
  sandbar: 'Sandbar',
  custom: 'Custom',
};

interface BookingEmailData {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  boatName: string;
  boatModel: string;
  charterDate: string;
  duration: string;
  charterType: string;
  guestCount: number;
  departurePort?: string;
  specialRequests?: string;
  captainRequested: boolean;
  subtotal: number;
  captainFee: number;
  tax: number;
  total: number;
  pointsEarned?: number;
  totalPoints?: number;
}

// $1,000.00 — not $1000.00. This is a document about money; it should look like one.
function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function buildCalendarUrl(data: BookingEmailData): string {
  // Determine start/end times based on duration
  const dateStr = data.charterDate.replace(/-/g, '');
  // Operating window is 8am–5pm; keep these in sync with BookingPage tripTimes().
  let startTime = '080000'; // 8am default
  let endTime = '170000';   // 5pm default

  if (data.duration === 'half_day_am') {
    startTime = '080000'; endTime = '120000';
  } else if (data.duration === 'half_day_pm') {
    startTime = '130000'; endTime = '170000';
  } else if (data.duration === 'full_day') {
    startTime = '080000'; endTime = '170000';
  } else if (data.duration === 'multi_day') {
    startTime = '080000'; endTime = '170000';
  }

  const start = `${dateStr}T${startTime}`;
  const end = `${dateStr}T${endTime}`;
  const title = encodeURIComponent(`Blue Skies Boat Rental — ${data.boatName}`);
  const details = encodeURIComponent(
    `Boat: ${data.boatName} (${data.boatModel})\n` +
    `Duration: ${durationLabels[data.duration] || data.duration}\n` +
    `Guests: ${data.guestCount}\n` +
    `Confirmation: ${data.bookingRef}\n` +
    `${data.captainRequested ? 'Captain included\n' : ''}` +
    `\nQuestions? Text (754) 254-2293`
  );
  const locationText = data.departurePort && data.departurePort !== 'Islamorada'
    ? data.departurePort
    : 'Safe Harbor Marina, Islamorada, FL 33036';
  const location = encodeURIComponent(locationText);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&ctz=America/New_York&details=${details}&location=${location}`;
}

function customerConfirmationHtml(data: BookingEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);padding:40px 30px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 5px;">Blue Skies</h1>
      <p style="color:#7dd3fc;font-size:13px;letter-spacing:3px;margin:0;text-transform:uppercase;">Boat Rentals</p>
    </div>

    <!-- Confirmation Banner -->
    <div style="background:#ecfdf5;padding:20px 30px;text-align:center;border-bottom:1px solid #d1fae5;">
      <div style="display:inline-block;background:#10b981;color:#ffffff;font-size:13px;font-weight:600;padding:6px 16px;border-radius:20px;margin-bottom:10px;">Booking Confirmed</div>
      <h2 style="color:#064e3b;font-size:22px;margin:8px 0 4px;">You're all set, ${data.customerName.split(' ')[0]}!</h2>
      <p style="color:#047857;font-size:14px;margin:0;">Confirmation #${data.bookingRef}</p>
    </div>

    <!-- Trip Details -->
    <div style="padding:30px;">
      <h3 style="color:#0f172a;font-size:16px;margin:0 0 20px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #0ea5e9;padding-bottom:8px;">Your Trip Details</h3>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;width:140px;">Boat</td>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600;">${data.boatName} — ${data.boatModel}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Date</td>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600;">${formatDate(data.charterDate)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Duration</td>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600;">${durationLabels[data.duration] || data.duration}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Experience</td>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600;">${charterTypeLabels[data.charterType] || data.charterType}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Guests</td>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600;">${data.guestCount}</td>
        </tr>
        ${data.captainRequested ? `<tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Captain</td>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600;">Included</td>
        </tr>` : ''}
        ${data.departurePort ? `<tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Departure</td>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:600;">${data.departurePort}</td>
        </tr>` : ''}
        ${data.specialRequests ? `<tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Notes</td>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;">${data.specialRequests}</td>
        </tr>` : ''}
      </table>

      <!-- Pricing -->
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-top:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px;">Boat Rental</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;text-align:right;">${money(data.subtotal)}</td>
          </tr>
          ${data.captainFee > 0 ? `<tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px;">Captain Fee</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;text-align:right;">${money(data.captainFee)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px;">Tax</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;text-align:right;">${money(data.tax)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;color:#0f172a;font-size:18px;font-weight:700;border-top:2px solid #e2e8f0;">Total</td>
            <td style="padding:12px 0 0;color:#0f172a;font-size:18px;font-weight:700;text-align:right;border-top:2px solid #e2e8f0;">${money(data.total)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Add to Calendar -->
    <div style="padding:0 30px 24px;text-align:center;">
      <a href="${buildCalendarUrl(data)}" target="_blank" style="display:inline-block;background:#0ea5e9;color:#ffffff;font-size:14px;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;">
        &#128197; Add to Calendar
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Adds your trip to Google Calendar with all the details</p>
    </div>

    <!-- Loyalty Points -->
    ${data.pointsEarned ? `
    <div style="padding:0 30px 24px;">
      <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a;border-radius:12px;padding:24px;text-align:center;">
        <p style="color:#92400e;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Loyalty Rewards</p>
        <p style="color:#78350f;font-size:28px;font-weight:700;margin:8px 0 4px;">+${data.pointsEarned} points earned!</p>
        ${data.totalPoints ? `<p style="color:#92400e;font-size:14px;margin:0 0 12px;">Your balance: <strong>${data.totalPoints} points</strong></p>` : ''}
        <p style="color:#a16207;font-size:12px;margin:0 0 16px;">Earn points on every trip. Redeem for free upgrades, discounts, and more.</p>
        <a href="https://blueskiesboatrentals.com/my-bookings" style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:13px;font-weight:600;padding:10px 24px;border-radius:20px;text-decoration:none;">View My Points & Rewards</a>
      </div>
    </div>
    ` : ''}

    <!-- What to Bring -->
    <div style="padding:0 30px 30px;">
      <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;padding:24px;">
        <h3 style="color:#0c4a6e;font-size:15px;margin:0 0 12px;">What to Bring</h3>
        <table style="width:100%;"><tr>
          <td style="vertical-align:top;padding-right:10px;">
            <p style="color:#0369a1;font-size:13px;margin:4px 0;">&#9745; Sunscreen</p>
            <p style="color:#0369a1;font-size:13px;margin:4px 0;">&#9745; Sunglasses</p>
            <p style="color:#0369a1;font-size:13px;margin:4px 0;">&#9745; Towels</p>
          </td>
          <td style="vertical-align:top;">
            <p style="color:#0369a1;font-size:13px;margin:4px 0;">&#9745; Cooler & drinks</p>
            <p style="color:#0369a1;font-size:13px;margin:4px 0;">&#9745; Snacks</p>
            <p style="color:#0369a1;font-size:13px;margin:4px 0;">&#9745; Good vibes</p>
          </td>
        </tr></table>
      </div>
    </div>

    <!-- Contact -->
    <div style="padding:0 30px 30px;text-align:center;">
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Questions? Text or call us anytime.</p>
      <a href="tel:7542542293" style="color:#0ea5e9;font-size:15px;font-weight:600;text-decoration:none;">(754) 254-2293</a>
    </div>

    <!-- Footer -->
    <div style="background:#0f172a;padding:24px 30px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Blue Skies Boat Rentals | Islamorada, Florida Keys</p>
      <p style="color:#64748b;font-size:11px;margin:0;">blueskiesboatrentals.com</p>
    </div>
  </div>
</body>
</html>`;
}

function adminNotificationHtml(data: BookingEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:30px;">
    <h2 style="color:#0f172a;margin:0 0 20px;">New Booking: ${data.bookingRef}</h2>

    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#64748b;font-size:14px;width:130px;">Customer</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${data.customerName}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Email</td><td style="padding:8px 0;font-size:14px;">${data.customerEmail}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Phone</td><td style="padding:8px 0;font-size:14px;">${data.customerPhone || 'N/A'}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Boat</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${data.boatName} (${data.boatModel})</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Date</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${formatDate(data.charterDate)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Duration</td><td style="padding:8px 0;font-size:14px;">${durationLabels[data.duration] || data.duration}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Type</td><td style="padding:8px 0;font-size:14px;">${charterTypeLabels[data.charterType] || data.charterType}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Guests</td><td style="padding:8px 0;font-size:14px;">${data.guestCount}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Captain</td><td style="padding:8px 0;font-size:14px;">${data.captainRequested ? 'Yes' : 'No'}</td></tr>
      ${data.specialRequests ? `<tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Requests</td><td style="padding:8px 0;font-size:14px;">${data.specialRequests}</td></tr>` : ''}
      <tr style="border-top:2px solid #e2e8f0;"><td style="padding:12px 0;color:#0f172a;font-size:16px;font-weight:700;">Total</td><td style="padding:12px 0;font-size:16px;font-weight:700;">${money(data.total)}</td></tr>
    </table>

    <p style="color:#64748b;font-size:13px;margin-top:20px;">View in admin: <a href="https://blueskiesboatrentals.com/admin/bookings">Admin Panel</a></p>
  </div>
</body>
</html>`;
}

export async function sendReviewRequest(data: { customerName: string; customerEmail: string; boatName: string; charterDate: string; bookingRef?: string }) {
  if (!resend) {
    console.log('Resend not configured — skipping review request email');
    return;
  }

  const firstName = data.customerName.split(' ')[0];
  // Set GOOGLE_REVIEW_URL to your Google Business "Ask for reviews" link
  // (e.g. https://g.page/r/XXXX/review) so the button opens the write-a-review box.
  const reviewUrl = process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/CUDyegV9v1xaEBM/review';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);padding:40px 30px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 5px;">Blue Skies</h1>
      <p style="color:#7dd3fc;font-size:13px;letter-spacing:3px;margin:0;text-transform:uppercase;">Boat Rentals</p>
    </div>

    <!-- Content -->
    <div style="padding:40px 30px;text-align:center;">
      <h2 style="color:#0f172a;font-size:24px;margin:0 0 16px;">How was your day on the water?</h2>
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 12px;">Hey ${firstName}, thanks for spending the day aboard <strong>${data.boatName}</strong>! We hope you had an amazing time out on the water.</p>
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 12px;">If you enjoyed your trip, we'd love to hear about it. A quick review takes about 30 seconds and means the world to us.</p>
      <p style="color:#0369a1;font-size:15px;line-height:1.6;margin:0 0 32px;font-weight:600;">As a thank-you, leave a review and reply to this email — we'll add bonus loyalty points to your account toward your next trip. ⭐</p>

      <!-- CTA Button -->
      <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#ffffff;font-size:16px;font-weight:600;padding:16px 40px;border-radius:30px;text-decoration:none;box-shadow:0 4px 14px rgba(14,165,233,0.4);">Leave a Review</a>

      <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;font-style:italic;">Your review helps other families find us</p>
    </div>

    <!-- Footer -->
    <div style="background:#0f172a;padding:24px 30px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Blue Skies Boat Rentals | Islamorada, Florida Keys</p>
      <p style="color:#64748b;font-size:11px;margin:0;">blueskiesboatrentals.com</p>
    </div>
  </div>
</body>
</html>`;

  const subject = 'How was your day on the water?';
  try {
    const result: any = await resend.emails.send({
      from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
      replyTo: ADMIN_EMAIL,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,   // Serge gets a copy of every customer email
      subject,
      html,
    });
    console.log(`Review request email sent to ${data.customerEmail}`);
    await logEmail({
      bookingRef: data.bookingRef ?? null, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'review_request', subject, htmlBody: html,
      resendId: result?.data?.id, status: 'sent',
    });
  } catch (err: any) {
    console.error('Failed to send review request email:', err);
    await logEmail({
      bookingRef: data.bookingRef ?? null, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'review_request', subject, status: 'failed', error: err?.message,
    });
  }
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  if (!resend) {
    console.log('Resend not configured — skipping booking emails');
    return;
  }

  const customerSubject = `Booking Confirmed — ${data.boatName} on ${formatDate(data.charterDate)}`;
  const customerHtml = customerConfirmationHtml(data);
  const adminSubject = `New Booking: ${data.bookingRef} — ${data.customerName} — ${money(data.total)}`;
  const adminHtml = adminNotificationHtml(data);

  try {
    // Send customer confirmation
    const customerResult: any = await resend.emails.send({
      from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
      replyTo: ADMIN_EMAIL,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,   // Serge gets a copy of every customer email
      subject: customerSubject,
      html: customerHtml,
    });
    console.log(`Confirmation email sent to ${data.customerEmail}`);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'booking_confirmation', subject: customerSubject, htmlBody: customerHtml,
      resendId: customerResult?.data?.id, status: 'sent',
    });

    // Send admin notification (logged but type admin_notification)
    await resend.emails.send({
      from: `Blue Skies Bookings <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: adminSubject,
      html: adminHtml,
    });
    console.log(`Admin notification sent to ${ADMIN_EMAIL}`);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: ADMIN_EMAIL, customerName: 'Admin',
      type: 'admin_notification', subject: adminSubject, htmlBody: adminHtml, status: 'sent',
    });
  } catch (err: any) {
    console.error('Failed to send booking email:', err);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'booking_confirmation', subject: customerSubject, status: 'failed', error: err?.message,
    });
  }
}

// Alerts the owner the moment a security deposit is paid at Stripe.
export async function sendDepositPaidAlert(data: { bookingRef: string; customerName: string; amount: number; boatName?: string; charterDate?: string }) {
  if (!resend) {
    console.log('Resend not configured — skipping deposit alert');
    return;
  }
  const subject = `Deposit paid: $${data.amount.toLocaleString()} — ${data.customerName} (${data.bookingRef})`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px">Security deposit received</h2>
        <p style="color:#475569;margin:0 0 16px"><strong>${data.customerName}</strong> just paid their <strong>$${data.amount.toLocaleString()}</strong> refundable security deposit.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155">
          <tr><td style="padding:4px 0;color:#94a3b8">Booking</td><td style="text-align:right">${data.bookingRef}</td></tr>
          ${data.boatName ? `<tr><td style="padding:4px 0;color:#94a3b8">Boat</td><td style="text-align:right">${data.boatName}</td></tr>` : ''}
          ${data.charterDate ? `<tr><td style="padding:4px 0;color:#94a3b8">Charter date</td><td style="text-align:right">${data.charterDate}</td></tr>` : ''}
        </table>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px">The deposit is now held in the booking's Trip Readiness panel. Refund the remainder after the offboarding inspection.</p>
      </div>`;
  try {
    await resend.emails.send({
      from: `Blue Skies Bookings <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
    console.log(`Deposit alert sent to ${ADMIN_EMAIL} for ${data.bookingRef}`);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: ADMIN_EMAIL, customerName: 'Admin',
      type: 'deposit_alert', subject, htmlBody: html, status: 'sent',
    });
  } catch (err: any) {
    console.error('Failed to send deposit alert:', err);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: ADMIN_EMAIL, customerName: 'Admin',
      type: 'deposit_alert', subject, status: 'failed', error: err?.message,
    });
  }
}

// --- Marketing emails ---

interface MarketingEmailData {
  to: string;
  name: string;
  subject: string;
  message: string;
  template: string;
  // Ties an agent-sent email to its booking so it shows up on that customer's
  // journey timeline in the booking drawer. Without it the email was logged but
  // orphaned — invisible on the booking it was actually about.
  bookingRef?: string | null;
}

// Renders the exact HTML the customer will receive — powers the agent's
// "Preview" button so an email can be seen before it is approved.
export function renderMarketingEmail(data: MarketingEmailData): string {
  return marketingEmailHtml(data);
}

function marketingEmailHtml(data: MarketingEmailData): string {
  const firstName = data.name.split(' ')[0];
  const bodyHtml = data.message.replace(/\n/g, '<br>');

  const heroImages: Record<string, string> = {
    summer_promo: 'https://www.blueskiesboatrentals.com/freedom-aerial.jpg',
    repeat_customer: 'https://www.blueskiesboatrentals.com/hero-keys-view.jpg',
    fishing_season: 'https://www.blueskiesboatrentals.com/catch-mahi.jpg',
    holiday: 'https://www.blueskiesboatrentals.com/boat-sunset.jpeg',
    review_followup: 'https://www.blueskiesboatrentals.com/drone-boats.jpeg',
    loyalty_reminder: 'https://www.blueskiesboatrentals.com/freedom-running.jpg',
    custom: 'https://www.blueskiesboatrentals.com/hero-keys-view.jpg',
  };
  const heroImage = heroImages[data.template] || heroImages.custom;

  const taglines: Record<string, string> = {
    summer_promo: 'Your Keys Adventure Awaits',
    repeat_customer: 'Welcome Back to Paradise',
    fishing_season: 'Tight Lines &amp; Blue Water',
    holiday: 'Make It a Weekend to Remember',
    review_followup: 'Thanks for Riding With Us',
    loyalty_reminder: 'You Have Rewards Waiting',
    custom: 'Life Is Better on the Water',
  };
  const tagline = taglines[data.template] || taglines.custom;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <!-- Header -->
    <div style="background:#0c4a6e;padding:24px 30px;text-align:center;">
      <h1 style="color:#ffffff;font-size:26px;margin:0;font-weight:300;letter-spacing:3px;">BLUE SKIES</h1>
      <div style="width:50px;height:2px;background:#f59e0b;margin:8px auto;"></div>
      <p style="color:#bae6fd;font-size:11px;letter-spacing:4px;margin:0;text-transform:uppercase;font-weight:400;">Boat Rentals</p>
    </div>

    <!-- Hero Image -->
    <img src="${heroImage}" alt="Blue Skies Boat Rentals" style="width:100%;display:block;" />

    <!-- Tagline Banner -->
    <div style="background:#0c4a6e;padding:16px 30px;text-align:center;">
      <p style="color:#f59e0b;font-size:14px;letter-spacing:2px;margin:0;text-transform:uppercase;font-weight:600;">${tagline}</p>
    </div>

    <!-- Body -->
    <div style="padding:40px 36px 24px;">
      <p style="color:#0f172a;font-size:22px;line-height:1.3;margin:0 0 24px;font-weight:300;">Hey ${firstName},</p>
      <div style="color:#334155;font-size:16px;line-height:2;">${bodyHtml}</div>
      <!-- Emails come from the business, not from Serge personally. Writers must not
           add their own sign-off; the agent's is stripped in stripGreetingAndSignoff(). -->
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:28px 0 0;">
        See you on the water,<br>
        <strong style="color:#0c4a6e;">The Blue Skies Team</strong><br>
        <span style="color:#94a3b8;font-size:14px;">Blue Skies Boat Rentals · Islamorada, FL</span>
      </p>
    </div>

    <!-- Divider -->
    <div style="padding:0 36px;">
      <div style="text-align:center;color:#cbd5e1;font-size:16px;letter-spacing:8px;margin:8px 0 0;">~ ~ ~</div>
    </div>

    <!-- CTA -->
    <div style="padding:24px 36px 44px;text-align:center;">
      <a href="https://blueskiesboatrentals.com/book" style="display:inline-block;background:#f59e0b;color:#0c4a6e;font-size:14px;font-weight:800;padding:18px 52px;border-radius:6px;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;">
        Book Your Next Trip &rarr;
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#0c4a6e;padding:32px;text-align:center;">
      <p style="color:#ffffff;font-size:16px;font-weight:300;letter-spacing:2px;margin:0 0 2px;">BLUE SKIES</p>
      <p style="color:#f59e0b;font-size:10px;font-weight:600;letter-spacing:3px;margin:0 0 16px;text-transform:uppercase;">Boat Rentals</p>

      <p style="color:#bae6fd;font-size:12px;margin:0 0 12px;">Islamorada, Florida Keys</p>

      <a href="tel:7542542293" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">(754) 254-2293</a>

      <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.15);">
        <a href="https://instagram.com/blueskiescharter" style="color:#7dd3fc;font-size:12px;text-decoration:none;margin:0 12px;letter-spacing:0.5px;">Instagram</a>
        <a href="https://tiktok.com/@blueskiescharter" style="color:#7dd3fc;font-size:12px;text-decoration:none;margin:0 12px;letter-spacing:0.5px;">TikTok</a>
        <a href="https://blueskiesboatrentals.com" style="color:#7dd3fc;font-size:12px;text-decoration:none;margin:0 12px;letter-spacing:0.5px;">Website</a>
      </div>

      <p style="color:rgba(255,255,255,0.3);font-size:10px;margin:20px 0 0;">You received this because you booked with Blue Skies Boat Rentals.</p>
    </div>
  </div>
</body>
</html>`;
}

// --- Waiver Packet (auto-sent after booking creation) ---

interface WaiverPacketData {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  boatName: string;
  charterDate: string;
  endDate?: string | null;
  duration: string;
  guestCount: number;
  depositAmount: number;
  renterLink: string;       // agreement + ID + waiver
  crewLink: string;         // crew waiver only
  depositLink: string | null; // Stripe checkout for deposit
}

function waiverPacketHtml(data: WaiverPacketData): string {
  const firstName = data.customerName.split(' ')[0];
  const dateStr = formatDate(data.charterDate);
  const endStr = data.endDate && data.endDate !== data.charterDate ? ` — ${formatDate(data.endDate)}` : '';
  const amt = data.depositAmount.toLocaleString();

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);padding:36px 30px;text-align:center;">
      <h1 style="color:#ffffff;font-size:36px;margin:0 0 6px;font-weight:200;letter-spacing:6px;text-transform:uppercase;">BLUE SKIES</h1>
      <div style="width:50px;height:2px;background:#f59e0b;margin:0 auto 8px;"></div>
      <p style="color:#f59e0b;font-size:11px;letter-spacing:5px;margin:0;text-transform:uppercase;font-weight:600;">Boat Rentals</p>
      <p style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">Islamorada &bull; Florida Keys</p>
    </div>

    <img src="https://www.blueskiesboatrentals.com/freedom-aerial.jpg" alt="Blue Skies" style="width:100%;max-height:180px;object-fit:cover;display:block;" />

    <div style="background:linear-gradient(135deg,#0c4a6e,#064e3b);padding:28px 30px;text-align:center;">
      <p style="color:#f59e0b;font-size:12px;letter-spacing:4px;margin:0 0 8px;text-transform:uppercase;font-weight:600;">Your adventure is almost here</p>
      <h2 style="color:#ffffff;font-size:26px;margin:0;font-weight:300;line-height:1.3;">Time to get ready, ${firstName}!</h2>
    </div>

    <div style="padding:30px 30px 10px;">
      <p style="color:#334155;font-size:16px;line-height:1.7;margin:0;">We're getting <strong>${data.boatName}</strong> prepped and ready for your day on the water. Just a few quick things to knock out before you head down to the marina — takes about 5 minutes.</p>
    </div>

    <!-- Trip Card -->
    <div style="padding:20px 30px;">
      <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);border-radius:16px;padding:24px;color:#ffffff;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Boat</td>
            <td style="padding:6px 0;color:#ffffff;font-size:15px;font-weight:600;text-align:right;">${data.boatName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Date</td>
            <td style="padding:6px 0;color:#ffffff;font-size:15px;font-weight:600;text-align:right;">${dateStr}${endStr}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Duration</td>
            <td style="padding:6px 0;color:#ffffff;font-size:15px;font-weight:600;text-align:right;">${durationLabels[data.duration] || data.duration}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Guests</td>
            <td style="padding:6px 0;color:#ffffff;font-size:15px;font-weight:600;text-align:right;">${data.guestCount}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:12px 0 0;">
              <div style="border-top:1px solid rgba(255,255,255,0.2);padding-top:12px;">
                <span style="color:#7dd3fc;font-size:11px;letter-spacing:1px;">CONFIRMATION</span>
                <span style="color:#ffffff;font-size:14px;font-weight:600;float:right;font-family:monospace;letter-spacing:1px;">${data.bookingRef}</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <div style="padding:10px 30px 0;text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#f0f9ff;border:1px solid #bae6fd;border-radius:20px;padding:8px 20px;">
        <p style="color:#0369a1;font-size:13px;font-weight:600;margin:0;">4 quick items to complete before your trip</p>
      </div>
    </div>

    <!-- 1. Agreement + ID -->
    <div style="padding:0 30px 20px;">
      <div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0;">
          <table style="width:100%;"><tr>
            <td style="width:36px;vertical-align:middle;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#fff;font-size:15px;font-weight:700;text-align:center;line-height:32px;">1</div></td>
            <td style="vertical-align:middle;"><p style="color:#0f172a;font-size:15px;font-weight:700;margin:0;">Sign Agreement & Upload ID</p></td>
          </tr></table>
        </div>
        <div style="padding:16px 20px;">
          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 14px;">Quick sign-off on the bareboat charter agreement and snap a photo of your ID — standard stuff so we're all squared away.</p>
          <a href="${data.renterLink}" style="display:block;text-align:center;background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#ffffff;font-size:14px;font-weight:600;padding:14px 24px;border-radius:10px;text-decoration:none;">Sign & Upload ID</a>
        </div>
      </div>
    </div>

    <!-- 2. Waivers -->
    <div style="padding:0 30px 20px;">
      <div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0;">
          <table style="width:100%;"><tr>
            <td style="width:36px;vertical-align:middle;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#fff;font-size:15px;font-weight:700;text-align:center;line-height:32px;">2</div></td>
            <td style="vertical-align:middle;"><p style="color:#0f172a;font-size:15px;font-weight:700;margin:0;">Safety Waivers — All ${data.guestCount} Passengers</p></td>
          </tr></table>
        </div>
        <div style="padding:16px 20px;">
          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 10px;">Everyone on board needs to sign a waiver before we cast off. Your waiver is included in Step 1 — just share this link with your crew:</p>
          <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;margin:0 0 10px;">
            <p style="color:#0c4a6e;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin:0 0 6px;">Share with your crew</p>
            <p style="color:#0369a1;font-size:13px;margin:0;word-break:break-all;font-weight:500;">${data.crewLink}</p>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin:0;">Tip: Drop it in the group chat so everyone can sign from their phone.</p>
        </div>
      </div>
    </div>

    <!-- 3. Deposit -->
    <div style="padding:0 30px 20px;">
      <div style="border:1px solid #fde68a;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);padding:16px 20px;border-bottom:1px solid #fde68a;">
          <table style="width:100%;"><tr>
            <td style="width:36px;vertical-align:middle;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:15px;font-weight:700;text-align:center;line-height:32px;">3</div></td>
            <td style="vertical-align:middle;"><p style="color:#92400e;font-size:15px;font-weight:700;margin:0;">Security Deposit — $${amt}</p></td>
          </tr></table>
        </div>
        <div style="padding:16px 20px;">
          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 6px;">Fully refundable! After your trip, we do a quick vessel inspection and return your deposit within 48 hours (minus any fuel or damage charges).</p>
          <p style="color:#78350f;font-size:12px;font-weight:600;margin:0 0 14px;background:#fef3c7;display:inline-block;padding:4px 10px;border-radius:6px;">Required before boarding</p>
          ${data.depositLink
            ? `<a href="${data.depositLink}" style="display:block;text-align:center;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;font-size:14px;font-weight:600;padding:14px 24px;border-radius:10px;text-decoration:none;box-shadow:0 2px 8px rgba(245,158,11,0.3);">Pay Refundable Deposit</a>`
            : `<p style="color:#92400e;font-size:13px;margin:0;">We'll send you a secure payment link shortly.</p>`}
        </div>
      </div>
    </div>

    <!-- 4. Inspection -->
    <div style="padding:0 30px 10px;">
      <div style="border:1px solid #d1fae5;border-radius:16px;overflow:hidden;">
        <div style="background:#ecfdf5;padding:16px 20px;">
          <table style="width:100%;"><tr>
            <td style="width:36px;vertical-align:middle;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:15px;font-weight:700;text-align:center;line-height:32px;">4</div></td>
            <td style="vertical-align:middle;">
              <p style="color:#065f46;font-size:15px;font-weight:700;margin:0;">Pre-Departure Inspection</p>
              <p style="color:#047857;font-size:12px;margin:4px 0 0;">Happens at the marina — we'll walk through the vessel together. No action needed now.</p>
            </td>
          </tr></table>
        </div>
      </div>
    </div>

    <div style="padding:20px 30px 0;text-align:center;color:#cbd5e1;font-size:16px;letter-spacing:8px;">~ ~ ~</div>

    <!-- Marina -->
    <div style="padding:24px 30px;">
      <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:16px;padding:24px;text-align:center;">
        <h3 style="color:#0c4a6e;font-size:16px;margin:0 0 4px;">Safe Harbor Marina</h3>
        <p style="color:#0369a1;font-size:14px;margin:0 0 4px;">80460 Overseas Hwy, Islamorada, FL 33036</p>
        <p style="color:#0369a1;font-size:13px;margin:0 0 14px;">Next to the Square Grouper — we'll meet you at the dock!</p>
        <a href="https://maps.google.com/?q=Safe+Harbor+Marina+Islamorada" style="display:inline-block;background:#0ea5e9;color:#ffffff;font-size:12px;font-weight:600;padding:8px 20px;border-radius:8px;text-decoration:none;">Open in Maps</a>
      </div>
    </div>

    <!-- Packing -->
    <div style="padding:0 30px 30px;">
      <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:16px;padding:24px;">
        <h3 style="color:#92400e;font-size:15px;margin:0 0 14px;text-align:center;">Don't Forget to Pack</h3>
        <table style="width:100%;"><tr>
          <td style="vertical-align:top;padding-right:10px;width:50%;">
            <p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Sunscreen (reef-safe)</p>
            <p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Polarized sunglasses</p>
            <p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Towels</p>
          </td>
          <td style="vertical-align:top;width:50%;">
            <p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Drinks & ice</p>
            <p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Dry bag for phones</p>
            <p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Good vibes only</p>
          </td>
        </tr></table>
      </div>
    </div>

    <div style="padding:0 30px 30px;text-align:center;">
      <p style="color:#475569;font-size:14px;margin:0 0 8px;">Got questions? We're a text away.</p>
      <a href="tel:7542542293" style="color:#0ea5e9;font-size:18px;font-weight:600;text-decoration:none;">(754) 254-2293</a>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">We usually reply within minutes</p>
    </div>

    <div style="background:#0c4a6e;padding:32px;text-align:center;">
      <p style="color:#ffffff;font-size:16px;font-weight:300;letter-spacing:2px;margin:0 0 2px;">BLUE SKIES</p>
      <div style="width:40px;height:2px;background:#f59e0b;margin:8px auto;"></div>
      <p style="color:#bae6fd;font-size:11px;letter-spacing:3px;margin:0 0 16px;text-transform:uppercase;">Boat Rentals</p>
      <p style="color:#7dd3fc;font-size:12px;margin:0 0 4px;">Islamorada, Florida Keys</p>
      <p style="color:#7dd3fc;font-size:11px;margin:0;">blueskiesboatrentals.com</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendWaiverPacket(data: WaiverPacketData) {
  if (!resend) {
    console.log('Resend not configured — skipping waiver packet email');
    return;
  }

  const subject = `Get ready for your trip — ${data.boatName} on ${formatDate(data.charterDate)}`;
  const html = waiverPacketHtml(data);

  try {
    const result: any = await resend.emails.send({
      from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
      replyTo: ADMIN_EMAIL,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,   // Serge gets a copy of every customer email
      subject,
      html,
    });
    console.log(`Waiver packet email sent to ${data.customerEmail}`);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'waiver_packet', subject, htmlBody: html,
      resendId: result?.data?.id, status: 'sent',
    });
  } catch (err: any) {
    console.error('Failed to send waiver packet email:', err);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'waiver_packet', subject, status: 'failed', error: err?.message,
    });
  }
}

// --- Pre-Trip Reminder (24h before charter date) ---

interface PreTripReminderData {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  boatName: string;
  charterDate: string;
  endDate?: string | null;
  duration: string;
  guestCount: number;
  depositAmount: number;
  // Readiness status
  agreementSigned: boolean;
  idUploaded: boolean;
  waiversSigned: number;
  waiversRequired: number;
  depositPaid: boolean;
  inspectionSigned: boolean;
  // Links for incomplete items
  renterLink: string;
  crewLink: string;
  depositLink: string | null;
}

function preTripReminderHtml(data: PreTripReminderData): string {
  const firstName = data.customerName.split(' ')[0];
  const dateStr = formatDate(data.charterDate);
  const amt = data.depositAmount.toLocaleString();

  const waiversOk = data.waiversRequired > 0 && data.waiversSigned >= data.waiversRequired;
  const allOk = data.agreementSigned && data.idUploaded && waiversOk && data.depositPaid;
  const pendingCount = [!data.agreementSigned, !data.idUploaded, !waiversOk, !data.depositPaid].filter(Boolean).length;

  const statusRow = (done: boolean, label: string, detail: string, actionUrl?: string | null, actionLabel?: string) => `
    <div style="padding:12px 20px;border-top:1px solid #f1f5f9;${!done ? 'background:#fff7ed;' : ''}">
      <table style="width:100%;"><tr>
        <td style="width:28px;vertical-align:middle;"><span style="color:${done ? '#10b981' : '#f59e0b'};font-size:18px;">${done ? '&#10003;' : '&#9679;'}</span></td>
        <td style="vertical-align:middle;">
          <span style="color:${done ? '#065f46' : '#92400e'};font-size:14px;font-weight:600;">${label}</span>
          <span style="color:${done ? '#10b981' : '#f59e0b'};font-size:12px;font-weight:500;"> — ${detail}</span>
          ${!done && actionUrl ? `<div style="margin-top:8px;"><a href="${actionUrl}" style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:12px;font-weight:600;padding:6px 16px;border-radius:6px;text-decoration:none;">${actionLabel || 'Complete now'}</a></div>` : ''}
        </td>
      </tr></table>
    </div>`;

  const readinessSection = allOk
    ? `<div style="padding:0 30px 24px;">
        <div style="border:2px solid #d1fae5;border-radius:16px;overflow:hidden;">
          <div style="background:#ecfdf5;padding:20px;text-align:center;">
            <p style="color:#065f46;font-size:18px;font-weight:700;margin:0;">&#10003; You're all set — see you tomorrow!</p>
            <p style="color:#047857;font-size:13px;margin:8px 0 0;">Everything is completed. Just show up and enjoy your day.</p>
          </div>
        </div>
      </div>`
    : `<div style="padding:0 30px 24px;">
        <div style="border:2px solid #fde68a;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);padding:16px 20px;text-align:center;">
            <p style="color:#92400e;font-size:14px;font-weight:700;margin:0;">&#9888;&#65039; ${pendingCount} item${pendingCount > 1 ? 's' : ''} still need${pendingCount === 1 ? 's' : ''} your attention</p>
          </div>
          <div style="padding:0;">
            ${statusRow(data.agreementSigned, 'Rental Agreement', data.agreementSigned ? 'signed' : 'not signed', !data.agreementSigned ? data.renterLink : null, 'Sign now')}
            ${statusRow(data.idUploaded, 'Government ID', data.idUploaded ? 'uploaded' : 'not uploaded', !data.idUploaded ? data.renterLink : null, 'Upload ID')}
            ${statusRow(waiversOk, 'Safety Waivers', `${data.waiversSigned} of ${data.waiversRequired} signed`, !waiversOk ? data.crewLink : null, 'Send reminder to crew')}
            ${statusRow(data.depositPaid, 'Security Deposit', data.depositPaid ? 'paid' : 'not paid', !data.depositPaid ? data.depositLink : null, `Pay $${amt} deposit`)}
          </div>
        </div>
      </div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);padding:36px 30px;text-align:center;">
      <h1 style="color:#ffffff;font-size:36px;margin:0 0 6px;font-weight:200;letter-spacing:6px;text-transform:uppercase;">BLUE SKIES</h1>
      <div style="width:50px;height:2px;background:#f59e0b;margin:0 auto 8px;"></div>
      <p style="color:#f59e0b;font-size:11px;letter-spacing:5px;margin:0;text-transform:uppercase;font-weight:600;">Boat Rentals</p>
      <p style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">Islamorada &bull; Florida Keys</p>
    </div>

    <img src="https://www.blueskiesboatrentals.com/hero-keys-view.jpg" alt="Florida Keys" style="width:100%;max-height:180px;object-fit:cover;display:block;" />

    <div style="background:linear-gradient(135deg,#064e3b,#0c4a6e);padding:30px;text-align:center;">
      <p style="color:#f59e0b;font-size:13px;letter-spacing:4px;margin:0 0 10px;text-transform:uppercase;font-weight:600;">Tomorrow is the day</p>
      <h2 style="color:#ffffff;font-size:28px;margin:0;font-weight:300;line-height:1.3;">Your trip is tomorrow, ${firstName}!</h2>
      <p style="color:#7dd3fc;font-size:15px;margin:10px 0 0;font-weight:300;">The boat is fueled, cleaned, and ready to go.</p>
    </div>

    <!-- Trip Card -->
    <div style="padding:24px 30px;">
      <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);border-radius:16px;padding:24px;color:#ffffff;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Boat</td><td style="padding:6px 0;color:#ffffff;font-size:15px;font-weight:600;text-align:right;">${data.boatName}</td></tr>
          <tr><td style="padding:6px 0;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Date</td><td style="padding:6px 0;color:#ffffff;font-size:15px;font-weight:600;text-align:right;">${dateStr}</td></tr>
          <tr><td style="padding:6px 0;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Duration</td><td style="padding:6px 0;color:#ffffff;font-size:15px;font-weight:600;text-align:right;">${durationLabels[data.duration] || data.duration}</td></tr>
          <tr><td style="padding:6px 0;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Guests</td><td style="padding:6px 0;color:#ffffff;font-size:15px;font-weight:600;text-align:right;">${data.guestCount}</td></tr>
          <tr><td colspan="2" style="padding:12px 0 0;"><div style="border-top:1px solid rgba(255,255,255,0.2);padding-top:12px;"><span style="color:#7dd3fc;font-size:11px;letter-spacing:1px;">CONFIRMATION</span><span style="color:#ffffff;font-size:14px;font-weight:600;float:right;font-family:monospace;letter-spacing:1px;">${data.bookingRef}</span></div></td></tr>
        </table>
      </div>
    </div>

    <!-- Readiness -->
    ${readinessSection}

    <!-- Marina -->
    <div style="padding:0 30px 24px;">
      <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:16px;padding:24px;">
        <h3 style="color:#0c4a6e;font-size:16px;margin:0 0 12px;text-align:center;">Where to Meet Us</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:90px;">Marina</td><td style="padding:8px 0;color:#0c4a6e;font-size:14px;font-weight:600;">Safe Harbor Marina</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;border-top:1px solid #bae6fd;">Address</td><td style="padding:8px 0;color:#0c4a6e;font-size:14px;font-weight:600;border-top:1px solid #bae6fd;">80460 Overseas Hwy, Islamorada, FL 33036</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px;border-top:1px solid #bae6fd;">Landmark</td><td style="padding:8px 0;color:#0c4a6e;font-size:14px;border-top:1px solid #bae6fd;">Next to the Square Grouper restaurant</td></tr>
        </table>
        <div style="text-align:center;margin-top:16px;">
          <a href="https://maps.google.com/?q=Safe+Harbor+Marina+Islamorada" style="display:inline-block;background:#0ea5e9;color:#ffffff;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;">Get Directions</a>
        </div>
      </div>
    </div>

    <!-- Packing -->
    <div style="padding:0 30px 24px;">
      <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:16px;padding:24px;">
        <h3 style="color:#92400e;font-size:15px;margin:0 0 14px;text-align:center;">Pack the Night Before</h3>
        <table style="width:100%;"><tr>
          <td style="vertical-align:top;padding-right:10px;width:50%;"><p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Sunscreen (reef-safe)</p><p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Polarized sunglasses</p><p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Towels</p></td>
          <td style="vertical-align:top;width:50%;"><p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Drinks & ice</p><p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Dry bag for phones</p><p style="color:#78350f;font-size:13px;margin:5px 0;">&#9745; Good vibes only</p></td>
        </tr></table>
      </div>
    </div>

    <!-- Tips -->
    <div style="padding:0 30px 30px;">
      <div style="border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
        <h3 style="color:#0f172a;font-size:15px;margin:0 0 14px;text-align:center;">Quick Tips for a Great Day</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;vertical-align:top;width:30px;font-size:16px;">&#9981;</td><td style="padding:8px 0;color:#475569;font-size:13px;line-height:1.5;"><strong style="color:#0f172a;">Fuel up.</strong> The boat leaves with a full tank — please return it full. There's a fuel dock right at the marina.</td></tr>
          <tr><td style="padding:8px 0;vertical-align:top;width:30px;font-size:16px;border-top:1px solid #f1f5f9;">&#9875;</td><td style="padding:8px 0;color:#475569;font-size:13px;line-height:1.5;border-top:1px solid #f1f5f9;"><strong style="color:#0f172a;">Watch the shallows.</strong> The Keys have beautiful but tricky waters. Stay in marked channels and watch your depth.</td></tr>
          <tr><td style="padding:8px 0;vertical-align:top;width:30px;font-size:16px;border-top:1px solid #f1f5f9;">&#127774;</td><td style="padding:8px 0;color:#475569;font-size:13px;line-height:1.5;border-top:1px solid #f1f5f9;"><strong style="color:#0f172a;">Apply early.</strong> Put on sunscreen before you board — the Keys sun is no joke, even on cloudy days.</td></tr>
        </table>
      </div>
    </div>

    <div style="padding:0 30px 30px;text-align:center;">
      <p style="color:#475569;font-size:14px;margin:0 0 4px;">Need to reach us tomorrow morning?</p>
      <a href="tel:7542542293" style="color:#0ea5e9;font-size:18px;font-weight:600;text-decoration:none;">(754) 254-2293</a>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Call or text — we'll be at the marina waiting for you</p>
    </div>

    <div style="background:#0c4a6e;padding:32px;text-align:center;">
      <p style="color:#ffffff;font-size:16px;font-weight:300;letter-spacing:2px;margin:0 0 2px;">BLUE SKIES</p>
      <div style="width:40px;height:2px;background:#f59e0b;margin:8px auto;"></div>
      <p style="color:#bae6fd;font-size:11px;letter-spacing:3px;margin:0 0 16px;text-transform:uppercase;">Boat Rentals</p>
      <p style="color:#7dd3fc;font-size:12px;margin:0 0 4px;">Islamorada, Florida Keys</p>
      <p style="color:#7dd3fc;font-size:11px;margin:0;">blueskiesboatrentals.com</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendPreTripReminder(data: PreTripReminderData) {
  if (!resend) {
    console.log('Resend not configured — skipping pre-trip reminder');
    return;
  }

  const subject = `Your trip is tomorrow — ${data.boatName} on ${formatDate(data.charterDate)}`;
  const html = preTripReminderHtml(data);

  try {
    const result: any = await resend.emails.send({
      from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
      replyTo: ADMIN_EMAIL,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,   // Serge gets a copy of every customer email
      subject,
      html,
    });
    console.log(`Pre-trip reminder sent to ${data.customerEmail}`);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'pre_trip_reminder', subject, htmlBody: html,
      resendId: result?.data?.id, status: 'sent',
    });
  } catch (err: any) {
    console.error('Failed to send pre-trip reminder:', err);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'pre_trip_reminder', subject, status: 'failed', error: err?.message,
    });
  }
}

// --- Deposit Settlement Email ---

interface DepositSettlementData {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  boatName: string;
  charterDate: string;
  depositAmount: number;
  deductions: number;
  deductionsNote?: string | null;
  refundAmount: number;
}

// Renders the deposit-settlement email — used by the admin "send me a sample"
// preview so the exact customer-facing email can be reviewed before it's real.
export function renderDepositSettlement(data: DepositSettlementData): string {
  return depositSettlementHtml(data);
}

function depositSettlementHtml(data: DepositSettlementData): string {
  const firstName = data.customerName.split(' ')[0];
  const dateStr = formatDate(data.charterDate);
  const hasDeductions = data.deductions > 0;
  const reviewUrl = process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/CUDyegV9v1xaEBM/review';

  // Parse deductions note into line items (format: "Fuel $85.00, Damage $150.00")
  // One deduction per line. Newlines win when present — splitting on commas as well
  // tore a reason in half ("Fuel — returned under half a tank, cost to refill" became
  // two rows). Commas remain the fallback only for older, comma-separated notes.
  const rawNote = data.deductionsNote?.trim();
  const deductionItems = rawNote
    ? (rawNote.includes('\n') ? rawNote.split(/\r?\n/) : rawNote.split(','))
        .map(s => s.trim()).filter(Boolean)
    : [`Deductions: ${money(data.deductions)}`];

  const deductionsSection = hasDeductions ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:12px 0;">
        <p style="color:#991b1b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Deductions</p>
        <table style="width:100%;border-collapse:collapse;">
          ${deductionItems.map((item, i) => `<tr><td style="padding:6px 0;color:#7f1d1d;font-size:14px;${i > 0 ? 'border-top:1px solid #fecaca;' : ''}">${item}</td></tr>`).join('')}
        </table>
        <div style="border-top:1px solid #fca5a5;margin-top:8px;padding-top:8px;">
          <table style="width:100%;"><tr>
            <td style="color:#991b1b;font-size:14px;font-weight:600;">Total Deductions</td>
            <td style="color:#991b1b;font-size:14px;font-weight:600;text-align:right;">- ${money(data.deductions)}</td>
          </tr></table>
        </div>
      </div>` : '';

  const refundSection = hasDeductions
    ? `<div style="background:#ecfdf5;border:2px solid #10b981;border-radius:12px;padding:20px;text-align:center;margin-top:12px;">
        <p style="color:#065f46;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Refund to Your Card</p>
        <p style="color:#065f46;font-size:36px;font-weight:700;margin:0;">${money(data.refundAmount)}</p>
        <p style="color:#047857;font-size:13px;margin:8px 0 0;">Refund issued via Stripe — typically arrives in 5–10 business days depending on your bank.</p>
      </div>`
    : `<div style="background:#ecfdf5;border:2px solid #10b981;border-radius:12px;padding:24px;text-align:center;margin-top:12px;">
        <p style="color:#065f46;font-size:15px;font-weight:600;margin:0 0 4px;">Great news — full refund!</p>
        <p style="color:#065f46;font-size:36px;font-weight:700;margin:8px 0;">${money(data.refundAmount)}</p>
        <p style="color:#047857;font-size:13px;margin:8px 0 0;">The vessel passed inspection with flying colors. Your full deposit is on its way back — typically 5–10 business days.</p>
      </div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);padding:36px 30px;text-align:center;">
      <h1 style="color:#ffffff;font-size:36px;margin:0 0 6px;font-weight:200;letter-spacing:6px;text-transform:uppercase;">BLUE SKIES</h1>
      <div style="width:50px;height:2px;background:#f59e0b;margin:0 auto 8px;"></div>
      <p style="color:#f59e0b;font-size:11px;letter-spacing:5px;margin:0;text-transform:uppercase;font-weight:600;">Boat Rentals</p>
      <p style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">Islamorada &bull; Florida Keys</p>
    </div>

    <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);padding:28px 30px;text-align:center;border-bottom:1px solid #a7f3d0;">
      <p style="color:#065f46;font-size:14px;font-weight:700;margin:0 0 4px;">Your security deposit has been settled</p>
      <p style="color:#047857;font-size:13px;margin:0;">Here's the full breakdown, ${firstName}.</p>
    </div>

    <div style="padding:24px 30px 0;">
      <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748b;font-size:13px;">Trip</td><td style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;font-family:monospace;">${data.bookingRef}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding-top:6px;">Boat</td><td style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;padding-top:6px;">${data.boatName}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding-top:6px;">Charter Date</td><td style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;padding-top:6px;">${dateStr}</td></tr>
        </table>
      </div>
    </div>

    <div style="padding:24px 30px;">
      <h3 style="color:#0f172a;font-size:16px;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #10b981;padding-bottom:8px;">Deposit Summary</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;color:#0f172a;font-size:15px;font-weight:600;">Security Deposit Collected</td>
          <td style="padding:12px 0;color:#0f172a;font-size:15px;font-weight:600;text-align:right;">${money(data.depositAmount)}</td>
        </tr>
      </table>
      ${deductionsSection}
      ${refundSection}
    </div>

    <div style="padding:0 30px 10px;text-align:center;color:#cbd5e1;font-size:16px;letter-spacing:8px;">~ ~ ~</div>

    <div style="padding:10px 30px 24px;text-align:center;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 6px;">Thanks for taking care of ${data.boatName}, ${firstName}!</p>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">We put a lot into making every trip right — the boats, the experience, all of it. If we delivered, a quick Google review goes a long way in helping other people find us. Takes about 30 seconds.</p>
      <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;box-shadow:0 2px 8px rgba(245,158,11,0.3);">Leave Us a Review &#11088;</a>
    </div>

    <div style="padding:0 30px 30px;text-align:center;">
      <p style="color:#64748b;font-size:13px;margin:0 0 4px;">Questions about your deposit? Just reply to this email or text us.</p>
      <a href="tel:7542542293" style="color:#0ea5e9;font-size:15px;font-weight:600;text-decoration:none;">(754) 254-2293</a>
    </div>

    <div style="background:#0c4a6e;padding:32px;text-align:center;">
      <p style="color:#ffffff;font-size:16px;font-weight:300;letter-spacing:2px;margin:0 0 2px;">BLUE SKIES</p>
      <div style="width:40px;height:2px;background:#f59e0b;margin:8px auto;"></div>
      <p style="color:#bae6fd;font-size:11px;letter-spacing:3px;margin:0 0 16px;text-transform:uppercase;">Boat Rentals</p>
      <p style="color:#7dd3fc;font-size:12px;margin:0 0 4px;">Islamorada, Florida Keys</p>
      <p style="color:#7dd3fc;font-size:11px;margin:0;">blueskiesboatrentals.com</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendDepositSettlement(data: DepositSettlementData) {
  if (!resend) {
    console.log('Resend not configured — skipping deposit settlement email');
    return;
  }

  const subject = data.deductions > 0
    ? `Your deposit has been settled — ${money(data.refundAmount)} refunded`
    : `Your full deposit of ${money(data.refundAmount)} has been refunded`;
  const html = depositSettlementHtml(data);

  try {
    const result: any = await resend.emails.send({
      from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
      replyTo: ADMIN_EMAIL,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,   // Serge gets a copy of every customer email
      subject,
      html,
    });
    console.log(`Deposit settlement email sent to ${data.customerEmail}`);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'deposit_settlement', subject, htmlBody: html,
      resendId: result?.data?.id, status: 'sent',
    });
  } catch (err: any) {
    console.error('Failed to send deposit settlement email:', err);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'deposit_settlement', subject, status: 'failed', error: err?.message,
    });
  }
}

// --- Post-Trip Rebook Nudge (~7 days after trip) ---

interface RebookNudgeData {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  boatName: string;
  loyaltyPointsEarned: number;
  totalLoyaltyPoints: number;
}

function rebookNudgeHtml(data: RebookNudgeData): string {
  const firstName = data.customerName.split(' ')[0];
  const reviewUrl = process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/CUDyegV9v1xaEBM/review';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);padding:36px 30px;text-align:center;">
      <h1 style="color:#ffffff;font-size:36px;margin:0 0 6px;font-weight:200;letter-spacing:6px;text-transform:uppercase;">BLUE SKIES</h1>
      <div style="width:50px;height:2px;background:#f59e0b;margin:0 auto 8px;"></div>
      <p style="color:#f59e0b;font-size:11px;letter-spacing:5px;margin:0;text-transform:uppercase;font-weight:600;">Boat Rentals</p>
      <p style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:3px;margin:6px 0 0;text-transform:uppercase;">Islamorada &bull; Florida Keys</p>
    </div>

    <img src="https://www.blueskiesboatrentals.com/boat-sunset.jpeg" alt="Sunset on the water" style="width:100%;max-height:200px;object-fit:cover;display:block;" />

    <div style="background:linear-gradient(135deg,#0c4a6e,#064e3b);padding:28px 30px;text-align:center;">
      <p style="color:#f59e0b;font-size:13px;letter-spacing:4px;margin:0 0 10px;text-transform:uppercase;font-weight:600;">Thanks again, ${firstName}</p>
      <h2 style="color:#ffffff;font-size:24px;margin:0;font-weight:300;line-height:1.3;">Hope the Keys treated you right.</h2>
    </div>

    <div style="padding:30px 30px 20px;">
      <p style="color:#334155;font-size:16px;line-height:1.8;margin:0;">Just wanted to say thanks for spending the day aboard <strong>${data.boatName}</strong>. We hope it was everything you wanted it to be — and then some.</p>
    </div>

    <!-- Loyalty Points -->
    <div style="padding:0 30px 24px;">
      <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a;border-radius:16px;overflow:hidden;">
        <div style="padding:24px;text-align:center;">
          <p style="color:#92400e;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">You Earned</p>
          <p style="color:#78350f;font-size:44px;font-weight:700;margin:0;line-height:1;">${data.loyaltyPointsEarned.toLocaleString()}</p>
          <p style="color:#92400e;font-size:14px;margin:6px 0 0;">loyalty points on this trip</p>
        </div>
        <div style="background:#fef3c7;padding:20px 24px;border-top:1px solid #fde68a;text-align:center;">
          <p style="color:#78350f;font-size:14px;line-height:1.6;margin:0 0 16px;">Create your free account to lock in your points. They'll be waiting for you whenever you're ready to book again — and they add up toward discounts on future trips.</p>
          <a href="https://blueskiesboatrentals.com/my-bookings" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;box-shadow:0 2px 8px rgba(245,158,11,0.3);">Claim My Points</a>
        </div>
      </div>
    </div>

    <!-- Review -->
    <div style="padding:0 30px 24px;">
      <div style="border:1px solid #e2e8f0;border-radius:16px;padding:24px;text-align:center;">
        <p style="color:#0f172a;font-size:16px;font-weight:600;margin:0 0 8px;">One more thing</p>
        <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 16px;">If you had a good experience, a quick Google review really helps other people find us. Takes about 30 seconds — and we genuinely read every one.</p>
        <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">Leave a Review</a>
      </div>
    </div>

    <!-- Feedback -->
    <div style="padding:0 30px 24px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:24px;text-align:center;">
        <p style="color:#0f172a;font-size:16px;font-weight:600;margin:0 0 8px;">How can we do better?</p>
        <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">We're always looking to improve the experience. If there's anything we could have done differently — big or small — we'd love to hear it. Just hit reply and let us know.</p>
      </div>
    </div>

    <!-- Referral -->
    <div style="padding:0 30px 30px;">
      <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd;border-radius:16px;padding:24px;text-align:center;">
        <p style="color:#0c4a6e;font-size:16px;font-weight:600;margin:0 0 10px;">Send a friend, you both win</p>
        <table style="width:100%;max-width:340px;margin:0 auto 16px;border-collapse:collapse;">
          <tr>
            <td style="padding:12px;text-align:center;width:50%;">
              <p style="color:#0369a1;font-size:28px;font-weight:700;margin:0;">$100</p>
              <p style="color:#0c4a6e;font-size:12px;margin:4px 0 0;">off your next trip</p>
            </td>
            <td style="padding:12px;text-align:center;width:50%;border-left:1px solid #bae6fd;">
              <p style="color:#0369a1;font-size:28px;font-weight:700;margin:0;">$50</p>
              <p style="color:#0c4a6e;font-size:12px;margin:4px 0 0;">off for your friend</p>
            </td>
          </tr>
        </table>
        <p style="color:#0369a1;font-size:13px;line-height:1.6;margin:0;">Just have them mention your name when they book. Once their trip is confirmed, your $100 credit is locked in.</p>
      </div>
    </div>

    <div style="padding:0 30px 30px;text-align:center;">
      <p style="color:#94a3b8;font-size:13px;margin:0;">Questions? <a href="tel:7542542293" style="color:#0ea5e9;text-decoration:none;font-weight:600;">(754) 254-2293</a></p>
    </div>

    <div style="background:#0c4a6e;padding:32px;text-align:center;">
      <p style="color:#ffffff;font-size:16px;font-weight:300;letter-spacing:2px;margin:0 0 2px;">BLUE SKIES</p>
      <div style="width:40px;height:2px;background:#f59e0b;margin:8px auto;"></div>
      <p style="color:#bae6fd;font-size:11px;letter-spacing:3px;margin:0 0 16px;text-transform:uppercase;">Boat Rentals</p>
      <p style="color:#7dd3fc;font-size:12px;margin:0 0 12px;">Islamorada, Florida Keys</p>
      <a href="tel:7542542293" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">(754) 254-2293</a>
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.15);">
        <a href="https://instagram.com/blueskiescharter" style="color:#7dd3fc;font-size:12px;text-decoration:none;margin:0 12px;">Instagram</a>
        <a href="https://tiktok.com/@blueskiescharter" style="color:#7dd3fc;font-size:12px;text-decoration:none;margin:0 12px;">TikTok</a>
        <a href="https://blueskiesboatrentals.com" style="color:#7dd3fc;font-size:12px;text-decoration:none;margin:0 12px;">Website</a>
      </div>
      <p style="color:rgba(255,255,255,0.3);font-size:10px;margin:20px 0 0;">You received this because you booked with Blue Skies Boat Rentals.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendRebookNudge(data: RebookNudgeData) {
  if (!resend) {
    console.log('Resend not configured — skipping rebook nudge');
    return;
  }

  const firstName = data.customerName.split(' ')[0];
  const subject = `Thanks again, ${firstName} — you earned ${data.loyaltyPointsEarned.toLocaleString()} points`;
  const html = rebookNudgeHtml(data);

  try {
    const result: any = await resend.emails.send({
      from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
      replyTo: ADMIN_EMAIL,
      to: data.customerEmail,
      bcc: ADMIN_EMAIL,   // Serge gets a copy of every customer email
      subject,
      html,
    });
    console.log(`Rebook nudge sent to ${data.customerEmail}`);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'custom', subject, htmlBody: html,
      resendId: result?.data?.id, status: 'sent',
    });
  } catch (err: any) {
    console.error('Failed to send rebook nudge:', err);
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'custom', subject, status: 'failed', error: err?.message,
    });
  }
}

export async function sendMarketingEmail(data: MarketingEmailData) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const html = marketingEmailHtml(data);
  const result: any = await resend.emails.send({
    from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
    replyTo: ADMIN_EMAIL,
    to: data.to,
    bcc: ADMIN_EMAIL,   // Serge gets a copy of every customer email
    subject: data.subject,
    html,
  });

  if (result?.error) {
    await logEmail({
      bookingRef: data.bookingRef ?? null,
      customerEmail: data.to, customerName: data.name,
      type: 'marketing', subject: data.subject, htmlBody: html,
      status: 'failed', error: result.error.message ?? JSON.stringify(result.error),
    });
    throw new Error(result.error.message ?? JSON.stringify(result.error));
  }

  console.log(`Marketing email sent to ${data.to}`);
  await logEmail({
    bookingRef: data.bookingRef ?? null,
    customerEmail: data.to, customerName: data.name,
    type: 'marketing', subject: data.subject, htmlBody: html,
    resendId: result?.data?.id, status: 'sent',
  });
  return result;
}

// --- Admin diagnostics ---
export function getEmailStatus() {
  return { configured: !!resend, fromEmail: FROM_EMAIL, adminEmail: ADMIN_EMAIL };
}

// Sends a test email and returns the real outcome (including Resend's error
// message) so the admin can see exactly what's wrong.
export async function sendTestEmail(to: string): Promise<{ ok: boolean; message: string }> {
  if (!resend) {
    return { ok: false, message: 'RESEND_API_KEY is not set in the environment — add it in Render, then redeploy.' };
  }
  try {
    const result: any = await resend.emails.send({
      from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
      to,
      subject: 'Blue Skies — test email',
      html: '<p>✅ This is a test from your Blue Skies admin. If you received this, your email sending is working.</p>',
    });
    if (result?.error) {
      return { ok: false, message: result.error.message ?? JSON.stringify(result.error) };
    }
    return { ok: true, message: `Sent to ${to} (id: ${result?.data?.id ?? 'n/a'}). Check the inbox (and spam).` };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? String(err) };
  }
}

// --- Readiness nudge (7 / 3 / 1 days before the trip) ---
//
// Chases a customer who hasn't finished their pre-boarding steps. Previously the
// ONLY follow-up was the pre-trip reminder the day before the charter — so an OTA
// guest who booked three weeks out and ignored the welcome email heard nothing for
// twenty days, and we were chasing a signature the night before the trip.

export interface ReadinessNudgeData {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  boatName: string;
  charterDate: string;
  daysOut: number;
  depositAmount: number;
  missing: {
    agreement: boolean;
    id: boolean;
    waivers: boolean;
    deposit: boolean;
  };
  renterLink: string;
  crewLink: string;
  depositLink: string | null;
}

function readinessNudgeHtml(data: ReadinessNudgeData): string {
  const firstName = data.customerName.split(' ')[0];
  const dateStr = formatDate(data.charterDate);
  const urgent = data.daysOut <= 1;

  const btn = (href: string, label: string) =>
    `<a href="${href}" style="display:block;text-align:center;background:#0ea5e9;color:#ffffff;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>`;

  const items: string[] = [];
  if (data.missing.agreement) {
    items.push(`<tr><td style="padding:0 0 12px;">
      <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 8px;">Sign your rental agreement</p>
      ${btn(data.renterLink, 'Sign Rental Agreement')}
    </td></tr>`);
  }
  if (data.missing.id) {
    items.push(`<tr><td style="padding:0 0 12px;">
      <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 8px;">Upload your photo ID</p>
      ${btn(data.renterLink, 'Upload ID')}
    </td></tr>`);
  }
  if (data.missing.waivers) {
    items.push(`<tr><td style="padding:0 0 12px;">
      <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 4px;">Waivers for everyone on board</p>
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Share this with your crew — each guest signs from their phone.</p>
      ${btn(data.crewLink, 'Crew Waiver Link')}
    </td></tr>`);
  }
  if (data.missing.deposit && data.depositLink) {
    items.push(`<tr><td style="padding:0 0 12px;">
      <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 4px;">Refundable security deposit</p>
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Fully refunded after your post-trip inspection.</p>
      ${btn(data.depositLink, `Pay $${data.depositAmount.toLocaleString()} Security Deposit`)}
    </td></tr>`);
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#0c4a6e;padding:24px 30px;text-align:center;">
      <h1 style="color:#ffffff;font-size:26px;margin:0;font-weight:300;letter-spacing:3px;">BLUE SKIES</h1>
      <div style="width:50px;height:2px;background:#f59e0b;margin:8px auto;"></div>
      <p style="color:#bae6fd;font-size:11px;letter-spacing:4px;margin:0;text-transform:uppercase;">Boat Rentals</p>
    </div>

    <div style="background:${urgent ? '#fef2f2' : '#fffbeb'};padding:14px 30px;text-align:center;border-bottom:1px solid ${urgent ? '#fecaca' : '#fde68a'};">
      <p style="color:${urgent ? '#b91c1c' : '#92400e'};font-size:14px;font-weight:600;margin:0;">
        ${urgent
          ? `Your charter is TOMORROW — we still need a few things`
          : `Your charter is in ${data.daysOut} days — a few things still to do`}
      </p>
    </div>

    <div style="padding:32px 30px 24px;">
      <p style="color:#0f172a;font-size:22px;line-height:1.3;margin:0 0 16px;font-weight:300;">Hey ${firstName},</p>
      <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px;">
        You're booked on the <strong>${data.boatName}</strong> for <strong>${dateStr}</strong> — we're looking forward to it.
        Before you can board, we just need you to finish the items below.
        ${urgent ? `<strong>These need to be done before you arrive at the dock.</strong>` : `It only takes a few minutes.`}
      </p>

      <table width="100%" cellpadding="0" cellspacing="0">${items.join('')}</table>

      <p style="color:#64748b;font-size:14px;line-height:1.7;margin:20px 0 0;">
        Already done some of these? Then you can ignore whatever's finished — this only lists what's still outstanding.
        Questions? Just reply to this email.
      </p>

      <p style="color:#334155;font-size:16px;line-height:1.6;margin:28px 0 0;">
        See you on the water,<br>
        <strong style="color:#0c4a6e;">The Blue Skies Team</strong><br>
        <span style="color:#94a3b8;font-size:14px;">Blue Skies Boat Rentals · Islamorada, FL</span>
      </p>
    </div>

    <div style="background:#0c4a6e;padding:20px 30px;text-align:center;">
      <p style="color:#bae6fd;font-size:12px;margin:0;">Islamorada, Florida Keys · Trip ${data.bookingRef}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendReadinessNudge(data: ReadinessNudgeData) {
  if (!resend) throw new Error('RESEND_API_KEY is not configured');

  const html = readinessNudgeHtml(data);
  const subject = data.daysOut <= 1
    ? `Tomorrow's charter — we still need a few things (${data.bookingRef})`
    : `${data.daysOut} days to your charter — a few things to finish (${data.bookingRef})`;

  const result: any = await resend.emails.send({
    from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
    replyTo: ADMIN_EMAIL,
    to: data.customerEmail,
    bcc: ADMIN_EMAIL,
    subject,
    html,
  });

  if (result?.error) {
    await logEmail({
      bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
      type: 'pre_trip_reminder', subject, htmlBody: html,
      status: 'failed', error: result.error.message ?? JSON.stringify(result.error),
    });
    throw new Error(result.error.message ?? JSON.stringify(result.error));
  }

  await logEmail({
    bookingRef: data.bookingRef, customerEmail: data.customerEmail, customerName: data.customerName,
    type: 'pre_trip_reminder', subject, htmlBody: html,
    resendId: result?.data?.id, status: 'sent',
  });
  return result;
}

// Heads-up to Serge when a trip is 1 day out and STILL incomplete — the one
// where he may need to pick up the phone.
export async function sendReadinessAlert(data: {
  bookings: Array<{ bookingRef: string; customerName: string; customerPhone: string | null; boatName: string; missing: string[] }>;
}) {
  if (!resend || data.bookings.length === 0) return;

  const rows = data.bookings.map(b => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">
        <strong style="color:#0f172a;">${b.customerName}</strong><br>
        <span style="color:#64748b;font-size:13px;">${b.bookingRef} · ${b.boatName}${b.customerPhone ? ` · ${b.customerPhone}` : ''}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#b91c1c;font-size:13px;">
        ${b.missing.join('<br>')}
      </td>
    </tr>`).join('');

  await resend.emails.send({
    from: `Blue Skies Alerts <${FROM_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: `⚠️ ${data.bookings.length} trip(s) tomorrow still incomplete`,
    html: `
      <h2 style="color:#0f172a;font-family:sans-serif;">Trips tomorrow with outstanding items</h2>
      <p style="color:#475569;font-family:sans-serif;font-size:14px;">
        These customers have been emailed. You may want to call them.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family:sans-serif;border-collapse:collapse;">
        <tr style="background:#f1f5f9;">
          <th align="left" style="padding:10px 12px;font-size:12px;text-transform:uppercase;color:#64748b;">Customer</th>
          <th align="left" style="padding:10px 12px;font-size:12px;text-transform:uppercase;color:#64748b;">Still missing</th>
        </tr>
        ${rows}
      </table>`,
  });
}
