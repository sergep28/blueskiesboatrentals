import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  { name: 'Papa Joe\'s Waterfront', category: 'restaurant', location: 'Islamorada', vibe: 'Waterfront tiki bar & fish camp, newly opened', ourTake: 'The newest spot on the island and already a favorite. Fresh seafood, island cocktails, and a killer tiki bar right on the water. Great energy — feels like the Keys should feel.', mustTry: 'Fresh catch & island cocktails' },
  { name: 'Morada Bay Beach Cafe', category: 'restaurant', location: 'Islamorada', vibe: 'Upscale casual, toes in the sand', ourTake: 'Our go-to for bringing clients. Sunset here is unbeatable. Get the hogfish.', mustTry: 'Hogfish Meuniere' },
  { name: 'Chef Michael\'s', category: 'restaurant', location: 'Islamorada', vibe: 'Fine dining, intimate', ourTake: 'The best restaurant in the Keys, full stop. Special occasion worthy. Reserve ahead.', mustTry: 'Chef\'s tasting menu' },
  { name: 'Islamorada Fish Company', category: 'restaurant', location: 'Islamorada', vibe: 'Casual, fresh off the boat', ourTake: 'No frills, incredible fish tacos. Sit at the outdoor bar and watch the tarpon.', mustTry: 'Fish tacos' },
  { name: 'Lorelei Cabana Bar', category: 'bar', location: 'Islamorada', vibe: 'Sunset views, live music', ourTake: 'Best sunset bar in Islamorada. Live music most nights. Come by boat and dock right there.', mustTry: 'Rum punch at sunset' },
  { name: 'Green Turtle Inn', category: 'restaurant', location: 'Islamorada', vibe: 'Classic Keys, historic', ourTake: 'Been here since 1947. The turtle chowder is legendary. Old Keys at its finest.' },
  { name: 'Islamorada Brewery & Distillery', category: 'bar', location: 'Islamorada', vibe: 'Craft beer, laid-back', ourTake: 'Great craft beers brewed on-site. The Sandbar Sunday wheat ale is perfect after a day on the water. Food trucks rotate through.' },
  { name: 'Hungry Tarpon', category: 'restaurant', location: 'Islamorada', vibe: 'Breakfast spot at Robbie\'s Marina', ourTake: 'Best breakfast in Islamorada. Sit on the deck and watch the tarpon while you eat. Get there early on weekends.', mustTry: 'Keys Benedict' },
  { name: 'Robbie\'s Marina', category: 'activity', location: 'Islamorada', vibe: 'Touristy but fun', ourTake: 'Feed the tarpon, browse the vendors, rent kayaks. Touristy? Yes. Fun? Also yes. Kids love it.' },
  { name: 'Theater of the Sea', category: 'activity', location: 'Islamorada', vibe: 'Marine park, family-friendly', ourTake: 'One of the oldest marine parks in the world. Swim with dolphins, sea lions, and stingrays. Great for kids and honestly fun for adults too.' },
  { name: 'Anne\'s Beach', category: 'activity', location: 'Islamorada', vibe: 'Quiet, shallow wading beach', ourTake: 'A hidden gem. Shallow water, boardwalk through the mangroves, and rarely crowded. Perfect for families with small kids.' },
  { name: 'Islamorada Sandbar', category: 'activity', location: 'Islamorada', vibe: 'The ultimate boat day hangout', ourTake: 'This is where everyone goes on the weekends. Anchor up, hop in the water, and hang with the crowd. We\'ll take you right to it.' },
  { name: 'Square Grouper', category: 'restaurant', location: 'Islamorada', vibe: 'Waterfront bar & grill at the marina', ourTake: 'Right at our marina. This is where you go before or after your boat day. Cold beer, great food, and you can literally walk to the dock. Our customers eat here all the time.', mustTry: 'Grouper sandwich' },
  { name: 'Lazy Days Restaurant', category: 'restaurant', location: 'Islamorada', vibe: 'Beachside dining, live music', ourTake: 'Voted best waterfront dining in the Upper Keys multiple times. Great seafood, Adirondack chairs right on the water. Hard to beat for a relaxed lunch.', mustTry: 'Fresh catch of the day' },
  { name: 'Pierre\'s Restaurant', category: 'restaurant', location: 'Islamorada', vibe: 'Upscale, romantic, colonial-style', ourTake: 'Sits right above Morada Bay with the best fine dining sunset view in Islamorada. French-American cuisine. Date night or special occasion — reserve ahead.' },
  { name: 'Mangrove Mike\'s Cafe', category: 'restaurant', location: 'Islamorada', vibe: 'Classic Keys breakfast joint', ourTake: 'The local breakfast spot. Lobster omelettes and strawberry waffles. Gets packed on weekends for a reason — get there early.', mustTry: 'Lobster omelette' },

  // Key Largo
  { name: 'The Fish House', category: 'restaurant', location: 'Key Largo', vibe: 'Waterfront, local favorite', ourTake: 'Best fish in Key Largo. Locals eat here — that tells you everything.', mustTry: 'Matecumbe style fish' },
  { name: 'Buzzard\'s Roost', category: 'restaurant', location: 'Key Largo', vibe: 'Marina dining, casual', ourTake: 'Great conch fritters and views of the marina. Solid lunch spot before or after a day on the water.' },
  { name: 'Mrs. Mac\'s Kitchen', category: 'restaurant', location: 'Key Largo', vibe: 'Classic diner since 1976', ourTake: 'License plates on the walls, cold beer, real food. A Keys institution.' },
  { name: 'Skipper\'s Dockside', category: 'restaurant', location: 'Key Largo', vibe: 'Casual waterfront, marina views', ourTake: 'Right on the marina with great views. Solid seafood, cold drinks, and a relaxed vibe. Good spot to grab lunch before heading out.' },
  { name: 'John Pennekamp State Park', category: 'activity', location: 'Key Largo', vibe: 'World-class snorkeling', ourTake: 'The first undersea park in the US. Christ of the Abyss statue is a must-see. Go early.' },
  { name: 'Florida Keys Brewing Co.', category: 'bar', location: 'Key Largo', vibe: 'Local craft brewery, chill', ourTake: 'Taproom with a rotating selection of tropical-inspired brews. Great spot to wind down after a day on the water.' },
  { name: 'Snappers Oceanfront', category: 'restaurant', location: 'Key Largo', vibe: 'Waterfront party, live music, three bars', ourTake: 'A Key Largo institution since 1989. Caribbean-style seafood, Sunday jazz brunch, and a genuinely fun waterfront vibe. Plan to stay a while.' },
  { name: 'Sundowners', category: 'restaurant', location: 'Key Largo', vibe: 'Bayside sunset spot', ourTake: 'One of the few bayside restaurants in Key Largo with unobstructed sunset views over Florida Bay. The sunset ritual here is a nightly event. Solid seafood and cocktails.' },

  // Marathon
  { name: 'Keys Fisheries', category: 'restaurant', location: 'Marathon', vibe: 'Waterfront, famous lobster', ourTake: 'The lobster reuben is famous for a reason. Casual waterfront dining at its best.', mustTry: 'Lobster reuben' },
  { name: 'Castaway Waterfront', category: 'bar', location: 'Marathon', vibe: 'Tiki bar, sunset views', ourTake: 'Great tiki bar with solid food. The kind of place you plan to stay an hour and stay three.' },
  { name: 'The Island Fish Co.', category: 'restaurant', location: 'Marathon', vibe: 'Tiki dining on the water', ourTake: 'Beautiful waterfront tiki restaurant. Great for groups and families. The sunset views from the deck are incredible.' },
  { name: 'Sombrero Beach', category: 'activity', location: 'Marathon', vibe: 'Best public beach in the Keys', ourTake: 'The nicest public beach in the middle Keys. Clean, free, with picnic areas and calm water. Locals bring their families here on weekends.' },
  { name: 'Turtle Hospital', category: 'activity', location: 'Marathon', vibe: 'Educational, family-friendly', ourTake: 'Guided tours of the sea turtle rehab facility. Genuinely fascinating, great for families.' },
  { name: 'The Florida Keys Aquarium Encounters', category: 'activity', location: 'Marathon', vibe: 'Interactive aquarium, family must-do', ourTake: 'Hands-on aquarium where you can touch stingrays, feed tarpon, and even swim with sharks. Way better than your typical aquarium — the kids will talk about it for weeks.' },
  { name: 'Marathon Hump', category: 'activity', location: 'Marathon', vibe: 'Offshore fishing hotspot', ourTake: 'If you\'re here to fish, this is the spot. Deep water seamount about 25 miles offshore. Tuna, mahi, wahoo — serious fishing. We\'ll set you up with a guide who knows it.' },
  { name: 'Sunset Grille & Raw Bar', category: 'bar', location: 'Marathon', vibe: 'Pool parties, waterfront, Seven Mile Bridge views', ourTake: 'Right at the base of the old Seven Mile Bridge. Sunday pool party with DJs and BBQ is legendary. Even on a regular night the sunset from here is hard to beat.' },
  { name: 'Sparky\'s Landing', category: 'restaurant', location: 'Marathon', vibe: 'Casual dockside, locals\' spot', ourTake: 'True locals\' hangout with great water views. No frills, great conch and fish sandwiches. If you want to eat where the fishing guides eat, this is it.' },
  { name: 'Pigeon Key', category: 'activity', location: 'Marathon', vibe: 'Historic island, snorkeling', ourTake: 'Tiny island under the old Seven Mile Bridge. Walk or bike the old bridge to get there, or take the ferry. Great snorkeling and fascinating railroad history. Feels like a hidden gem.' },
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
              href="sms:5155870438"
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-full font-semibold hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              Text Us for Recommendations
            </a>
            <Link
              to="/stays"
              className="border border-slate-200 hover:bg-slate-900 hover:text-white text-slate-900 px-8 py-4 rounded-full font-semibold transition-all flex items-center justify-center gap-2"
            >
              View Stays + Boat Packages
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
