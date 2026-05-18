import { trpc } from '../../lib/trpc';
import { Search, X, Mail, Phone, MessageCircle, Star, Calendar, DollarSign, Award, Upload, Download, Check } from 'lucide-react';
import { useState, useRef } from 'react';

const tierInfo = (points: number) => {
  if (points >= 5000) return { name: 'Captain', color: 'bg-amber-100 text-amber-700' };
  if (points >= 2500) return { name: 'First Mate', color: 'bg-sky-100 text-sky-700' };
  return { name: 'Crew', color: 'bg-slate-100 text-slate-600' };
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  }).filter(row => Object.values(row).some(v => v));
}

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; total: number } | null>(null);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: users, refetch } = trpc.users.list.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();
  const { data: boats } = trpc.boats.list.useQuery();
  const importMutation = trpc.users.importCustomers.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      setImportPreview(null);
      refetch();
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      const mapped = rows.map(row => ({
        name: row.name || row.customer_name || row.full_name || row.first_name || '',
        email: row.email || row.customer_email || row.email_address || '',
        phone: row.phone || row.customer_phone || row.phone_number || '',
        bookingCount: parseInt(row.bookings || row.booking_count || row.trips || '0') || 0,
        totalSpent: parseFloat(row.total_spent || row.revenue || row.total || row.amount || '0') || 0,
      })).filter(r => r.name && r.email);
      setImportPreview(mapped);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!importPreview) return;
    importMutation.mutate(importPreview);
  };

  const [sortBy, setSortBy] = useState<'name' | 'bookings' | 'totalSpent' | 'loyaltyPoints'>('totalSpent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const sortArrow = (col: typeof sortBy) => sortBy === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const filtered = users?.filter(u =>
    u.role !== 'admin' && (
      !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.phone?.toLowerCase().includes(search.toLowerCase())
    )
  )?.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'name') return dir * (a.name ?? '').localeCompare(b.name ?? '');
    if (sortBy === 'bookings') return dir * (a.bookingCount - b.bookingCount);
    if (sortBy === 'totalSpent') return dir * (a.totalSpent - b.totalSpent);
    if (sortBy === 'loyaltyPoints') return dir * (a.loyaltyPoints - b.loyaltyPoints);
    return 0;
  });

  const getUserBookings = (email: string) => bookings?.filter(b => b.customerEmail === email) ?? [];
  const getBoatName = (id: number) => boats?.find(b => b.id === id)?.name ?? 'Unknown';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Customers</h1>
        <div className="flex items-center gap-3">
          <p className="text-slate-400 text-sm">{filtered?.length ?? 0} total</p>
          <button
            onClick={() => { setShowImport(true); setImportResult(null); setImportPreview(null); }}
            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowImport(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-slate-900">Import Customers from CSV</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6">
              {importResult ? (
                <div className="text-center py-8">
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Import Complete!</h3>
                  <p className="text-slate-500">
                    {importResult.imported} new customers imported, {importResult.updated} existing updated.
                  </p>
                  <button onClick={() => setShowImport(false)} className="mt-6 bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium">Done</button>
                </div>
              ) : !importPreview ? (
                <div>
                  <div className="bg-slate-50 rounded-xl p-6 text-center mb-6">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium mb-1">Upload your customer spreadsheet</p>
                    <p className="text-slate-400 text-sm mb-4">CSV file with columns for name, email, phone, bookings, total spent</p>
                    <input ref={fileRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
                      Choose CSV File
                    </button>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 text-sm font-medium mb-2">Expected CSV format:</p>
                    <code className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1 block overflow-x-auto">
                      name,email,phone,bookings,total_spent<br/>
                      John Smith,john@email.com,305-555-1234,3,2400<br/>
                      Jane Doe,jane@email.com,786-555-5678,1,900
                    </code>
                    <p className="text-amber-600 text-xs mt-2">Column names are flexible — we'll match common variations like "customer_name", "email_address", "revenue", etc.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-slate-700 font-medium mb-4">Preview — {importPreview.length} customers found</p>
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-slate-600">Name</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-600">Email</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-600">Phone</th>
                          <th className="text-right px-4 py-2 font-medium text-slate-600">Bookings</th>
                          <th className="text-right px-4 py-2 font-medium text-slate-600">Spent</th>
                          <th className="text-right px-4 py-2 font-medium text-slate-600">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((c, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-4 py-2">{c.name}</td>
                            <td className="px-4 py-2 text-slate-500">{c.email}</td>
                            <td className="px-4 py-2 text-slate-500">{c.phone || '—'}</td>
                            <td className="px-4 py-2 text-right">{c.bookingCount}</td>
                            <td className="px-4 py-2 text-right">${c.totalSpent.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-amber-600">{Math.floor(c.totalSpent / 5)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-slate-400 text-xs mt-3">Loyalty points will be auto-calculated at 1 point per $1 spent. Existing customers will be updated (not duplicated).</p>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setImportPreview(null); if (fileRef.current) fileRef.current.value = ''; }} className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium">
                      Back
                    </button>
                    <button onClick={handleImport} disabled={importMutation.isPending} className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
                      {importMutation.isPending ? 'Importing...' : `Import ${importPreview.length} Customers`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-sky-600 select-none" onClick={() => handleSort('name')}>Name{sortArrow('name')}</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-center px-4 py-3 font-medium cursor-pointer hover:text-sky-600 select-none" onClick={() => handleSort('bookings')}>Bookings{sortArrow('bookings')}</th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-sky-600 select-none" onClick={() => handleSort('totalSpent')}>Total Spent{sortArrow('totalSpent')}</th>
              <th className="text-center px-4 py-3 font-medium cursor-pointer hover:text-sky-600 select-none" onClick={() => handleSort('loyaltyPoints')}>Loyalty{sortArrow('loyaltyPoints')}</th>
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
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{user.email}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{user.phone || '—'}</td>
                  <td className="px-4 py-3 text-center font-semibold">{user.bookingCount}</td>
                  <td className="px-4 py-3 text-right font-semibold">${user.totalSpent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color}`}>{tier.name}</span>
                    <p className="text-slate-400 text-xs mt-1">{user.loyaltyPoints} pts</p>
                  </td>
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
