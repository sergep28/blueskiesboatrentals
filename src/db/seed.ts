import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { resolve } from 'path';
import * as schema from './schema.js';

const dbPath = resolve(process.cwd(), 'data.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

const db = drizzle(sqlite, { schema });

// Drop and recreate tables for clean seed
sqlite.exec(`
  DROP TABLE IF EXISTS point_transactions;
  DROP TABLE IF EXISTS referral_transactions;
  DROP TABLE IF EXISTS bookings;
  DROP TABLE IF EXISTS rewards;
  DROP TABLE IF EXISTS partners;
  DROP TABLE IF EXISTS reviews;
  DROP TABLE IF EXISTS gallery;
  DROP TABLE IF EXISTS captains;
  DROP TABLE IF EXISTS boats;
  DROP TABLE IF EXISTS users;
  DROP TABLE IF EXISTS posts;
  DROP TABLE IF EXISTS quotes;
`);

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

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    cover_image TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    tags TEXT,
    author TEXT NOT NULL DEFAULT 'Blue Skies Crew',
    instagram_url TEXT,
    tiktok_url TEXT,
    facebook_url TEXT,
    youtube_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
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

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    boat_id INTEGER NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    charter_date TEXT NOT NULL,
    end_date TEXT,
    duration TEXT NOT NULL,
    price REAL NOT NULL,
    notes TEXT,
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
    imageUrl: '/freedom-aerial.jpg',
    galleryImages: JSON.stringify([
      '/freedom-aerial.jpg',
      '/freedom-anchored.jpg',
      '/freedom-helm.jpg',
      '/freedom-bow.jpg',
      '/freedom-head.jpg',
      '/freedom-running.jpg',
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
    imageUrl: '/canyon-306.jpeg',
    galleryImages: JSON.stringify([
      '/canyon-306.jpeg',
      '/alligator-reef.jpg',
      '/grill-onboard.jpg',
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
  // Boats
  { imageUrl: '/freedom-aerial.jpg', caption: 'Freedom cruising turquoise waters', category: 'boats', sortOrder: 1 },
  { imageUrl: '/freedom-anchored.jpg', caption: 'Anchored in crystal clear shallows', category: 'boats', sortOrder: 2 },
  { imageUrl: '/freedom-running.jpg', caption: 'Freedom running offshore', category: 'boats', sortOrder: 3 },
  { imageUrl: '/freedom-helm.jpg', caption: 'Premium Grady White helm', category: 'boats', sortOrder: 4 },
  { imageUrl: '/freedom-bow.jpg', caption: 'Spacious bow seating with speakers', category: 'boats', sortOrder: 5 },
  { imageUrl: '/freedom-lorelei.jpg', caption: 'Docked at Lorelei in Islamorada', category: 'boats', sortOrder: 6 },
  { imageUrl: '/freedom-stern.jpg', caption: 'Freedom stern at the marina', category: 'boats', sortOrder: 7 },
  // Fishing
  { imageUrl: '/catch-queen-snapper.jpg', caption: 'Queen snapper catch of the day', category: 'fishing', sortOrder: 8 },
  { imageUrl: '/customer-mahi.jpeg', caption: 'Customer with a nice mahi', category: 'fishing', sortOrder: 9 },
  { imageUrl: '/catch-wahoo.jpg', caption: 'Mahi haul at the dock', category: 'fishing', sortOrder: 10 },
  { imageUrl: '/catch-red-snapper.jpg', caption: 'Big red snapper', category: 'fishing', sortOrder: 10 },
  { imageUrl: '/catch-amberjack.jpg', caption: 'Amberjack offshore', category: 'fishing', sortOrder: 11 },
  { imageUrl: '/catch-mahi.jpg', caption: 'Mahi mahi on the line', category: 'fishing', sortOrder: 12 },
  { imageUrl: '/catch-mangrove-snapper.jpg', caption: 'Mangrove snapper in Marathon', category: 'fishing', sortOrder: 13 },
  { imageUrl: '/catch-tuna.jpg', caption: 'Tuna on the boat', category: 'fishing', sortOrder: 14 },
  { imageUrl: '/catch-yellowtail.jpg', caption: 'Nice yellowtail catch', category: 'fishing', sortOrder: 15 },
  { imageUrl: '/fishing-action-1.jpg', caption: 'Fighting a big one offshore', category: 'fishing', sortOrder: 16 },
  { imageUrl: '/fishing-action-2.jpg', caption: 'Reeling it in', category: 'fishing', sortOrder: 17 },
  { imageUrl: '/catch-big-amberjack.jpg', caption: 'Big amberjack offshore', category: 'fishing', sortOrder: 18 },
  { imageUrl: '/catch-amberjack-2.jpg', caption: 'Amberjack with Bass Pro hat', category: 'fishing', sortOrder: 19 },
  { imageUrl: '/catch-grouper.jpg', caption: 'Nice grouper catch', category: 'fishing', sortOrder: 20 },
  { imageUrl: '/catch-grouper-duo.jpg', caption: 'Grouper with a buddy', category: 'fishing', sortOrder: 21 },
  { imageUrl: '/catch-big-grouper.jpg', caption: 'Monster grouper offshore', category: 'fishing', sortOrder: 22 },
  { imageUrl: '/catch-mahi-3.jpg', caption: 'Mahi on the Grady White', category: 'fishing', sortOrder: 23 },
  { imageUrl: '/catch-mahi-4.jpg', caption: 'Another mahi in the books', category: 'fishing', sortOrder: 24 },
  { imageUrl: '/fishing-grady-action.jpg', caption: 'Fighting fish on the Grady White', category: 'fishing', sortOrder: 25 },
  { imageUrl: '/dock-haul-crew.jpg', caption: 'Crew with the day\'s haul', category: 'fishing', sortOrder: 26 },
  { imageUrl: '/dock-haul-girl.jpg', caption: 'Great day on the water', category: 'fishing', sortOrder: 27 },
  { imageUrl: '/IMG_9913.jpg', caption: 'Grouper in the GW shirt', category: 'fishing', sortOrder: 28 },
  { imageUrl: '/IMG_7764.jpg', caption: 'Offshore action', category: 'fishing', sortOrder: 29 },
  { imageUrl: '/IMG_7043.jpg', caption: 'Catches all around', category: 'fishing', sortOrder: 30 },
  { imageUrl: '/attachment.jpg', caption: 'Mahi on the line', category: 'fishing', sortOrder: 31 },
  // Destinations & Sandbar
  { imageUrl: '/alligator-reef.jpg', caption: 'Alligator Reef Lighthouse', category: 'destinations', sortOrder: 32 },
  { imageUrl: '/alligator-reef-group.jpg', caption: 'Crew at Alligator Reef', category: 'destinations', sortOrder: 33 },
  { imageUrl: '/alligator-reef-2.jpg', caption: 'Alligator Reef on a perfect day', category: 'destinations', sortOrder: 34 },
  { imageUrl: '/sombrero-lighthouse.jpg', caption: 'Sombrero Lighthouse, Marathon', category: 'destinations', sortOrder: 35 },
  { imageUrl: '/sandbar-guys.jpg', caption: 'Day at the sandbar', category: 'destinations', sortOrder: 36 },
  { imageUrl: '/IMG_7639.jpg', caption: 'Group day at the reef', category: 'destinations', sortOrder: 37 },
  // Lifestyle
  { imageUrl: '/family-boat-day.jpg', caption: 'Family day on the water', category: 'lifestyle', sortOrder: 38 },
  { imageUrl: '/grill-onboard.jpg', caption: 'Grilling fresh catch on the water', category: 'lifestyle', sortOrder: 39 },
  { imageUrl: '/snorkel-couple.jpg', caption: 'Snorkeling at Sombrero Reef', category: 'lifestyle', sortOrder: 40 },
  // Sunset
  { imageUrl: '/boat-sunset.jpeg', caption: 'Sunset on the water', category: 'sunset', sortOrder: 41 },
  // Videos
  { imageUrl: '/reel-1.mp4', caption: 'Mahi on the line', category: 'videos', sortOrder: 42 },
  { imageUrl: '/reel-2.mp4', caption: 'Cruising the Keys', category: 'videos', sortOrder: 43 },
  { imageUrl: '/reel-3.mp4', caption: 'Offshore action', category: 'videos', sortOrder: 44 },
  { imageUrl: '/reel-4.mp4', caption: 'Another day on the water', category: 'videos', sortOrder: 45 },
]).run();

// Seed blog posts
sqlite.exec(`
INSERT INTO posts (title, slug, excerpt, content, cover_image, category, tags, author, status, created_at) VALUES
(
  'Fishing in Islamorada vs. Key West: Where to Find the Best Charter?',
  'islamorada-vs-key-west-fishing-charters',
  'Deciding between Islamorada vs Key West fishing charters? Compare costs, seasons, and species to book the right trip with confidence.',
  'If you''re planning a Florida Keys trip, timing matters more than ever. Record bookings are already tightening availability, and the best captains fill their calendars fast. That pressure creates a real dilemma: do you chase the prestige of Islamorada or the laid-back thrill of Key West?

## The Vibe

Choosing between Islamorada and Key West is not just about geography. It is identity.

**Islamorada: The Elite Angler Mindset.** Islamorada wears its "Sportfishing Capital of the World" title with pride. This is where serious anglers come to test skills and chase bragging rights. The mood is focused, traditional, and quietly competitive. Every dock conversation feels technical. Every trip feels earned.

**Key West: The Experience Seeker.** Key West attracts a different energy. It is playful, social, and inclusive. Anglers here want stories, photos, and shared moments. Key West fishing often blends fishing with sightseeing, reef stops, and laughter.

## Species & Seasonality

Both locations deliver world-class fishing, but access changes the game. Islamorada offers unmatched backcountry and flats access. Shallow waters produce tarpon, bonefish, and permit. Offshore runs are shorter, which means more lines-in time. Spring and early summer shine for tarpon. Fall brings consistent reef action.

Key West leans toward variety. Deep water sits close, making deep-sea fishing a top draw. Expect mahi, tuna, sailfish, and snapper. Winter and early spring are prime offshore months, while summer delivers steady reef species.

## Cost & Value

Most fishing charters range from half-day to full-day pricing, depending on boat size and distance. Islamorada trips often anchor value in efficiency — shorter runs mean more fishing time.

Your charter typically includes a licensed captain and crew, premium rods, reels, and tackle, fishing licenses, ice and bait, and local expertise. You are not paying for hours. You are paying for outcomes.

## Family vs. Pro Angler

Families and mixed-experience groups thrive in Key West. Calm pacing, reef fishing, and flexible plans reduce pressure. Serious anglers gravitate toward Islamorada. Hardcore offshore or technical flats trips demand focus and stamina.

## Ready to Book?

Islamorada feeds ambition. Key West fuels connection. Each delivers unforgettable days when matched to the right dream. Contact us to find the right experience for your group.',
  '/blog-islamorada-vs-keywest.jpeg',
  'fishing_report',
  '["islamorada","key west","fishing charters","florida keys"]',
  'Serge Parakhnevich',
  'published',
  '2026-01-09T12:00:00'
),
(
  'Renting a Boat in the Florida Keys: The Complete Guide',
  'rent-a-boat-florida-keys-guide',
  'Planning to rent a boat in the Keys? Everything you need to know about types, pricing, locations, and what to expect on the water.',
  'Planning to rent a boat in the Keys is one of the most exciting ways to explore the Florida Keys. The freedom to discover hidden sandbars away from tourist crowds, access snorkeling reefs privately, enjoy sunset cruises, and control your own schedule — it''s unmatched.

## Types of Boats Available

**Center Consoles** — Best for fishing and exploring deeper waters. This is what we run at Blue Skies — Grady White center and dual consoles that handle offshore conditions and still feel comfortable all day.

**Pontoons & Deck Boats** — You''ll see these everywhere in the Keys. They''re cheap to rent but they ride rough in chop, they''re slow, and they don''t handle open water well. If you''re staying in a canal, fine. If you want to actually explore, you need a real boat.

## Best Rental Locations

**Key Largo** — Calm, protected waters ideal for beginners. Home to John Pennekamp Coral Reef State Park. Our Islamorada base is just 20 minutes south.

**Islamorada** — World-class fishing, reef access, sandbars, and the Gulf Stream 20 minutes out. This is our home base for a reason.

**Marathon** — Smooth waters perfect for families. Central location gives you access to both upper and lower Keys.

## What to Look For in a Rental Company

The difference between a great day and a frustrating one comes down to the operator. Look for well-maintained vessels (not just "clean" — actually maintained), transparent pricing with no hidden fees, proper safety equipment, and staff who actually know the local waters.

## Legal Requirements

Florida requires a Boater Safety ID for those born after January 1, 1988. You can get one online in about an hour. Or skip the hassle entirely and add a captain to your rental — our USCG-licensed captains know every reef, flat, and channel from Key Largo to Marathon.',
  '/blog-rent-boat-keys.jpg',
  'keys_guide',
  '["boat rental","florida keys","islamorada","guide"]',
  'Serge Parakhnevich',
  'published',
  '2025-11-19T12:00:00'
),
(
  'Fall Fishing in Islamorada: The Sportfishing Capital at Its Best',
  'fall-fishing-islamorada',
  'Fall in Islamorada is when the crowds thin out, the breeze picks up, and the fish show up ready to play. Here''s what to expect.',
  'In Islamorada, fishing isn''t just something people do — it''s part of the DNA. They don''t call this place the Sportfishing Capital of the World for nothing. And fall? That''s when it all starts to get really fun.

The summer crowds thin out, the breeze picks up just enough to take the edge off, and the fish show up ready to play.

Picture this: you''re on the dock early morning, coffee in hand, and the sky is just starting to glow. The air feels cooler than it did in August, but the water''s still warm. It''s that sweet spot of the year when everything lines up — the weather, the vibe, and the bite.

## Fall Means Options

Here''s the thing about fishing in Islamorada during fall: you don''t have to pick just one style of trip.

Offshore, the sailfish are starting to run, mahi are still flashing those wild green-and-gold colors, and tuna are hanging deep. Slide back toward the reefs and you''ll find snapper and grouper keeping things busy. And if you''d rather stay shallow, the flats are alive with bonefish and tarpon — fish that can make light tackle feel like a rollercoaster.

## It''s About More Than Fish

Yeah, catching a sailfish will give you bragging rights, but honestly? Half the fun is in the moments in between. The calm before the first strike, the scramble when lines go tight, the laughter when someone''s fighting a fish that''s clearly stronger than they expected.

By the time the day''s done, you''re salty, sun-tired, and already talking about doing it again tomorrow.

Fall in Islamorada just hits different. The pace slows down, but the fishing doesn''t. It''s the season where every trip feels personal — like the ocean''s showing off just for you.

That''s exactly what Blue Skies is about. We know these waters, the seasons, and the species that make Islamorada legendary in the fall. With the right crew and the right setup, your fishing trip isn''t just a day on the water — it''s the kind of story you''ll be telling long after you''ve rinsed the salt off your gear.',
  '/blog-fall-fishing.png',
  'fishing_report',
  '["fall fishing","islamorada","sailfish","mahi","snapper"]',
  'Serge Parakhnevich',
  'published',
  '2025-09-25T12:00:00'
),
(
  'The Best Fishing Charters in the Florida Keys: Island-by-Island Guide',
  'best-fishing-charters-florida-keys',
  'From Key Largo to Key West — a breakdown of what each island offers anglers and which fishing charters deliver the best experience.',
  'If you''ve been dreaming about fishing in the Florida Keys, you''re not alone — this stretch of turquoise water is a bucket-list destination for anglers from every corner of the world.

But the Keys aren''t one place. They''re a chain of islands, each with its own character, its own water, and its own fishing. Picking the right spot can be the difference between a good trip and an unforgettable one.

## Key Largo

The diving capital of the world, but don''t sleep on the fishing. Backcountry flats produce tarpon, bonefish, and permit. Offshore runs reach the reef quickly. Best for anglers who want to combine snorkeling and fishing in one trip.

## Islamorada

This is home base — and for good reason. The Sportfishing Capital of the World gives you access to everything: backcountry flats, the reef, and the Gulf Stream all within minutes. Fall brings sailfish. Spring brings tarpon. Summer and winter bring consistent reef action. No other island in the Keys offers this kind of range.

## Marathon

The heart of the Keys. Family-friendly waters, excellent flats fishing on the Gulf side, and Sombrero Reef for snorkeling between catches. A great choice for multi-day trips where you want variety without long runs.

## Key West

The end of the road — and the gateway to deep water. Key West puts you close to serious offshore fishing: tuna, swordfish, and marlin territory. The trade-off is longer runs and higher prices. Best for experienced anglers chasing big game.

## Which One Is Right for You?

If you want range and efficiency, Islamorada is hard to beat. If you want deep water, Key West. If you want calm family days, Marathon. And if you want reef access with diving, Key Largo.

We run out of Islamorada because it gives our customers the most options in the least amount of transit time. More fishing, less driving.',
  '/blog-fishing-guide.jpg',
  'keys_guide',
  '["fishing charters","florida keys","key largo","islamorada","marathon","key west"]',
  'Serge Parakhnevich',
  'published',
  '2025-11-20T12:00:00'
),
(
  'Boat Charters in the Florida Keys: Requirements for Renting Without a Captain',
  'boat-rental-requirements-florida-keys',
  'Everything you need to know about bareboat rentals in the Keys — licensing, safety requirements, and what to expect.',
  'Planning a boat rental in the Keys is exciting — and confusing for newcomers. The freedom to cruise at your own pace, anchor at sandbars, and explore reefs independently is why people love bareboat rentals. But there are a few things you need to know before you take the helm.

## Do You Need a License?

Florida does not require a boating license. However, if you were born on or after January 1, 1988, you need a Florida Boater Safety ID card. You can complete the course online in about an hour. It''s a one-time requirement — once you have it, it''s good for life.

If you were born before 1988, no card is needed. You just need a valid photo ID.

## What About a Captain?

A captain is never required, but it''s worth considering if you''re unfamiliar with the waters. The Florida Keys have shallow flats, reef areas, and channel markers that can be tricky if you don''t know the area. Our USCG-licensed captains know every shortcut, every reef, and every sandbar from Key Largo to Marathon.

## Safety Equipment

Every rental should include life jackets for all passengers, a fire extinguisher, a throwable flotation device, navigation lights, a horn or whistle, and flares. At Blue Skies, every boat is fully equipped and inspected before every departure.

## What to Bring

Sunscreen, sunglasses, a cooler with your drinks and snacks, and a towel. We provide safety equipment, and fishing and snorkeling gear is available on board. Show up, do a quick walkthrough with us, and you''re off.

## The Bottom Line

Renting a boat in the Keys without a captain is straightforward. Get your Boater Safety ID if needed, bring your photo ID, and choose a rental company that takes maintenance seriously. The boat should feel right when you step on it — clean, equipped, and ready to go.',
  '/blog-boat-rental-guide.jpg',
  'keys_guide',
  '["bareboat rental","florida keys","boating license","safety"]',
  'Serge Parakhnevich',
  'published',
  '2025-11-24T12:00:00'
),
(
  'Celebrate Labor Day Weekend on the Water',
  'labor-day-weekend-florida-keys',
  'Labor Day weekend is the perfect excuse to escape to the Florida Keys — and the best way to do it is from the deck of your own boat.',
  'Labor Day weekend is the perfect excuse to escape to the Florida Keys — and the best way to do it is from the deck of your own private boat.

While everyone else is fighting for a table at the same waterfront restaurants, you''ll be anchored at a sandbar with your cooler, your playlist, and nothing but turquoise water in every direction.

## Why Labor Day in the Keys?

The timing is perfect. Summer heat is starting to break, but the water is still warm. The fishing is excellent — mahi, snapper, and early sailfish are all in play. And the sandbars are at peak vibes.

## How to Spend the Weekend

**Day 1: Sandbar & Sunset.** Grab the boat in the morning, cruise to the Islamorada sandbar, anchor up, and spend the day floating. Late afternoon, pull anchor and find a quiet spot for a sunset cruise through the backcountry channels.

**Day 2: Fishing & Reef.** Head offshore in the morning for mahi and snapper. Afternoon, swing by Alligator Reef for some snorkeling. End the day at Morada Bay with your feet in the sand and a drink in your hand.

**Day 3: Explore.** Take the boat down to Indian Key or Lignumvitae Key. Explore the ruins, snorkel the surrounding reef, and cruise back at your own pace.

## Book Early

Labor Day is one of our busiest weekends. If you''re thinking about it, lock in your dates now. We offer multi-day rates that make a full weekend on the water more accessible than you''d think.',
  '/blog-labor-day.png',
  'experiences',
  '["labor day","florida keys","sandbar","weekend"]',
  'Serge Parakhnevich',
  'published',
  '2025-08-15T12:00:00'
);
`);

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
