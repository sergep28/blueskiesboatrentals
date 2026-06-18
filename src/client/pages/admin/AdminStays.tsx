import { trpc } from '../../lib/trpc';
import { useState } from 'react';
import { Home, MapPin, Edit2, X, Save, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  hidden: 'bg-slate-100 text-slate-500',
};

// JSON array string <-> newline-separated text helpers (for the textareas)
function jsonToLines(json: string | null | undefined): string {
  if (!json) return '';
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.join('\n') : '';
  } catch {
    return '';
  }
}
function linesToJson(text: string): string {
  return JSON.stringify(text.split('\n').map(s => s.trim()).filter(Boolean));
}

const emptyForm = {
  name: '', slug: '', host: '', location: 'Key Colony Beach', type: 'Waterfront Home',
  guests: 2, bedrooms: 1, bathrooms: 1, rating: '', reviews: 0,
  description: '', highlightsText: '', pricePerNight: 0, cleaningFee: 150,
  imageUrl: '', galleryText: '', status: 'active' as 'active' | 'hidden', sortOrder: 0,
};

export default function AdminStays() {
  const { data: properties, refetch } = trpc.properties.list.useQuery();
  const updateProperty = trpc.properties.update.useMutation({ onSuccess: () => { refetch(); setEditingId(null); } });
  const createProperty = trpc.properties.create.useMutation({ onSuccess: () => { refetch(); setShowAdd(false); setAddForm(emptyForm); } });
  const deleteProperty = trpc.properties.delete.useMutation({ onSuccess: () => refetch() });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editForm, setEditForm] = useState<typeof emptyForm>(emptyForm);
  const [addForm, setAddForm] = useState<typeof emptyForm>(emptyForm);

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name, slug: p.slug, host: p.host ?? '', location: p.location, type: p.type,
      guests: p.guests, bedrooms: p.bedrooms, bathrooms: p.bathrooms ?? 1,
      rating: p.rating != null ? String(p.rating) : '', reviews: p.reviews,
      description: p.description ?? '', highlightsText: jsonToLines(p.highlights),
      pricePerNight: p.pricePerNight, cleaningFee: p.cleaningFee,
      imageUrl: p.imageUrl ?? '', galleryText: jsonToLines(p.galleryImages),
      status: p.status, sortOrder: p.sortOrder,
    });
  };

  const buildPayload = (f: typeof emptyForm) => ({
    name: f.name, slug: f.slug, host: f.host || undefined, location: f.location, type: f.type,
    guests: Number(f.guests), bedrooms: Number(f.bedrooms), bathrooms: Number(f.bathrooms),
    rating: f.rating === '' ? null : Number(f.rating), reviews: Number(f.reviews),
    description: f.description, highlights: linesToJson(f.highlightsText),
    pricePerNight: Number(f.pricePerNight), cleaningFee: Number(f.cleaningFee),
    imageUrl: f.imageUrl, galleryImages: linesToJson(f.galleryText),
    status: f.status, sortOrder: Number(f.sortOrder),
  });

  const saveEdit = () => {
    if (!editingId) return;
    updateProperty.mutate({ id: editingId, ...buildPayload(editForm) });
  };

  // Plain function (not a component) so inputs don't remount/lose focus each keystroke.
  const renderForm = (form: typeof emptyForm, set: (f: typeof emptyForm) => void) => (
    <div className="px-6 py-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name *</label>
          <input value={form.name} onChange={e => set({ ...form, name: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Slug * (url: /stays/slug)</label>
          <input value={form.slug} onChange={e => set({ ...form, slug: e.target.value })} placeholder="irish-pirate"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Location</label>
          <input value={form.location} onChange={e => set({ ...form, location: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Type</label>
          <input value={form.type} onChange={e => set({ ...form, type: e.target.value })} placeholder="Waterfront Home"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Guests</label>
          <input type="number" value={form.guests || ''} onChange={e => set({ ...form, guests: Number(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Bedrooms</label>
          <input type="number" value={form.bedrooms || ''} onChange={e => set({ ...form, bedrooms: Number(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Bathrooms</label>
          <input type="number" step="0.5" value={form.bathrooms || ''} onChange={e => set({ ...form, bathrooms: Number(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-sky-700 font-medium mb-1">Price / night ($) — 0 shows "Contact for pricing"</label>
          <input type="number" value={form.pricePerNight || ''} onChange={e => set({ ...form, pricePerNight: Number(e.target.value) })}
            className="w-full border border-sky-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Cleaning fee ($)</label>
          <input type="number" value={form.cleaningFee || ''} onChange={e => set({ ...form, cleaningFee: Number(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Rating (blank = hide)</label>
          <input type="number" step="0.1" value={form.rating} onChange={e => set({ ...form, rating: e.target.value })} placeholder="—"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Reviews #</label>
          <input type="number" value={form.reviews || ''} onChange={e => set({ ...form, reviews: Number(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Sort order</label>
          <input type="number" value={form.sortOrder} onChange={e => set({ ...form, sortOrder: Number(e.target.value) })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Host</label>
          <input value={form.host} onChange={e => set({ ...form, host: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Status</label>
          <select value={form.status} onChange={e => set({ ...form, status: e.target.value as 'active' | 'hidden' })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="active">Active (visible)</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Hero / card image URL</label>
        <input value={form.imageUrl} onChange={e => set({ ...form, imageUrl: e.target.value })} placeholder="/homes/irish-pirate-aerial.jpg"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Gallery images — one URL per line</label>
        <textarea value={form.galleryText} onChange={e => set({ ...form, galleryText: e.target.value })} rows={4}
          placeholder={'/homes/irish-pirate-aerial.jpg\n/homes/irish-pirate-pool.jpg'}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-sky-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Highlights — one per line</label>
        <textarea value={form.highlightsText} onChange={e => set({ ...form, highlightsText: e.target.value })} rows={4}
          placeholder={'Private heated pool\nCanal-front with dock'}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Description</label>
        <textarea value={form.description} onChange={e => set({ ...form, description: e.target.value })} rows={4}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-normal text-slate-900">Stays Management</h1>
          <p className="text-slate-500 text-sm mt-1">Edit pricing, photos, and details for the Where to Stay listings.</p>
        </div>
        <button
          onClick={() => { setAddForm(emptyForm); setShowAdd(true); }}
          className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </div>

      <div className="space-y-4">
        {properties?.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <img src={p.imageUrl ?? ''} alt={p.name} className="w-full md:w-56 h-40 object-cover flex-shrink-0" />
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-xl text-slate-900">{p.name}</h3>
                    <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
                      <MapPin className="w-3 h-3" /> {p.location} · {p.type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[p.status]}`}>{p.status}</span>
                    <button onClick={() => startEdit(p)} className="text-slate-400 hover:text-sky-600 p-1"><Edit2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900">{p.pricePerNight > 0 ? `$${p.pricePerNight}` : '—'}</p>
                    <p className="text-xs text-slate-400">/ night</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900">{p.bedrooms}</p>
                    <p className="text-xs text-slate-400">Bedrooms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900">{p.guests}</p>
                    <p className="text-xs text-slate-400">Guests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900">{p.rating ?? '—'}</p>
                    <p className="text-xs text-slate-400">Rating</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => updateProperty.mutate({ id: p.id, status: p.status === 'active' ? 'hidden' : 'active' })}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    {p.status === 'active' ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Show</>}
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${p.name}"? This cannot be undone.`)) deleteProperty.mutate(p.id); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {properties?.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center text-slate-400">
            <Home className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No properties yet. Click "Add Property" to create one.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditingId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-slate-900">Edit Property</h3>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {renderForm(editForm, setEditForm)}
            <div className="sticky bottom-0 bg-white flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={saveEdit} disabled={updateProperty.isPending}
                className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Save className="w-4 h-4" /> {updateProperty.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-slate-900">Add Property</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {renderForm(addForm, setAddForm)}
            <div className="sticky bottom-0 bg-white flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button
                onClick={() => createProperty.mutate(buildPayload(addForm))}
                disabled={!addForm.name || !addForm.slug || createProperty.isPending}
                className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> {createProperty.isPending ? 'Adding…' : 'Add Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
