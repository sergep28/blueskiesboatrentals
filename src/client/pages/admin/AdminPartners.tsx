import { useState, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { Search, X, Plus, Mail, Phone, Save, Trash2, DollarSign, Users, TrendingUp } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
};

const typeOptions = [
  { value: 'airbnb_host', label: 'Airbnb Host' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'concierge', label: 'Concierge' },
  { value: 'other', label: 'Other' },
];

export default function AdminPartners() {
  const [search, setSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    businessName: '', contactName: '', email: '', phone: '',
    type: 'hotel' as string, commissionRate: '10', referralCode: '',
  });

  const { data: partners, refetch } = trpc.partners.list.useQuery();
  const createPartner = trpc.partners.create.useMutation({
    onSuccess: () => {
      refetch(); setShowAdd(false);
      setAddForm({ businessName: '', contactName: '', email: '', phone: '', type: 'hotel', commissionRate: '10', referralCode: '' });
    },
  });
  const updatePartner = trpc.partners.update.useMutation({
    onSuccess: () => { refetch(); setIsDirty(false); },
  });
  const deletePartner = trpc.partners.delete.useMutation({
    onSuccess: () => { refetch(); setSelectedPartner(null); },
  });

  const [editForm, setEditForm] = useState({
    businessName: '', contactName: '', email: '', phone: '',
    type: '', commissionRate: 0, referralCode: '', status: '',
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (selectedPartner) {
      setEditForm({
        businessName: selectedPartner.businessName ?? '',
        contactName: selectedPartner.contactName ?? '',
        email: selectedPartner.email ?? '',
        phone: selectedPartner.phone ?? '',
        type: selectedPartner.type ?? 'other',
        commissionRate: selectedPartner.commissionRate ?? 10,
        referralCode: selectedPartner.referralCode ?? '',
        status: selectedPartner.status ?? 'pending',
      });
      setIsDirty(false);
    }
  }, [selectedPartner]);

  const patchField = <K extends keyof typeof editForm>(k: K, v: typeof editForm[K]) => {
    setEditForm(f => ({ ...f, [k]: v }));
    setIsDirty(true);
  };

  const filtered = partners?.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.businessName.toLowerCase().includes(q) || p.contactName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) || p.referralCode.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading text-3xl font-normal text-slate-900">Partners</h1>
        <div className="flex items-center gap-3">
          <p className="text-slate-400 text-sm">{filtered?.length ?? 0} total</p>
          <button onClick={() => setShowAdd(true)} className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Partner
          </button>
        </div>
      </div>

      {/* Add Partner Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-slate-900">Add New Partner</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
                  <input value={addForm.businessName} onChange={e => setAddForm(f => ({ ...f, businessName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
                  <input value={addForm.contactName} onChange={e => setAddForm(f => ({ ...f, contactName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                    {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Commission Rate (%)</label>
                  <input type="number" min={0} max={100} step="0.5" value={addForm.commissionRate} onChange={e => setAddForm(f => ({ ...f, commissionRate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Referral Code <span className="text-slate-400 font-normal">(optional)</span></label>
                <input value={addForm.referralCode} onChange={e => setAddForm(f => ({ ...f, referralCode: e.target.value }))} placeholder="e.g. SUNRISE10" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 font-mono" />
              </div>
              <button
                onClick={() => createPartner.mutate({
                  businessName: addForm.businessName, contactName: addForm.contactName,
                  email: addForm.email, phone: addForm.phone || undefined,
                  type: addForm.type as any, commissionRate: addForm.commissionRate ? parseFloat(addForm.commissionRate) : undefined,
                  referralCode: addForm.referralCode || undefined,
                })}
                disabled={!addForm.businessName || !addForm.contactName || !addForm.email || createPartner.isPending}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white py-2.5 rounded-lg font-semibold text-sm"
              >
                {createPartner.isPending ? 'Creating...' : 'Create Partner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search by business, contact, email, or code..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Business</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Code</th>
              <th className="text-center px-4 py-3 font-medium">Referrals</th>
              <th className="text-right px-4 py-3 font-medium">Revenue</th>
              <th className="text-right px-4 py-3 font-medium">Commission</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map(p => (
              <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedPartner(p)}>
                <td className="px-4 py-3 font-medium">{p.businessName}</td>
                <td className="px-4 py-3 text-slate-500">{p.contactName}</td>
                <td className="px-4 py-3 capitalize">{p.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 font-mono text-sky-600 text-xs">{p.referralCode}</td>
                <td className="px-4 py-3 text-center">{p.totalReferrals}</td>
                <td className="px-4 py-3 text-right">${p.totalRevenue.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">${p.totalCommission.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.status]}`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!filtered || filtered.length === 0) && (
          <div className="text-center py-12 text-slate-400">
            <p>No partners yet. Click "Add Partner" to create one.</p>
          </div>
        )}
      </div>

      {/* Partner Detail Drawer */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedPartner(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{selectedPartner.businessName}</h3>
              <button onClick={() => setSelectedPartner(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-6 space-y-6">
              {/* Stats */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Performance</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <Users className="w-4 h-4 text-sky-500 mx-auto mb-1" />
                    <p className="text-2xl font-semibold">{selectedPartner.totalReferrals}</p>
                    <p className="text-xs text-slate-400">Referrals</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <TrendingUp className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-2xl font-semibold">${selectedPartner.totalRevenue.toFixed(0)}</p>
                    <p className="text-xs text-slate-400">Revenue</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <DollarSign className="w-4 h-4 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-semibold text-green-600">${selectedPartner.totalCommission.toFixed(0)}</p>
                    <p className="text-xs text-slate-400">Commission</p>
                  </div>
                </div>
              </div>

              {/* Edit Fields */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Business Details</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Business Name</label>
                    <input value={editForm.businessName} onChange={e => patchField('businessName', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Contact Name</label>
                      <input value={editForm.contactName} onChange={e => patchField('contactName', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Type</label>
                      <select value={editForm.type} onChange={e => patchField('type', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                        {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Email</label>
                      <input type="email" value={editForm.email} onChange={e => patchField('email', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Phone</label>
                      <input value={editForm.phone} onChange={e => patchField('phone', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                  </div>
                  {editForm.email && editForm.phone && !isDirty && (
                    <div className="flex gap-3 text-xs">
                      <a href={`mailto:${editForm.email}`} className="flex items-center gap-1 text-sky-600"><Mail className="w-3 h-3" /> Email</a>
                      <a href={`tel:${editForm.phone}`} className="flex items-center gap-1 text-slate-600"><Phone className="w-3 h-3" /> Call</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Referral Settings */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Referral Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Commission Rate (%)</label>
                    <input type="number" min={0} max={100} step="0.5" value={editForm.commissionRate} onChange={e => patchField('commissionRate', parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Referral Code</label>
                    <input value={editForm.referralCode} onChange={e => patchField('referralCode', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 font-mono" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Status</p>
                <select value={editForm.status} onChange={e => patchField('status', e.target.value)}
                  className={`border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 ${statusColors[editForm.status] || ''}`}>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Save / Delete */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => updatePartner.mutate({
                    id: selectedPartner.id, businessName: editForm.businessName, contactName: editForm.contactName,
                    email: editForm.email, phone: editForm.phone || undefined, type: editForm.type as any,
                    commissionRate: editForm.commissionRate, referralCode: editForm.referralCode || undefined, status: editForm.status as any,
                  })}
                  disabled={!isDirty || updatePartner.isPending}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updatePartner.isPending ? 'Saving...' : updatePartner.isSuccess && !isDirty ? 'Saved' : 'Save Changes'}
                </button>
                <button
                  onClick={() => { if (confirm(`Delete partner "${selectedPartner.businessName}"?`)) deletePartner.mutate(selectedPartner.id); }}
                  className="border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
