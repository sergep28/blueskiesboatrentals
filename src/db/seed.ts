import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { resolve } from 'path';
import * as schema from './schema.js';

const dbPath = resolve(import.meta.dirname, '../../data.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

const db = drizzle(sqlite, { schema });

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    open_id TEXT UNIQUE,
    name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    total_spent REAL NOT NULL DEFAULT 0,
    booking_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    referred_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_signed_in TEXT
  );

  CREATE TABLE IF NOT EXISTS boats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    type TEXT NOT NULL,
    length_ft INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    description TEXT,
    features TEXT,
    image_url TEXT,
    gallery_images TEXT,
    price_half_day REAL NOT NULL,
    price_full_day REAL NOT NULL,
    price_multi_day REAL,
    home_port TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref TEXT UNIQUE NOT NULL,
    boat_id INTEGER NOT NULL,
    user_id INTEGER,
    captain_id INTEGER,
    captain_requested INTEGER NOT NULL DEFAULT 0,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    charter_date TEXT NOT NULL,
    duration TEXT NOT NULL,
    charter_type TEXT NOT NULL,
    guest_count INTEGER NOT NULL,
    departure_port TEXT,
    special_requests TEXT,
    subtotal REAL NOT NULL,
    captain_fee REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    referral_code TEXT,
    referral_discount REAL DEFAULT 0,
    loyalty_points_earned INTEGER DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    stripe_payment_id TEXT,
    stripe_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS captains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    license_number TEXT,
    experience TEXT,
    bio TEXT,
    photo_url TEXT,
    daily_rate REAL NOT NULL DEFAULT 250,
    half_day_rate REAL NOT NULL DEFAULT 150,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    type TEXT NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    commission_rate REAL NOT NULL DEFAULT 10,
    total_referrals INTEGER NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0,
    total_commission REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS referral_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    booking_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    commission REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    type TEXT NOT NULL,
    value TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS point_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    booking_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    caption TEXT,
    category TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    customer_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed boats — pricing aligned with blueskiecharter.com ($700-$900 range)
db.insert(schema.boats).values([
  {
    name: 'Freedom',
    model: 'Grady White Freedom 285',
    type: 'dual_console',
    lengthFt: 28,
    capacity: 8,
    description: 'Our 28-foot Grady White Freedom 285 is built for the perfect Keys day. Dual console design with a spacious bow, twin Yamaha 300HP engines, and all the amenities you need — whether you\'re cruising to the sandbar, fishing the backcountry, or chasing a sunset.',
    features: JSON.stringify(['Twin Yamaha 300HP Engines', 'Garmin GPS & Fish Finder', 'Bluetooth Sound System', 'Freshwater Shower', 'Onboard Head', 'Livewell & Rod Holders', 'Shade Top & Cushioned Seating', 'Cooler & Ice Chest', 'Snorkeling Gear Available']),
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
    galleryImages: JSON.stringify([
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&h=600&fit=crop',
    ]),
    priceHalfDay: 700,
    priceFullDay: 900,
    priceMultiDay: 800,
    homePort: 'Islamorada',
    status: 'active',
  },
  {
    name: 'Canyon Runner',
    model: 'Grady White Canyon 306',
    type: 'center_console',
    lengthFt: 30,
    capacity: 10,
    description: 'The Grady White Canyon 306 is built for serious offshore adventures. At 30 feet with twin Yamaha 300HP engines, this center console handles everything from reef fishing to Gulf Stream runs. Spacious deck, premium electronics, and room for the whole crew.',
    features: JSON.stringify(['Twin Yamaha 300HP Engines', 'Garmin Navigation & Sonar', 'Bluetooth Sound System', 'Freshwater Shower & Head', 'Livewell & Rod Holders', 'Outriggers', 'Full Shade Coverage', 'Coolers & Rod Storage', 'Snorkeling Gear Available']),
    imageUrl: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&h=600&fit=crop',
    galleryImages: JSON.stringify([
      'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1562281302-809108fd533c?w=800&h=600&fit=crop',
    ]),
    priceHalfDay: 700,
    priceFullDay: 900,
    priceMultiDay: 800,
    homePort: 'Islamorada',
    status: 'active',
  },
]).run();

// Seed captains
db.insert(schema.captains).values([
  {
    name: 'Captain Mike Rodriguez',
    email: 'mike@blueskiesboatrentals.com',
    phone: '305-555-0101',
    licenseNumber: 'USCG-12345',
    experience: '15 years navigating the Florida Keys',
    bio: 'Born and raised in the Keys, Captain Mike knows every reef, flat, and hidden sandbar from Key Largo to Marathon. Specializes in backcountry fishing and sunset cruises. USCG licensed with an impeccable safety record.',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    dailyRate: 300,
    halfDayRate: 175,
    status: 'active',
  },
  {
    name: 'Captain Sarah Chen',
    email: 'sarah@blueskiesboatrentals.com',
    phone: '305-555-0102',
    licenseNumber: 'USCG-67890',
    experience: '12 years in the Florida Keys',
    bio: 'Captain Sarah brings a passion for marine ecology and offshore fishing to every trip. Expert in reef snorkeling, island hopping, and deep-sea fishing. Known for creating unforgettable family-friendly experiences.',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
    dailyRate: 275,
    halfDayRate: 165,
    status: 'active',
  },
]).run();

// Seed gallery
db.insert(schema.gallery).values([
  { imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop', caption: 'Freedom cruising the Keys', category: 'boats', sortOrder: 1 },
  { imageUrl: 'https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=800&h=600&fit=crop', caption: 'Trophy catch in Islamorada', category: 'fishing', sortOrder: 2 },
  { imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', caption: 'Keys sunset from the water', category: 'sunset', sortOrder: 3 },
  { imageUrl: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&h=600&fit=crop', caption: 'Snorkeling the reef', category: 'snorkeling', sortOrder: 4 },
  { imageUrl: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&h=600&fit=crop', caption: 'Islamorada marina at dawn', category: 'destinations', sortOrder: 5 },
  { imageUrl: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&h=600&fit=crop', caption: 'Living the Keys life', category: 'lifestyle', sortOrder: 6 },
]).run();

// Seed reviews
db.insert(schema.reviews).values([
  { customerName: 'James & Emily T.', rating: 5, comment: 'Absolutely incredible day on the water! The Grady White was immaculate and Captain Mike put us on fish all morning. Best day of our Keys vacation by far.', status: 'approved' },
  { customerName: 'The Martinez Family', rating: 5, comment: 'Rented the Freedom for a family sandbar trip. The kids had a blast snorkeling and the boat was perfect — clean, spacious, and loaded with gear. Will definitely be back!', status: 'approved' },
  { customerName: 'David R.', rating: 5, comment: 'Great sunset cruise around Islamorada. Captain Sarah was knowledgeable and fun. The boat is in a completely different league compared to other rentals in the area.', status: 'approved' },
  { customerName: 'Sarah & Mike L.', rating: 5, comment: 'We\'ve rented boats all over the Keys and this was hands down the best experience. Premium boats, amazing service, and they actually care about your trip.', status: 'approved' },
  { customerName: 'Chris K.', rating: 5, comment: 'Took the Canyon Runner offshore and it was a beast. Caught mahi, wahoo, and a big bull dolphin. The boat handled the swells like a dream. Already booked our next trip!', status: 'approved' },
]).run();

// Seed rewards
db.insert(schema.rewards).values([
  { name: '$50 Off Next Charter', description: 'Save $50 on your next booking', pointsCost: 500, type: 'discount', value: '50', status: 'active' },
  { name: 'Free Sunset Upgrade', description: 'Upgrade any half-day to include a sunset extension', pointsCost: 750, type: 'upgrade', value: 'sunset_upgrade', status: 'active' },
  { name: 'VIP Sandbar Package', description: 'Premium sandbar setup with chairs, umbrella, and cooler', pointsCost: 1000, type: 'freebie', value: 'sandbar_vip', status: 'active' },
  { name: 'Free Half-Day Charter', description: 'A complimentary half-day rental on us', pointsCost: 2500, type: 'freebie', value: 'free_half_day', status: 'active' },
]).run();

// Seed partners
db.insert(schema.partners).values([
  { businessName: 'Keys Sunset Resort', contactName: 'Maria Gonzalez', email: 'maria@keyssunset.com', phone: '305-555-0201', type: 'hotel', referralCode: 'BS-SUNSET', commissionRate: 10, status: 'active' },
  { businessName: 'Paradise Stays', contactName: 'Tom Williams', email: 'tom@paradisestays.com', phone: '305-555-0202', type: 'airbnb_host', referralCode: 'BS-PARADI', commissionRate: 10, status: 'active' },
]).run();

// Seed admin user
db.insert(schema.users).values([
  { name: 'Admin', email: 'admin@blueskiesboatrentals.com', role: 'admin', loyaltyPoints: 0 },
]).run();

console.log('Database seeded successfully!');
sqlite.close();
