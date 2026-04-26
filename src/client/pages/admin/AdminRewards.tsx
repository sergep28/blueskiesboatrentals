import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Award, Gift, Plus, Edit2, X, Save, TrendingUp, Users, Star } from 'lucide-react';

const tierConfig = [
  { name: 'Crew', range: '0–2,499', multiplier: '1x', color: 'bg-slate-100 text-slate-600' },
  { name: 'First Mate', range: '2,500–7,499', multiplier: '1.1x', color: 'bg-blue-100 text-blue-700' },
  { name: 'Captain', range: '7,500–14,999', multiplier: '1.15x', color: 'bg-sky-100 text-sky-700' },
  { name: 'Admiral', range: '15,000+', multiplier: '1.25x', color: 'bg-amber-100 text-amber-700' },
];

const getTier = (points: number) => {
  if (points >= 15000) return tierConfig[3];
  if (points >= 7500) return tierConfig[2];
  if (points >= 2500) return tierConfig[1];
  return tierConfig[0];
};

export default function AdminRewards() {
  const { data: rewards, refetch: refetchRewards } = trpc.rewards.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();
  const [showAddReward, setShowAddReward] = useState(false);
  const [addRewardForm, setAddRewardForm] = useState({
    name: '', description: '', pointsCost: 0, type: 'discount' as string, value: '',
  });

  // Calculate program stats
  const loyaltyMembers = users?.filter(u => u.role !== 'admin' && u.loyaltyPoints > 0) ?? [];
  const totalPointsIssued = loyaltyMembers.reduce((sum, u) => sum + u.loyaltyPoints, 0);
  const tierBreakdown = {
    'Crew Member': loyaltyMembers.filter(u => u.loyaltyPoints < 500).length,
    'First Mate': loyaltyMembers.filter(u => u.loyaltyPoints >= 500 && u.loyaltyPoints < 1500).length,
    'Captain': loyaltyMembers.filter(u => u.loyaltyPoints >= 1500 && u.loyaltyPoints < 5000).length,
    'Admiral': loyaltyMembers.filter(u => u.loyaltyPoints >= 5000).length,
  };
  const avgPointsPerMember = loyaltyMembers.length > 0 ? Math.round(totalPointsIssued / loyaltyMembers.length) : 0;

  // Sort members by points
  const topMembers = [...loyaltyMembers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Rewards Program</h1>
      </div>

      {/* Program Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <Users className="w-5 h-5 text-sky-500 mb-2" />
          <p className="text-2xl font-semibold text-slate-900">{loyaltyMembers.length}</p>
          <p className="text-slate-400 text-xs">Loyalty Members</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <Award className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-semibold text-slate-900">{totalPointsIssued.toLocaleString()}</p>
          <p className="text-slate-400 text-xs">Total Points Issued</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-semibold text-slate-900">{avgPointsPerMember.toLocaleString()}</p>
          <p className="text-slate-400 text-xs">Avg Points / Member</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <Gift className="w-5 h-5 text-purple-500 mb-2" />
          <p className="text-2xl font-semibold text-slate-900">{rewards?.length ?? 0}</p>
          <p className="text-slate-400 text-xs">Active Rewards</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left — Tier Breakdown & Top Members */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tier Breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Tier Breakdown</h3>
            <div className="grid grid-cols-4 gap-4">
              {tierConfig.map(tier => (
                <div key={tier.name} className="text-center">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${tier.color}`}>
                    {tier.name}
                  </div>
                  <p className="text-2xl font-semibold text-slate-900">{tierBreakdown[tier.name as keyof typeof tierBreakdown]}</p>
                  <p className="text-slate-400 text-xs">{tier.range} pts</p>
                  <p className="text-slate-400 text-xs">{tier.multiplier} multiplier</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Members */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Top Loyalty Members</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Member</th>
                  <th className="text-center px-4 py-3 font-medium">Tier</th>
                  <th className="text-right px-4 py-3 font-medium">Points</th>
                  <th className="text-center px-4 py-3 font-medium">Bookings</th>
                  <th className="text-right px-4 py-3 font-medium">Lifetime Spend</th>
                </tr>
              </thead>
              <tbody>
                {topMembers.map((user, i) => {
                  const tier = getTier(user.loyaltyPoints);
                  return (
                    <tr key={user.id} className="border-t border-slate-50">
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color}`}>{tier.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600">{user.loyaltyPoints.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">{user.bookingCount}</td>
                      <td className="px-4 py-3 text-right font-semibold">${user.totalSpent.toFixed(0)}</td>
                    </tr>
                  );
                })}
                {topMembers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">No loyalty members yet. Members are created automatically when customers book.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right — Rewards Catalog Management */}
        <div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Rewards Catalog</h3>
              <button onClick={() => setShowAddReward(true)} className="text-sky-600 hover:text-sky-700 text-sm font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {rewards?.map(reward => (
                <div key={reward.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{reward.name}</p>
                      <p className="text-slate-400 text-xs mt-1">{reward.description}</p>
                    </div>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      {reward.pointsCost.toLocaleString()} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-400 capitalize">{reward.type}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${reward.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {reward.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!rewards || rewards.length === 0) && (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">No rewards configured</div>
              )}
            </div>
          </div>

          {/* How it Works summary */}
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
            <h3 className="font-semibold text-slate-900 mb-3 text-sm">How Points Work</h3>
            <div className="space-y-2 text-xs text-slate-500">
              <p>• Customers earn <strong>1 point per $5 spent</strong></p>
              <p>• ~150 pts per half day, ~240 pts per full day</p>
              <p>• Points multiplied by tier level</p>
              <p>• Auto-awarded on confirmed booking</p>
              <p>• Tiers require sustained loyalty (10+ trips for Captain)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Reward Modal */}
      {showAddReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddReward(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Add Reward</h3>
              <button onClick={() => setShowAddReward(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Reward Name *</label>
                <input value={addRewardForm.name} onChange={e => setAddRewardForm({ ...addRewardForm, name: e.target.value })}
                  placeholder="e.g. $50 Off Next Charter"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description</label>
                <input value={addRewardForm.description} onChange={e => setAddRewardForm({ ...addRewardForm, description: e.target.value })}
                  placeholder="Short description of the reward"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Points Cost *</label>
                  <input type="number" value={addRewardForm.pointsCost || ''} onChange={e => setAddRewardForm({ ...addRewardForm, pointsCost: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Type</label>
                  <select value={addRewardForm.type} onChange={e => setAddRewardForm({ ...addRewardForm, type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="discount">Discount</option>
                    <option value="freebie">Freebie</option>
                    <option value="upgrade">Upgrade</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Value</label>
                <input value={addRewardForm.value} onChange={e => setAddRewardForm({ ...addRewardForm, value: e.target.value })}
                  placeholder="e.g. $50 or free_half_day"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowAddReward(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button
                  disabled={!addRewardForm.name || !addRewardForm.pointsCost}
                  className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Reward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
