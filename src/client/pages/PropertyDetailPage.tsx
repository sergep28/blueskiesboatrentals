import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Star, Users, BedDouble, Check, MessageCircle, ArrowRight, Calendar, Ship } from 'lucide-react';
import { useEffect, useState } from 'react';
import { properties } from './StaysPage';

export default function PropertyDetailPage() {
  const { slug } = useParams();
  const property = properties.find(p => p.slug === slug);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);

  useEffect(() => {
    if (property) document.title = `${property.name} | Blue Skies Boat Rentals`;
    window.scrollTo(0, 0);
  }, [property]);

  if (!property) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400">Property not found</div>;

  const nights = checkIn && checkOut ? Math.max(1, Math.round((new Date(checkOut + 'T12:00:00').getTime() - new Date(checkIn + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const stayTotal = nights * property.pricePerNight;

  return (
    <div className="bg-white min-h-screen">
      {/* Hero image */}
      <section className="relative h-[45vh] overflow-hidden">
        <img src={property.img} alt={property.name} className="w-full h-full object-cover" />
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
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-sky-500 text-sky-500" />
                {property.rating} ({property.reviews} reviews)
              </span>
              <span className="flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-slate-300" />
                {property.bedrooms} bedrooms
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-300" />
                Up to {property.guests} guests
              </span>
            </div>

            {/* Description */}
            <p className="text-slate-500 leading-relaxed">{property.description}</p>

            {/* Highlights */}
            <div>
              <h3 className="text-slate-900 font-semibold text-sm mb-3">Property Highlights</h3>
              <div className="grid grid-cols-2 gap-2">
                {property.highlights.map(h => (
                  <div key={h} className="flex items-center gap-2 text-slate-500 text-sm">
                    <Check className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                    {h}
                  </div>
                ))}
              </div>
            </div>

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
                  <span className="font-heading text-3xl text-slate-900">${property.pricePerNight}</span>
                  <span className="text-slate-400 text-sm">/ night</span>
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
                {nights > 0 && (
                  <div className="border-t border-slate-100 pt-4 mb-5 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>${property.pricePerNight} × {nights} night{nights > 1 ? 's' : ''}</span>
                      <span>${stayTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Cleaning fee</span>
                      <span>$150</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t border-slate-100">
                      <span>Total</span>
                      <span>${(stayTotal + 150).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Book button */}
                <a
                  href={`sms:5155870438&body=Hi, I'd like to book ${property.name} in ${property.location}.${checkIn ? ` Check-in: ${checkIn}.` : ''}${checkOut ? ` Check-out: ${checkOut}.` : ''} ${guests} guests.`}
                  className="group w-full inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wider uppercase px-8 py-4 rounded-full bg-sky-500 text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-sky-500/20"
                >
                  {nights > 0 ? `Book ${nights} Night${nights > 1 ? 's' : ''} — $${(stayTotal + 150).toLocaleString()}` : 'Inquire to Book'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>

                <p className="text-slate-400 text-xs text-center mt-3">
                  We'll confirm availability and send you a booking link
                </p>
              </div>

              {/* Quick contact */}
              <div className="text-center">
                <a href="sms:5155870438" className="text-slate-400 text-xs hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" /> Questions? Text us anytime
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
