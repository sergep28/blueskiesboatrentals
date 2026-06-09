import { useState, useMemo } from 'react';
import { trpc } from '../../lib/trpc';
import { DollarSign, CalendarDays, TrendingUp, Clock, Users, Anchor, Handshake, X, Phone, Mail, MessageCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6'];

type DateRange = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'last_year' | 'all';

function getDateRange(range: DateRange): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (range) {
    case 'this_month':
      return { start: `${y}-${String(m+1).padStart(2,'0')}-01`, end: `${y}-${String(m+1).padStart(2,'0')}-31` };
    case 'last_month': {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      return { start: `${ly}-${String(lm+1).padStart(2,'0')}-01`, end: `${ly}-${String(lm+1).padStart(2,'0')}-31` };
    }
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return { start: `${y}-${String(qStart+1).padStart(2,'0')}-01`, end: `${y}-${String(qStart+3).padStart(2,'0')}-31` };
    }
    case 'this_year':
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case 'last_year':
      return { start: `${y-1}-01-01`, end: `${y-1}-12-31` };
    case 'all':
      return { start: '2000-01-01', end: '2099-12-31' };
  }
}

function getPlatform(specialRequests: string | null | undefined): string {
  if (!specialRequests) return 'Direct';
  if (specialRequests.startsWith('Via ')) {
    const raw = specialRequests.replace('Via ', '').trim();
    const normalized = raw.toLowerCase();
    if (normalized === 'boatsetter') return 'BoatSetter';
    if (normalized === 'getmyboat') return 'GetMyBoat';
    if (normalized === 'zelle') return 'Zelle';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return 'Direct';
}

function bookingDays(b: { duration: string; charterDate: string; endDate?: string | null }): number {
  if (b.endDate && b.endDate > b.charterDate) {
    const start = new Date(b.charterDate).getTime();
    const end = new Date(b.endDate).getTime();
    return Math.max(1, Math.round((end - start) / 86400000) + 1);
  }
  if (b.duration === 'half_day_am' || b.duration === 'half_day_pm') return 0.5;
  return 1;
}

export default function AdminAnalytics() {
  const [range, setRange] = useState<DateRange>('all');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const { data: bookings } = trpc.bookings.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const { data: stats } = trpc.stats.overview.useQuery();

  const { start, end } = getDateRange(range);

  const filtered = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(b => b.charterDate >= start && b.charterDate <= end);
  }, [bookings, start, end]);

  const paidFiltered = useMemo(() => filtered.filter(b => b.paymentStatus === 'paid' && b.status !== 'cancelled'), [filtered]);
  const pendingFiltered = useMemo(() => filtered.filter(b => b.paymentStatus === 'pending' && b.status !== 'cancelled'), [filtered]);

  // KPIs
  const totalRevenue = paidFiltered.reduce((s, b) => s + b.total, 0);
  const totalBookings = filtered.filter(b => b.status !== 'cancelled').length;
  const totalDays = paidFiltered.reduce((s, b) => s + bookingDays(b), 0);
  const avgDailyRate = totalDays > 0 ? totalRevenue / totalDays : 0;
  const pendingRevenue = pendingFiltered.reduce((s, b) => s + b.total, 0);

  // Revenue by month
  const revenueByMonth = useMemo(() => {
    const months: Record<string, { revenue: number; bookings: number }> = {};
    paidFiltered.forEach(b => {
      const month = b.charterDate.slice(0, 7);
      if (!months[month]) months[month] = { revenue: 0, bookings: 0 };
      months[month].revenue += b.total;
      months[month].bookings += 1;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        monthKey: month,
        month: new Date(month + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Math.round(data.revenue),
        bookings: data.bookings,
      }));
  }, [paidFiltered]);

  // Bookings for selected month drill-down
  const selectedMonthBookings = useMemo(() => {
    if (!selectedMonth || !paidFiltered) return [];
    return paidFiltered
      .filter(b => b.charterDate.startsWith(selectedMonth))
      .sort((a, b) => a.charterDate.localeCompare(b.charterDate));
  }, [selectedMonth, paidFiltered]);

  const selectedMonthLabel = selectedMonth
    ? new Date(selectedMonth + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  // Revenue by platform
  const revenueByPlatform = useMemo(() => {
    const platforms: Record<string, number> = {};
    paidFiltered.forEach(b => {
      const platform = getPlatform(b.specialRequests);
      platforms[platform] = (platforms[platform] || 0) + b.total;
    });
    return Object.entries(platforms)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [paidFiltered]);

  // Top customers
  const topCustomers = useMemo(() => {
    const byCustomer: Record<string, { name: string; revenue: number; bookings: number; days: number }> = {};
    paidFiltered.forEach(b => {
      const key = b.customerEmail;
      if (!byCustomer[key]) byCustomer[key] = { name: b.customerName, revenue: 0, bookings: 0, days: 0 };
      byCustomer[key].revenue += b.total;
      byCustomer[key].bookings += 1;
      byCustomer[key].days += bookingDays(b);
    });
    return Object.values(byCustomer)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [paidFiltered]);

  // Repeat rate
  const repeatRate = useMemo(() => {
    if (!users) return 0;
    const customers = users.filter(u => u.role !== 'admin' && u.bookingCount > 0);
    if (customers.length === 0) return 0;
    return Math.round((customers.filter(u => u.bookingCount > 1).length / customers.length) * 100);
  }, [users]);

  // Charter type
  const byType = useMemo(() => {
    const types: Record<string, number> = {};
    filtered.filter(b => b.status !== 'cancelled').forEach(b => {
      types[b.charterType] = (types[b.charterType] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [filtered]);

  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  const rangeLabels: Record<DateRange, string> = {
    this_month: 'This Month',
    last_month: 'Last Month',
    this_quarter: 'This Quarter',
    this_year: 'This Year',
    last_year: 'Last Year',
    all: 'All Time',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Analytics</h1>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(Object.keys(rangeLabels) as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                range === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <DollarSign className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-slate-500 text-sm">Collected Revenue</p>
          <p className="font-heading text-3xl font-normal">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <CalendarDays className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-slate-500 text-sm">Bookings</p>
          <p className="font-heading text-3xl font-normal">{totalBookings}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <TrendingUp className="w-8 h-8 text-sky-500 mb-2" />
          <p className="text-slate-500 text-sm">Avg Daily Rate</p>
          <p className="font-heading text-3xl font-normal">${avgDailyRate.toFixed(0)}</p>
          <p className="text-slate-400 text-xs mt-1">{totalDays % 1 === 0 ? totalDays : totalDays.toFixed(1)} charter days</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <Clock className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-slate-500 text-sm">Pending Revenue</p>
          <p className="font-heading text-3xl font-normal text-amber-600">${pendingRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-slate-400 text-xs mt-1">{pendingFiltered.length} unpaid bookings</p>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-slate-500 text-xs">Repeat Rate</p>
            <p className="font-semibold text-lg">{repeatRate}%</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <p className="text-slate-500 text-xs">Avg Booking Value</p>
            <p className="font-semibold text-lg">${avgBookingValue.toFixed(0)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Anchor className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-slate-500 text-xs">Active Boats</p>
            <p className="font-semibold text-lg">{stats?.activeBoats ?? 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-slate-500 text-xs">Active Partners</p>
            <p className="font-semibold text-lg">{stats?.totalPartners ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Over Time */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-heading text-lg font-normal mb-4">Revenue by Month</h3>
          {revenueByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMonth} onClick={(e) => { if (e?.activePayload?.[0]?.payload?.monthKey) setSelectedMonth(e.activePayload[0].payload.monthKey); }} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-12">No revenue data for this period.</p>
          )}

          {/* Month drill-down */}
          {selectedMonth && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-heading text-base font-normal text-slate-900">
                  {selectedMonthLabel} — {selectedMonthBookings.length} booking{selectedMonthBookings.length !== 1 ? 's' : ''}, ${selectedMonthBookings.reduce((s, b) => s + b.total, 0).toLocaleString()}
                </h4>
                <button onClick={() => setSelectedMonth(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {selectedMonthBookings.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Date</th>
                      <th className="text-left px-3 py-2 font-medium">Customer</th>
                      <th className="text-left px-3 py-2 font-medium">Duration</th>
                      <th className="text-left px-3 py-2 font-medium">Platform</th>
                      <th className="text-right px-3 py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMonthBookings.map((b, i) => (
                      <tr key={i} className="border-t border-slate-50 hover:bg-sky-50 cursor-pointer transition-colors" onClick={() => setSelectedBooking(b)}>
                        <td className="px-3 py-2">{new Date(b.charterDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="px-3 py-2 font-medium text-sky-700">{b.customerName}</td>
                        <td className="px-3 py-2 text-slate-500">{b.duration === 'half_day_am' ? 'Half (AM)' : b.duration === 'half_day_pm' ? 'Half (PM)' : b.duration === 'full_day' ? 'Full Day' : b.duration === 'multi_day' ? 'Multi-Day' : b.duration}</td>
                        <td className="px-3 py-2 text-slate-500">{getPlatform(b.specialRequests)}</td>
                        <td className="px-3 py-2 text-right font-semibold">${b.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-slate-400 text-sm">No paid bookings this month.</p>
              )}
            </div>
          )}
        </div>

        {/* Revenue by Platform */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-heading text-lg font-normal mb-4">Revenue by Platform</h3>
          {revenueByPlatform.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={revenueByPlatform} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {revenueByPlatform.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-12">No data for this period.</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
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
            <p className="text-slate-400 text-center py-12">No booking data for this period.</p>
          )}
        </div>

        {/* Charter Type Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-heading text-lg font-normal mb-4">Charter Type Distribution</h3>
          {byType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byType} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                  {byType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-12">No data for this period.</p>
          )}
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-heading text-lg font-normal mb-4">Top Customers</h3>
        {topCustomers.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-center px-4 py-3 font-medium">Bookings</th>
                <th className="text-center px-4 py-3 font-medium">Charter Days</th>
                <th className="text-right px-4 py-3 font-medium">Total Revenue</th>
                <th className="text-right px-4 py-3 font-medium">Avg/Day</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="px-4 py-3 text-slate-400 font-medium">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-center">{c.bookings}</td>
                  <td className="px-4 py-3 text-center">{c.days % 1 === 0 ? c.days : c.days.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold">${c.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right text-slate-500">${c.days > 0 ? (c.revenue / c.days).toFixed(0) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-400 text-center py-8">No customer data for this period.</p>
        )}
      </div>

      {/* Booking Detail Drawer */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedBooking(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Booking {selectedBooking.bookingRef}</h3>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-6 space-y-6">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Customer</p>
                <p className="text-slate-900 font-semibold text-lg">{selectedBooking.customerName}</p>
                <div className="flex items-center gap-4 mt-2">
                  <a href={`mailto:${selectedBooking.customerEmail}`} className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700">
                    <Mail className="w-3 h-3" /> {selectedBooking.customerEmail}
                  </a>
                </div>
                {selectedBooking.customerPhone && (
                  <div className="flex items-center gap-4 mt-1">
                    <a href={`tel:${selectedBooking.customerPhone}`} className="flex items-center gap-1 text-sm text-slate-600">
                      <Phone className="w-3 h-3" /> {selectedBooking.customerPhone}
                    </a>
                    <a href={`sms:${selectedBooking.customerPhone}`} className="flex items-center gap-1 text-sm text-green-600">
                      <MessageCircle className="w-3 h-3" /> Text
                    </a>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Trip Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Date:</span> <span className="font-medium">{new Date(selectedBooking.charterDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
                  {selectedBooking.endDate && selectedBooking.endDate !== selectedBooking.charterDate && (
                    <div><span className="text-slate-500">End:</span> <span className="font-medium">{new Date(selectedBooking.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
                  )}
                  <div><span className="text-slate-500">Duration:</span> <span className="font-medium">{selectedBooking.duration === 'half_day_am' ? 'Half Day (AM)' : selectedBooking.duration === 'half_day_pm' ? 'Half Day (PM)' : selectedBooking.duration === 'full_day' ? 'Full Day' : selectedBooking.duration === 'multi_day' ? 'Multi-Day' : selectedBooking.duration}</span></div>
                  <div><span className="text-slate-500">Type:</span> <span className="font-medium capitalize">{selectedBooking.charterType}</span></div>
                  <div><span className="text-slate-500">Guests:</span> <span className="font-medium">{selectedBooking.guestCount}</span></div>
                  {selectedBooking.departurePort && <div><span className="text-slate-500">Port:</span> <span className="font-medium">{selectedBooking.departurePort}</span></div>}
                  <div><span className="text-slate-500">Platform:</span> <span className="font-medium">{getPlatform(selectedBooking.specialRequests)}</span></div>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Payment</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Total:</span> <span className="font-semibold text-lg">${selectedBooking.total.toLocaleString()}</span></div>
                  <div><span className="text-slate-500">Status:</span> <span className={`font-medium ${selectedBooking.paymentStatus === 'paid' ? 'text-green-600' : selectedBooking.paymentStatus === 'pending' ? 'text-amber-600' : 'text-red-600'}`}>{selectedBooking.paymentStatus.charAt(0).toUpperCase() + selectedBooking.paymentStatus.slice(1)}</span></div>
                  <div><span className="text-slate-500">Booking Status:</span> <span className={`font-medium ${selectedBooking.status === 'confirmed' ? 'text-green-600' : selectedBooking.status === 'completed' ? 'text-blue-600' : selectedBooking.status === 'cancelled' ? 'text-red-600' : 'text-amber-600'}`}>{selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}</span></div>
                </div>
              </div>

              {selectedBooking.specialRequests && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-slate-700">{selectedBooking.specialRequests}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
