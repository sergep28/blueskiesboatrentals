import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Calendar, Ship, Award, DollarSign, Star, Gift, MessageCircle } from 'lucide-react';
import { trpc } from '../lib/trpc';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const getTier = (points: number) => {
  if (points >= 15000) return { name: 'Admiral', color: 'bg-amber-100 text-amber-700' };
  if (points >= 7500) return { name: 'Captain', color: 'bg-sky-100 text-sky-700' };
  if (points >= 2500) return { name: 'First Mate', color: 'bg-blue-100 text-blue-700' };
  return { name: 'Crew', color: 'bg-slate-100 text-slate-600' };
};

export default function MyBookingsPage() {
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const { data: bookings, isLoading } = trpc.bookings.getByEmail.useQuery(searchEmail, { enabled: !!searchEmail });
  const { data: user } = trpc.users.getByEmail.useQuery(searchEmail, { enabled: !!searchEmail });
  const { data: rewards } = trpc.rewards.list.useQuery();

  const tier = user ? getTier(user.loyaltyPoints) : null;

  return (
    <div>
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading text-4xl font-normal mb-4">My Bookings</h1>
          <p className="text-slate-300">View your booking history, loyalty points, and tier status</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <label className="block text-sm font-medium text-slate-700 mb-2">Enter your email to view your account</label>
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setSearchEmail(email)}
              placeholder="your@email.com"
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
            />
            <button
              onClick={() => setSearchEmail(email)}
              className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Look Up
            </button>
          </div>
        </div>

        {/* User Profile Card */}
        {user && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Welcome back</p>
                  <h2 className="font-heading text-2xl">{user.name}</h2>
                  <p className="text-white/40 text-sm">{user.email}</p>
                </div>
                {tier && (
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${tier.color}`}>
                    {tier.name}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Calendar className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                  <p className="text-xl font-semibold">{user.bookingCount}</p>
                  <p className="text-white/40 text-xs">Bookings</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <p className="text-xl font-semibold">${user.totalSpent.toFixed(0)}</p>
                  <p className="text-white/40 text-xs">Total Spent</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Award className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-xl font-semibold">{user.loyaltyPoints}</p>
                  <p className="text-white/40 text-xs">Points</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Link to="/loyalty" className="text-sky-400 text-xs hover:text-sky-300">View Rewards →</Link>
                <Link to="/book" className="text-sky-400 text-xs hover:text-sky-300">Book Again →</Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Redeem Rewards */}
        {user && rewards && rewards.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Gift className="w-4 h-4 text-sky-500" /> Redeem Your Points
              <span className="text-slate-400 text-xs font-normal ml-auto">{user.loyaltyPoints} pts available</span>
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {rewards.map(reward => {
                const canAfford = user.loyaltyPoints >= reward.pointsCost;
                return (
                  <div key={reward.id} className={`bg-white rounded-xl p-4 shadow-sm flex items-start gap-3 ${!canAfford ? 'opacity-50' : ''}`}>
                    <Gift className="w-6 h-6 text-sky-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 text-sm font-medium">{reward.name}</p>
                      <p className="text-slate-500 text-xs">{reward.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="bg-sky-50 text-sky-600 text-xs font-medium px-2 py-0.5 rounded-full">
                          {reward.pointsCost.toLocaleString()} pts
                        </span>
                        {canAfford ? (
                          <a
                            href={`sms:3055550000&body=Hi, I'd like to redeem "${reward.name}" (${reward.pointsCost} pts). My email is ${user.email}.`}
                            className="text-green-600 text-xs font-medium flex items-center gap-1 hover:text-green-700"
                          >
                            <MessageCircle className="w-3 h-3" /> Text to Redeem
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">{reward.pointsCost - user.loyaltyPoints} more pts needed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {searchEmail && !isLoading && !user && (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-2">No account found for {searchEmail}</p>
            <p className="text-slate-400 text-sm">Book your first trip and your account is created automatically.</p>
            <Link to="/book" className="inline-block mt-4 bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium">
              Book Now
            </Link>
          </div>
        )}

        {/* Booking History */}
        {bookings && bookings.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Booking History</h3>
            <div className="space-y-4">
              {bookings.map((booking, i) => (
                <motion.div
                  key={booking.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-sm text-sky-600">{booking.bookingRef}</span>
                      <span className={`ml-3 text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[booking.status]}`}>
                        {booking.status}
                      </span>
                    </div>
                    <span className="font-semibold text-lg">${booking.total.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {booking.charterDate}</span>
                    <span className="flex items-center gap-1"><Ship className="w-4 h-4" /> {booking.duration.replace(/_/g, ' ')}</span>
                    <span className="capitalize">{booking.charterType}</span>
                  </div>
                  {booking.loyaltyPointsEarned > 0 && (
                    <p className="text-amber-600 text-xs mt-2 flex items-center gap-1">
                      <Star className="w-3 h-3" /> +{booking.loyaltyPointsEarned} points earned
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
