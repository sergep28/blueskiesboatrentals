import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Anchor, Calendar, Clock, MapPin, Users, Ship, ChevronRight, Sun, Waves } from 'lucide-react';
import { trpc } from '../lib/trpc';
import SEO from '../components/SEO';

const durationLabels: Record<string, string> = {
  half_day_am: 'Half Day (Morning)',
  half_day_pm: 'Half Day (Afternoon)',
  full_day: 'Full Day',
  multi_day: 'Multi-Day',
  custom: 'Custom',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(t: string) {
  const h = Number(t.split(':')[0]);
  const m = t.split(':')[1] ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${m} ${period}`;
}

export default function QuoteLandingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quoteCode = searchParams.get('quote') ?? '';

  const { data: quote, isLoading } = trpc.quotes.getByCode.useQuery(quoteCode, { enabled: !!quoteCode });
  const { data: boats } = trpc.boats.list.useQuery();

  const boat = boats?.find(b => b.id === quote?.boatId);
  const firstName = quote?.customerName?.split(' ')[0] ?? '';

  const handleContinue = () => {
    navigate(`/book?quote=${quoteCode}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-950 to-sky-900 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Anchor className="w-10 h-10 text-sky-400" />
        </motion.div>
      </div>
    );
  }

  if (!quote || quote.status !== 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-950 to-sky-900 flex items-center justify-center px-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-10 text-center max-w-md">
          <Ship className="w-16 h-16 text-sky-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {quote?.status === 'booked' ? 'Already Booked!' : 'Quote Expired'}
          </h1>
          <p className="text-sky-200 mb-6">
            {quote?.status === 'booked'
              ? 'This booking has already been confirmed. Check your email for details.'
              : 'This quote is no longer available. Text us for a new one!'}
          </p>
          <a
            href="sms:5165870438&body=Hi, I'd like a new quote for a boat rental!"
            className="inline-block bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 py-3 rounded-full transition-colors"
          >
            Text Us: (516) 587-0438
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-950 via-sky-900 to-sky-800 overflow-hidden">
      <SEO title={`${firstName ? `${firstName}'s ` : ''}Boat Rental`} noindex={true} path="/quote" />

      {/* Floating decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 right-10 text-sky-800/30"
        >
          <Sun className="w-24 h-24" />
        </motion.div>
        <motion.div
          animate={{ x: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 left-5 text-sky-800/20"
        >
          <Waves className="w-32 h-32" />
        </motion.div>
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-12">
        {/* Logo / Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-500/20 mb-4">
            <Anchor className="w-8 h-8 text-sky-400" />
          </div>
          <h2 className="text-sky-300 text-sm tracking-[4px] uppercase">Blue Skies Boat Rentals</h2>
        </motion.div>

        {/* Personalized Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            {firstName ? `Hey ${firstName}!` : 'Your Trip Awaits!'}
          </h1>
          <p className="text-sky-200 text-lg">Your boat is reserved and waiting for you.</p>
        </motion.div>

        {/* Boat Card */}
        {boat && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden mb-6"
          >
            {/* Boat Image */}
            <div className="relative h-52 overflow-hidden">
              <img
                src={boat.imageUrl ?? ''}
                alt={boat.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5">
                <h3 className="text-white text-2xl font-bold">{boat.name}</h3>
                <p className="text-white/80 text-sm">{boat.model}</p>
              </div>
            </div>

            {/* Trip Details */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4.5 h-4.5 text-sky-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Date</p>
                    <p className="text-slate-900 font-semibold">{formatDate(quote.charterDate)}</p>
                    {quote.endDate && quote.endDate !== quote.charterDate && (
                      <p className="text-slate-500 text-sm">through {formatDate(quote.endDate)}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Duration & Time</p>
                    <p className="text-slate-900 font-semibold">{durationLabels[quote.duration] ?? quote.duration}</p>
                    {quote.pickupTime && quote.dropoffTime && (
                      <p className="text-slate-500 text-sm">{formatTime(quote.pickupTime)} – {formatTime(quote.dropoffTime)}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4.5 h-4.5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Departure</p>
                    <p className="text-slate-900 font-semibold">{boat.homePort ?? 'Islamorada'}, Florida Keys</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Total</p>
                    <p className="text-3xl font-bold text-slate-900">${quote.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-full">Custom Quote</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* What's Included */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-6"
        >
          <p className="text-sky-300 text-xs font-semibold uppercase tracking-wider mb-3">Included with your rental</p>
          <div className="grid grid-cols-2 gap-2.5">
            {['Full tank of fuel', 'Cooler & ice', 'Safety gear', 'Bluetooth speakers', 'Safety briefing', 'Life jackets'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                <span className="text-white/80 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-white font-bold text-lg py-4 px-8 rounded-xl shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-400/40 transition-all flex items-center justify-center gap-3 group"
          >
            Continue to Book
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sky-300/60 text-xs text-center mt-3">Sign rental agreement & complete payment</p>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-8"
        >
          <p className="text-sky-300/60 text-sm">Questions? Text or call us anytime</p>
          <a href="tel:5165870438" className="text-sky-400 font-semibold text-lg hover:text-sky-300 transition-colors">
            (516) 587-0438
          </a>
        </motion.div>
      </div>
    </div>
  );
}
