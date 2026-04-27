import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'bookings@blueskiesboatrentals.com';
const ADMIN_EMAIL = 'info@blueskiescharter.com';

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
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
            <td style="padding:6px 0;color:#0f172a;font-size:14px;text-align:right;">$${data.subtotal.toFixed(2)}</td>
          </tr>
          ${data.captainFee > 0 ? `<tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px;">Captain Fee</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;text-align:right;">$${data.captainFee.toFixed(2)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:14px;">Tax</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;text-align:right;">$${data.tax.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;color:#0f172a;font-size:18px;font-weight:700;border-top:2px solid #e2e8f0;">Total</td>
            <td style="padding:12px 0 0;color:#0f172a;font-size:18px;font-weight:700;text-align:right;border-top:2px solid #e2e8f0;">$${data.total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>

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
      <a href="tel:5155870438" style="color:#0ea5e9;font-size:15px;font-weight:600;text-decoration:none;">(515) 587-0438</a>
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
      <tr style="border-top:2px solid #e2e8f0;"><td style="padding:12px 0;color:#0f172a;font-size:16px;font-weight:700;">Total</td><td style="padding:12px 0;font-size:16px;font-weight:700;">$${data.total.toFixed(2)}</td></tr>
    </table>

    <p style="color:#64748b;font-size:13px;margin-top:20px;">View in admin: <a href="https://blueskiesboatrentals.com/admin/bookings">Admin Panel</a></p>
  </div>
</body>
</html>`;
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  if (!resend) {
    console.log('Resend not configured — skipping booking emails');
    return;
  }

  try {
    // Send customer confirmation
    await resend.emails.send({
      from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `Booking Confirmed — ${data.boatName} on ${formatDate(data.charterDate)}`,
      html: customerConfirmationHtml(data),
    });
    console.log(`Confirmation email sent to ${data.customerEmail}`);

    // Send admin notification
    await resend.emails.send({
      from: `Blue Skies Bookings <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `New Booking: ${data.bookingRef} — ${data.customerName} — $${data.total.toFixed(2)}`,
      html: adminNotificationHtml(data),
    });
    console.log(`Admin notification sent to ${ADMIN_EMAIL}`);
  } catch (err) {
    console.error('Failed to send booking email:', err);
  }
}
