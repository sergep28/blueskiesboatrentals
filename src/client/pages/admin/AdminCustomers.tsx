import { trpc } from '../../lib/trpc';
import { Search, X, Mail, Phone, MessageCircle, Star, Calendar, DollarSign, Award } from 'lucide-react';
import { useState } from 'react';

const tierInfo = (points: number) => {
  if (points >= 15000) return { name: 'Admiral', color: 'bg-amber-100 text-amber-700' };
  if (points >= 7500) return { name: 'Captain', color: 'bg-sky-100 text-sky-700' };
  if (points >= 2500) return { name: 'First Mate', color: 'bg-blue-100 text-blue-700' };
  return { name: 'Crew', color: 'bg-slate-100 text-slate-600' };
};

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { data: users } = trpc.users.list.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();
  const { data: boats } = trpc.boats.list.useQuery();

  const filtered = users?.filter(u =>
    u.role !== 'admin' && (
      !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const getUserBookings = (email: string) => bookings?.filter(b => b.customerEmail === email) ?? [];
  const getBoatName = (id: number) => boats?.find(b => b.id === id)?.name ?? 'Unknown';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Customers</h1>
        <p className="text-slate-400 text-sm">{filtered?.length ?? 0} total</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-center px-4 py-3 font-medium">Bookings</th>
              <th className="text-right px-4 py-3 font-medium">Total Spent</th>
              <th className="text-center px-4 py-3 font-medium">Loyalty</th>
              <th className="text-center px-4 py-3 font-medium">Profile</th>
              <th className="text-left px-4 py-3 font-medium">Joined</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map(user => {
              const tier = tierInfo(user.loyaltyPoints);
              return (
                <tr key={user.id} className="border-t border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedUser(user)}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-slate-400 text-xs">{user.email}</p>
                    {user.phone && <p className="text-slate-400 text-xs">{user.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{user.bookingCount}</td>
                  <td className="px-4 py-3 text-right font-semibold">${user.totalSpent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color}`}>{tier.name}</span>
                    <p className="text-slate-400 text-xs mt-1">{user.loyaltyPoints} pts</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(user as any).has_profile ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Guest</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button className="text-sky-600 hover:text-sky-700 text-xs font-medium">View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!filtered || filtered.length === 0) && (
          <div className="text-center py-12 text-slate-400">
            <p>No customers yet. Bookings will create customer records automatically.</p>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{selectedUser.name}</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-6 space-y-6">
              {/* Contact */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Contact</p>
                <div className="space-y-2">
                  <a href={`mailto:${selectedUser.email}`} className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700">
                    <Mail className="w-4 h-4" /> {selectedUser.email}
                  </a>
                  {selectedUser.phone && (
                    <>
                      <a href={`tel:${selectedUser.phone}`} className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" /> {selectedUser.phone}
                      </a>
                      <a href={`sms:${selectedUser.phone}`} className="flex items-center gap-2 text-sm text-green-600">
                        <MessageCircle className="w-4 h-4" /> Text customer
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Stats</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <Calendar className="w-4 h-4 text-sky-500 mx-auto mb-1" />
                    <p className="text-2xl font-semibold text-slate-900">{selectedUser.bookingCount}</p>
                    <p className="text-xs text-slate-400">Bookings</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <DollarSign className="w-4 h-4 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-semibold text-slate-900">${selectedUser.totalSpent.toFixed(0)}</p>
                    <p className="text-xs text-slate-400">Total Spent</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <Award className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-2xl font-semibold text-slate-900">{selectedUser.loyaltyPoints}</p>
                    <p className="text-xs text-slate-400">Points</p>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <span className={`text-xs px-3 py-1 rounded-full ${tierInfo(selectedUser.loyaltyPoints).color}`}>
                    {tierInfo(selectedUser.loyaltyPoints).name}
                  </span>
                </div>
              </div>

              {/* Booking History */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Booking History</p>
                <div className="space-y-3">
                  {getUserBookings(selectedUser.email).map(b => (
                    <div key={b.id} className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-sky-600">{b.bookingRef}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{b.status}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-slate-900 font-medium">{getBoatName(b.boatId)}</p>
                          <p className="text-slate-400 text-xs">{b.charterDate} — {b.charterType} — {b.duration.replace(/_/g, ' ')}</p>
                        </div>
                        <p className="font-semibold">${b.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {getUserBookings(selectedUser.email).length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">No bookings found</p>
                  )}
                </div>
              </div>

              {/* Quick Award Points */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Award Bonus Points</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'IG Tag', pts: 50, color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
                    { label: 'TikTok', pts: 75, color: 'bg-sky-500' },
                    { label: 'Google Review', pts: 100, color: 'bg-blue-500' },
                  ].map(bonus => (
                    <button
                      key={bonus.label}
                      onClick={() => {
                        // In production this would call the API
                        alert(`Awarded +${bonus.pts} points to ${selectedUser.name} for ${bonus.label}`);
                      }}
                      className={`${bonus.color} text-white rounded-lg p-3 text-center hover:opacity-90 transition-opacity`}
                    >
                      <p className="text-xs font-medium">{bonus.label}</p>
                      <p className="text-sm font-semibold">+{bonus.pts} pts</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Admin Notes</p>
                <textarea
                  defaultValue={selectedUser.notes ?? ''}
                  placeholder="Add notes about this customer..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-24 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
