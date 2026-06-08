import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, ArrowRight, Phone, MessageCircle, Check, Fish, Waves, Sunset, Anchor, UtensilsCrossed, Camera } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { useEffect } from 'react';
import SEO from '../components/SEO';

const locations: Record<string, {
  name: string;
  headline: string;
  tagline: string;
  description: string;
  img: string;
  gallery: string[];
  thingsToDo: { icon: any; title: string; desc: string }[];
  dining: { name: string; vibe: string }[];
  tips: string[];
  distance: string;
}> = {
  'key-largo': {
    name: 'Key Largo',
    headline: 'Key Largo',
    tagline: 'Diving capital of the world',
    description: 'Key Largo is the first island you hit driving into the Keys and it sets the tone immediately. Home to John Pennekamp Coral Reef State Park — the first undersea park in the US — and some of the clearest water you\'ll find on the East Coast. Our Islamorada base is just 20 minutes south, making Key Largo waters an easy morning cruise.',
    img: '/keys-sunset.jpeg',
    gallery: ['/keys-sunset.jpeg', '/mahi-catch.jpeg', '/boat-alligator-reef.jpeg'],
    thingsToDo: [
      { icon: Waves, title: 'John Pennekamp State Park', desc: 'Snorkel or dive the reef. See the famous Christ of the Abyss underwater statue.' },
      { icon: Fish, title: 'Backcountry Fishing', desc: 'Tarpon, bonefish, and permit in the mangrove flats. World-class sight fishing.' },
      { icon: Anchor, title: 'Molasses Reef', desc: 'One of the most popular dive/snorkel sites in the Keys. Vibrant coral and marine life.' },
      { icon: Sunset, title: 'Sunset at Largo Sound', desc: 'Anchor up in the sound and watch the sky turn colors over the mangroves.' },
      { icon: Camera, title: 'Florida Keys Wild Bird Rehabilitation Center', desc: 'Walk the boardwalk through natural habitats. Great photo ops.' },
    ],
    dining: [
      { name: 'The Fish House', vibe: 'Fresh catch, waterfront, local favorite' },
      { name: 'Buzzard\'s Roost', vibe: 'Casual marina dining, great conch fritters' },
      { name: 'Mrs. Mac\'s Kitchen', vibe: 'Classic Keys diner, been here since 1976' },
    ],
    tips: [
      'Book a full day to combine Key Largo snorkeling with an afternoon at Alligator Reef',
      'The best visibility is in the morning before the wind picks up',
      'Pennekamp mooring balls fill up fast on weekends — go on a weekday if you can',
    ],
    distance: '20 min from our dock',
  },
  islamorada: {
    name: 'Islamorada',
    headline: 'Islamorada',
    tagline: 'Sport fishing capital of the world — and our home base',
    description: 'Islamorada is where we live, dock, and breathe. It\'s the sport fishing capital of the world for a reason — access to the backcountry flats, the reef, and the Gulf Stream all within minutes. But it\'s not just about fishing. The sandbars, Alligator Reef, Indian Key, sunsets from the water — Islamorada delivers the full Keys experience in one place.',
    img: '/boat-alligator-reef.jpeg',
    gallery: ['/boat-alligator-reef.jpeg', '/boat-night.jpeg', '/mahi-catch.jpeg', '/keys-sunset.jpeg'],
    thingsToDo: [
      { icon: Anchor, title: 'Alligator Reef Lighthouse', desc: 'Crystal clear turquoise water, iconic lighthouse, incredible snorkeling. The shot everyone posts.' },
      { icon: Fish, title: 'Offshore Fishing', desc: 'Mahi, wahoo, tuna, sailfish. The Gulf Stream is 20 minutes out. Bring your game face.' },
      { icon: Waves, title: 'The Islamorada Sandbar', desc: 'Anchor up with everyone else or find your own spot. Bring a cooler and stay all day.' },
      { icon: Camera, title: 'Indian Key State Park', desc: 'A tiny historic island you can only reach by boat. Hike the ruins and snorkel the surrounding reef.' },
      { icon: Sunset, title: 'Backcountry Sunset Cruise', desc: 'Cruise through the mangrove channels into Florida Bay. The sunset out here is unmatched.' },
      { icon: Fish, title: 'Robbie\'s Tarpon Feeding', desc: 'Hand-feed giant tarpon off the dock. Touristy? Yes. Worth it? Also yes.' },
    ],
    dining: [
      { name: 'Morada Bay Beach Cafe', vibe: 'Toes in the sand, cocktails at sunset, upscale casual' },
      { name: 'Islamorada Fish Company', vibe: 'Fresh off the boat, no frills, excellent fish tacos' },
      { name: 'Chef Michael\'s', vibe: 'Fine dining, chef-driven, special occasion spot' },
      { name: 'Lorelei Cabana Bar', vibe: 'Sunset views, live music, cold drinks on the water' },
    ],
    tips: [
      'This is our home base — boats are docked here, no transit time needed',
      'The sandbar gets crowded on weekends. Weekday mornings are magic.',
      'Ask us about the best fishing spots for the current season — it changes monthly',
      'Alligator Reef is best on calm days. Check the wind forecast before you go.',
    ],
    distance: 'Home Base',
  },
  marathon: {
    name: 'Marathon',
    headline: 'Marathon',
    tagline: 'The heart of the Keys',
    description: 'Marathon sits right in the middle of the island chain with easy access to both the Atlantic and the Gulf of Mexico. It\'s family-friendly, laid back, and surrounded by incredible water. From our Islamorada base, Marathon is an easy 45-minute cruise south — perfect for a full day hitting Sombrero Reef, the Seven Mile Bridge area, or the pristine backcountry flats.',
    img: '/boat-night.jpeg',
    gallery: ['/boat-night.jpeg', '/keys-sunset.jpeg', '/yellowtail-catch.jpeg'],
    thingsToDo: [
      { icon: Waves, title: 'Sombrero Reef', desc: 'One of the best snorkeling reefs in the Keys. Shallow, colorful, and teeming with life.' },
      { icon: Anchor, title: 'Seven Mile Bridge Views', desc: 'Cruise under the iconic bridge. The old bridge makes for incredible photos from the water.' },
      { icon: Fish, title: 'Flats Fishing', desc: 'Bonefish, permit, and tarpon on the Gulf side flats. Calm, clear, perfect sight fishing.' },
      { icon: Camera, title: 'Turtle Hospital', desc: 'Worth a stop on land. Guided tours show you the rescue and rehab process.' },
      { icon: Sunset, title: 'Sunset on the Gulf Side', desc: 'The Gulf of Mexico sunsets from Marathon are wide open and spectacular.' },
    ],
    dining: [
      { name: 'Keys Fisheries', vibe: 'Famous lobster reuben, waterfront, casual and delicious' },
      { name: 'Castaway Waterfront', vibe: 'Tiki bar vibes, great seafood, sunset views' },
      { name: 'Burdines Waterfront', vibe: 'Old school Keys charm, breakfast on the water' },
    ],
    tips: [
      'Multi-day rental recommended — Marathon rewards a slower pace',
      'The Gulf side flats here are some of the best-kept secrets in the Keys',
      'Sombrero Reef has mooring balls — first come first served, arrive early',
    ],
    distance: '45 min cruise from our dock',
  },
};

export default function LocationPage() {
  const { location } = useParams();
  const loc = locations[location ?? ''];
  const { data: boats } = trpc.boats.list.useQuery();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc]);

  if (!loc) return <Navigate to="/404" replace />;

  const locationDescriptions: Record<string, string> = {
    'key-largo': 'Rent a Grady White boat and explore Key Largo — John Pennekamp, Molasses Reef, and the diving capital of the world. 20 minutes from our Islamorada dock.',
    islamorada: 'Boat rentals in Islamorada, the sport fishing capital of the world. Sandbars, Alligator Reef, offshore fishing, sunset cruises. Our home base in the Florida Keys.',
    marathon: 'Rent a boat and cruise to Marathon — Sombrero Reef, Seven Mile Bridge, and the heart of the Florida Keys. 45 minutes from our Islamorada dock.',
  };

  return (
    <div className="bg-white">
      <SEO
        title={`Boat Rentals ${loc.headline} FL`}
        description={locationDescriptions[location ?? ''] || loc.description.slice(0, 155)}
        path={`/${location}`}
        image={loc.img}
      />
      {/* Hero — shorter */}
      <section className="relative h-[50vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${loc.img})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 pb-10 w-full">
          <p className="text-sky-300 text-xs font-semibold tracking-[0.2em] uppercase mb-2">
            <MapPin className="w-3 h-3 inline mr-1" />{loc.distance}
          </p>
          <h1 className="font-heading text-5xl md:text-6xl font-normal text-white mb-2">{loc.headline} Boat Rentals</h1>
          <p className="text-white/70">{loc.tagline}</p>
        </div>
      </section>

      {/* Main content — two column */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-5 gap-10">

          {/* Left — About + Things To Do + Dining */}
          <div className="md:col-span-3 space-y-8">
            <p className="text-slate-500 text-sm leading-relaxed">{loc.description}</p>

            <div>
              <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Things To Do</p>
              <div className="grid grid-cols-2 gap-3">
                {loc.thingsToDo.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ y: 10, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-slate-50 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-2">
                      <item.icon className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                      <div>
                        <h3 className="text-slate-900 font-medium text-sm">{item.title}</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Where To Eat</p>
              <div className="grid grid-cols-2 gap-3">
                {loc.dining.map((spot) => (
                  <div key={spot.name} className="flex items-start gap-2 bg-slate-50 rounded-lg p-3">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-sky-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-900 text-sm font-medium">{spot.name}</p>
                      <p className="text-slate-400 text-xs">{spot.vibe}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Photos, Pro Tips, CTA */}
          <div className="md:col-span-2 space-y-6">
            {/* Photo Gallery */}
            <div className="grid grid-cols-2 gap-2">
              {loc.gallery.map((img, i) => (
                <div key={img + i} className={`rounded-xl overflow-hidden ${i === 0 ? 'col-span-2 h-40' : 'h-28'}`}>
                  <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            {/* Pro Tips */}
            <div className="bg-slate-50 rounded-xl p-5">
              <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Pro Tips</p>
              <div className="space-y-3">
                {loc.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-sky-500 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-500 text-xs leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center space-y-3">
              <Link
                to="/book"
                className="group w-full inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wider uppercase px-8 py-4 rounded-full bg-sky-500 text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-sky-500/20"
              >
                Reserve Your Vessel
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="sms:5165870438" className="text-slate-400 text-xs hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Text us about {loc.name} trips
              </a>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
