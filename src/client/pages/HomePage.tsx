import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Anchor, Star, ArrowRight, MessageCircle, ChevronDown, ChevronRight, ChevronLeft, Wind, Droplets, Thermometer, Check, MapPin, Calendar, Users, Ship, Sun, Fish, Waves, Phone } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { useEffect, useState, useMemo, useRef } from 'react';

const weatherCodes: Record<number, string> = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 51: 'Light Drizzle', 53: 'Drizzle', 61: 'Light Rain',
  63: 'Rain', 65: 'Heavy Rain', 80: 'Showers', 95: 'Thunderstorm',
};

const heroSlides = [
  { img: '/freedom-aerial.jpg', kenBurns: 'animate-kb-1' },
  { img: '/alligator-reef.jpg', kenBurns: 'animate-kb-2' },
  { img: '/hero-keys-view.jpg', kenBurns: 'animate-kb-3' },
  { img: '/freedom-anchored.jpg', kenBurns: 'animate-kb-1' },
  { img: '/boat-sunset.jpeg', kenBurns: 'animate-kb-2' },
  { img: '/freedom-running.jpg', kenBurns: 'animate-kb-3' },
];

export default function HomePage() {
  const { data: boats } = trpc.boats.list.useQuery();
  const { data: reviews } = trpc.reviews.approved.useQuery();
  const [weather, setWeather] = useState<any>(null);
  const [selectedBoat, setSelectedBoat] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const experiencesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/weather').then(r => r.json()).then(setWeather).catch(() => {});
  }, []);

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const navigate = useNavigate();
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedBoat, setPickedBoat] = useState<number | null>(null);
  const { data: bookings } = trpc.bookings.list.useQuery();

  const activeBoats = boats?.filter(b => b.status === 'active') ?? [];

  const bookedDates = useMemo(() => {
    if (!bookings) return new Set<string>();
    return new Set(bookings.filter(b => b.status !== 'cancelled').map(b => `${b.boatId}-${b.charterDate}`));
  }, [bookings]);

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════
          HERO — Cinematic crossfading slideshow with Ken Burns
      ═══════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative h-screen flex items-center overflow-hidden -mt-16 pt-16">
        {/* Slideshow layers */}
        {heroSlides.map((slide, i) => (
          <div
            key={slide.img}
            className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
              i === activeSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className={`absolute inset-0 bg-cover bg-center ${slide.kenBurns} ${
                i === activeSlide ? 'running' : 'paused'
              }`}
              style={{ backgroundImage: `url(${slide.img})` }}
            />
          </div>
        ))}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />

        {/* Content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-4 w-full py-20">
          <div className="max-w-2xl">
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-sky-300 text-sm font-medium tracking-[0.2em] uppercase mb-4"
            >
              Islamorada, Florida Keys
            </motion.p>

            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="font-heading text-5xl md:text-7xl text-white mb-6 leading-[1.05]"
            >
              Your day on the water starts here.
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-white/70 text-lg md:text-xl mb-10 leading-relaxed max-w-lg"
            >
              Pristine Grady White boats. Bareboat or with a captain.
              From Key Largo to Marathon.
            </motion.p>

            {/* Inline booking prompt */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link
                to="/book"
                className="group bg-sky-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:bg-sky-600 shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2"
              >
                Check Availability
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="sms:3055550000"
                className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl text-lg font-medium transition-all hover:bg-white/20 border border-white/20 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Text Us
              </a>
            </motion.div>

            {/* Weather chip */}
            {weather?.current && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-8 inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 text-sm text-white/80 border border-white/10"
              >
                <span className="flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-300" />
                  {Math.round(weather.current.temperature_2m)}°F
                </span>
                <span className="w-px h-4 bg-white/20" />
                <span>{weatherCodes[weather.current.weather_code] ?? 'Clear'}</span>
                <span className="w-px h-4 bg-white/20" />
                <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{Math.round(weather.current.wind_speed_10m)} mph</span>
              </motion.div>
            )}
          </div>

          {/* Slide indicators */}
          <div className="absolute bottom-10 right-8 flex gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`transition-all duration-500 rounded-full ${
                  i === activeSlide
                    ? 'w-8 h-2 bg-sky-400'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS — 3 steps
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl md:text-4xl text-slate-900">Getting on the water is easy.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: Ship, title: 'Pick your boat', desc: '28\' or 30\' Grady White — both pristine, loaded with gear, and ready to go.' },
              { step: '2', icon: Calendar, title: 'Choose your day', desc: 'Half day, full day, or multi-day. Pick your dates and we\'ll confirm availability.' },
              { step: '3', icon: Waves, title: 'Get on the water', desc: 'Show up at the marina, quick walkthrough, and you\'re off. We handle the rest.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-50 mb-5">
                  <item.icon className="w-7 h-7 text-sky-500" strokeWidth={1.5} />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/book" className="inline-flex items-center gap-2 text-sky-600 font-semibold hover:text-sky-700 transition-colors">
              Book now — it takes 2 minutes <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          THE FLEET — Cards with inline booking calendar
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-1">The Fleet</p>
              <h2 className="font-heading text-3xl md:text-4xl text-slate-900">Grady White fleet. Pristine. Ready to go.</h2>
            </div>
          </div>

          <div className="space-y-6">
            {activeBoats.map((boat, i) => {
              const features = boat.features ? JSON.parse(boat.features as string) : [];
              const isPickedBoat = pickedBoat === boat.id;

              // Calendar logic
              const cy = calendarMonth.getFullYear(), cm = calendarMonth.getMonth();
              const firstDay = new Date(cy, cm, 1).getDay();
              const daysInMonth = new Date(cy, cm + 1, 0).getDate();
              const today = new Date(); today.setHours(0, 0, 0, 0);

              const calDays = [];
              for (let d = 0; d < firstDay; d++) calDays.push(<div key={`e${d}`} />);
              for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(cy, cm, d);
                const ds = date.toISOString().split('T')[0];
                const past = date < today;
                const booked = bookedDates.has(`${boat.id}-${ds}`);
                const selected = isPickedBoat && pickedDate === ds;

                calDays.push(
                  <button
                    key={d}
                    disabled={past || booked}
                    onClick={() => { setPickedBoat(boat.id); setPickedDate(ds); }}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
                      selected ? 'bg-sky-500 text-white font-semibold shadow-sm' :
                      past ? 'text-slate-300' :
                      booked ? 'bg-red-50 text-red-300 line-through' :
                      'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                    }`}
                  >
                    {d}
                  </button>
                );
              }

              return (
                <motion.div
                  key={boat.id}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <div className="grid md:grid-cols-3">
                    {/* Photo */}
                    <div className="relative h-64 md:h-auto overflow-hidden">
                      <img src={boat.imageUrl ?? ''} alt={boat.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1 rounded-full">{boat.lengthFt}ft</span>
                        <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1 rounded-full">Up to {boat.capacity} guests</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-6 md:p-8 flex flex-col justify-between">
                      <div>
                        <h3 className="font-heading text-2xl text-slate-900 mb-1">{boat.model}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1 mb-4">
                          <MapPin className="w-3 h-3" /> {boat.homePort} &middot; {boat.type === 'dual_console' ? 'Dual Console' : 'Center Console'}
                        </p>
                        <p className="text-slate-500 text-sm leading-relaxed mb-4">{boat.description}</p>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {features.slice(0, 4).map((f: string) => (
                            <span key={f} className="bg-slate-50 text-slate-500 text-[11px] px-2.5 py-1 rounded-full border border-slate-100">{f}</span>
                          ))}
                          {features.length > 4 && (
                            <span className="text-slate-400 text-[11px] px-2 py-1">+{features.length - 4} more</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span><strong className="text-slate-900 text-lg">${boat.priceHalfDay}</strong> <span className="text-slate-400">half day</span></span>
                        <span className="w-px h-4 bg-slate-200" />
                        <span><strong className="text-slate-900 text-lg">${boat.priceFullDay}</strong> <span className="text-slate-400">full day</span></span>
                      </div>
                    </div>

                    {/* Calendar */}
                    <div className="border-t md:border-t-0 md:border-l border-slate-100 p-5 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <button onClick={() => setCalendarMonth(new Date(cy, cm - 1, 1))} className="text-slate-400 hover:text-slate-700 p-1"><ChevronLeft className="w-4 h-4" /></button>
                        <p className="text-slate-800 font-medium text-sm">{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        <button onClick={() => setCalendarMonth(new Date(cy, cm + 1, 1))} className="text-slate-400 hover:text-slate-700 p-1"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-7 gap-0 mb-1">
                        {['S','M','T','W','T','F','S'].map((d,idx) => <div key={idx} className="text-center text-slate-400 text-[10px] font-medium">{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">{calDays}</div>

                      {/* Selected date action */}
                      {isPickedBoat && pickedDate && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 bg-sky-50 rounded-xl p-3 border border-sky-100"
                        >
                          <p className="text-sky-800 text-xs font-medium mb-2">
                            {new Date(pickedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </p>
                          <button
                            onClick={() => navigate(`/book?boat=${boat.id}&date=${pickedDate}`)}
                            className="w-full bg-sky-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
                          >
                            Book Now <ArrowRight className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}

                      {!isPickedBoat && (
                        <p className="text-center text-slate-400 text-[11px] mt-3">Pick a date to book</p>
                      )}
                    </div>
                  </div>

                  {/* View details link */}
                  <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Pre-trip inspected</span>
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Free weather reschedule</span>
                    </div>
                    <Link to={`/boat/${boat.id}`} className="text-sky-600 hover:text-sky-700 text-xs font-medium flex items-center gap-1">
                      Full details <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SOCIAL PROOF — Compact review strip
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              </div>
              <span className="text-slate-900 font-semibold">5.0</span>
              <span className="text-slate-400 text-sm">from {reviews?.length ?? 0}+ guests</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {reviews?.slice(0, 3).map((review) => (
              <div key={review.id} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {review.customerName.charAt(0)}
                </div>
                <div>
                  <p className="text-slate-800 font-medium text-sm mb-1">{review.customerName}</p>
                  <p className="text-slate-500 text-sm leading-relaxed">"{review.comment}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          EXPERIENCES — Horizontal scroll cards
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-1">Experiences</p>
              <h2 className="font-heading text-3xl md:text-4xl text-slate-900">What do you want to do?</h2>
            </div>
            <Link to="/experiences" className="hidden md:flex items-center gap-1 text-sky-600 font-medium text-sm hover:text-sky-700">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div ref={experiencesRef} className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {[
              { title: 'Offshore Fishing', desc: 'Mahi, wahoo, tuna — the Gulf Stream is right there.', img: '/catch-queen-snapper.jpg', icon: Fish },
              { title: 'Sandbar & Islands', desc: 'Alligator Reef, Indian Key, crystal clear shallows.', img: '/alligator-reef.jpg', icon: Waves },
              { title: 'Sunset Cruises', desc: 'BYOB. We bring the views.', img: '/boat-sunset.jpeg', icon: Sun },
              { title: 'Just Cruising', desc: 'No agenda. Pick a spot, drop anchor, enjoy the day.', img: '/freedom-anchored.jpg', icon: Ship },
            ].map((exp, i) => (
              <motion.div
                key={exp.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex-shrink-0 w-72 snap-start"
              >
                <Link to="/book" className="block group">
                  <div className="relative h-80 rounded-2xl overflow-hidden mb-4">
                    <img src={exp.img} alt={exp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-semibold text-lg">{exp.title}</h3>
                      <p className="text-white/70 text-sm mt-1">{exp.desc}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHY BLUE SKIES — Punchy, single row
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-sky-50 border-y border-sky-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-slate-900 text-center mb-12">Why people choose us.</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { title: 'Pristine boats', desc: 'Detailed before every trip. Not just clean — immaculate.', icon: '✓' },
              { title: 'No hidden fees', desc: 'The price you see is the price you pay. Period.', icon: '✓' },
              { title: 'Free reschedule', desc: 'Bad weather? We move your trip, no charge, no hassle.', icon: '✓' },
              { title: 'Text us anytime', desc: 'Real people. Fast answers. Before, during, or after your trip.', icon: '✓' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ y: 15, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WEATHER + DESTINATIONS — Combined
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Destinations */}
            <div>
              <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-1">Where we go</p>
              <h3 className="font-heading text-2xl text-slate-900 mb-6">From our dock, you can reach:</h3>
              <div className="space-y-4">
                {[
                  { name: 'Key Largo', time: '~20 min', desc: 'Diving capital. John Pennekamp, coral reefs, crystal water.', slug: 'key-largo' },
                  { name: 'Islamorada', time: 'Home base', desc: 'Sport fishing capital. Sandbars, Alligator Reef, sunset spots.', slug: 'islamorada' },
                  { name: 'Marathon', time: '~45 min', desc: 'Heart of the Keys. Sombrero Reef, Seven Mile Bridge, family-friendly.', slug: 'marathon' },
                ].map((dest) => (
                  <Link key={dest.name} to={`/${dest.slug}`} className="flex items-start gap-4 group p-3 -mx-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 transition-colors">
                      <MapPin className="w-5 h-5 text-sky-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{dest.name}</h4>
                        <span className="text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{dest.time}</span>
                      </div>
                      <p className="text-slate-500 text-sm mt-0.5">{dest.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 mt-3 group-hover:text-sky-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Weather */}
            {weather?.daily && (
              <div>
                <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-1">This week</p>
                <h3 className="font-heading text-2xl text-slate-900 mb-6">Islamorada forecast</h3>
                <div className="grid grid-cols-4 gap-3">
                  {weather.daily.time.slice(0, 4).map((date: string, i: number) => (
                    <div key={date} className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <p className="text-slate-500 text-xs mb-2">
                        {i === 0 ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className="text-2xl font-bold text-slate-900">{Math.round(weather.daily.temperature_2m_max[i])}°</p>
                      <p className="text-slate-400 text-xs">{Math.round(weather.daily.temperature_2m_min[i])}°</p>
                      {weather.daily.precipitation_probability_max && (
                        <p className="text-sky-500 text-xs mt-1">
                          <Droplets className="w-3 h-3 inline" /> {weather.daily.precipitation_probability_max[i]}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-6 bg-sky-50 rounded-xl p-4 border border-sky-100">
                  <p className="text-sky-800 text-sm font-medium">Good weather? Lock in your date.</p>
                  <p className="text-sky-600 text-xs mt-1">Popular days fill up fast, especially weekends.</p>
                  <Link to="/book" className="inline-flex items-center gap-1 text-sky-600 font-semibold text-sm mt-3 hover:text-sky-700">
                    Check availability <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ — Conversational, fewer questions
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-3xl text-slate-900 text-center mb-10">Quick answers</h2>
          <div className="space-y-3">
            {[
              { q: 'Do I need a boating license?', a: 'Nope. No license required in Florida. We\'ll walk you through everything before you leave the dock.' },
              { q: 'Can I get a captain?', a: 'Yes — all our boats are available bareboat (you drive) or with a USCG-licensed captain. Just select it when booking.' },
              { q: 'How much does it cost?', a: 'Half-day rentals start at $700, full-day at $900. That includes safety gear, cooler, ice, and a full boat walkthrough. No hidden fees.' },
              { q: 'What should I bring?', a: 'Sunscreen, sunglasses, drinks, snacks, and a towel. We handle the rest — safety equipment, fishing/snorkeling gear available on board.' },
              { q: 'What if the weather is bad?', a: 'Free reschedule, no questions asked. We watch the forecast and reach out proactively if your day looks rough.' },
              { q: 'Where do I pick up the boat?', a: 'Our marina is in Islamorada. We send you the exact address and slip number after you book.' },
            ].map((faq, i) => (
              <details key={i} className="bg-white rounded-xl group border border-slate-100">
                <summary className="flex items-center justify-between cursor-pointer p-5 text-slate-800 font-medium text-sm list-none">
                  {faq.q}
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-5 pb-5 text-slate-500 text-sm leading-relaxed -mt-1">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA — Clean, direct
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/boat-sunset.jpeg)' }} />
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-4xl md:text-5xl text-white mb-4">
              Ready?
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-md mx-auto">
              Pick a boat, pick a day, and we'll see you at the dock.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/book"
                className="group bg-sky-500 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all hover:bg-sky-600 shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2"
              >
                Book Your Boat
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="sms:3055550000"
                className="text-white/50 hover:text-white px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" /> or text us
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
