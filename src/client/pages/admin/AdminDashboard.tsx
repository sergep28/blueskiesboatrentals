import { trpc } from '../../lib/trpc';
import { Users, CalendarDays, DollarSign, Ship, Handshake } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { data: stats } = trpc.stats.overview.useQuery();
  const { data: byType } = trpc.stats.bookingsByType.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();

  const kpis = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Bookings', value: stats?.totalBookings ?? 0, icon: CalendarDays, color: 'bg-green-500' },
    { label: 'Total Revenue', value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'bg-sky-500' },
    { label: 'Active Boats', value: stats?.activeBoats ?? 0, icon: Ship, color: 'bg-purple-500' },
    { label: 'Active Partners', value: stats?.totalPartners ?? 0, icon: Handshake, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="font-heading text-3xl font-normal text-slate-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm">
            <div className={`w-10 h-10 ${kpi.color} rounded-lg flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-slate-500 text-sm">{kpi.label}</p>
            <p className="font-heading text-2xl font-normal text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-heading text-lg font-normal mb-4">Bookings by Charter Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byType ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Bookings — sorted by when the booking was created */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-heading text-lg font-normal mb-4">Recent Bookings</h3>
          <div className="space-y-3">
            {bookings
              ?.slice()
              .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
              .slice(0, 5)
              .map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                <div>
                  <p className="font-medium text-sm">{b.customerName}</p>
                  <p className="text-xs text-slate-500">
                    {b.bookingRef} &bull; Trip: {new Date(b.charterDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {b.createdAt && <> &bull; Booked: {new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">${b.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{b.status}</span>
                </div>
              </div>
            ))}
            {(!bookings || bookings.length === 0) && (
              <p className="text-slate-400 text-sm text-center py-4">No bookings yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
