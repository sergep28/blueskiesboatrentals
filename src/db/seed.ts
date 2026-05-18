import { sql } from 'drizzle-orm';
import { db, schema, pool } from './index.js';

async function main() {
  // Idempotency: if boats already exist, skip seeding entirely.
  // This is what prevents production data from being wiped on every deploy.
  const existing = await db.select().from(schema.boats);
  if (existing.length > 0) {
    console.log(`Seed skipped — ${existing.length} boats already present.`);
    await pool.end();
    return;
  }

  console.log('Seeding fresh database...');

  // Seed boats — pricing aligned with blueskiecharter.com ($700-$900 range)
  await db.insert(schema.boats).values([
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
  ]);

  // Seed captains
  await db.insert(schema.captains).values([
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
  ]);

  // Seed gallery
  await db.insert(schema.gallery).values([
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
  ]);

  // Seed blog posts
  await db.execute(sql.raw(`
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
  ),
  (
    'How Much Does It Cost to Rent a Boat in the Florida Keys? (2026 Pricing Guide)',
    'boat-rental-cost-florida-keys-pricing-guide',
    'Florida Keys boat rental prices range from $300 to $2,000+ per day depending on boat size, type, and whether you add a captain. Here is the complete breakdown.',
    'If you''re Googling "how much does it cost to rent a boat in the Florida Keys," you''re not alone. It''s the #1 question we get — and the answer depends on what kind of experience you''re after.

  Here''s the honest breakdown from a company that actually operates boats in the Keys, not a blog that''s never been on the water.

  ## The Quick Answer

  **Budget options (pontoons, deck boats):** $250–$500/day. You get what you pay for — slow, uncomfortable in chop, limited range. Fine for a canal cruise. Not ideal for open water.

  **Mid-range (center consoles, dual consoles 22–26ft):** $500–$800/day. Decent boats that can handle the ocean. Check the maintenance — some rental fleets run boats hard and fix them rarely.

  **Premium (Grady White, Boston Whaler, 28ft+):** $700–$1,500/day. This is what we run at Blue Skies. Deep-V hulls, twin engines, full electronics, real offshore capability. The difference is night and day.

  **Luxury yachts (40ft+):** $2,000–$5,000+/day. If you want a floating living room with a crew, this is the tier.

  ## Blue Skies Boat Rentals Pricing

  We keep it simple. No hidden fees, no fuel surcharges, no "cleaning fees" tacked on at checkout.

  **Grady White Freedom 285 (28ft dual console, up to 8 guests):**
  - Half day (4 hours): $700
  - Full day (8 hours): $900
  - Multi-day: discounted daily rate

  **Grady White Canyon 306 (30ft center console, up to 10 guests):**
  - Half day (4 hours): $900
  - Full day (8 hours): $1,200
  - Multi-day: discounted daily rate

  **Captain add-on:** Available for any rental. Our captains are USCG-licensed and know every reef, flat, and sandbar from Key Largo to Marathon.

  **What''s included:** Safety equipment, cooler, ice, Garmin GPS, fish finder, Bluetooth stereo, freshwater shower, onboard head (bathroom), full boat orientation before departure.

  ## What Affects the Price?

  **Boat size and brand.** A 30ft Grady White costs more than a 20ft rental because it costs more to buy, maintain, insure, and fuel. You''re paying for a real offshore boat that handles 3–4 foot seas without beating you up.

  **Season.** December through April is peak season in the Keys. Prices are higher and availability is tighter. Summer is slightly cheaper but hotter. Fall is the sweet spot — great weather, fewer crowds, excellent fishing.

  **Duration.** Multi-day rentals get a better daily rate. If you''re down for a long weekend, ask about our multi-day pricing.

  **Captain vs. bareboat.** Adding a captain costs more but saves you stress, puts you on fish, and lets everyone in your group relax. If you''ve never boated in the Keys, a captain is worth every penny.

  ## How to Get the Best Value

  1. **Book direct.** Platforms like Boatsetter and GetMyBoat charge 15–20% service fees. Booking direct with a local operator saves you that markup.
  2. **Book early.** Weekends and holidays fill up fast. The further out you book, the more options you have.
  3. **Choose the right boat for your trip.** Don''t overspend on a 30ft boat if you''re just going to the sandbar. Don''t underspend on a pontoon if you want to fish offshore.
  4. **Go multi-day.** The per-day rate drops significantly on 2+ day rentals.

  ## The Bottom Line

  A solid boat rental in the Florida Keys runs $700–$1,200 per day for a premium experience. Split that among 6–8 people and you''re looking at $100–$175 per person for a full day on the water with a pristine Grady White boat. That''s cheaper than most tourist activities in the Keys — and way more memorable.

  Ready to check availability? Book online at blueskiesboatrentals.com or text us at (516) 587-0438.',
    '/freedom-aerial.jpg',
    'keys_guide',
    '["boat rental cost","florida keys pricing","grady white rental","islamorada boat rental"]',
    'Serge Parakhnevich',
    'published',
    '2026-04-21T12:00:00'
  ),
  (
    'Islamorada Boat Rental Guide: Everything You Need to Know Before You Book',
    'islamorada-boat-rental-guide',
    'Planning a boat rental in Islamorada? Local operators share everything about marinas, pricing, what to bring, and the best spots to visit by boat.',
    'Islamorada sits in the heart of the Florida Keys — mile marker 74 to 90 — and it''s the single best place to rent a boat in the entire island chain. Here''s why, and everything you need to know before you book.

  ## Why Islamorada?

  It''s called the Sportfishing Capital of the World for a reason, but fishing is just the start. From Islamorada you can reach:

  - **Alligator Reef & Lighthouse** — 15 minutes. Crystal clear snorkeling, iconic lighthouse, sea turtles.
  - **Indian Key Historic State Park** — 10 minutes. Kayak-accessible ruins of an 1800s settlement.
  - **The Islamorada Sandbar** — 10 minutes. The social hub of the Keys. Anchor up, float, and meet people.
  - **Key Largo & John Pennekamp** — 20 minutes north. World-famous coral reef diving.
  - **Marathon & Sombrero Reef** — 45 minutes south. Family-friendly, calm waters.
  - **The Gulf Stream** — 20 minutes offshore. Deep-sea fishing for mahi, tuna, and wahoo.

  No other island in the Keys gives you this kind of range in every direction.

  ## Where to Rent

  Blue Skies Boat Rentals operates out of Safe Harbor Marina in Islamorada — right next to the Square Grouper restaurant. We run a fleet of Grady White boats (Freedom 285 and Canyon 306) that are detailed before every single trip. No pontoons. No deck boats. No apologies when you step on board.

  Other options exist on the island, but here''s what to look for in any rental company:
  - **What brand/condition are the boats?** Ask to see photos of the actual boat, not stock images.
  - **Is pricing transparent?** Some operators quote low then add fuel, cleaning, or "convenience" fees.
  - **Do they offer captains?** Even experienced boaters benefit from local knowledge in unfamiliar waters.
  - **What''s included?** Safety equipment, cooler, ice, electronics — these should be standard, not add-ons.

  ## Best Times to Visit

  **Peak season (December–April):** Best weather, lowest humidity, calm seas. Book weeks in advance — weekends fill fast.

  **Summer (May–August):** Hot but the water is warm and calm. Afternoon thunderstorms are common but usually brief. Great fishing.

  **Fall (September–November):** The secret season. Fewer crowds, excellent fishing (sailfish start running), and comfortable temperatures. This is when locals go out the most.

  ## What to Bring

  - Sunscreen (reef-safe preferred — you''re swimming in a marine sanctuary)
  - Sunglasses with a strap
  - Cooler with drinks and snacks (or buy ice and drinks at the marina)
  - Towels
  - A change of dry clothes for the ride home
  - Waterproof phone case

  We provide: all safety equipment, cooler, ice, fishing gear (rods, tackle, livewell), snorkeling gear, Garmin GPS, and a full boat orientation.

  ## Bareboat or Captain?

  Both are great options. If you''re experienced on the water and comfortable with navigation, bareboat gives you total freedom. If you want to focus on fishing, explore spots you''d never find on your own, or just relax while someone else drives — add a captain.

  Our captains are USCG-licensed and have logged thousands of hours in these exact waters. They know where the fish are, where the sandbars are shallow, and which reefs have the best visibility today — not last week.

  ## How to Book

  1. Go to blueskiesboatrentals.com/book
  2. Pick your boat, date, and duration
  3. Add a captain if you want one
  4. Confirm and you''re done

  We send you the marina address, slip number, and everything you need to know before your trip. Show up, do a 15-minute walkthrough with us, and you''re off.

  Questions? Text us anytime at (516) 587-0438. We actually answer.',
    '/alligator-reef.jpg',
    'keys_guide',
    '["islamorada","boat rental","guide","florida keys","grady white"]',
    'Serge Parakhnevich',
    'published',
    '2026-04-24T12:00:00'
  ),
  (
    'Best Fishing Spots in Islamorada: A Local Captain''s Guide',
    'best-fishing-spots-islamorada',
    'Islamorada is the sport fishing capital of the world. Here are the best fishing spots from Key Largo to Marathon, shared by local captains who fish them every day.',
    'Islamorada didn''t earn the title "Sportfishing Capital of the World" by accident. The geography is perfect — you have backcountry flats on one side, the Atlantic reef on the other, and the Gulf Stream close enough to reach in 20 minutes.

  After three years of running charters out of Islamorada, here are the spots our captains keep going back to.

  ## Offshore — The Humps

  About 20 miles south of Islamorada, the ocean floor rises from 600 feet to about 200 feet. This underwater mountain range is called "The Humps" and it''s one of the most productive deep-sea fishing spots in the entire Keys.

  **What you''ll catch:** Mahi mahi, blackfin tuna, wahoo, swordfish (night trips), and amberjack.
  **Best season:** Year-round, but mahi peak in spring/summer and wahoo in fall/winter.
  **Boat you need:** A center console with range — like our Canyon 306. You need a boat that can handle open water and carry enough fuel for a 40-mile round trip.

  ## The Reef — Alligator Reef

  Marked by the iconic Alligator Reef Lighthouse, this spot is just 4 miles offshore from Islamorada. The reef drops from 8 feet to 40 feet and holds an incredible variety of species.

  **What you''ll catch:** Yellowtail snapper, mangrove snapper, grouper, hogfish, and cobia.
  **Best season:** Year-round. Yellowtail and mangrove snapper are most active in summer. Grouper opens in May.
  **Pro tip:** Anchor on the deep side of the reef and chum. Yellowtail will come to you.

  ## The Flats — Backcountry

  The Gulf side of Islamorada opens into Florida Bay — a maze of shallow flats, mangrove islands, and channels. This is technical fishing at its finest.

  **What you''ll catch:** Tarpon (spring/summer), bonefish (year-round), permit (spring), redfish, snook.
  **Best season:** Tarpon run April through July. Bonefish are most active in warmer months.
  **Note:** Flats fishing is best with a captain who knows the tides and channels. The water is shallow enough to run aground if you don''t know the area.

  ## The Bridges — Channel 2 & Channel 5

  The bridges connecting the Keys create natural current funnels that attract bait and predators. Channel 2 (near Islamorada) and Channel 5 (near Long Key) are both accessible and productive.

  **What you''ll catch:** Tarpon, barracuda, sharks, snapper, and jacks.
  **Best season:** Tarpon in spring/summer. Snapper year-round.
  **Pro tip:** Fish the outgoing tide. Bait gets pulled through the channel and big fish line up to feed.

  ## Nearshore Wrecks

  Between the reef and the shore, there are dozens of artificial reefs and wrecks scattered along the Keys. These structure spots hold grouper, snapper, and amberjack — and they''re close enough for a half-day trip.

  **What you''ll catch:** Grouper, snapper, amberjack, barracuda.
  **Best season:** Grouper season opens May 1. Snapper year-round.

  ## How to Fish These Spots with Blue Skies

  Every one of these spots is within range of our Islamorada marina. For a half-day trip, you can hit the reef, the flats, or the bridges. For a full day, you can combine reef fishing with an offshore run to the Humps.

  Add one of our USCG-licensed captains and they''ll put you on the bite. They fish these spots every week and know what''s running, what''s biting, and what technique to use today — not what worked last month.

  Book at blueskiesboatrentals.com or text us at (516) 587-0438.',
    '/catch-mahi.jpg',
    'fishing_report',
    '["fishing","islamorada","fishing spots","mahi","snapper","tarpon","florida keys fishing"]',
    'Serge Parakhnevich',
    'published',
    '2026-04-26T12:00:00'
  ),
  (
    'Bareboat vs. Captain: Which Should You Choose for Your Florida Keys Trip?',
    'bareboat-vs-captain-florida-keys',
    'Should you rent a boat bareboat or add a captain in the Florida Keys? Here is an honest comparison to help you decide.',
    'Every boat rental in the Keys comes down to one decision: do you drive, or does someone else?

  Both options are great. But they''re great for different reasons. Here''s the honest breakdown from operators who run both every single day.

  ## Bareboat: Total Freedom

  A bareboat rental means you''re the captain. You pick where to go, when to leave, and how long to stay. Nobody is on a schedule but you.

  **Bareboat is perfect if:**
  - You have boating experience and are comfortable with navigation
  - You want to set your own pace — anchor at a sandbar for 4 hours if you want
  - You''re on a budget (no captain fee)
  - You want privacy for your group — no strangers on board
  - You''ve boated in the Keys before and know the waters

  **The trade-offs:**
  - You''re responsible for navigation, anchoring, and safety
  - You need a Florida Boater Safety ID if born after January 1, 1988
  - You might miss the best fishing spots, reefs, or hidden sandbars that only locals know
  - If something goes wrong (engine trouble, weather change), you''re handling it

  **At Blue Skies, every bareboat rental includes:** Full boat orientation and safety briefing, loaded GPS with waypoints to popular spots (sandbars, reefs, restaurants), all safety equipment, a direct text line to us if you need anything on the water.

  ## With a Captain: Local Knowledge + Zero Stress

  Adding a captain means you have a USCG-licensed professional who lives on this water. They know the tides, the fish, the weather patterns, and the spots that don''t show up on Google Maps.

  **A captain is perfect if:**
  - You''re visiting the Keys for the first time
  - You want to fish (seriously, not just cast and hope)
  - You want someone else to handle the boat while everyone in your group relaxes
  - You want to find the best snorkeling reef with clear visibility TODAY
  - You''re celebrating something — anniversary, birthday, bachelor party — and want to enjoy it
  - You have kids and want an extra set of experienced hands on board

  **The trade-offs:**
  - It costs more (captain fee on top of the rental)
  - You''re on someone else''s general timeline (though our captains are flexible)
  - Less privacy — there''s an extra person on your boat

  **What our captains bring:** Thousands of hours on these exact waters. They know which reef has the best visibility this morning. They know where the mahi are schooling this week. They know the sandbar that''s perfect at low tide vs. high tide. That''s not something you can Google.

  ## The Numbers

  Let''s say you''re renting our Freedom 285 for a full day with 6 friends:

  **Bareboat:** $900 ÷ 6 people = **$150/person** for a full day on a pristine Grady White.

  **With captain:** ~$1,200 total ÷ 6 people = **$200/person** for a full day with a licensed captain who puts you on fish or takes you to spots you''d never find.

  For $50 more per person, you get a completely different experience.

  ## Our Recommendation

  **First time in the Keys?** Get a captain. You''ll see more, catch more, and stress less.

  **Experienced boater who knows the area?** Go bareboat and enjoy the freedom.

  **Want the best of both?** Book a captain for Day 1 to learn the waters, then go bareboat on Day 2. A lot of our multi-day customers do exactly this.

  ## Book Your Trip

  Pick your boat, pick your date, and decide at checkout whether to add a captain. Simple.

  blueskiesboatrentals.com/book — or text us at (516) 587-0438 if you want our honest recommendation for your specific group.',
    '/freedom-anchored.jpg',
    'keys_guide',
    '["bareboat","captain","boat rental","florida keys","islamorada"]',
    'Serge Parakhnevich',
    'published',
    '2026-04-25T12:00:00'
  ),
  (
    'Best Restaurants in Islamorada: Where to Eat Before and After Your Boat Day',
    'best-restaurants-islamorada',
    'The best restaurants in Islamorada, Florida Keys — from waterfront seafood to casual Keys vibes. Plus why our marina puts you steps from the best meal on the island.',
    'One of the best things about renting a boat with Blue Skies is where you start and end your day.

  Our boats are docked at **Safe Harbor Marina in Islamorada** — and the marina shares a parking lot with **The Square Grouper**, one of the best restaurants on the entire island chain. That''s not a coincidence. It''s one of the reasons we chose this marina.

  You pull in, park once, walk 30 seconds to the dock for your boat, and when you get back — salty, sun-tired, and starving — the best meal in the Keys is right there. No driving. No searching for parking in a tourist town. Just tie up, rinse off, and grab a table.

  ## The Square Grouper — Steps From Your Boat

  This is the spot. Right in the Safe Harbor Marina parking lot, The Square Grouper is an Islamorada institution. Fresh seafood, creative cocktails, and a vibe that somehow feels upscale and Keys-casual at the same time.

  **What to order:** The pan-seared grouper (obviously), the tuna nachos, and whatever the daily catch is. Their cocktail menu is legit — not the frozen tourist stuff you get at the chain spots.

  **Why it matters for your boat day:** You can literally see your boat from the restaurant. Finish your trip, walk off the dock, sit down, and order. It''s the perfect ending to a day on the water. Some of our customers book a sunset cruise and then eat at the Square Grouper after. That''s an A+ Keys day.

  ## Morada Bay Beach Cafe — Toes in the Sand

  About 5 minutes south of our marina, Morada Bay is the most photographed restaurant in Islamorada for a reason. White sand beach, Adirondack chairs, palm trees, and tables right on the water. The Full Moon Party here is legendary.

  **What to order:** The fish tacos, the ceviche, and a rum punch. Keep it simple — you''re here for the vibe as much as the food.

  **Boat day play:** Hit the sandbar in the morning, come back mid-afternoon, change into dry clothes, and walk the beach at Morada Bay for dinner. You will not regret this.

  ## Lorelei Restaurant & Cabana Bar — Sunset Central

  Lorelei sits right on the bay and has one of the best sunset views in the Keys. The cabana bar is open-air, casual, and almost always has live music in the evenings.

  **What to order:** Blackened mahi sandwich, conch fritters, and a cold beer. This is a Keys dive bar that happens to serve excellent food.

  **Boat day play:** If you''re doing a half-day morning charter, Lorelei is a great late lunch spot. Sit at the bar, watch the boats come in, and recap the catches of the day.

  ## Robbie''s of Islamorada — Feed the Tarpon

  Robbie''s is part restaurant, part tourist attraction, part open-air market. The main draw is feeding the giant tarpon that hang out at the dock — they''ll eat right out of your hand. The food is solid casual fare.

  **What to order:** Fish sandwich and a bucket of tarpon food (seriously, it''s $5 and the kids will lose their minds).

  **Boat day play:** If you have kids, stop at Robbie''s before or after your charter. It''s a 5-minute drive from our marina and it''s the kind of thing they''ll talk about for months.

  ## Lazy Days Restaurant — Ocean Views

  Right on the oceanside of Islamorada, Lazy Days has been a local favorite for decades. The outdoor patio overlooks the Atlantic and the food is consistently excellent.

  **What to order:** Lobster mac and cheese, hogfish (when in season), and Key lime pie. Their hogfish is some of the best on the island.

  **Boat day play:** Great for a nicer dinner after a full-day charter. A step up from casual but still very Keys — no need to dress up.

  ## Hog Heaven — Smoked Meat, Cold Beer, Done

  If you want barbecue and don''t need a white tablecloth, Hog Heaven is your spot. Smoked ribs, pulled pork, and smoked fish dip that locals swear by. It sits right on the highway with water views.

  **What to order:** The smoked fish dip and a rack of ribs. Bring napkins. Lots of napkins.

  **Boat day play:** Perfect quick lunch before an afternoon charter. Grab it to go and eat at the marina if you want.

  ## The Perfect Islamorada Boat Day (With Food)

  Here''s what the best day in Islamorada looks like:

  **8:00 AM** — Coffee at the marina, meet your captain or do your safety briefing
  **8:30 AM** — Head out on your Blue Skies Grady White
  **9:00 AM** — Fish the reef or cruise to the sandbar
  **12:00 PM** — Anchor up at a sandbar, swim, snorkel, lunch from your cooler
  **3:00 PM** — Head back to Safe Harbor Marina
  **3:30 PM** — Walk 30 seconds to The Square Grouper
  **4:00 PM** — Cold cocktail, fresh grouper, and the best post-boat-day meal of your life
  **6:00 PM** — Drive to Morada Bay for sunset on the beach (optional but highly recommended)

  That''s a day that costs less than you think and creates memories that last forever.

  ## Book Your Day

  Our boats depart from Safe Harbor Marina — steps from The Square Grouper and minutes from every restaurant on this list. Book at blueskiesboatrentals.com or text us at (516) 587-0438.

  We''ll handle the boat. Islamorada will handle the rest.',
    '/freedom-anchored.jpg',
    'keys_guide',
    '["islamorada restaurants","square grouper","morada bay","best restaurants florida keys","islamorada food","where to eat islamorada"]',
    'Serge Parakhnevich',
    'published',
    '2026-04-26T12:00:00'
  );
  `));

  // Seed reviews
  await db.insert(schema.reviews).values([
    { customerName: 'James & Emily T.', rating: 5, comment: 'Absolutely incredible day on the water! The Grady White was immaculate and Captain Mike put us on fish all morning. Best day of our Keys vacation by far.', status: 'approved' },
    { customerName: 'The Martinez Family', rating: 5, comment: 'Rented the Freedom for a family sandbar trip. The kids had a blast snorkeling and the boat was perfect — clean, spacious, and loaded with gear. Will definitely be back!', status: 'approved' },
    { customerName: 'David R.', rating: 5, comment: 'Great sunset cruise around Islamorada. Captain Sarah was knowledgeable and fun. The boat is in a completely different league compared to other rentals in the area.', status: 'approved' },
    { customerName: 'Sarah & Mike L.', rating: 5, comment: 'We\'ve rented boats all over the Keys and this was hands down the best experience. Premium boats, amazing service, and they actually care about your trip.', status: 'approved' },
    { customerName: 'Chris K.', rating: 5, comment: 'Took the Canyon Runner offshore and it was a beast. Caught mahi, wahoo, and a big bull dolphin. The boat handled the swells like a dream. Already booked our next trip!', status: 'approved' },
  ]);

  // Rewards catalog intentionally not seeded — superseded by automatic tier discounts
  // (5% off at First Mate, 10% off at Captain). See src/lib/loyalty.ts.

  // Seed partners
  await db.insert(schema.partners).values([
    { businessName: 'Keys Sunset Resort', contactName: 'Maria Gonzalez', email: 'maria@keyssunset.com', phone: '305-555-0201', type: 'hotel', referralCode: 'BS-SUNSET', commissionRate: 10, status: 'active' },
    { businessName: 'Paradise Stays', contactName: 'Tom Williams', email: 'tom@paradisestays.com', phone: '305-555-0202', type: 'airbnb_host', referralCode: 'BS-PARADI', commissionRate: 10, status: 'active' },
  ]);

  // Seed admin user
  await db.insert(schema.users).values([
    { name: 'Admin', email: 'admin@blueskiesboatrentals.com', role: 'admin', loyaltyPoints: 0 },
  ]);

  console.log('Database seeded successfully!');
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
