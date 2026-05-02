import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Search, X, Phone, Mail, MessageCircle, Plus } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const paymentColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-red-100 text-red-700',
};

export default function AdminBookings() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '',
    boatId: 0, charterDate: '', duration: 'full_day',
    charterType: 'cruising', guestCount: 4, captainRequested: false,
    departurePort: 'Islamorada', specialRequests: '',
  });
  const { data: bookings, refetch } = trpc.bookings.list.useQuery();
  const { data: captains } = trpc.captains.list.useQuery();
  const { data: boats } = trpc.boats.list.useQuery();
  const updateStatus = trpc.bookings.updateStatus.useMutation({ onSuccess: () => refetch() });
  const assignCaptain = trpc.bookings.assignCaptain.useMutation({ onSuccess: () => refetch() });
  const createBooking = trpc.bookings.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); setAddForm({ customerName: '', customerEmail: '', customerPhone: '', boatId: 0, charterDate: '', duration: 'full_day', charterType: 'cruising', guestCount: 4, captainRequested: false, departurePort: 'Islamorada', specialRequests: '' }); },
  });

  const filtered = bookings?.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search && !b.customerName.toLowerCase().includes(search.toLowerCase()) && !b.bookingRef.toLowerCase().includes(search.toLowerCase()) && !b.customerEmail.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getBoatName = (id: number) => boats?.find(b => b.id === id)?.name ?? 'Unknown';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Bookings</h1>
        <button onClick={() => { setShowAdd(true); if (boats?.length) setAddForm(f => ({ ...f, boatId: boats.filter(b => b.status === 'active')[0]?.id || 0 })); }} className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Booking
        </button>
      </div>

      {/* Add Booking Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-slate-900">Add Manual Booking</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                  <input value={addForm.customerName} onChange={e => setAddForm(f => ({ ...f, customerName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input type="email" value={addForm.customerEmail} onChange={e => setAddForm(f => ({ ...f, customerEmail: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input value={addForm.customerPhone} onChange={e => setAddForm(f => ({ ...f, customerPhone: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Boat *</label>
                  <select value={addForm.boatId} onChange={e => setAddForm(f => ({ ...f, boatId: Number(e.target.value) }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                    {boats?.filter(b => b.status === 'active').map(b => <option key={b.id} value={b.id}>{b.name} — {b.model}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input type="date" value={addForm.charterDate} onChange={e => setAddForm(f => ({ ...f, charterDate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                  <select value={addForm.duration} onChange={e => setAddForm(f => ({ ...f, duration: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="half_day_am">Half Day — Morning</option>
                    <option value="half_day_pm">Half Day — Afternoon</option>
                    <option value="full_day">Full Day</option>
                    <option value="multi_day">Multi-Day</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Charter Type</label>
                  <select value={addForm.charterType} onChange={e => setAddForm(f => ({ ...f, charterType: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                    <option value="cruising">Cruising</option>
                    <option value="fishing">Fishing</option>
                    <option value="snorkeling">Snorkeling</option>
                    <option value="sandbar">Sandbar</option>
                    <option value="sunset">Sunset</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Guests</label>
                  <input type="number" min={1} max={10} value={addForm.guestCount} onChange={e => setAddForm(f => ({ ...f, guestCount: parseInt(e.target.value) || 1 }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={addForm.captainRequested} onChange={e => setAddForm(f => ({ ...f, captainRequested: e.target.checked }))} className="w-4 h-4 rounded text-sky-500" />
                    <span className="text-sm text-slate-700">Captain</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Special Requests</label>
                <textarea value={addForm.specialRequests} onChange={e => setAddForm(f => ({ ...f, specialRequests: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <button
                onClick={() => createBooking.mutate({ ...addForm, customerName: addForm.customerName, customerEmail: addForm.customerEmail, customerPhone: addForm.customerPhone || undefined, boatId: addForm.boatId, charterDate: addForm.charterDate, duration: addForm.duration as any, charterType: addForm.charterType as any, guestCount: addForm.guestCount, departurePort: addForm.departurePort, specialRequests: addForm.specialRequests || undefined, captainRequested: addForm.captainRequested })}
                disabled={!addForm.customerName || !addForm.customerEmail || !addForm.charterDate || !addForm.boatId || createBooking.isPending}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                {createBooking.isPending ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by name, email, or ref..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Ref</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Boat</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Payment</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(b => (
                <tr key={b.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-sky-600 text-xs">{b.bookingRef}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{b.customerName}</p>
                      <p className="text-slate-400 text-xs">{b.customerEmail}</p>
                      {b.customerPhone && <p className="text-slate-400 text-xs">{b.customerPhone}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{getBoatName(b.boatId)}</td>
                  <td className="px-4 py-3 text-sm">{b.charterDate}</td>
                  <td className="px-4 py-3 capitalize text-sm">{b.charterType} — {b.duration.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right font-semibold">${b.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${paymentColors[b.paymentStatus]}`}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={b.status}
                      onChange={e => updateStatus.mutate({ id: b.id, status: e.target.value as any })}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${statusColors[b.status]}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="text-sky-600 hover:text-sky-700 text-xs font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              {/* Customer */}
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

              {/* Trip */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Trip Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Boat</p>
                    <p className="text-sm font-medium text-slate-900">{getBoatName(selectedBooking.boatId)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Date</p>
                    <p className="text-sm font-medium text-slate-900">{selectedBooking.charterDate}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Duration</p>
                    <p className="text-sm font-medium text-slate-900 capitalize">{selectedBooking.duration.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Charter Type</p>
                    <p className="text-sm font-medium text-slate-900 capitalize">{selectedBooking.charterType}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Guests</p>
                    <p className="text-sm font-medium text-slate-900">{selectedBooking.guestCount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Departure</p>
                    <p className="text-sm font-medium text-slate-900">{selectedBooking.departurePort}</p>
                  </div>
                </div>
                {selectedBooking.specialRequests && (
                  <div className="bg-slate-50 rounded-lg p-3 mt-3">
                    <p className="text-xs text-slate-400">Special Requests</p>
                    <p className="text-sm text-slate-700">{selectedBooking.specialRequests}</p>
                  </div>
                )}
              </div>

              {/* Captain */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Captain</p>
                <select
                  value={selectedBooking.captainId ?? ''}
                  onChange={e => { assignCaptain.mutate({ id: selectedBooking.id, captainId: Number(e.target.value) }); setSelectedBooking({ ...selectedBooking, captainId: Number(e.target.value) }); }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">No captain (bareboat)</option>
                  {captains?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Pricing</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>${selectedBooking.subtotal.toFixed(2)}</span></div>
                  {selectedBooking.captainFee > 0 && (
                    <div className="flex justify-between"><span className="text-slate-500">Captain</span><span>${selectedBooking.captainFee.toFixed(2)}</span></div>
                  )}
                  {selectedBooking.referralDiscount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Referral Discount</span><span>-${selectedBooking.referralDiscount.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-slate-500">Tax (7.5%)</span><span>${selectedBooking.tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-slate-100">
                    <span>Total</span><span>${selectedBooking.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Booking Status</p>
                  <select
                    value={selectedBooking.status}
                    onChange={e => { updateStatus.mutate({ id: selectedBooking.id, status: e.target.value as any }); setSelectedBooking({ ...selectedBooking, status: e.target.value }); }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Payment</p>
                  <span className={`text-xs px-3 py-1.5 rounded-full inline-block ${paymentColors[selectedBooking.paymentStatus]}`}>
                    {selectedBooking.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
