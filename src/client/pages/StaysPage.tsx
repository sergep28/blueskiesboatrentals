import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Star, MessageCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { trpc } from '../lib/trpc';

export function parseHighlights(highlights: string | null | undefined): string[] {
  if (!highlights) return [];
  try {
    const parsed = JSON.parse(highlights);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const packages = [
  {
    name: 'The Keys Getaway',
    duration: '3 nights + 1 full day on the water',
    description: 'Three nights at a waterfront property plus a full-day Grady White rental. Fish, snorkel, sandbar — your call.',
    startingAt: 1850,
  },
  {
    name: 'The Full Experience',
    duration: '5 nights + 2 days on the water',
    description: 'Five nights at your choice of property plus two days with the boat. The ultimate Keys vacation.',
    startingAt: 3200,
  },
  {
    name: 'Couples Escape',
    duration: '2 nights + sunset cruise',
    description: 'Two nights in a waterfront villa plus a private sunset cruise. Bring the champagne.',
    startingAt: 1400,
  },
];

export default function StaysPage() {
  const { data: allProperties } = trpc.properties.list.useQuery();
  const properties = (allProperties ?? []).filter(p => p.status === 'active');

  return (
    <div className="bg-white">
      <SEO title="Where to Stay in the Florida Keys" description="Find the best places to stay near our boats in Islamorada, Key Largo, and Marathon. Vacation rentals, hotels, and resorts in the Florida Keys." path="/stays" />
      {/* Hero — compact */}
      <div className="bg-slate-50 text-slate-900 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-normal mb-2">Where to Stay</h1>
            <p className="text-slate-500 text-sm">Hand-picked waterfront properties paired with our boats. Book together — we coordinate everything.</p>
          </div>
          <a href="sms:5165870438&body=Hi, I'm interested in a stay + boat package in the Keys."
            className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:scale-105 bg-sky-500 text-white">
            <MessageCircle className="w-4 h-4" /> Ask About Packages
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Properties — 3-column card grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {properties.map((prop, i) => (
            <motion.div
              key={prop.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 h-full flex flex-col"
            >
              <Link to={`/stays/${prop.slug}`} className="relative h-48 overflow-hidden block group">
                <img src={prop.imageUrl ?? ''} alt={prop.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-slate-900 text-xs px-2.5 py-1 rounded-full">
                  {prop.pricePerNight > 0 ? `From $${prop.pricePerNight}/night` : 'Contact for pricing'}
                </div>
              </Link>
              <div className="p-5 space-y-3 flex-1 flex flex-col">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3 h-3 text-sky-500" />
                    <span className="text-sky-500 text-[10px] tracking-[0.15em] uppercase">{prop.location}</span>
                    <span className="text-slate-200">|</span>
                    <span className="text-slate-400 text-[10px]">{prop.type}</span>
                  </div>
                  <Link to={`/stays/${prop.slug}`}>
                    <h3 className="font-heading text-xl font-normal text-slate-900 hover:text-sky-600 transition-colors">{prop.name}</h3>
                  </Link>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {prop.rating != null && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-sky-500 text-sky-500" /> {prop.rating}
                    </span>
                  )}
                  <span>{prop.bedrooms} BR</span>
                  <span>{prop.guests} guests</span>
                </div>

                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{prop.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  {parseHighlights(prop.highlights).map(h => (
                    <span key={h} className="bg-slate-50 text-slate-400 text-[10px] px-2 py-1 rounded-full">{h}</span>
                  ))}
                </div>

                <div className="flex gap-3 pt-1 mt-auto">
                  <Link to={`/stays/${prop.slug}`}
                    className="group flex-1 inline-flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.1em] uppercase px-4 py-2.5 rounded-full bg-sky-500 text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-sky-500/20">
                    View Property <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <a href="sms:5165870438" className="text-slate-300 hover:text-slate-900 flex items-center transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Packages — compact row */}
        <div className="mb-10">
          <h2 className="font-heading text-2xl font-normal text-slate-900 mb-4">Stay + Boat Packages</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {packages.map((pkg, i) => (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col"
              >
                <p className="text-sky-500 text-[10px] tracking-[0.15em] uppercase mb-1">{pkg.duration}</p>
                <h3 className="font-heading text-lg font-normal text-slate-900 mb-2">{pkg.name}</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-4 flex-1">{pkg.description}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-heading text-2xl text-slate-900">${pkg.startingAt.toLocaleString()}</span>
                    <span className="text-slate-400 text-xs ml-1">starting</span>
                  </div>
                  <a href="sms:5165870438"
                    className="text-xs text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" /> Text to book
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Partner With Us */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 md:p-14">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-3">For Property Owners</p>
                <h3 className="font-heading text-3xl font-normal text-slate-900 mb-4">
                  Own a rental property in the Keys?
                </h3>
                <p className="text-slate-400 leading-relaxed mb-6">
                  We're building a curated network of premium properties to pair with our boat rentals.
                  If you manage a quality waterfront property from Key Largo to Marathon, we'd love to talk.
                  Our guests are high-value clients who expect the best.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    'We send you qualified, premium guests',
                    'Cross-promotion on our site and social channels',
                    '10% referral commission on boat bookings from your guests',
                    'Featured listing on our Where to Stay page',
                  ].map(benefit => (
                    <div key={benefit} className="flex items-start gap-2 text-slate-500 text-sm">
                      <div className="w-1 h-1 bg-sky-500 rounded-full mt-2 flex-shrink-0" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center md:text-left">
                <Link
                  to="/partners"
                  className="group inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-8 py-4 rounded-full font-semibold transition-all"
                >
                  Become a Partner
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="text-slate-400 text-sm mt-4">
                  or <a href="sms:5165870438" className="text-sky-500 hover:text-sky-400 underline underline-offset-2">text us</a> to chat
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
