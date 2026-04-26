import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, CheckCircle, MessageCircle, Anchor } from 'lucide-react';
import { useEffect } from 'react';

const experiences = [
  {
    id: 'offshore-fishing',
    title: 'Offshore Fishing',
    tagline: 'Where the big ones live.',
    img: '/mahi-catch.jpeg',
    description: 'The Gulf Stream runs just 20 minutes from our Islamorada dock, putting you in world-class offshore fishing water before most people finish their coffee. Our Grady White is rigged and ready — outriggers, rod holders, livewells, GPS, fish finder. You just bring the attitude.',
    whatToExpect: [
      'Target mahi-mahi, wahoo, tuna, and sailfish depending on season',
      'Trolling along weed lines and current edges',
      'Reef fishing for yellowtail snapper, grouper, and more',
      'All tackle and gear provided on board',
    ],
    bestTime: 'Year-round. Mahi peaks April–September. Sailfish November–March. Yellowtail and grouper all year.',
    duration: 'Full day recommended for offshore. Half day works for reef fishing.',
    included: ['Rod holders & outriggers', 'GPS & fish finder', 'Livewells', 'Tackle & bait available', 'Cooler & ice'],
  },
  {
    id: 'sandbar-islands',
    title: 'Sandbar & Island Hopping',
    tagline: 'Crystal clear water. Zero agenda.',
    img: '/boat-alligator-reef.jpeg',
    description: 'This is the quintessential Keys day. Anchor up at the Islamorada sandbar in waist-deep turquoise water, cruise over to Alligator Reef Lighthouse for snorkeling, hop over to Indian Key for a history lesson and more snorkeling, then find a quiet mangrove channel to drift through on the way back. No schedule, no rush.',
    whatToExpect: [
      'Anchor at the famous Islamorada sandbar',
      'Cruise to Alligator Reef Lighthouse — the iconic Keys photo',
      'Explore Indian Key or Lignumvitae Key by boat',
      'Crystal clear water, white sand, full relaxation',
    ],
    bestTime: 'Best on calm days with light wind. Summer has the calmest water. Weekday mornings for fewer crowds.',
    duration: 'Half day or full day. Full day lets you hit multiple spots without rushing.',
    included: ['Bluetooth sound system', 'Shade top', 'Cooler & ice', 'Snorkeling gear available', 'Freshwater shower'],
  },
  {
    id: 'sunset-cruises',
    title: 'Sunset Cruises',
    tagline: 'Every evening is a masterpiece.',
    img: '/keys-sunset.jpeg',
    description: 'There\'s a reason people come from all over the world to watch the sun set in the Keys. Now imagine seeing it from the water — no crowds, no buildings, just the horizon turning every shade of orange, pink, and purple. Bring your drinks, a cheese board, and whoever you want to impress. We handle the rest.',
    whatToExpect: [
      'Cruise through backcountry channels into Florida Bay',
      'Find a quiet spot and watch the sky do its thing',
      'BYOB — bring whatever you want to drink and eat',
      'Bluetooth speakers for your playlist',
    ],
    bestTime: 'Year-round. Departure time adjusts with sunset. Usually 5–6pm depending on season.',
    duration: 'Half day (PM) is perfect. Can combine with a morning fishing trip for the full experience.',
    included: ['Bluetooth sound system', 'Cushioned seating', 'Cooler & ice provided', 'Freshwater shower', 'Shade top for the ride out'],
  },
  {
    id: 'snorkeling',
    title: 'Snorkeling',
    tagline: 'The only living coral reef in the continental US.',
    img: '/boat-alligator-reef.jpeg',
    description: 'The Florida Keys barrier reef is the third largest in the world and the only one in the continental United States. From our Islamorada base, you\'re minutes from world-class snorkeling at Alligator Reef, Cheeca Rocks, and the reefs off Indian Key. Expect parrotfish, angelfish, nurse sharks, sea turtles, and visibility that\'ll make you forget you\'re not in the Caribbean.',
    whatToExpect: [
      'Snorkel Alligator Reef, Cheeca Rocks, or Indian Key',
      'See tropical fish, coral formations, and marine life',
      'Nurse sharks and sea turtles are common sightings',
      'Great for all skill levels — beginners to experienced',
    ],
    bestTime: 'Best visibility in calm conditions. Morning is usually calmer than afternoon. Summer has the warmest water.',
    duration: 'Half day covers 1–2 reefs. Full day lets you explore more and combine with a sandbar stop.',
    included: ['Snorkeling gear available', 'Freshwater shower', 'Shade top', 'Cooler & ice', 'Ladder for easy entry/exit'],
  },
  {
    id: 'multi-day',
    title: 'Multi-Day Voyages',
    tagline: 'Take the Keys at your pace.',
    img: '/customer-mahi.jpeg',
    description: 'The best way to experience the Keys is slowly. Book a multi-day rental and cruise from Islamorada down to Marathon — stopping at sandbars, reefs, and hidden spots along the way. Fish in the morning, snorkel at noon, sunset cruise in the evening. Sleep at a marina or anchor out. This is the trip your friends will be jealous of.',
    whatToExpect: [
      'Cruise the Keys chain — Key Largo to Marathon and back',
      'Stop wherever you want, whenever you want',
      'Fish offshore, snorkel reefs, hit sandbars',
      'Overnight at marinas along the way',
    ],
    bestTime: 'Best in spring and fall. Calmer seas, fewer crowds, perfect temperatures.',
    duration: '2–5 days recommended. We offer discounted daily rates for multi-day bookings.',
    included: ['All standard amenities', 'Fuel planning guidance', 'Marina recommendations for overnights', 'Cooler & ice', 'We help you plan the route'],
  },
  {
    id: 'private-events',
    title: 'Private Events',
    tagline: 'We\'ve hosted them all.',
    img: '/keys-sunset.jpeg',
    description: 'Birthdays, proposals, anniversaries, bachelor and bachelorette parties, corporate team outings, family reunions — if it\'s a special occasion, it\'s better on the water. Our Grady White comfortably hosts up to 8 guests with premium seating, a sound system, and all the space you need. We\'ll help you plan the route, the timing, and the vibe.',
    whatToExpect: [
      'Up to 8 guests on our Grady White Freedom 285',
      'Custom route planning based on your event',
      'Sunset proposals, birthday cruises, corporate retreats',
      'BYOB and catering-friendly — bring whatever you want',
    ],
    bestTime: 'Anytime. We\'ll adjust the plan to match the occasion and the season.',
    duration: 'Half day or full day. Sunset events are our most popular.',
    included: ['Bluetooth sound system', 'Cushioned seating throughout', 'Cooler & ice', 'Freshwater shower', 'Captain available for your group'],
  },
];

export default function ExperiencesPage() {
  useEffect(() => {
    document.title = 'Boat Rental Experiences in the Florida Keys | Blue Skies Boat Rentals';
  }, []);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative h-[50vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/boat-alligator-reef.jpeg)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pb-16 w-full">
          <p className="text-sky-300 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Experiences</p>
          <h1 className="font-heading text-5xl md:text-7xl font-normal text-white mb-4">
            Florida Keys Boat Rental Experiences
          </h1>
          <p className="text-white/70 text-lg max-w-2xl">
            You pick the adventure. We provide a vessel worthy of it — and the local knowledge to make it unforgettable.
          </p>
        </div>
      </section>

      {/* Experiences Grid */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-6">
          {experiences.map((exp, i) => (
            <motion.div
              key={exp.id}
              id={exp.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 2) * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden flex-shrink-0">
                <img src={exp.img} alt={exp.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-sky-300 text-[10px] font-semibold tracking-[0.2em] uppercase">{exp.tagline}</p>
                  <h2 className="font-heading text-2xl font-normal text-white">{exp.title}</h2>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                {/* Description — truncated */}
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-4">{exp.description}</p>

                {/* What to expect */}
                <div className="space-y-1.5 mb-4">
                  {exp.whatToExpect.map((item, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-sky-500 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-400 text-xs">{item}</p>
                    </div>
                  ))}
                </div>

                {/* Bottom section — always pinned to bottom */}
                <div className="mt-auto space-y-4">
                  {/* Best Time + Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3 h-3 text-sky-500" />
                        <p className="text-slate-400 text-[10px] tracking-[0.1em] uppercase">Best Time</p>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{exp.bestTime}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3 text-sky-500" />
                        <p className="text-slate-400 text-[10px] tracking-[0.1em] uppercase">Duration</p>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{exp.duration}</p>
                    </div>
                  </div>

                  {/* Included tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {exp.included.map(item => (
                      <span key={item} className="bg-slate-50 text-slate-400 text-[10px] px-2.5 py-1 rounded-full">{item}</span>
                    ))}
                  </div>

                  {/* Book button */}
                  <Link
                    to="/book"
                    className="group w-full inline-flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase px-6 py-3 rounded-full bg-sky-500 text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-sky-500/20"
                  >
                    Book This Experience
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA — compact */}
      <section className="py-12 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="font-heading text-2xl font-normal text-slate-900 mb-1">Not sure what you want to do?</h2>
            <p className="text-slate-400 text-sm">Text us who you're with and how long you have — we'll plan it.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <a
              href="sms:3055550000"
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full font-semibold text-sm hover:scale-105 transition-transform flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Text Us
            </a>
            <Link
              to="/book"
              className="group border border-slate-200 hover:bg-slate-900 hover:text-white text-slate-900 px-6 py-3 rounded-full font-semibold text-sm transition-all flex items-center gap-2"
            >
              Browse Boats <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
