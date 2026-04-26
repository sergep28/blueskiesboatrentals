import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Anchor, Fish, Sunset, Waves, MapPin, Star, Phone, ChevronRight, Wind, Droplets, Thermometer, Shield, Sparkles, Clock, Users, ArrowRight, MessageCircle, ChevronDown, Instagram, Check } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { useEffect, useState, useRef } from 'react';

const weatherCodes: Record<number, string> = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 51: 'Light Drizzle', 53: 'Drizzle', 61: 'Light Rain',
  63: 'Rain', 65: 'Heavy Rain', 80: 'Showers', 95: 'Thunderstorm',
};

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function HomePage() {
  const { data: boats } = trpc.boats.list.useQuery();
  const { data: reviews } = trpc.reviews.approved.useQuery();
  const [weather, setWeather] = useState<any>(null);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    fetch('/api/weather').then(r => r.json()).then(setWeather).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero — Full Screen with Parallax */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden -mt-16">
        <motion.div
          style={{ y: heroY }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{ backgroundImage: 'url(/boat-alligator-reef.jpeg)' }}
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-sky-900/30 via-sky-900/10 to-white" />

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 text-center text-white px-4 max-w-5xl">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mb-8"
          >
            <span className="inline-block bg-white/20 backdrop-blur-md rounded-full px-6 py-2 text-white text-sm tracking-[0.2em] uppercase border border-white/30">
              Islamorada, Florida Keys
            </span>
          </motion.div>

          <motion.h1
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="font-heading text-6xl md:text-8xl font-medium mb-8 leading-[0.95] drop-shadow-lg"
          >
            Nothing But
            <br />
            <span className="text-sky-gradient">Blue Skies</span>
          </motion.h1>

          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="text-xl md:text-2xl text-white/80 mb-12 max-w-2xl mx-auto font-light leading-relaxed drop-shadow"
          >
            Premium boat rentals in the Florida Keys.
            <br className="hidden md:block" />
            From Key Largo to Marathon — fishing, cruising, and unforgettable sunsets.
          </motion.p>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-5 justify-center"
          >
            <Link
              to="/book"
              className="group bg-sky-500 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 hover:bg-sky-600 shadow-xl shadow-sky-500/30 flex items-center justify-center gap-2"
            >
              Book Your Boat
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="mt-6 text-white/60 text-sm"
          >
            or <a href="sms:3055550000" className="text-sky-300 hover:text-sky-200 underline underline-offset-2">text us</a> — we answer fast
          </motion.p>
        </motion.div>

        {/* Weather strip at bottom */}
        {weather?.current && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-dark rounded-2xl px-8 py-3 flex items-center gap-8 text-sm text-white/80"
          >
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-sky-300" />
              <span className="text-white font-medium">{Math.round(weather.current.temperature_2m)}°F</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-sky-300" />
              {Math.round(weather.current.wind_speed_10m)} mph
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-300" />
              {weather.current.relative_humidity_2m}%
            </div>
            <span className="hidden sm:block text-white/40">|</span>
            <span className="hidden sm:block">
              {weatherCodes[weather.current.weather_code] ?? 'Clear'} in Islamorada
            </span>
          </motion.div>
        )}

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2"
        >
          <div className="w-1 h-2 bg-white/50 rounded-full" />
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 500, suffix: '+', label: 'Happy Guests' },
              { value: 28, suffix: 'ft+', label: 'Premium Vessels' },
              { value: 5, suffix: '.0', label: 'Star Rating' },
              { value: 15, suffix: '+', label: 'Years on the Water' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="font-heading text-4xl md:text-5xl font-normal text-sky-600 mb-1">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-slate-400 text-xs tracking-[0.2em] uppercase">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="divider-sky mx-auto w-full" />

      {/* Fleet */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em]">The Fleet</span>
            <h2 className="font-heading text-4xl md:text-5xl font-normal mt-3 text-slate-900">Grady White. The Gold Standard.</h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">
              We chose Grady White for a reason — the finest boats on the water.
              Meticulously maintained, loaded with premium gear, and detailed before every trip.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {boats?.filter(b => b.status === 'active').map((boat, i) => {
              const typeLabel = boat.type === 'dual_console' ? 'Family Cruiser' : 'Offshore Performer';
              const styleLabel = boat.type === 'dual_console' ? 'Dual console' : 'Center console';
              const bestFor = boat.type === 'dual_console' ? 'Cruising & families' : 'Fishing & island hopping';
              return (
                <motion.div
                  key={boat.id}
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="bg-white rounded-2xl overflow-hidden group shadow-sm border border-slate-100 hover-lift"
                >
                  <div className="relative h-72 overflow-hidden">
                    <img
                      src={boat.imageUrl ?? ''}
                      alt={boat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-sky-500 text-white text-xs font-semibold px-3 py-1 rounded-full">{typeLabel}</span>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="font-heading text-3xl font-normal text-slate-900 mb-2">{boat.model}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-8">{boat.description}</p>

                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <div className="bg-sky-50 rounded-lg px-4 py-3">
                        <p className="text-sky-600/60 text-[10px] tracking-[0.15em] uppercase mb-1">Length</p>
                        <p className="text-slate-800 text-sm font-medium">{boat.lengthFt}' class</p>
                      </div>
                      <div className="bg-sky-50 rounded-lg px-4 py-3">
                        <p className="text-sky-600/60 text-[10px] tracking-[0.15em] uppercase mb-1">Style</p>
                        <p className="text-slate-800 text-sm font-medium">{styleLabel}</p>
                      </div>
                      <div className="bg-sky-50 rounded-lg px-4 py-3">
                        <p className="text-sky-600/60 text-[10px] tracking-[0.15em] uppercase mb-1">Best For</p>
                        <p className="text-slate-800 text-sm font-medium">{bestFor}</p>
                      </div>
                      <div className="bg-sky-50 rounded-lg px-4 py-3">
                        <p className="text-sky-600/60 text-[10px] tracking-[0.15em] uppercase mb-1">Booking Mode</p>
                        <p className="text-slate-800 text-sm font-medium">Bareboat or captain</p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 text-center">
                      <Link
                        to={`/boat/${boat.id}`}
                        className="group/btn inline-flex items-center gap-3 text-sm font-semibold tracking-[0.1em] uppercase px-10 py-4 rounded-full transition-all hover:scale-105 bg-sky-500 text-white shadow-lg shadow-sky-500/20 hover:bg-sky-600"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="divider-sky mx-auto w-full" />

      {/* Origin Story */}
      <section className="py-32 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ x: -40, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-br from-sky-200/40 to-transparent rounded-3xl blur-2xl" />
              <img src="/boat-night.jpeg" alt="Our Grady White" className="relative rounded-2xl shadow-2xl shadow-sky-900/10" />
              <div className="absolute -bottom-6 -right-6 bg-white rounded-xl px-6 py-4 shadow-lg border border-slate-100">
                <p className="text-sky-600 font-heading text-2xl font-normal">Since 2023</p>
                <p className="text-slate-400 text-sm">Islamorada, FL</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em]">Our Story</span>
              <h2 className="font-heading text-4xl md:text-5xl font-normal mt-3 mb-8 text-slate-900 leading-tight">
                Born From a Love
                <br />
                <span className="text-sky-gradient">of the Water.</span>
              </h2>
              <div className="space-y-5 text-slate-500 leading-relaxed">
                <p>
                  We came to the Keys to disconnect — to find that perfect blue-sky day
                  on the water. But every time we rented a boat, something felt off.
                  Dirty cushions, outdated gear, a "good enough" attitude.
                </p>
                <p>
                  In a place this beautiful, we expected more. So we built it ourselves —
                  pristine boats, real service, and the kind of experience the Keys deserve.
                </p>
                <div className="pull-quote py-2">
                  <p className="text-slate-700 text-xl leading-relaxed font-heading italic">
                    We didn't start a boat rental company. We built the experience
                    we wished existed.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Photo Carousel */}
      <section className="py-4 bg-slate-50">
        <div className="flex gap-4 overflow-hidden">
          {['/mahi-catch.jpeg', '/keys-sunset.jpeg', '/boat-alligator-reef.jpeg', '/yellowtail-catch.jpeg', '/customer-mahi.jpeg', '/boat-night.jpeg'].map((img, i) => (
            <motion.div
              key={img}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex-shrink-0 w-48 h-32 rounded-lg overflow-hidden"
            >
              <img src={img} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust & Guarantee */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em]">Our Promise</span>
            <h2 className="font-heading text-4xl md:text-5xl font-normal mt-3 text-slate-900">
              Your trip, guaranteed.
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">
              We stand behind every boat, every trip, every experience. No fine print.
            </p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-white rounded-2xl p-8 md:p-12 mb-10 border border-sky-100">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-sky-500 shadow-lg shadow-sky-500/20">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl font-normal text-slate-900">Satisfaction Guarantee</h3>
                    <p className="text-sky-600 text-sm">Every trip. Every time. No exceptions.</p>
                  </div>
                </div>
                <p className="text-slate-500 leading-relaxed mb-6">
                  If your boat doesn't meet our standard — or yours — we make it right. Period.
                  We don't hide behind fine print. We stand behind every boat, every trip.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'Inspected Before Every Trip', desc: 'Every vessel is walked through, tested, and detailed before you step on board.' },
                  { title: 'Transparent Pricing', desc: 'The price you see is the price you pay. No hidden fees, no fuel surcharges.' },
                  { title: 'Weather Protection', desc: 'Bad weather? Free reschedule, no questions asked. We monitor and reach out proactively.' },
                  { title: 'Real-Time Support', desc: 'Text us anytime — before, during, or after your trip. We respond fast.' },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-sky-500" />
                    <div>
                      <p className="text-slate-800 font-medium text-sm">{item.title}</p>
                      <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: '100%', label: 'Pre-Trip Inspection Rate' },
              { stat: '$0', label: 'Hidden Fees' },
              { stat: '24/7', label: 'Text Support' },
              { stat: 'Free', label: 'Weather Reschedule' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center py-6 bg-slate-50 rounded-xl"
              >
                <p className="font-heading text-3xl text-sky-600">{item.stat}</p>
                <p className="text-slate-400 text-xs tracking-wider uppercase mt-1">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em]">The Difference</span>
            <h2 className="font-heading text-4xl md:text-5xl font-normal mt-3 text-slate-900">Why Blue Skies</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Sparkles, title: 'Pristine Fleet', desc: 'Professionally detailed before every trip. Fresh cushions, polished hardware, pristine decks.' },
              { icon: Shield, title: 'Concierge Service', desc: 'Coolers stocked, gear prepped, lines ready. You arrive and enjoy — we handle the rest.' },
              { icon: Users, title: 'Local Experts', desc: 'We know every reef, sandbar, and sunset spot from Key Largo to Marathon.' },
              { icon: Clock, title: 'Seamless Experience', desc: 'Prepped and waiting when you arrive. We respect your time as much as the water.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white rounded-2xl p-6 hover-lift text-center shadow-sm border border-slate-100"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-5 h-5 text-sky-500" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2 text-slate-900">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Full-width Photo Break */}
      <section className="relative h-[50vh] overflow-hidden">
        <div className="parallax-bg absolute inset-0" style={{ backgroundImage: 'url(/boat-alligator-reef.jpeg)' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-transparent to-white" />
      </section>

      {/* Divider */}
      <div className="divider-sky mx-auto w-full" />

      {/* Experiences */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em]">Experiences</span>
            <h2 className="font-heading text-4xl md:text-5xl font-normal mt-3 text-slate-900">Your Day, Your Way</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">
              Choose your adventure. We'll make sure the boat matches it.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Offshore Fishing', desc: 'Mahi, wahoo, tuna — the Gulf Stream is minutes away.', img: '/mahi-catch.jpeg' },
              { title: 'Sandbar & Islands', desc: 'Alligator Reef, Indian Key, crystal clear water.', img: '/boat-alligator-reef.jpeg' },
              { title: 'Sunset Cruises', desc: 'Your drinks, our views. Every evening is a masterpiece.', img: '/keys-sunset.jpeg' },
              { title: 'Snorkeling', desc: 'The only living coral reef in the continental US.', img: '/customer-mahi.jpeg' },
            ].map((ct, i) => (
              <motion.div
                key={ct.title}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to="/book"
                  className="block group relative rounded-xl overflow-hidden h-56 hover-lift"
                >
                  <img src={ct.img} alt={ct.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-heading text-lg font-medium text-white mb-1">{ct.title}</h3>
                    <p className="text-white/70 text-xs leading-relaxed">{ct.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="divider-sky mx-auto w-full" />

      {/* Destinations */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em]">Destinations</span>
            <h2 className="font-heading text-4xl md:text-5xl font-normal mt-3 text-slate-900">Where We Take You</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { name: 'Key Largo', slug: 'key-largo', desc: 'Diving capital of the world — 20 min from our dock', img: '/boat-alligator-reef.jpeg' },
              { name: 'Islamorada', slug: 'islamorada', desc: 'Our home base — sport fishing capital of the world', img: '/keys-sunset.jpeg' },
              { name: 'Marathon', slug: 'marathon', desc: 'Heart of the Keys — family-friendly waters', img: '/boat-night.jpeg' },
            ].map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={`/${d.slug}`}
                  className="block relative rounded-2xl overflow-hidden h-80 group cursor-pointer hover-lift"
                >
                  <img src={d.img} alt={d.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <h3 className="font-heading text-2xl font-normal text-white">{d.name}</h3>
                    <p className="text-white/70 text-sm mt-1">{d.desc}</p>
                    <p className="text-sky-300 text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Explore {d.name} <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Weather Forecast */}
      {weather?.daily && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <h3 className="font-heading text-2xl font-normal text-center text-slate-900 mb-8">7-Day Islamorada Forecast</h3>
            <div className="flex justify-center gap-4 pb-4 flex-wrap">
              {weather.daily.time.map((date: string, i: number) => (
                <div key={date} className="flex-shrink-0 bg-sky-50 rounded-xl px-6 py-5 text-center min-w-[130px] border border-sky-100">
                  <p className="text-slate-500 text-xs mb-3">
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-3xl font-bold text-slate-900">{Math.round(weather.daily.temperature_2m_max[i])}°</p>
                  <p className="text-slate-400 text-sm">{Math.round(weather.daily.temperature_2m_min[i])}°</p>
                  {weather.daily.precipitation_probability_max && (
                    <p className="text-sky-500 text-xs mt-2">
                      <Droplets className="w-3 h-3 inline" /> {weather.daily.precipitation_probability_max[i]}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Divider */}
      <div className="divider-sky mx-auto w-full" />

      {/* Reviews */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em]">Testimonials</span>
            <h2 className="font-heading text-4xl md:text-5xl font-normal mt-3 text-slate-900">Don't Take Our Word For It</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews?.slice(0, 6).map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 hover-lift shadow-sm border border-slate-100"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm mb-5 italic leading-relaxed">"{review.comment}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-sm">
                    {review.customerName.charAt(0)}
                  </div>
                  <p className="font-semibold text-slate-800">{review.customerName}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* As Seen On */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-slate-400 text-xs uppercase tracking-[0.3em] mb-10">Trusted On</p>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20">
            {[
              { name: 'Boatsetter', url: 'boatsetter.com' },
              { name: 'GetMyBoat', url: 'getmyboat.com' },
              { name: 'Google', sub: '5.0 Stars' },
              { name: 'Instagram', sub: '@blueskiesboatrentals' },
            ].map((brand) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-slate-600 font-heading text-xl font-semibold">{brand.name}</p>
                {brand.sub && <p className="text-sky-500 text-xs mt-1">{brand.sub}</p>}
                {brand.url && <p className="text-slate-300 text-xs mt-1">{brand.url}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em]">Follow Along</span>
            <h2 className="font-heading text-4xl md:text-5xl font-normal mt-3 text-slate-900">
              <Instagram className="w-8 h-8 inline mr-3 text-sky-500" />
              @blueskiesboatrentals
            </h2>
            <p className="text-slate-500 mt-4">Real moments from the water. No filters needed.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {['/mahi-catch.jpeg', '/boat-alligator-reef.jpeg', '/keys-sunset.jpeg', '/yellowtail-catch.jpeg', '/boat-night.jpeg', '/customer-mahi.jpeg'].map((img, i) => (
              <motion.a
                key={img}
                href="https://instagram.com/blueskiesboatrentals"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="relative group aspect-square rounded-xl overflow-hidden"
              >
                <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-sky-900/0 group-hover:bg-sky-900/40 transition-colors flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.a>
            ))}
          </div>
          <div className="text-center mt-8">
            <a
              href="https://instagram.com/blueskiesboatrentals"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-600 font-medium text-sm transition-colors"
            >
              Follow us on Instagram <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* SMS / Text CTA */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 rounded-2xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-8 border border-sky-200/50">
            <div className="flex-1">
              <h3 className="font-heading text-3xl font-normal text-slate-900 mb-3">Got Questions? Just Text Us.</h3>
              <p className="text-slate-500 leading-relaxed">
                Weather, what to bring, best spots for the day — skip the forms and text us directly.
                We're real people who actually answer.
              </p>
            </div>
            <a
              href="sms:3055550000"
              className="flex-shrink-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:scale-105 transition-transform flex items-center gap-3 shadow-lg shadow-green-500/20"
            >
              <MessageCircle className="w-5 h-5" />
              Text (305) 555-BOAT
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em]">FAQ</span>
            <h2 className="font-heading text-4xl font-normal mt-3 text-slate-900">Common Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'Do I need a boating license?', a: 'No license is required to rent a boat in Florida. We\'ll give you a thorough orientation before departure so you feel confident and safe on the water.' },
              { q: 'Can I add a captain?', a: 'Absolutely. Our boats are available bareboat or with an experienced USCG-licensed captain. Just select the captain option when booking.' },
              { q: 'What should I bring?', a: 'Sunscreen, sunglasses, a cooler with your drinks and snacks, and a towel. We provide all the safety equipment, and fishing/snorkeling gear is available on board.' },
              { q: 'How much does it cost?', a: 'Half-day rentals start at $700 and full-day rentals start at $900. Multi-day discounts available. All prices include safety equipment, cooler, ice, and a full boat orientation.' },
              { q: 'What\'s your cancellation policy?', a: 'Full refund if cancelled 48+ hours before your trip. Within 48 hours, we\'ll work with you to reschedule based on availability.' },
              { q: 'Can I book multiple days?', a: 'Yes! Multi-day rentals are available at a discounted daily rate. Select "Multi-Day" during booking and choose your dates.' },
              { q: 'Where do I pick up the boat?', a: 'Our home base is in Islamorada. We\'ll send you the exact marina address and slip number after booking.' },
              { q: 'What if the weather is bad?', a: 'Safety comes first. If conditions are unsafe, we\'ll reschedule at no extra charge. We monitor conditions closely and reach out proactively.' },
              { q: 'What is the best time of year to visit the Keys?', a: 'The Florida Keys are a year-round boating destination. Winter offers the most pleasant weather, summer brings calm seas and great fishing, and fall has warm, clear water for snorkeling. We operate 7 days a week, all year.' },
            ].map((faq, i) => (
              <motion.details
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl group shadow-sm border border-slate-100"
              >
                <summary className="flex items-center justify-between cursor-pointer p-6 text-slate-800 font-medium list-none">
                  {faq.q}
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-6 pb-6 text-slate-500 text-sm leading-relaxed">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-4 overflow-hidden">
        <div className="parallax-bg absolute inset-0" style={{ backgroundImage: 'url(/keys-sunset.jpeg)' }} />
        <div className="absolute inset-0 bg-sky-900/60" />
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-5xl md:text-6xl font-normal mb-6 leading-tight">
              Your Perfect Day
              <br />
              <span className="text-sky-gradient">Starts Here.</span>
            </h2>
            <p className="text-white/70 text-xl mb-12 max-w-xl mx-auto font-light">
              The Florida Keys are one of the most beautiful places on earth.
              Your time on the water should reflect that.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <Link
                to="/book"
                className="group bg-sky-500 text-white px-12 py-5 rounded-full text-lg font-semibold transition-all hover:scale-105 hover:bg-sky-600 shadow-xl shadow-sky-500/30 flex items-center justify-center gap-2"
              >
                Book Your Boat
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="tel:3055550000"
                className="glass-dark text-white px-10 py-5 rounded-full text-lg font-medium transition-all hover:bg-white/20 flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" /> (305) 555-BOAT
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
