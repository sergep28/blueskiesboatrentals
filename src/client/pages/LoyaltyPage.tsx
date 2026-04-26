import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Star, Gift, TrendingUp, ArrowRight } from 'lucide-react';
import { trpc } from '../lib/trpc';

const tiers = [
  { name: 'Crew', range: '0–2,499 pts', multiplier: '1x', trips: '1–3 trips', color: 'from-slate-400 to-slate-600', min: 0, max: 2499 },
  { name: 'First Mate', range: '2,500–7,499 pts', multiplier: '1.1x', trips: '4–10 trips', color: 'from-blue-400 to-blue-600', min: 2500, max: 7499 },
  { name: 'Captain', range: '7,500–14,999 pts', multiplier: '1.15x', trips: '10–20 trips', color: 'from-sky-400 to-sky-600', min: 7500, max: 14999 },
  { name: 'Admiral', range: '15,000+ pts', multiplier: '1.25x', trips: '20+ trips', color: 'from-yellow-400 to-amber-500', min: 15000, max: Infinity },
];

export default function LoyaltyPage() {
  const { data: rewards } = trpc.rewards.list.useQuery();

  return (
    <div>
      {/* Hero — compact with how-it-works inline */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-normal mb-2">Loyalty Rewards</h1>
            <p className="text-white/80 text-sm">Earn 1 point for every $5 spent. No sign-up — you're enrolled on your first booking.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:scale-105 bg-white text-sky-600 hover:bg-sky-50"
            >
              Book & Earn <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/my-bookings"
              className="inline-flex items-center gap-2 text-white border border-white/30 hover:bg-white hover:text-sky-600 px-6 py-2.5 rounded-full font-semibold text-sm transition-all"
            >
              My Points
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tiers — compact horizontal bar style */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {tiers.map((tier) => (
            <div key={tier.name} className={`bg-gradient-to-r ${tier.color} rounded-xl p-4 text-white text-center`}>
              <h3 className="font-heading text-lg font-normal">{tier.name}</h3>
              <p className="text-white/70 text-xs">{tier.range}</p>
              <p className="font-heading text-2xl font-normal mt-1">{tier.multiplier}</p>
              <p className="text-white/60 text-[10px]">multiplier • ~{tier.trips}</p>
            </div>
          ))}
        </div>

        {/* Two columns: Rewards Catalog + Bonus Points */}
        <div className="grid md:grid-cols-3 gap-8">

          {/* Rewards Catalog — left 2 cols */}
          <div className="md:col-span-2">
            <h2 className="font-heading text-2xl font-normal mb-4">Rewards Catalog</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {rewards?.map((reward) => (
                <div key={reward.id} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3">
                  <Gift className="w-8 h-8 text-sky-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-sm font-normal">{reward.name}</h3>
                    <p className="text-slate-500 text-xs">{reward.description}</p>
                  </div>
                  <div className="bg-sky-50 rounded-lg py-1 px-3 flex-shrink-0">
                    <span className="font-normal text-sky-600 text-sm">{reward.pointsCost.toLocaleString()}</span>
                    <span className="text-sky-500 text-[10px]"> pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus Points — right col */}
          <div>
            <h2 className="font-heading text-2xl font-normal mb-4">Bonus Points</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="18" cy="6" r="1.5" fill="currentColor"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 text-sm font-medium">Tag on Instagram</p>
                  <p className="text-slate-400 text-xs">@blueskiesboatrentals</p>
                </div>
                <span className="font-semibold text-sky-600 text-sm">+50</span>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 text-sm font-medium">Google Review</p>
                  <p className="text-slate-400 text-xs">Share your experience</p>
                </div>
                <span className="font-semibold text-sky-600 text-sm">+100</span>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.65a8.35 8.35 0 004.76 1.49V6.69h-1z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 text-sm font-medium">Post on TikTok</p>
                  <p className="text-slate-400 text-xs">@blueskiesboatrentals</p>
                </div>
                <span className="font-semibold text-sky-600 text-sm">+75</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-3">Text us your handle after posting — points added within 24hrs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
