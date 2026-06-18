import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Star, Users, BedDouble, Bath, Check, MessageCircle, ArrowRight, Ship, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc';
import { parseHighlights } from './StaysPage';
import SEO from '../components/SEO';

function parseGallery(galleryImages: string | null | undefined, fallback: string | null | undefined): string[] {
  if (galleryImages) {
    try {
      const parsed = JSON.parse(galleryImages);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* fall through */
    }
  }
  return fallback ? [fallback] : [];
}

export default function PropertyDetailPage() {
  const { slug } = useParams();
  const { data: property, isLoading } = trpc.properties.getBySlug.useQuery(slug ?? '', { enabled: !!slug });
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [property]);

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400">Loading…</div>;
  if (!property) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400">Property not found</div>;

  const gallery = parseGallery(property.galleryImages, property.imageUrl);
  const highlights = parseHighlights(property.highlights);
  const hasPrice = property.pricePerNight > 0;
  const nights = checkIn && checkOut ? Math.max(1, Math.round((new Date(checkOut + 'T12:00:00').getTime() - new Date(checkIn + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const stayTotal = nights * property.pricePerNight;
  const total = stayTotal + property.cleaningFee;

  return (
    <div className="bg-white min-h-screen">
      <SEO title={property.name} description={property.description ?? ''} path={`/stays/${slug}`} />
      {/* Hero image */}
      <section className="relative h-[45vh] overflow-hidden">
        <img src={property.imageUrl ?? ''} alt={property.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3 h-3 text-sky-300" />
            <span className="text-sky-300 text-xs tracking-[0.15em] uppercase">{property.location}</span>
            <span className="text-white/40 mx-1">|</span>
            <span className="text-white/70 text-xs">{property.type}</span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-normal text-white">{property.name}</h1>
        </div>
      </section>

      {/* Main content — two column */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-5 gap-10">

          {/* Left — Property info */}
          <div className="md:col-span-3 space-y-8">
            {/* Quick stats */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              {property.rating != null && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-sky-500 text-sky-500" />
                  {property.rating} ({property.reviews} reviews)
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-slate-300" />
                {property.bedrooms} bedrooms
              </span>
              {property.bathrooms != null && (
                <span className="flex items-center gap-1.5">
                  <Bath className="w-4 h-4 text-slate-300" />
                  {property.bathrooms} baths
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-300" />
                Up to {property.guests} guests
              </span>
            </div>

            {/* Description */}
            <p className="text-slate-500 leading-relaxed">{property.description}</p>

            {/* Photo gallery */}
            {gallery.length > 1 && (
              <div>
                <h3 className="text-slate-900 font-semibold text-sm mb-3">Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {gallery.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setLightbox(i)}
                      className="relative aspect-[4/3] overflow-hidden rounded-lg group"
                    >
                      <img src={src} alt={`${property.name} photo ${i + 1}`} loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <div>
                <h3 className="text-slate-900 font-semibold text-sm mb-3">Property Highlights</h3>
                <div className="grid grid-cols-2 gap-2">
                  {highlights.map(h => (
                    <div key={h} className="flex items-center gap-2 text-slate-500 text-sm">
                      <Check className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Why book with us */}
            <div className="bg-slate-50 rounded-xl p-5">
              <h3 className="text-slate-900 font-semibold text-sm mb-3">Why Book Through Us</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'One point of contact for stay + boat',
                  'Bundle discounts available',
                  'We coordinate everything',
                  'No third-party booking fees',
                  'Direct communication with host',
                  'Add a boat day to any stay',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-400 text-xs">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Add a boat */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Ship className="w-5 h-5 text-sky-500 mt-0.5" />
                <div>
                  <h3 className="text-slate-900 font-semibold text-sm mb-1">Add a Boat Day</h3>
                  <p className="text-slate-400 text-xs mb-3">
                    Pair your stay with one of our Grady Whites. Fish, snorkel, sandbar — your call.
                    Guests who book a stay + boat get priority scheduling.
                  </p>
                  <Link to="/book" className="text-sky-500 text-xs font-medium hover:text-sky-400 flex items-center gap-1">
                    Browse boats <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Booking sidebar */}
          <div className="md:col-span-2">
            <div className="sticky top-6 space-y-5">
              {/* Price */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-baseline gap-2 mb-5">
                  {hasPrice ? (
                    <>
                      <span className="font-heading text-3xl text-slate-900">${property.pricePerNight}</span>
                      <span className="text-slate-400 text-sm">/ night</span>
                    </>
                  ) : (
                    <span className="font-heading text-2xl text-slate-900">Contact for pricing</span>
                  )}
                </div>

                {/* Date inputs */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-slate-400 text-[10px] tracking-[0.1em] uppercase block mb-1">Check In</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={e => setCheckIn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] tracking-[0.1em] uppercase block mb-1">Check Out</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                      min={checkIn}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-slate-400 text-[10px] tracking-[0.1em] uppercase block mb-1">Guests</label>
                  <select
                    value={guests}
                    onChange={e => setGuests(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm outline-none focus:border-sky-500"
                  >
                    {Array.from({ length: property.guests }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Price breakdown */}
                {hasPrice && nights > 0 && (
                  <div className="border-t border-slate-100 pt-4 mb-5 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>${property.pricePerNight} × {nights} night{nights > 1 ? 's' : ''}</span>
                      <span>${stayTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Cleaning fee</span>
                      <span>${property.cleaningFee}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t border-slate-100">
                      <span>Total</span>
                      <span>${total.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Book button */}
                <a
                  href={`sms:5165870438&body=Hi, I'd like to book ${property.name} in ${property.location}.${checkIn ? ` Check-in: ${checkIn}.` : ''}${checkOut ? ` Check-out: ${checkOut}.` : ''} ${guests} guests.`}
                  className="group w-full inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wider uppercase px-8 py-4 rounded-full bg-sky-500 text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-sky-500/20"
                >
                  {hasPrice && nights > 0 ? `Book ${nights} Night${nights > 1 ? 's' : ''} — $${total.toLocaleString()}` : 'Inquire to Book'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>

                <p className="text-slate-400 text-xs text-center mt-3">
                  We'll confirm availability and send you a booking link
                </p>
              </div>

              {/* Quick contact */}
              <div className="text-center">
                <a href="sms:5165870438" className="text-slate-400 text-xs hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" /> Questions? Text us anytime
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Lightbox */}
      {lightbox != null && gallery[lightbox] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(null)}>
            <X className="w-7 h-7" />
          </button>
          <button
            className="absolute left-4 text-white/70 hover:text-white text-4xl px-3"
            onClick={e => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length); }}
          >‹</button>
          <motion.img
            key={lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={gallery[lightbox]}
            alt={`${property.name} photo ${lightbox + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white/70 hover:text-white text-4xl px-3"
            onClick={e => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length); }}
          >›</button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs">
            {lightbox + 1} / {gallery.length}
          </div>
        </div>
      )}
    </div>
  );
}
