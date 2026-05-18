import { trpc } from '../../lib/trpc';
import { Award, TrendingUp, Users as UsersIcon } from 'lucide-react';
import { TIERS, getTier } from '../../../lib/loyalty';

const tierBadge: Record<string, string> = {
  crew: 'bg-slate-100 text-slate-600',
  first_mate: 'bg-sky-100 text-sky-700',
  captain: 'bg-amber-100 text-amber-700',
};

export default function AdminRewards() {
  const { data: users } = trpc.users.list.useQuery();

  const customers = users?.filter(u => u.role !== 'admin') ?? [];

  const tierCounts = TIERS.map(t => ({
    ...t,
    count: customers.filter(c => getTier(c.loyaltyPoints).key === t.key).length,
  }));

  const topCustomers = [...customers]
    .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
    .slice(0, 10);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Loyalty Program</h1>
        <p className="text-slate-500 text-sm mt-1">Customers earn 1 point per $1 spent. Tier status is permanent once earned.</p>
      </div>

      {/* Tier overview */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {tierCounts.map(tier => (
          <div key={tier.key} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading text-xl font-normal">{tier.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${tierBadge[tier.key]}`}>
                {tier.discount > 0 ? `${Math.round(tier.discount * 100)}% off` : 'No discount'}
              </span>
            </div>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">
              {tier.minPoints === 0 ? 'Starting tier' : `${tier.minPoints.toLocaleString()}+ points`}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-3xl font-normal text-slate-900">{tier.count}</span>
              <span className="text-slate-500 text-sm">customers</span>
            </div>
          </div>
        ))}
      </div>

      {/* Top customers */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <h2 className="font-heading text-lg font-normal">Top Customers by Loyalty Points</h2>
        </div>
        {topCustomers.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            No customers yet. Bookings will populate this list automatically.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-3 font-medium">Customer</th>
                <th className="text-left px-6 py-3 font-medium">Tier</th>
                <th className="text-right px-6 py-3 font-medium">Lifetime Spend</th>
                <th className="text-right px-6 py-3 font-medium">Bookings</th>
                <th className="text-right px-6 py-3 font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map(c => {
                const tier = getTier(c.loyaltyPoints);
                return (
                  <tr key={c.id} className="border-t border-slate-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-sm">{c.name ?? '—'}</p>
                      <p className="text-slate-400 text-xs">{c.email ?? '—'}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${tierBadge[tier.key]}`}>{tier.name}</span>
                    </td>
                    <td className="px-6 py-3 text-right">${c.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3 text-right">{c.bookingCount}</td>
                    <td className="px-6 py-3 text-right font-medium">{c.loyaltyPoints.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* How to change */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 flex gap-3">
        <TrendingUp className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sky-900">
          <p className="font-medium">Want to change tier thresholds or discount percentages?</p>
          <p className="text-sky-700 mt-1">The loyalty rules live in <code className="bg-sky-100 rounded px-1 py-0.5 text-xs">src/lib/loyalty.ts</code>. Ping your developer to adjust the numbers — same change updates both the public Loyalty page and how discounts are calculated.</p>
        </div>
      </div>
    </div>
  );
}
