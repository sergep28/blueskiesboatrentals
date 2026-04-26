import { trpc } from '../../lib/trpc';
import { DollarSign, CalendarDays, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

export default function AdminAnalytics() {
  const { data: stats } = trpc.stats.overview.useQuery();
  const { data: byType } = trpc.stats.bookingsByType.useQuery();

  const avgBooking = stats && stats.totalBookings > 0
    ? stats.totalRevenue / stats.totalBookings
    : 0;

  return (
    <div>
      <h1 className="font-heading text-3xl font-normal text-slate-900 mb-8">Analytics</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <DollarSign className="w-8 h-8 text-sky-500 mb-2" />
          <p className="text-slate-500 text-sm">Total Revenue</p>
          <p className="font-heading text-3xl font-normal">${(stats?.totalRevenue ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <CalendarDays className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-slate-500 text-sm">Total Bookings</p>
          <p className="font-heading text-3xl font-normal">{stats?.totalBookings ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-slate-500 text-sm">Avg Booking Value</p>
          <p className="font-heading text-3xl font-normal">${avgBooking.toFixed(0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-heading text-lg font-normal mb-4">Charter Type Distribution</h3>
        {byType && byType.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie data={byType} cx="50%" cy="50%" outerRadius={120} dataKey="value" nameKey="name" label>
                {byType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-400 text-center py-12">No booking data yet. Make some bookings to see analytics.</p>
        )}
      </div>
    </div>
  );
}
