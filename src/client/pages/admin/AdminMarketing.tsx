import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Mail, MessageCircle, Check, Users, Filter, Send, X, ChevronDown } from 'lucide-react';

export default function AdminMarketing() {
  const { data: users } = trpc.users.list.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();

  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showCompose, setShowCompose] = useState(false);
  const [composeType, setComposeType] = useState<'email' | 'sms'>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const customers = users?.filter(u => u.role !== 'admin') ?? [];

  const filteredCustomers = customers.filter(u => {
    if (filter === 'all') return true;
    if (filter === 'has_booked') return u.bookingCount > 0;
    if (filter === 'repeat') return u.bookingCount > 1;
    if (filter === 'high_value') return u.totalSpent >= 2000;
    if (filter === 'inactive') return u.bookingCount === 0;
    if (filter === 'admiral') return u.loyaltyPoints >= 5000;
    if (filter === 'captain') return u.loyaltyPoints >= 1500 && u.loyaltyPoints < 5000;
    if (filter === 'first_mate') return u.loyaltyPoints >= 500 && u.loyaltyPoints < 1500;
    if (filter === 'crew') return u.loyaltyPoints < 500;
    return true;
  });

  const toggleUser = (id: number) => {
    const next = new Set(selectedUsers);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedUsers(next);
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredCustomers.map(u => u.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSend = () => {
    // In production this would call an email API (ActiveCampaign, SendGrid, etc.)
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setShowCompose(false);
      setSubject('');
      setMessage('');
      setSelectedUsers(new Set());
    }, 2000);
  };

  const selectedList = customers.filter(u => selectedUsers.has(u.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Marketing</h1>
        <div className="flex gap-3">
          <button
            disabled={selectedUsers.size === 0}
            onClick={() => { setComposeType('email'); setShowCompose(true); }}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Mail className="w-4 h-4" /> Email ({selectedUsers.size})
          </button>
          <button
            disabled={selectedUsers.size === 0}
            onClick={() => { setComposeType('sms'); setShowCompose(true); }}
            className="bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Text ({selectedUsers.size})
          </button>
        </div>
      </div>

      {/* Quick Segments */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'All Customers' },
          { key: 'has_booked', label: 'Has Booked' },
          { key: 'repeat', label: 'Repeat Customers' },
          { key: 'high_value', label: 'High Value ($2k+)' },
          { key: 'admiral', label: 'Admiral Tier' },
          { key: 'captain', label: 'Captain Tier' },
          { key: 'first_mate', label: 'First Mate' },
          { key: 'crew', label: 'Crew Member' },
        ].map(seg => (
          <button
            key={seg.key}
            onClick={() => { setFilter(seg.key); setSelectedUsers(new Set()); setSelectAll(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === seg.key ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={selectAll} onChange={toggleAll}
              className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500" />
            <span className="text-sm text-slate-500">
              {selectedUsers.size > 0 ? `${selectedUsers.size} selected` : `${filteredCustomers.length} customers`}
            </span>
          </div>
          {selectedUsers.size > 0 && (
            <button onClick={() => { setSelectedUsers(new Set()); setSelectAll(false); }}
              className="text-xs text-slate-400 hover:text-slate-600">Clear selection</button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-center px-4 py-3 font-medium">Bookings</th>
              <th className="text-right px-4 py-3 font-medium">Spent</th>
              <th className="text-center px-4 py-3 font-medium">Points</th>
              <th className="text-left px-4 py-3 font-medium">Last Booking</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(user => {
              const lastBooking = bookings?.filter(b => b.customerEmail === user.email).sort((a, b) => b.charterDate.localeCompare(a.charterDate))[0];
              return (
                <tr key={user.id} className={`border-t border-slate-50 ${selectedUsers.has(user.id) ? 'bg-sky-50' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedUsers.has(user.id)} onChange={() => toggleUser(user.id)}
                      className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-600 text-xs">{user.email}</p>
                    {user.phone && <p className="text-slate-400 text-xs">{user.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{user.bookingCount}</td>
                  <td className="px-4 py-3 text-right font-medium">${user.totalSpent.toFixed(0)}</td>
                  <td className="px-4 py-3 text-center text-amber-600 font-medium">{user.loyaltyPoints}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{lastBooking?.charterDate ?? 'Never'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No customers match this filter</div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCompose(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                {composeType === 'email' ? <Mail className="w-4 h-4 text-sky-500" /> : <MessageCircle className="w-4 h-4 text-green-500" />}
                {composeType === 'email' ? 'Compose Email' : 'Compose Text'}
              </h3>
              <button onClick={() => setShowCompose(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {sent ? (
              <div className="px-6 py-12 text-center">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-900 text-lg">Sent!</p>
                <p className="text-slate-400 text-sm">{composeType === 'email' ? 'Email' : 'Text'} sent to {selectedUsers.size} customer{selectedUsers.size > 1 ? 's' : ''}</p>
              </div>
            ) : (
              <div className="px-6 py-6 space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-2">Sending to {selectedUsers.size} customer{selectedUsers.size > 1 ? 's' : ''}:</p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {selectedList.slice(0, 10).map(u => (
                      <span key={u.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{u.name}</span>
                    ))}
                    {selectedList.length > 10 && <span className="text-xs text-slate-400">+{selectedList.length - 10} more</span>}
                  </div>
                </div>

                {composeType === 'email' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Subject</label>
                    <input value={subject} onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. Mahi Season is Here — Book Your Spot"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    rows={composeType === 'sms' ? 4 : 8}
                    placeholder={composeType === 'email'
                      ? "Write your email message..."
                      : "Keep it short — 160 chars for SMS"}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                  {composeType === 'sms' && (
                    <p className="text-xs text-slate-400 mt-1">{message.length}/160 characters</p>
                  )}
                </div>

                <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
                  <strong>Note:</strong> {composeType === 'email'
                    ? 'Connect ActiveCampaign or SendGrid to send real emails. Currently in preview mode.'
                    : 'Connect Twilio to send real SMS. Currently in preview mode.'}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setShowCompose(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                  <button
                    onClick={handleSend}
                    disabled={!message || (composeType === 'email' && !subject)}
                    className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send {composeType === 'email' ? 'Email' : 'Text'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
