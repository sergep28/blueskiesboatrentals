import { trpc } from '../../lib/trpc';
import { useState } from 'react';
import { Ship, MapPin, Edit2, X, Save, Plus, Calendar, ChevronLeft, ChevronRight, Lock } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  retired: 'bg-red-100 text-red-700',
};

function BoatCalendar({ boatId }: { boatId: number }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: bookings } = trpc.bookings.list.useQuery();
  const { data: blackouts, refetch: refetchBlackouts } = trpc.blackouts.list.useQuery(boatId);
  const [blackoutRange, setBlackoutRange] = useState<{ start: string; end: string } | null>(null);
  const [blackoutReason, setBlackoutReason] = useState('');
  const createBlackout = trpc.blackouts.create.useMutation({ onSuccess: () => { refetchBlackouts(); setBlackoutRange(null); setBlackoutReason(''); } });
  const deleteBlackout = trpc.blackouts.delete.useMutation({ onSuccess: () => refetchBlackouts() });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const boatBookings = bookings?.filter(b => b.boatId === boatId && b.status !== 'cancelled') ?? [];
  const bookingMap: Record<string, any> = {};
  boatBookings.forEach(b => {
    const start = new Date(b.charterDate);
    const end = new Date(b.endDate ?? b.charterDate);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      bookingMap[d.toISOString().slice(0, 10)] = b;
    }
  });
  const blackoutMap: Record<string, any> = {};
  (blackouts ?? []).forEach(bl => {
    const start = new Date(bl.startDate);
    const end = new Date(bl.endDate);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      blackoutMap[d.toISOString().slice(0, 10)] = bl;
    }
  });

  const handleDayClick = (dateStr: string) => {
    if (bookingMap[dateStr]) return; // booked — do nothing
    const existing = blackoutMap[dateStr];
    if (existing) {
      if (confirm(`Remove blackout from ${existing.startDate} → ${existing.endDate}${existing.reason ? ' (' + existing.reason + ')' : ''}?`)) {
        deleteBlackout.mutate(existing.id);
      }
      return;
    }
    if (!blackoutRange) {
      setBlackoutRange({ start: dateStr, end: dateStr });
    } else if (dateStr < blackoutRange.start) {
      setBlackoutRange({ start: dateStr, end: blackoutRange.start });
    } else {
      setBlackoutRange({ start: blackoutRange.start, end: dateStr });
    }
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().split('T')[0];
    const booking = bookingMap[dateStr];
    const blackout = blackoutMap[dateStr];
    const isPast = date < today;
    const inPendingRange = blackoutRange && dateStr >= blackoutRange.start && dateStr <= blackoutRange.end;

    days.push(
      <button
        type="button"
        key={d}
        onClick={() => handleDayClick(dateStr)}
        disabled={!!booking}
        className={`aspect-square flex flex-col items-center justify-center text-xs rounded-lg relative group ${
          booking ? 'bg-sky-100 text-sky-700 font-medium cursor-not-allowed' :
          blackout ? 'bg-amber-100 text-amber-700 font-medium cursor-pointer hover:bg-amber-200' :
          inPendingRange ? 'bg-amber-50 border border-amber-300 text-amber-700' :
          isPast ? 'text-slate-300 cursor-default' :
          'text-slate-600 hover:bg-slate-100 cursor-pointer'
        }`}
        title={booking ? `${booking.customerName} — ${booking.duration.replace(/_/g, ' ')}` : blackout ? `Blackout: ${blackout.reason ?? 'no reason'}` : 'Click to block off'}
      >
        {d}
        {booking && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-500" />
        )}
        {blackout && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />
        )}
        {booking && (
          <div className="hidden group-hover:block absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
            {booking.customerName} — {booking.charterType}
          </div>
        )}
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-slate-400 hover:text-slate-700 p-1"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-slate-900 font-medium text-sm">{monthName}</p>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-slate-400 hover:text-slate-700 p-1"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-slate-400 text-[10px]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">{days}</div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-500" /> Booked</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Blackout</div>
        <span className="ml-auto">{boatBookings.length} bookings · {blackouts?.length ?? 0} blackouts</span>
      </div>
      {blackoutRange && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-900 font-medium mb-2">
            Block off {blackoutRange.start}{blackoutRange.start !== blackoutRange.end ? ` → ${blackoutRange.end}` : ''}?
          </p>
          <input
            type="text"
            value={blackoutReason}
            onChange={e => setBlackoutReason(e.target.value)}
            placeholder="Reason (optional) — e.g., maintenance, owner use"
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs mb-2 outline-none focus:ring-1 focus:ring-amber-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createBlackout.mutate({ boatId, startDate: blackoutRange.start, endDate: blackoutRange.end, reason: blackoutReason || undefined })}
              disabled={createBlackout.isPending}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs py-1.5 rounded-md font-medium"
            >
              {createBlackout.isPending ? 'Saving...' : 'Block these dates'}
            </button>
            <button onClick={() => { setBlackoutRange(null); setBlackoutReason(''); }} className="px-3 text-xs text-slate-600 hover:bg-slate-100 rounded-md">
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-amber-700 mt-1">Tip: click another day to extend the range. Click an existing blackout (amber) to remove it.</p>
        </div>
      )}
    </div>
  );
}

export default function AdminFleet() {
  const { data: boats, refetch } = trpc.boats.list.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();
  const updateBoat = trpc.boats.update.useMutation({ onSuccess: () => refetch() });
  const createBoat = trpc.boats.create.useMutation({ onSuccess: () => { refetch(); setShowAdd(false); } });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [addForm, setAddForm] = useState({
    name: '', model: '', type: 'center_console' as string, lengthFt: 0, capacity: 0,
    description: '', priceHalfDay: 0, priceFullDay: 0, priceMultiDay: 0, homePort: 'Islamorada',
    imageUrl: '', status: 'active' as string,
  });

  const startEdit = (boat: any) => {
    setEditingId(boat.id);
    setEditForm({
      name: boat.name, model: boat.model, type: boat.type, lengthFt: boat.lengthFt,
      capacity: boat.capacity, description: boat.description, priceHalfDay: boat.priceHalfDay,
      priceFullDay: boat.priceFullDay, priceMultiDay: boat.priceMultiDay, homePort: boat.homePort,
      imageUrl: boat.imageUrl, status: boat.status,
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateBoat.mutate({ id: editingId, ...editForm });
    setEditingId(null);
  };

  const getUpcomingBookings = (boatId: number) => {
    const today = new Date().toISOString().split('T')[0];
    return bookings?.filter(b => b.boatId === boatId && b.charterDate >= today && b.status !== 'cancelled').length ?? 0;
  };

  const getTotalRevenue = (boatId: number) => {
    return bookings?.filter(b => b.boatId === boatId && b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.total, 0) ?? 0;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Fleet Management</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Boat
        </button>
      </div>

      {/* Boat Cards */}
      <div className="space-y-8">
        {boats?.map(boat => (
          <div key={boat.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="grid lg:grid-cols-3 gap-0">
              {/* Left — Photo & Info */}
              <div className="lg:col-span-2">
                <div className="flex flex-col md:flex-row">
                  <img src={boat.imageUrl ?? ''} alt={boat.name} className="w-full md:w-64 h-48 object-cover flex-shrink-0" />
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading text-xl text-slate-900">{boat.name}</h3>
                        <p className="text-slate-500 text-sm">{boat.model}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[boat.status]}`}>
                          {boat.status}
                        </span>
                        <button onClick={() => startEdit(boat)} className="text-slate-400 hover:text-sky-600 p-1">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mt-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-slate-900">{boat.lengthFt}ft</p>
                        <p className="text-xs text-slate-400">Length</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-slate-900">{boat.capacity}</p>
                        <p className="text-xs text-slate-400">Guests</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-slate-900">{getUpcomingBookings(boat.id)}</p>
                        <p className="text-xs text-slate-400">Upcoming</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-green-600">${getTotalRevenue(boat.id).toLocaleString()}</p>
                        <p className="text-xs text-slate-400">Revenue</p>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-4 text-sm">
                      <span><strong className="text-slate-900">${boat.priceHalfDay}</strong> <span className="text-slate-400">half day</span></span>
                      <span><strong className="text-slate-900">${boat.priceFullDay}</strong> <span className="text-slate-400">full day</span></span>
                      {boat.priceMultiDay && <span><strong className="text-slate-900">${boat.priceMultiDay}</strong> <span className="text-slate-400">/day multi</span></span>}
                    </div>

                    <div className="flex items-center gap-1 mt-3 text-sm text-slate-500">
                      <MapPin className="w-3 h-3" /> {boat.homePort}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => updateBoat.mutate({ id: boat.id, status: boat.status === 'active' ? 'maintenance' : 'active' })}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${
                          boat.status === 'active'
                            ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {boat.status === 'active' ? 'Set Maintenance' : 'Set Active'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right — Calendar */}
              <div className="border-l border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  <p className="text-sm font-medium text-slate-900">Booking Calendar</p>
                </div>
                <BoatCalendar boatId={boat.id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditingId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-slate-900">Edit Boat</h3>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Name</label>
                  <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Model</label>
                  <input value={editForm.model} onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Type</label>
                  <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="center_console">Center Console</option>
                    <option value="dual_console">Dual Console</option>
                    <option value="bay_boat">Bay Boat</option>
                    <option value="catamaran">Catamaran</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Length (ft)</label>
                  <input type="number" value={editForm.lengthFt} onChange={e => setEditForm({ ...editForm, lengthFt: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Capacity</label>
                  <input type="number" value={editForm.capacity} onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Half Day Price</label>
                  <input type="number" value={editForm.priceHalfDay} onChange={e => setEditForm({ ...editForm, priceHalfDay: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Full Day Price</label>
                  <input type="number" value={editForm.priceFullDay} onChange={e => setEditForm({ ...editForm, priceFullDay: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Multi-Day /day</label>
                  <input type="number" value={editForm.priceMultiDay} onChange={e => setEditForm({ ...editForm, priceMultiDay: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Home Port</label>
                  <input value={editForm.homePort} onChange={e => setEditForm({ ...editForm, homePort: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Image URL</label>
                <input value={editForm.imageUrl} onChange={e => setEditForm({ ...editForm, imageUrl: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
                <button onClick={saveEdit} className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Boat Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-slate-900">Add New Boat</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Name *</label>
                  <input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. Freedom"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Model *</label>
                  <input value={addForm.model} onChange={e => setAddForm({ ...addForm, model: e.target.value })} placeholder="e.g. Grady White Freedom 285"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Type</label>
                  <select value={addForm.type} onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="center_console">Center Console</option>
                    <option value="dual_console">Dual Console</option>
                    <option value="bay_boat">Bay Boat</option>
                    <option value="catamaran">Catamaran</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Length (ft) *</label>
                  <input type="number" value={addForm.lengthFt || ''} onChange={e => setAddForm({ ...addForm, lengthFt: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Capacity *</label>
                  <input type="number" value={addForm.capacity || ''} onChange={e => setAddForm({ ...addForm, capacity: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Half Day Price *</label>
                  <input type="number" value={addForm.priceHalfDay || ''} onChange={e => setAddForm({ ...addForm, priceHalfDay: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Full Day Price *</label>
                  <input type="number" value={addForm.priceFullDay || ''} onChange={e => setAddForm({ ...addForm, priceFullDay: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Multi-Day /day</label>
                  <input type="number" value={addForm.priceMultiDay || ''} onChange={e => setAddForm({ ...addForm, priceMultiDay: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Home Port</label>
                <input value={addForm.homePort} onChange={e => setAddForm({ ...addForm, homePort: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Image URL</label>
                <input value={addForm.imageUrl} onChange={e => setAddForm({ ...addForm, imageUrl: e.target.value })} placeholder="https://..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description</label>
                <textarea value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                  rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button
                  onClick={() => createBoat.mutate({
                    ...addForm,
                    type: addForm.type as any,
                    status: addForm.status as any,
                  })}
                  disabled={!addForm.name || !addForm.model || !addForm.lengthFt || !addForm.capacity || !addForm.priceHalfDay || !addForm.priceFullDay}
                  className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Boat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
