import { pgTable, serial, text, integer, real, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  openId: text('open_id').unique(),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['user', 'admin', 'partner'] }).default('user').notNull(),
  loyaltyPoints: integer('loyalty_points').default(0).notNull(),
  totalSpent: real('total_spent').default(0).notNull(),
  bookingCount: integer('booking_count').default(0).notNull(),
  notes: text('notes'),
  referredBy: text('referred_by'),
  idFront: text('id_front'),
  idBack: text('id_back'),
  idUploadedAt: text('id_uploaded_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastSignedIn: text('last_signed_in'),
});

export const boats = pgTable('boats', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  model: text('model').notNull(),
  type: text('type', { enum: ['center_console', 'dual_console', 'bay_boat', 'catamaran'] }).notNull(),
  lengthFt: integer('length_ft').notNull(),
  capacity: integer('capacity').notNull(),
  description: text('description'),
  features: text('features'),
  imageUrl: text('image_url'),
  galleryImages: text('gallery_images'),
  priceHalfDay: real('price_half_day').notNull(),
  priceFullDay: real('price_full_day').notNull(),
  priceMultiDay: real('price_multi_day'),
  homePort: text('home_port'),
  status: text('status', { enum: ['active', 'maintenance', 'retired'] }).default('active').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  bookingRef: text('booking_ref').unique().notNull(),
  boatId: integer('boat_id').notNull(),
  userId: integer('user_id'),
  captainId: integer('captain_id'),
  captainRequested: boolean('captain_requested').default(false).notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone'),
  charterDate: text('charter_date').notNull(),
  endDate: text('end_date'),
  pickupTime: text('pickup_time'),
  dropoffTime: text('dropoff_time'),
  // Renter/operator government ID (data URLs, downscaled client-side). Front is
  // mandatory before boarding; back optional. idUploadedAt gates the readiness UI.
  idFront: text('id_front'),
  idBack: text('id_back'),
  idUploadedAt: text('id_uploaded_at'),
  duration: text('duration', { enum: ['half_day_am', 'half_day_pm', 'full_day', 'multi_day', 'custom'] }).notNull(),
  charterType: text('charter_type', { enum: ['fishing', 'cruising', 'snorkeling', 'sunset', 'sandbar', 'custom'] }).notNull(),
  guestCount: integer('guest_count').notNull(),
  departurePort: text('departure_port'),
  specialRequests: text('special_requests'),
  subtotal: real('subtotal').notNull(),
  captainFee: real('captain_fee').default(0).notNull(),
  tax: real('tax').notNull(),
  total: real('total').notNull(),
  referralCode: text('referral_code'),
  referralDiscount: real('referral_discount').default(0).notNull(),
  loyaltyPointsEarned: integer('loyalty_points_earned').default(0).notNull(),
  paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'refunded'] }).default('pending').notNull(),
  // How the booking came in. Drives the unified New Booking flow (Direct = we
  // collect the trip payment; OTA platforms = the guest already paid there).
  source: text('source', { enum: ['direct', 'website', 'boatsetter', 'getmyboat', 'phone', 'walkin', 'other'] }).default('direct').notNull(),
  stripePaymentId: text('stripe_payment_id'),
  stripeSessionId: text('stripe_session_id'),
  stripeEventId: text('stripe_event_id').unique(),
  // $1,000 refundable security deposit — a SEPARATE Stripe charge from the trip
  // payment. Requested via a texted/emailed link, refunded (minus deductions)
  // after the post-trip inspection.
  depositStatus: text('deposit_status', { enum: ['none', 'requested', 'paid', 'partially_refunded', 'refunded'] }).default('none').notNull(),
  depositAmount: real('deposit_amount').default(1000).notNull(),
  depositStripeSessionId: text('deposit_stripe_session_id'),
  depositPaymentIntentId: text('deposit_payment_intent_id'),
  depositStripeEventId: text('deposit_stripe_event_id').unique(),
  depositPaidAt: text('deposit_paid_at'),
  depositRefundedAmount: real('deposit_refunded_amount').default(0).notNull(),
  depositDeductionsNote: text('deposit_deductions_note'),  // human-readable breakdown: fuel/damage/misc
  signature: text('signature'),
  agreedToTerms: boolean('agreed_to_terms').default(false).notNull(),
  agreementSignedAt: text('agreement_signed_at'),
  agreementVersion: text('agreement_version'),
  status: text('status', { enum: ['pending', 'confirmed', 'completed', 'cancelled'] }).default('pending').notNull(),
  preTripReminderAt: text('pre_trip_reminder_at'),   // set once the pre-trip reminder email is sent
  reviewRequestedAt: text('review_requested_at'),  // set once the post-trip Google review email is sent
  rebookNudgeAt: text('rebook_nudge_at'),           // set once the post-trip rebook/loyalty email is sent
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const captains = pgTable('captains', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  licenseNumber: text('license_number'),
  experience: text('experience'),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  dailyRate: real('daily_rate').default(250).notNull(),
  halfDayRate: real('half_day_rate').default(150).notNull(),
  status: text('status', { enum: ['active', 'inactive'] }).default('active').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const partners = pgTable('partners', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  businessName: text('business_name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  type: text('type', { enum: ['airbnb_host', 'hotel', 'restaurant', 'concierge', 'other'] }).notNull(),
  referralCode: text('referral_code').unique().notNull(),
  commissionRate: real('commission_rate').default(10).notNull(),
  totalReferrals: integer('total_referrals').default(0).notNull(),
  totalRevenue: real('total_revenue').default(0).notNull(),
  totalCommission: real('total_commission').default(0).notNull(),
  status: text('status', { enum: ['pending', 'active', 'suspended'] }).default('pending').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const referralTransactions = pgTable('referral_transactions', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull(),
  bookingId: integer('booking_id').notNull(),
  amount: real('amount').notNull(),
  commission: real('commission').notNull(),
  status: text('status', { enum: ['pending', 'paid'] }).default('pending').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const rewards = pgTable('rewards', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  pointsCost: integer('points_cost').notNull(),
  type: text('type', { enum: ['discount', 'freebie', 'upgrade'] }).notNull(),
  value: text('value'),
  status: text('status', { enum: ['active', 'inactive'] }).default('active').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const pointTransactions = pgTable('point_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  points: integer('points').notNull(),
  type: text('type', { enum: ['earned', 'redeemed', 'bonus'] }).notNull(),
  description: text('description'),
  bookingId: integer('booking_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  code: text('code').unique().notNull(),
  boatId: integer('boat_id').notNull(),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  customerEmail: text('customer_email'),
  charterDate: text('charter_date').notNull(),
  endDate: text('end_date'),
  duration: text('duration', { enum: ['half_day_am', 'half_day_pm', 'full_day', 'multi_day', 'custom'] }).notNull(),
  price: real('price').notNull(),
  notes: text('notes'),
  pickupTime: text('pickup_time'),
  dropoffTime: text('dropoff_time'),
  platform: text('platform'),
  status: text('status', { enum: ['pending', 'booked', 'expired'] }).default('pending').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Pre-departure conditional inspection signed by the renter/operator before boarding.
export const inspections = pgTable('inspections', {
  id: serial('id').primaryKey(),
  bookingRef: text('booking_ref').notNull(),
  operatorName: text('operator_name'),
  // JSON: [{ area, condition: 'good' | 'damage', notes }]
  checklist: text('checklist'),
  damageNotes: text('damage_notes'),
  hullDiagram: text('hull_diagram'),        // marked-up image dataURL
  outboardDiagram: text('outboard_diagram'),
  acknowledged: boolean('acknowledged').default(false).notNull(),
  signaturePrinted: text('signature_printed'),
  signatureData: text('signature_data'),
  signedAt: text('signed_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Inspection photos kept in their own table (one row per photo) so large
// base64 images don't bloat the inspection row. Resized client-side before upload.
export const inspectionPhotos = pgTable('inspection_photos', {
  id: serial('id').primaryKey(),
  bookingRef: text('booking_ref').notNull(),
  area: text('area'),                       // checklist area this documents, or 'general'
  imageData: text('image_data').notNull(),  // resized JPEG dataURL
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Every email sent through the platform is logged here for transparency.
export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  bookingRef: text('booking_ref'),            // null for marketing emails not tied to a booking
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name'),
  type: text('type', { enum: [
    'booking_confirmation', 'admin_notification', 'review_request',
    'deposit_alert', 'deposit_settlement', 'marketing',
    'waiver_packet', 'pre_trip_reminder', 'custom',
  ] }).notNull(),
  subject: text('subject').notNull(),
  htmlBody: text('html_body'),                 // full rendered HTML for preview
  resendId: text('resend_id'),                // Resend's message ID for tracking
  status: text('status', { enum: ['sent', 'failed', 'bounced'] }).default('sent').notNull(),
  error: text('error'),                       // error message if failed
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const gallery = pgTable('gallery', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  category: text('category', { enum: ['boats', 'fishing', 'sunset', 'snorkeling', 'destinations', 'lifestyle', 'videos'] }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id'),
  customerName: text('customer_name').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const boatBlackouts = pgTable('boat_blackouts', {
  id: serial('id').primaryKey(),
  boatId: integer('boat_id').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  reason: text('reason'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const properties = pgTable('properties', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  host: text('host'),
  location: text('location').notNull(),
  type: text('type').notNull(),
  guests: integer('guests').default(2).notNull(),
  bedrooms: integer('bedrooms').default(1).notNull(),
  bathrooms: real('bathrooms'),
  rating: real('rating'),
  reviews: integer('reviews').default(0).notNull(),
  description: text('description'),
  highlights: text('highlights'),
  pricePerNight: real('price_per_night').default(0).notNull(),
  cleaningFee: real('cleaning_fee').default(150).notNull(),
  imageUrl: text('image_url'),
  galleryImages: text('gallery_images'),
  status: text('status', { enum: ['active', 'hidden'] }).default('active').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const waivers = pgTable('waivers', {
  id: serial('id').primaryKey(),
  bookingRef: text('booking_ref').notNull(),
  participantName: text('participant_name').notNull(),
  participantEmail: text('participant_email'),
  participantPhone: text('participant_phone'),
  dateOfBirth: text('date_of_birth'),
  address: text('address'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  isMinor: boolean('is_minor').default(false).notNull(),
  guardianName: text('guardian_name'),
  signaturePrinted: text('signature_printed'),
  signatureData: text('signature_data'),
  inWaterActivity: boolean('in_water_activity').default(false).notNull(),
  isRenter: boolean('is_renter').default(false).notNull(),
  waiverVersion: text('waiver_version'),
  ipAddress: text('ip_address'),
  signedAt: text('signed_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  coverImage: text('cover_image'),
  category: text('category').default('general').notNull(),
  tags: text('tags'),
  author: text('author').default('Blue Skies Crew').notNull(),
  instagramUrl: text('instagram_url'),
  tiktokUrl: text('tiktok_url'),
  facebookUrl: text('facebook_url'),
  youtubeUrl: text('youtube_url'),
  status: text('status').default('draft').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
