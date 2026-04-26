import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle, Check, MapPin, Anchor } from 'lucide-react';

export default function AboutPage() {
  return (
    <div>

      {/* Hero */}
      <section className="relative h-[50vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/hero-keys-view.jpg)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-black/20 to-black/10" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 pb-14 w-full">
          <h1 className="font-heading text-4xl md:text-6xl text-slate-900">
            We live here. We love the water.<br />We keep our boats right.
          </h1>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-slate-600 text-lg leading-relaxed"
          >
            <p>
              Blue Skies started because we were tired of renting boats that didn't match
              the place we were in. The Florida Keys are world-class — but the boat rental
              experience? Usually not.
            </p>
            <p>
              We wanted to change that. Not by adding luxury surcharges or VIP upsells,
              but by doing the basics <span className="text-slate-800 font-medium">really well</span>:
              keep the boats clean, maintain them properly, price them fairly,
              and actually be available when people have questions.
            </p>
            <p>
              That's it. No gimmicks. Just good boats and good service.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What we care about */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl text-slate-900 mb-12">What we actually care about.</h2>
          <div className="space-y-8">
            {[
              {
                title: 'The boats are clean. Every time.',
                desc: 'We detail every boat before every trip. Not a quick wipe-down — a real detail. Fresh cushions, polished hardware, stocked cooler. When you step on board, it should feel new.',
              },
              {
                title: 'The price is the price.',
                desc: 'No hidden fuel surcharges, no mystery fees at checkout. We tell you what it costs upfront. Half day, full day, multi-day — pick one and go.',
              },
              {
                title: 'We answer our phone.',
                desc: 'Text us at 10pm asking about tomorrow\'s weather? We\'ll answer. Have a question at the sandbar? We\'re a text away. We\'re a small operation and that\'s a feature, not a bug.',
              },
              {
                title: 'Bad weather happens. We don\'t punish you for it.',
                desc: 'If conditions aren\'t safe, we reschedule you for free. No penalty, no drama. We actually watch the forecast and reach out to you first.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4"
              >
                <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
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
                Our marina is in Islamorada — the sport fishing capital of the world.
                From here you can reach Key Largo in 20 minutes, Marathon in 45.
                Sandbars, reefs, and open water in every direction.
              </p>
              <p className="text-slate-500 leading-relaxed">
                After you book, we send you the exact marina address and slip number.
                Show up, do a quick walkthrough with us, and you're off.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <img src="/boat-dock.jpeg" alt="Our marina" className="rounded-2xl shadow-lg" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-sky-50 border-y border-sky-100">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl text-slate-900 mb-3">Want to check it out?</h2>
          <p className="text-slate-500 mb-8">Book online or text us — we're happy to answer any questions first.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/book"
              className="group bg-sky-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:bg-sky-600 shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
            >
              Book Your Boat
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="sms:3055550000"
              className="text-slate-500 hover:text-slate-800 px-8 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300"
            >
              <MessageCircle className="w-4 h-4" /> Text us first
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
