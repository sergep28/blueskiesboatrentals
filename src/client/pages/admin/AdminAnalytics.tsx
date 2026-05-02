import { useMemo } from 'react';
import { trpc } from '../../lib/trpc';
import { DollarSign, CalendarDays, TrendingUp, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

export default function AdminAnalytics() {
  const { data: stats } = trpc.stats.overview.useQuery();
  const { data: byType } = trpc.stats.bookingsByType.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();

  const avgBooking = stats && stats.totalBookings > 0
    ? stats.totalRevenue / stats.totalBookings
    : 0;

  const repeatRate = useMemo(() => {
    if (!users) return 0;
    const customers = users.filter(u => u.role !== 'admin' && u.bookingCount > 0);
    if (customers.length === 0) return 0;
    const repeaters = customers.filter(u => u.bookingCount > 1);
    return Math.round((repeaters.length / customers.length) * 100);
  }, [users]);

  // Revenue by month
  const revenueByMonth = useMemo(() => {
    if (!bookings) return [];
    const months: Record<string, { revenue: number; bookings: number }> = {};
    bookings
      .filter(b => b.paymentStatus === 'paid')
      .forEach(b => {
        const month = b.charterDate.slice(0, 7); // YYYY-MM
        if (!months[month]) months[month] = { revenue: 0, bookings: 0 };
        months[month].revenue += b.total;
        months[month].bookings += 1;
      });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Math.round(data.revenue),
        bookings: data.bookings,
      }));
  }, [bookings]);

  return (
    <div>
      <h1 className="font-heading text-3xl font-normal text-slate-900 mb-8">Analytics</h1>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
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
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <Users className="w-8 h-8 text-purple-500 mb-2" />
          <p className="text-slate-500 text-sm">Repeat Rate</p>
          <p className="font-heading text-3xl font-normal">{repeatRate}%</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Over Time */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-heading text-lg font-normal mb-4">Revenue by Month</h3>
          {revenueByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-12">No revenue data yet.</p>
          )}
        </div>

        {/* Bookings Over Time */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-heading text-lg font-normal mb-4">Bookings by Month</h3>
          {revenueByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-12">No booking data yet.</p>
          )}
        </div>
      </div>

      {/* Charter Type Distribution */}
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
          <p className="text-slate-400 text-center py-12">No booking data yet.</p>
        )}
      </div>
    </div>
  );
}
