import { pgTable, text, integer, serial, doublePrecision, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  openId: text('open_id').unique(),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('user').notNull(),
  loyaltyPoints: integer('loyalty_points').default(0).notNull(),
  totalSpent: doublePrecision('total_spent').default(0).notNull(),
  bookingCount: integer('booking_count').default(0).notNull(),
  notes: text('notes'),
  referredBy: text('referred_by'),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
  updatedAt: text('updated_at').default(sql`NOW()`).notNull(),
  lastSignedIn: text('last_signed_in'),
});

export const boats = pgTable('boats', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  model: text('model').notNull(),
  type: text('type').notNull(),
  lengthFt: integer('length_ft').notNull(),
  capacity: integer('capacity').notNull(),
  description: text('description'),
  features: text('features'), // JSON string
  imageUrl: text('image_url'),
  galleryImages: text('gallery_images'), // JSON string
  priceHalfDay: doublePrecision('price_half_day').notNull(),
  priceFullDay: doublePrecision('price_full_day').notNull(),
  priceMultiDay: doublePrecision('price_multi_day'),
  homePort: text('home_port'),
  status: text('status').default('active').notNull(),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
  updatedAt: text('updated_at').default(sql`NOW()`).notNull(),
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
  duration: text('duration').notNull(),
  charterType: text('charter_type').notNull(),
  guestCount: integer('guest_count').notNull(),
  departurePort: text('departure_port'),
  specialRequests: text('special_requests'),
  subtotal: doublePrecision('subtotal').notNull(),
  captainFee: doublePrecision('captain_fee').default(0).notNull(),
  tax: doublePrecision('tax').notNull(),
  total: doublePrecision('total').notNull(),
  referralCode: text('referral_code'),
  referralDiscount: doublePrecision('referral_discount').default(0),
  loyaltyPointsEarned: integer('loyalty_points_earned').default(0),
  paymentStatus: text('payment_status').default('pending').notNull(),
  stripePaymentId: text('stripe_payment_id'),
  stripeSessionId: text('stripe_session_id'),
  status: text('status').default('pending').notNull(),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
  updatedAt: text('updated_at').default(sql`NOW()`).notNull(),
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
  dailyRate: doublePrecision('daily_rate').default(250).notNull(),
  halfDayRate: doublePrecision('half_day_rate').default(150).notNull(),
  status: text('status').default('active').notNull(),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
  updatedAt: text('updated_at').default(sql`NOW()`).notNull(),
});

export const partners = pgTable('partners', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  businessName: text('business_name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  type: text('type').notNull(),
  referralCode: text('referral_code').unique().notNull(),
  commissionRate: doublePrecision('commission_rate').default(10).notNull(),
  totalReferrals: integer('total_referrals').default(0).notNull(),
  totalRevenue: doublePrecision('total_revenue').default(0).notNull(),
  totalCommission: doublePrecision('total_commission').default(0).notNull(),
  status: text('status').default('pending').notNull(),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
  updatedAt: text('updated_at').default(sql`NOW()`).notNull(),
});

export const referralTransactions = pgTable('referral_transactions', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull(),
  bookingId: integer('booking_id').notNull(),
  amount: doublePrecision('amount').notNull(),
  commission: doublePrecision('commission').notNull(),
  status: text('status').default('pending').notNull(),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
});

export const rewards = pgTable('rewards', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  pointsCost: integer('points_cost').notNull(),
  type: text('type').notNull(),
  value: text('value'),
  status: text('status').default('active').notNull(),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
});

export const pointTransactions = pgTable('point_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  points: integer('points').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  bookingId: integer('booking_id'),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
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
  duration: text('duration').notNull(),
  price: doublePrecision('price').notNull(),
  notes: text('notes'),
  status: text('status').default('pending').notNull(),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
});

export const gallery = pgTable('gallery', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  category: text('category').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id'),
  customerName: text('customer_name').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  status: text('status').default('pending').notNull(),
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
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
  createdAt: text('created_at').default(sql`NOW()`).notNull(),
});
