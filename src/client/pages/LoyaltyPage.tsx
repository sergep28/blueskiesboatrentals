import { Link } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';
import { TIERS } from '../../lib/loyalty';
import SEO from '../components/SEO';

const tierStyles: Record<string, string> = {
  crew: 'from-slate-400 to-slate-600',
  first_mate: 'from-sky-400 to-sky-600',
  captain: 'from-amber-400 to-amber-600',
};

export default function LoyaltyPage() {
  return (
    <div>
      <SEO title="Loyalty Rewards Program" description="Earn points on every boat rental and redeem for free trips, upgrades, and gear. Blue Skies Boat Rentals loyalty rewards program." path="/loyalty" />
      {/* Hero */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-normal mb-2">Loyalty Rewards</h1>
            <p className="text-white/80 text-sm">Earn 1 point for every $1 spent. No sign-up — you're enrolled on your first booking. Tier status is permanent.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/book" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:scale-105 bg-white text-sky-600 hover:bg-sky-50">
              Book & Earn <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/my-bookings" className="inline-flex items-center gap-2 text-white border border-white/30 hover:bg-white hover:text-sky-600 px-6 py-2.5 rounded-full font-semibold text-sm transition-all">
              My Status
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {TIERS.map((tier) => (
            <div key={tier.key} className={`bg-gradient-to-br ${tierStyles[tier.key]} rounded-2xl p-6 text-white`}>
              <h3 className="font-heading text-2xl font-normal mb-1">{tier.name}</h3>
              <p className="text-white/70 text-xs uppercase tracking-wider mb-4">
                {tier.minPoints === 0 ? 'Starting tier' : `$${tier.minPoints.toLocaleString()}+ lifetime spend`}
              </p>
              {tier.discount > 0 ? (
                <>
                  <p className="font-heading text-4xl font-normal">{Math.round(tier.discount * 100)}%</p>
                  <p className="text-white/80 text-sm">off every future booking</p>
                </>
              ) : (
                <p className="text-white/80 text-sm">Start earning to unlock 5% off at First Mate.</p>
              )}
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="font-heading text-2xl font-normal mb-4">How it works</h2>
          <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
            <li>Book a charter. Every dollar you spend (after tax) becomes 1 loyalty point on your account.</li>
            <li>Once your lifetime points hit 2,500, you unlock <strong>First Mate — 5% off</strong> every future booking, forever.</li>
            <li>Hit 5,000 and you become <strong>Captain — 10% off</strong> every future booking, forever.</li>
            <li>At checkout, you choose whether to apply your loyalty discount. (You might skip it if you're stacking another promo.)</li>
          </ol>
        </div>

        {/* Bonus Points */}
        <h2 className="font-heading text-2xl font-normal mb-4">Bonus Points</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="18" cy="6" r="1.5" fill="currentColor"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 text-sm font-medium">Tag on Instagram</p>
              <p className="text-slate-400 text-xs">@blueskiescharter</p>
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
              <p className="text-slate-400 text-xs">@blueskiescharter</p>
            </div>
            <span className="font-semibold text-sky-600 text-sm">+75</span>
          </div>
        </div>
        <p className="text-slate-400 text-xs mt-3">Text us your handle after posting — points added within 24hrs.</p>
      </div>
    </div>
  );
}
