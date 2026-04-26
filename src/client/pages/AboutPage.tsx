import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, MessageCircle, Check, MapPin, Anchor, Ship, Star, Shield } from 'lucide-react';

export default function AboutPage() {
  useEffect(() => { document.title = 'About Us | Boat Rentals Islamorada FL | Blue Skies Boat Rentals'; }, []);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Serge Parakhnevich',
      jobTitle: 'Co-Founder',
      url: 'https://blueskiesboatrentals.com/about',
      sameAs: ['https://www.instagram.com/blueskiescharter/'],
      worksFor: {
        '@type': 'LocalBusiness',
        name: 'Blue Skies Boat Rentals',
        url: 'https://blueskiesboatrentals.com',
      },
      knowsAbout: ['boat rentals', 'Florida Keys', 'fishing charters', 'Grady White boats', 'Islamorada', 'financial services'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Robert Garan',
      jobTitle: 'Co-Founder',
      url: 'https://blueskiesboatrentals.com/about',
      worksFor: {
        '@type': 'LocalBusiness',
        name: 'Blue Skies Boat Rentals',
        url: 'https://blueskiesboatrentals.com',
      },
    },
  ];

  return (
    <div>
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}

      {/* Hero — Parallax */}
      <section ref={heroRef} className="relative h-[70vh] flex items-end overflow-hidden">
        <motion.div
          style={{ y: heroY }}
          className="absolute inset-0 bg-cover bg-center scale-110"
          initial={false}
        >
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/hero-keys-view.jpg)' }} />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/10" />
        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-4xl mx-auto px-6 pb-16 w-full">
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sky-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3"
          >
            Our Story
          </motion.p>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-heading text-5xl md:text-7xl text-white leading-[1.05]"
          >
            Built on a<br />higher standard.
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-white/60 text-lg mt-4 max-w-xl"
          >
            Two guys from Wall Street who decided the Keys deserved better boats.
          </motion.p>
        </motion.div>
      </section>

      {/* Story */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <p className="text-slate-600 text-xl leading-relaxed">
            We spent years on Wall Street — managing portfolios, advising clients, and building
            a career around one principle: <span className="text-slate-900 font-semibold">every detail matters</span>.
            In financial services, trust isn't given — it's earned through precision, consistency,
            and always putting the client first.
          </p>
          <p className="text-slate-600 text-xl leading-relaxed">
            When we moved to Florida to open an office for our broker-dealer, we started spending
            real time on the water in the Keys. We expected the same level of care we were used to
            delivering to our own clients. Instead, we got worn-out boats, stained cushions, outdated
            electronics, and a "good enough" attitude that felt completely at odds with the beauty around us.
          </p>
          <div className="bg-sky-50 border-l-4 border-sky-500 rounded-r-xl p-6">
            <p className="text-slate-800 text-xl font-medium italic">
              "The Keys deserve better. The people who visit deserve better. So we built it."
            </p>
          </div>
        </div>
      </section>

      {/* Satisfaction Banner with fish & waves */}
      <section className="relative py-20 bg-slate-950 text-white overflow-hidden">
        {/* Animated waves */}
        <div className="absolute inset-0">
          <svg className="absolute bottom-0 w-[200%] opacity-[0.15] animate-[wave_12s_linear_infinite]" viewBox="0 0 2400 120" preserveAspectRatio="none">
            <path d="M0,60 C400,120 800,0 1200,60 C1600,120 2000,0 2400,60 L2400,120 L0,120 Z" fill="currentColor" className="text-sky-400" />
          </svg>
          <svg className="absolute bottom-0 w-[200%] opacity-[0.10] animate-[wave_15s_linear_infinite]" style={{ animationDirection: 'reverse' }} viewBox="0 0 2400 120" preserveAspectRatio="none">
            <path d="M0,80 C300,20 600,100 900,60 C1200,20 1500,100 1800,60 C2100,20 2400,80 2400,80 L2400,120 L0,120 Z" fill="currentColor" className="text-sky-300" />
          </svg>
        </div>
        {/* Swimming fish */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute top-[25%] opacity-[0.15] animate-[swim_18s_linear_infinite]" width="60" height="30" viewBox="0 0 40 20" fill="currentColor">
            <path d="M30,10 Q40,5 30,0 L10,4 Q0,10 10,16 L30,20 Q40,15 30,10 Z M6,10 L0,6 L0,14 Z" className="text-sky-400" />
          </svg>
          <svg className="absolute top-[55%] opacity-[0.12] animate-[swim_24s_linear_infinite]" width="45" height="22" viewBox="0 0 40 20" fill="currentColor" style={{ animationDelay: '4s' }}>
            <path d="M30,10 Q40,5 30,0 L10,4 Q0,10 10,16 L30,20 Q40,15 30,10 Z M6,10 L0,6 L0,14 Z" className="text-sky-400" />
          </svg>
          <svg className="absolute top-[70%] opacity-[0.18] animate-[swim_15s_linear_infinite]" width="50" height="25" viewBox="0 0 40 20" fill="currentColor" style={{ animationDelay: '8s' }}>
            <path d="M30,10 Q40,5 30,0 L10,4 Q0,10 10,16 L30,20 Q40,15 30,10 Z M6,10 L0,6 L0,14 Z" className="text-sky-400" />
          </svg>
          <svg className="absolute top-[40%] opacity-[0.10] animate-[swim_21s_linear_infinite]" width="35" height="17" viewBox="0 0 40 20" fill="currentColor" style={{ animationDelay: '12s' }}>
            <path d="M30,10 Q40,5 30,0 L10,4 Q0,10 10,16 L30,20 Q40,15 30,10 Z M6,10 L0,6 L0,14 Z" className="text-sky-400" />
          </svg>
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[1,2,3,4,5].map(s => <Star key={s} className="w-7 h-7 fill-amber-400 text-amber-400" />)}
          </div>
          <p className="font-heading text-3xl md:text-4xl text-white mb-3">5-Star Rated. Satisfaction Guaranteed.</p>
          <p className="text-white/50 text-lg">Every trip. Every boat. Every time.</p>
        </div>
      </section>

      {/* Founders */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.2em] mb-10">The Founders</p>
          <div className="flex justify-center gap-20">
            <div>
              <img src="/headshot-serge.jpeg" alt="Serge Parakhnevich" className="w-32 h-32 rounded-full object-cover mx-auto mb-4 shadow-xl ring-4 ring-sky-100" />
              <h3 className="font-heading text-xl text-slate-900">Serge Parakhnevich</h3>
              <p className="text-sky-600 text-sm font-medium">Co-Founder</p>
            </div>
            <div>
              <img src="/headshot-robert.jpeg" alt="Robert Garan" className="w-32 h-32 rounded-full object-cover mx-auto mb-4 shadow-xl ring-4 ring-sky-100" />
              <h3 className="font-heading text-xl text-slate-900">Robert Garan</h3>
              <p className="text-sky-600 text-sm font-medium">Co-Founder</p>
            </div>
          </div>
        </div>
      </section>

      {/* What we care about */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl text-slate-900 mb-14 text-center">What we actually care about.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Ship,
                title: 'Grady White or nothing.',
                desc: 'We don\'t run deck boats, pontoons, or anything we wouldn\'t put our own family on. Our fleet is 100% Grady White — deep-V hulls, twin Yamaha 300s, and the fit and finish that serious boaters recognize the second they step aboard.',
              },
              {
                icon: Shield,
                title: 'Maintained like we own them. Because we do.',
                desc: 'Preventive maintenance on a real schedule — not "we\'ll fix it when it breaks." Engines serviced on time, electronics calibrated, hulls inspected weekly. Every boat runs like it just came off the showroom floor.',
              },
              {
                icon: Star,
                title: 'Detailed before every single trip.',
                desc: 'Not a quick wipe-down — a real detail. Fresh cushions, polished hardware, stocked cooler, topped-off fuel. When you step on board, it should feel new. Because it practically is.',
              },
              {
                icon: Check,
                title: 'The price is the price.',
                desc: 'No hidden fuel surcharges, no mystery fees at checkout. We tell you what it costs upfront. Half day, full day, multi-day — pick one and go.',
              },
              {
                icon: MessageCircle,
                title: 'We answer our phone.',
                desc: 'Text us at 10pm asking about tomorrow\'s weather? We\'ll answer. Have a question at the sandbar? We\'re a text away. We\'re a small operation and that\'s a feature, not a bug.',
              },
              {
                icon: Anchor,
                title: 'Bad weather happens. We don\'t punish you for it.',
                desc: 'If conditions aren\'t safe, we reschedule you for free. No penalty, no drama. We actually watch the forecast and reach out to you first.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-lg hover:border-sky-200 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-sky-500 text-white flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-slate-900 font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full-width photo break */}
      <section className="relative h-[40vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: 'url(/freedom-anchored.jpg)' }}
        />
        <div className="absolute inset-0 bg-slate-900/30" />
      </section>

      {/* Location */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-4">
                <MapPin className="w-4 h-4" /> Home base
              </div>
              <h2 className="font-heading text-3xl text-slate-900 mb-4">Islamorada, Florida Keys</h2>
              <p className="text-slate-500 leading-relaxed mb-4">
                We're docked at <span className="text-slate-800 font-medium">Safe Harbor Marina in Islamorada</span> —
                right next to the famous Square Grouper restaurant. It's the sport fishing capital
                of the world, and from our slip you can reach Key Largo in 20 minutes, Marathon
                in 45, and the Gulf Stream in under half an hour.
              </p>
              <p className="text-slate-500 leading-relaxed">
                After you book, we send you the exact slip number and directions.
                Show up, do a quick walkthrough with us, and you're off. Park at the marina,
                grab lunch at the Square Grouper when you get back.
              </p>
            </div>
            <div>
              <img src="/boat-dock.jpeg" alt="Blue Skies at Safe Harbor Marina in Islamorada" className="rounded-2xl shadow-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-sky-500 to-sky-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl text-white mb-3">Want to check it out?</h2>
          <p className="text-white/70 mb-8">Book online or text us — we're happy to answer any questions first.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/book"
              className="group bg-white text-sky-600 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-xl flex items-center justify-center gap-2"
            >
              Book Your Boat
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="sms:5155870438"
              className="text-white/80 hover:text-white px-8 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/30 hover:border-white/60"
            >
              <MessageCircle className="w-4 h-4" /> Text us first
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
