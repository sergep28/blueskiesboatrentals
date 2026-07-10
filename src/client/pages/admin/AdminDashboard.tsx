import { trpc } from '../../lib/trpc';
import { Link } from 'react-router-dom';
import { Users, CalendarDays, DollarSign, Ship, Handshake, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { data: stats } = trpc.stats.overview.useQuery();
  const { data: byType } = trpc.stats.bookingsByType.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();
  const { data: readinessMap } = trpc.bookings.readinessList.useQuery();
  const { data: boats } = trpc.boats.list.useQuery();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (bookings ?? [])
    .filter(b => b.status !== 'cancelled' && b.status !== 'completed' && (b.endDate || b.charterDate) >= today)
    .sort((a, b) => a.charterDate.localeCompare(b.charterDate));
  const boatName = (id: number) => boats?.find(bt => bt.id === id)?.name ?? `Boat #${id}`;
  const GATES: { key: 'agreement' | 'id' | 'waivers' | 'inspection' | 'deposit'; label: string }[] = [
    { key: 'agreement', label: 'Agreement' },
    { key: 'id', label: 'ID' },
    { key: 'waivers', label: 'Waivers' },
    { key: 'inspection', label: 'Inspection' },
    { key: 'deposit', label: 'Deposit' },
  ];

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

      {/* Upcoming Trips — readiness (what's still outstanding before boarding) */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-normal">Upcoming Trips — Readiness</h3>
          <Link to="/admin/bookings" className="text-sky-600 hover:text-sky-700 text-sm font-medium">All bookings →</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No upcoming trips.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcoming.slice(0, 10).map(b => {
              const r = readinessMap?.[b.bookingRef];
              const outstanding = GATES.filter(g => !r?.[g.key]).length;
              return (
                <Link key={b.id} to="/admin/bookings" className="flex items-center gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-900 truncate">{b.customerName}</p>
                      {r && (outstanding === 0
                        ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex-shrink-0">Ready ✓</span>
                        : <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">{outstanding} outstanding</span>)}
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(b.charterDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {b.endDate && b.endDate !== b.charterDate && <> → {new Date(b.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                      {' '}&bull; {boatName(b.boatId)} &bull; {b.guestCount} guest{b.guestCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1.5 justify-end max-w-[52%]">
                    {GATES.map(g => {
                      const ok = !!r?.[g.key];
                      return (
                        <span key={g.key} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                          {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {g.label}
                        </span>
                      );
                    })}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
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
