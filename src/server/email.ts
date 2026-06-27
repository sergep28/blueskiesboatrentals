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
  pointsEarned?: number;
  totalPoints?: number;
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
      <tr style="border-top:2px solid #e2e8f0;"><td style="padding:12px 0;color:#0f172a;font-size:16px;font-weight:700;">Total</td><td style="padding:12px 0;font-size:16px;font-weight:700;">$${data.total.toFixed(2)}</td></tr>
    </table>

    <p style="color:#64748b;font-size:13px;margin-top:20px;">View in admin: <a href="https://blueskiesboatrentals.com/admin/bookings">Admin Panel</a></p>
  </div>
</body>
</html>`;
}

export async function sendReviewRequest(data: { customerName: string; customerEmail: string; boatName: string; charterDate: string }) {
  if (!resend) {
    console.log('Resend not configured — skipping review request email');
    return;
  }

  const firstName = data.customerName.split(' ')[0];
  // Set GOOGLE_REVIEW_URL to your Google Business "Ask for reviews" link
  // (e.g. https://g.page/r/XXXX/review) so the button opens the write-a-review box.
  const reviewUrl = process.env.GOOGLE_REVIEW_URL || 'https://www.google.com/maps/place/Blue+Skies+Charter+Florida+Keys/?hl=en';

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

  try {
    await resend.emails.send({
      from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
      replyTo: ADMIN_EMAIL,
      to: data.customerEmail,
      subject: 'How was your day on the water?',
      html,
    });
    console.log(`Review request email sent to ${data.customerEmail}`);
  } catch (err) {
    console.error('Failed to send review request email:', err);
  }
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
      replyTo: ADMIN_EMAIL,
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

// --- Marketing emails ---

interface MarketingEmailData {
  to: string;
  name: string;
  subject: string;
  message: string;
  template: string;
}

function marketingEmailHtml(data: MarketingEmailData): string {
  const firstName = data.name.split(' ')[0];
  const bodyHtml = data.message.replace(/\n/g, '<br>');

  const heroImages: Record<string, string> = {
    summer_promo: 'https://www.blueskiesboatrentals.com/boat-day-vibes.jpg',
    repeat_customer: 'https://www.blueskiesboatrentals.com/alligator-reef-vibes.jpg',
    fishing_season: 'https://www.blueskiesboatrentals.com/blog-fishing-guide.jpg',
    holiday: 'https://www.blueskiesboatrentals.com/boat-sunset.jpeg',
    review_followup: 'https://www.blueskiesboatrentals.com/alligator-reef-group.jpg',
    loyalty_reminder: 'https://www.blueskiesboatrentals.com/aerial-ocean.jpg',
    custom: 'https://www.blueskiesboatrentals.com/freedom-aerial.jpg',
  };
  const heroImage = heroImages[data.template] || heroImages.custom;
  const logoUrl = 'https://www.blueskiesboatrentals.com/logo-blueskies.png';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;">

    <!-- Logo Bar -->
    <div style="background:#ffffff;padding:24px 30px;text-align:center;border-bottom:1px solid #e2e8f0;">
      <img src="${logoUrl}" alt="Blue Skies Charter" style="height:60px;width:auto;" />
    </div>

    <!-- Hero Image -->
    <div style="position:relative;line-height:0;">
      <img src="${heroImage}" alt="Blue Skies Boat Rentals" style="width:100%;height:260px;object-fit:cover;display:block;" />
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:36px 32px 28px;">
      <p style="color:#0f172a;font-size:20px;line-height:1.4;margin:0 0 24px;font-weight:700;">Hey ${firstName} &#x1F44B;</p>
      <div style="color:#475569;font-size:15px;line-height:1.9;">${bodyHtml}</div>
    </div>

    <!-- CTA -->
    <div style="background:#ffffff;padding:12px 32px 40px;text-align:center;">
      <a href="https://blueskiesboatrentals.com/book" style="display:inline-block;background:#0c4a6e;color:#ffffff;font-size:15px;font-weight:700;padding:16px 48px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;text-transform:uppercase;">
        Book Your Next Trip &rarr;
      </a>
    </div>

    <!-- Accent Strip -->
    <div style="height:4px;background:linear-gradient(90deg,#0ea5e9,#38bdf8,#0ea5e9);"></div>

    <!-- Footer -->
    <div style="background:#0c4a6e;padding:32px;text-align:center;">
      <img src="${logoUrl}" alt="Blue Skies" style="height:40px;width:auto;margin-bottom:16px;filter:brightness(10);" />
      <p style="color:#bae6fd;font-size:13px;margin:0 0 12px;">Islamorada, Florida Keys</p>

      <a href="tel:7542542293" style="display:inline-block;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:20px;">(754) 254-2293</a>

      <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.15);">
        <a href="https://instagram.com/blueskiescharter" style="color:#7dd3fc;font-size:12px;text-decoration:none;margin:0 10px;">Instagram</a>
        <a href="https://tiktok.com/@blueskiescharter" style="color:#7dd3fc;font-size:12px;text-decoration:none;margin:0 10px;">TikTok</a>
        <a href="https://blueskiesboatrentals.com" style="color:#7dd3fc;font-size:12px;text-decoration:none;margin:0 10px;">Website</a>
      </div>

      <p style="color:rgba(255,255,255,0.4);font-size:10px;margin:16px 0 0;">You received this because you booked with Blue Skies Boat Rentals.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendMarketingEmail(data: MarketingEmailData) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const result: any = await resend.emails.send({
    from: `Blue Skies Boat Rentals <${FROM_EMAIL}>`,
    replyTo: ADMIN_EMAIL,
    to: data.to,
    subject: data.subject,
    html: marketingEmailHtml(data),
  });

  if (result?.error) {
    throw new Error(result.error.message ?? JSON.stringify(result.error));
  }

  console.log(`Marketing email sent to ${data.to}`);
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
