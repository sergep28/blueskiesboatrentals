import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, UtensilsCrossed, Wine, Waves, Camera, Star, ExternalLink } from 'lucide-react';

type Spot = {
  name: string;
  category: 'restaurant' | 'bar' | 'activity' | 'shop';
  location: string;
  vibe: string;
  ourTake: string;
  mustTry?: string;
};

const spots: Spot[] = [
  // Islamorada
  { name: 'Morada Bay Beach Cafe', category: 'restaurant', location: 'Islamorada', vibe: 'Upscale casual, toes in the sand', ourTake: 'Our go-to for bringing clients. Sunset here is unbeatable. Get the hogfish.', mustTry: 'Hogfish Meuniere' },
  { name: 'Chef Michael\'s', category: 'restaurant', location: 'Islamorada', vibe: 'Fine dining, intimate', ourTake: 'The best restaurant in the Keys, full stop. Special occasion worthy. Reserve ahead.', mustTry: 'Chef\'s tasting menu' },
  { name: 'Islamorada Fish Company', category: 'restaurant', location: 'Islamorada', vibe: 'Casual, fresh off the boat', ourTake: 'No frills, incredible fish tacos. Sit at the outdoor bar and watch the tarpon.', mustTry: 'Fish tacos' },
  { name: 'Lorelei Cabana Bar', category: 'bar', location: 'Islamorada', vibe: 'Sunset views, live music', ourTake: 'Best sunset bar in Islamorada. Live music most nights. Come by boat and dock right there.', mustTry: 'Rum punch at sunset' },
  { name: 'Green Turtle Inn', category: 'restaurant', location: 'Islamorada', vibe: 'Classic Keys, historic', ourTake: 'Been here since 1947. The turtle chowder is legendary. Old Keys at its finest.' },
  { name: 'Robbie\'s Marina', category: 'activity', location: 'Islamorada', vibe: 'Touristy but fun', ourTake: 'Feed the tarpon, browse the vendors, rent kayaks. Touristy? Yes. Fun? Also yes. Kids love it.' },

  // Key Largo
  { name: 'The Fish House', category: 'restaurant', location: 'Key Largo', vibe: 'Waterfront, local favorite', ourTake: 'Best fish in Key Largo. Locals eat here — that tells you everything.', mustTry: 'Matecumbe style fish' },
  { name: 'Buzzard\'s Roost', category: 'restaurant', location: 'Key Largo', vibe: 'Marina dining, casual', ourTake: 'Great conch fritters and views of the marina. Solid lunch spot before or after a day on the water.' },
  { name: 'Mrs. Mac\'s Kitchen', category: 'restaurant', location: 'Key Largo', vibe: 'Classic diner since 1976', ourTake: 'License plates on the walls, cold beer, real food. A Keys institution.' },
  { name: 'John Pennekamp State Park', category: 'activity', location: 'Key Largo', vibe: 'World-class snorkeling', ourTake: 'The first undersea park in the US. Christ of the Abyss statue is a must-see. Go early.' },

  // Marathon
  { name: 'Keys Fisheries', category: 'restaurant', location: 'Marathon', vibe: 'Waterfront, famous lobster', ourTake: 'The lobster reuben is famous for a reason. Casual waterfront dining at its best.', mustTry: 'Lobster reuben' },
  { name: 'Castaway Waterfront', category: 'bar', location: 'Marathon', vibe: 'Tiki bar, sunset views', ourTake: 'Great tiki bar with solid food. The kind of place you plan to stay an hour and stay three.' },
  { name: 'Turtle Hospital', category: 'activity', location: 'Marathon', vibe: 'Educational, family-friendly', ourTake: 'Guided tours of the sea turtle rehab facility. Genuinely fascinating, great for families.' },
];

const categoryIcons: Record<string, any> = {
  restaurant: UtensilsCrossed,
  bar: Wine,
  activity: Waves,
  shop: Camera,
};

const categoryLabels: Record<string, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar & Drinks',
  activity: 'Activity',
  shop: 'Shop',
};

const locations = ['All', 'Islamorada', 'Key Largo', 'Marathon'];
const categories = ['all', 'restaurant', 'bar', 'activity'];

export default function KeysGuidePage() {
  const [activeLocation, setActiveLocation] = useState('All');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    document.title = 'Keys Guide | Blue Skies Boat Rentals';
  }, []);

  const filtered = spots.filter(s => {
    if (activeLocation !== 'All' && s.location !== activeLocation) return false;
    if (activeCategory !== 'all' && s.category !== activeCategory) return false;
    return true;
  });

  // Group by location
  const grouped: Record<string, Spot[]> = {};
  filtered.forEach(s => {
    if (!grouped[s.location]) grouped[s.location] = [];
    grouped[s.location].push(s);
  });

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative h-[50vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/keys-sunset.jpeg)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pb-16 w-full">
          <p className="text-sky-300 text-xs font-semibold tracking-[0.2em] uppercase mb-3">The Insider's Guide</p>
          <h1 className="font-heading text-5xl md:text-7xl font-normal text-white mb-4">
            Keys Guide
          </h1>
          <p className="text-white/70 text-lg max-w-2xl">
            Our curated picks for where to eat, drink, and explore — from people who actually live here.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 px-6 border-b border-slate-100 sticky top-16 bg-white/90 backdrop-blur-lg z-30">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-wrap gap-2">
              {locations.map(loc => (
                <button
                  key={loc}
                  onClick={() => setActiveLocation(loc)}
                  className={`text-sm px-4 py-2 rounded-full transition-all ${
                    activeLocation === loc
                      ? 'bg-sky-500 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-900 bg-slate-50'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-sm px-4 py-2 rounded-full transition-all capitalize ${
                    activeCategory === cat
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? 'All types' : categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Spots */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          {Object.entries(grouped).map(([location, locationSpots]) => (
            <div key={location} className="mb-16 last:mb-0">
              <div className="flex items-center gap-2 mb-8">
                <MapPin className="w-4 h-4 text-sky-500" />
                <h2 className="font-heading text-2xl font-normal text-slate-900">{location}</h2>
                <span className="text-slate-300 text-sm ml-2">{locationSpots.length} spots</span>
              </div>

              <div className="space-y-4">
                {locationSpots.map((spot, i) => {
                  const Icon = categoryIcons[spot.category] || Camera;
                  return (
                    <motion.div
                      key={spot.name}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-slate-50 rounded-xl p-6 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon className="w-4 h-4 text-sky-500" />
                            <h3 className="text-slate-900 font-medium">{spot.name}</h3>
                            <span className="text-slate-400 text-xs px-2 py-0.5 rounded-full bg-white capitalize">
                              {categoryLabels[spot.category]}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-3">{spot.vibe}</p>
                          <p className="text-slate-500 text-sm leading-relaxed">{spot.ourTake}</p>
                          {spot.mustTry && (
                            <p className="text-sky-500 text-xs mt-3">
                              Must try: <span className="text-sky-400">{spot.mustTry}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-400 text-lg">No spots match your filters.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl font-normal text-slate-900 mb-4">
            Want the full experience?
          </h2>
          <p className="text-slate-400 mb-10">
            Book a boat, stay at one of our partner properties, and let us build your Keys itinerary.
            We know every spot on this list personally.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="sms:3055550000"
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-full font-semibold hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              Text Us for Recommendations
            </a>
            <a
              href="/stays"
              className="border border-slate-200 hover:bg-slate-900 hover:text-white text-slate-900 px-8 py-4 rounded-full font-semibold transition-all flex items-center justify-center gap-2"
            >
              View Stays + Boat Packages
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
