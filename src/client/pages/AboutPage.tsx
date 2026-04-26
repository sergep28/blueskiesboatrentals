import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Anchor, ArrowRight, Shield, Sparkles, Clock, Users, MessageCircle } from 'lucide-react';

export default function AboutPage() {
  return (
    <div>

      {/* Hero */}
      <section className="relative h-[60vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/boat-alligator-reef.jpeg)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-sky-900/30 to-sky-900/10" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pb-16 w-full">
          <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Our Story</p>
          <h1 className="font-heading text-5xl md:text-7xl font-normal text-slate-900">
            Born from a love<br />of the water.
          </h1>
        </div>
      </section>

      {/* Origin */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-slate-600 text-lg leading-relaxed"
          >
            <p>
              We came to the Florida Keys for the same reason everyone does — to escape,
              to breathe, to find that perfect blue-sky day on the water.
              <span className="text-slate-800 font-medium"> But every time we rented a boat, something felt off.</span>
            </p>
            <p>
              Worn-out boats, stained cushions, outdated electronics,
              and a "good enough" attitude that felt completely at odds with the beauty around us.
              In a place this beautiful, we expected more.
            </p>
            <p>
              The Keys deserve better. The people who visit deserve better. So we built it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-20 px-6 bg-sky-50">
        <div className="max-w-4xl mx-auto text-center">
          <Anchor className="w-5 h-5 text-sky-400 mx-auto mb-8" />
          <p className="font-heading italic text-2xl md:text-4xl text-slate-700 leading-relaxed mb-8">
            "We didn't start a boat rental company.
            We built the experience we wished existed."
          </p>
          <div className="h-px w-16 bg-sky-300 mx-auto mb-6" />
          <p className="text-sky-600 text-sm tracking-[0.2em] uppercase">The Founders</p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div>
            <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Our Mission</p>
            <h2 className="font-heading text-3xl md:text-4xl font-normal text-slate-900 mb-8 leading-tight">
              Raise the bar for boat rentals in the Keys.
            </h2>
            <div className="space-y-5 text-slate-500 leading-relaxed">
              <p>
                Every boat in our fleet is maintained to a standard that would make most rental
                companies uncomfortable. We detail before every trip. We upgrade equipment
                constantly. We don't cut corners — ever.
              </p>
              <p>
                But it's not just about the boats. It's about how we treat people. We answer
                texts at 10pm. We check weather forecasts for our clients proactively. We remember
                your name, your preferences, and what you caught last time.
              </p>
              <p className="text-slate-700 font-medium">
                The relationship is the business.
              </p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <img src="/boat-night.jpeg" alt="Our Grady White" className="rounded-2xl shadow-xl" />
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-3">What We Stand For</p>
          <h2 className="font-heading text-3xl md:text-4xl font-normal text-slate-900 mb-16">Our principles</h2>
          <div className="grid md:grid-cols-2 gap-12">
            {[
              { icon: Sparkles, title: 'Obsessive Quality', desc: 'Every boat is professionally detailed before every trip. Fresh cushions, polished hardware, pristine decks. We notice what others overlook.' },
              { icon: Shield, title: 'Radical Transparency', desc: 'No hidden fees, no bait-and-switch. The price you see is the price you pay. If there\'s bad weather, we tell you before you ask.' },
              { icon: Users, title: 'Client First, Always', desc: 'Your experience is our reputation. We go above and beyond because that\'s who we are, not because we have to.' },
              { icon: Clock, title: 'Respect Your Time', desc: 'Your vacation days are precious. We don\'t waste them with slow check-ins, broken equipment, or boats that aren\'t ready. You show up, you go.' },
            ].map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-5"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <value.icon className="w-5 h-5 text-sky-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-slate-900 font-semibold mb-2">{value.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{value.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Platform */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Our Guarantee</p>
              <h2 className="font-heading text-3xl md:text-4xl font-normal text-slate-900 mb-8 leading-tight">
                We stand behind every trip.
              </h2>
              <div className="space-y-5 text-slate-500 leading-relaxed">
                <p>
                  If your boat doesn't meet our standard — or yours — we make it right. Period.
                  No fine print, no runaround.
                </p>
                <p>
                  Every vessel is inspected before every trip.
                  Every price is exactly what you'll pay. Every promise is backed by a guarantee.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { stat: '100%', label: 'Pre-Trip Inspection', desc: 'Every vessel, every time' },
                { stat: '$0', label: 'Hidden Fees', desc: 'What you see is what you pay' },
                { stat: '48hr', label: 'Free Cancellation', desc: 'No questions asked' },
                { stat: '24/7', label: 'Text Support', desc: 'Real people, fast responses' },
              ].map(item => (
                <div key={item.label} className="bg-sky-50 rounded-xl p-5 text-center border border-sky-100">
                  <p className="font-heading text-2xl text-sky-600">{item.stat}</p>
                  <p className="text-slate-800 text-xs font-medium mt-1">{item.label}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Where We Are */}
      <section className="py-24 px-6 bg-sky-50">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sky-500 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Home Base</p>
          <h2 className="font-heading text-3xl md:text-4xl font-normal text-slate-900 mb-6">Islamorada, Florida Keys</h2>
          <p className="text-slate-500 leading-relaxed mb-4">
            We're docked in Islamorada — the sport fishing capital of the world — and serve
            guests from Key Largo to Marathon. Whether you're here for a half day or a
            week-long adventure, our boats and our team are ready.
          </p>
          <p className="text-slate-500 leading-relaxed">
            Text us anytime. We're real people, and we actually answer.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-4xl font-normal text-slate-900 mb-4">Experience the difference.</h2>
          <p className="text-slate-500 mb-10">See what happens when people who love the water run the boats.</p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link
              to="/book"
              className="group bg-sky-500 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 hover:bg-sky-600 shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
            >
              Book Your Boat
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="sms:3055550000"
              className="text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-2 py-4"
            >
              <MessageCircle className="w-4 h-4" /> Text us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
