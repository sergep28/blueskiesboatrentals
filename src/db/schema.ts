import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastSignedIn: text('last_signed_in'),
});

export const boats = sqliteTable('boats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  model: text('model').notNull(),
  type: text('type', { enum: ['center_console', 'dual_console', 'bay_boat', 'catamaran'] }).notNull(),
  lengthFt: integer('length_ft').notNull(),
  capacity: integer('capacity').notNull(),
  description: text('description'),
  features: text('features'), // JSON string
  imageUrl: text('image_url'),
  galleryImages: text('gallery_images'), // JSON string
  priceHalfDay: real('price_half_day').notNull(),
  priceFullDay: real('price_full_day').notNull(),
  priceMultiDay: real('price_multi_day'),
  homePort: text('home_port'),
  status: text('status', { enum: ['active', 'maintenance', 'retired'] }).default('active').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const bookings = sqliteTable('bookings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookingRef: text('booking_ref').unique().notNull(),
  boatId: integer('boat_id').notNull(),
  userId: integer('user_id'),
  captainId: integer('captain_id'),
  captainRequested: integer('captain_requested', { mode: 'boolean' }).default(false).notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone'),
  charterDate: text('charter_date').notNull(),
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
  referralDiscount: real('referral_discount').default(0),
  loyaltyPointsEarned: integer('loyalty_points_earned').default(0),
  paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'refunded'] }).default('pending').notNull(),
  stripePaymentId: text('stripe_payment_id'),
  stripeSessionId: text('stripe_session_id'),
  status: text('status', { enum: ['pending', 'confirmed', 'completed', 'cancelled'] }).default('pending').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const captains = sqliteTable('captains', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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

export const partners = sqliteTable('partners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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

export const referralTransactions = sqliteTable('referral_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  partnerId: integer('partner_id').notNull(),
  bookingId: integer('booking_id').notNull(),
  amount: real('amount').notNull(),
  commission: real('commission').notNull(),
  status: text('status', { enum: ['pending', 'paid'] }).default('pending').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const rewards = sqliteTable('rewards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  pointsCost: integer('points_cost').notNull(),
  type: text('type', { enum: ['discount', 'freebie', 'upgrade'] }).notNull(),
  value: text('value'),
  status: text('status', { enum: ['active', 'inactive'] }).default('active').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const pointTransactions = sqliteTable('point_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  points: integer('points').notNull(),
  type: text('type', { enum: ['earned', 'redeemed', 'bonus'] }).notNull(),
  description: text('description'),
  bookingId: integer('booking_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const quotes = sqliteTable('quotes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
  status: text('status', { enum: ['pending', 'booked', 'expired'] }).default('pending').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const gallery = sqliteTable('gallery', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  category: text('category', { enum: ['boats', 'fishing', 'sunset', 'snorkeling', 'destinations', 'lifestyle'] }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookingId: integer('booking_id'),
  customerName: text('customer_name').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
