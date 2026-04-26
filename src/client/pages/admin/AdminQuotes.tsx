import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Link2, Send, Check, Copy, MessageCircle } from 'lucide-react';

const durationLabels: Record<string, string> = {
  half_day_am: 'Half Day (AM)',
  full_day: 'Full Day',
  multi_day: 'Multi-Day',
  custom: 'Custom',
};

export default function AdminQuotes() {
  const { data: boats } = trpc.boats.list.useQuery();
  const { data: quotes, refetch } = trpc.quotes.list.useQuery();
  const createQuote = trpc.quotes.create.useMutation({ onSuccess: () => refetch() });

  const [form, setForm] = useState({
    boatId: 0,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    charterDate: '',
    endDate: '',
    duration: 'full_day',
    price: '',
    notes: '',
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!form.boatId || !form.charterDate || !form.price) return;
    const result = await createQuote.mutateAsync({
      boatId: form.boatId,
      customerName: form.customerName || undefined,
      customerPhone: form.customerPhone || undefined,
      customerEmail: form.customerEmail || undefined,
      charterDate: form.charterDate,
      endDate: form.endDate || undefined,
      duration: form.duration as any,
      price: Number(form.price),
      notes: form.notes || undefined,
    });
    const baseUrl = window.location.origin;
    setGeneratedLink(`${baseUrl}/book?quote=${result.code}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const textLink = () => {
    const msg = `Hi${form.customerName ? ` ${form.customerName.split(' ')[0]}` : ''}! Here's your booking link for Blue Skies: ${generatedLink}`;
    window.open(`sms:${form.customerPhone}&body=${encodeURIComponent(msg)}`);
  };

  const activeBoats = boats?.filter(b => b.status === 'active') ?? [];
  const pendingQuotes = quotes?.filter(q => q.status === 'pending') ?? [];
  const bookedQuotes = quotes?.filter(q => q.status === 'booked') ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Send Booking Link</h1>

      {/* Create Quote Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-sky-500" /> Create a Quote
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Boat *</label>
            <select
              value={form.boatId}
              onChange={e => setForm(f => ({ ...f, boatId: Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={0}>Select boat...</option>
              {activeBoats.map(b => <option key={b.id} value={b.id}>{b.name} — {b.model}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Duration *</label>
            <select
              value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="half_day_am">Half Day</option>
              <option value="full_day">Full Day</option>
              <option value="multi_day">Multi-Day</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Start Date *</label>
            <input
              type="date"
              value={form.charterDate}
              onChange={e => setForm(f => ({ ...f, charterDate: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">End Date (multi-day)</label>
            <input
              type="date"
              value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Agreed Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="900"
                className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Customer Name</label>
            <input
              value={form.customerName}
              onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
              placeholder="John Smith"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Customer Phone</label>
            <input
              value={form.customerPhone}
              onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
              placeholder="305-555-1234"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Customer Email</label>
            <input
              value={form.customerEmail}
              onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
              placeholder="john@email.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-slate-500 mb-1">Internal Notes</label>
          <input
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Negotiated discount, repeat customer..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={!form.boatId || !form.charterDate || !form.price || createQuote.isPending}
          className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
        >
          <Link2 className="w-4 h-4" />
          {createQuote.isPending ? 'Creating...' : 'Generate Booking Link'}
        </button>
      </div>

      {/* Generated Link */}
      {generatedLink && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
            <Check className="w-4 h-4" /> Booking Link Ready
          </h3>
          <div className="bg-white border border-emerald-200 rounded-lg px-4 py-3 mb-4 font-mono text-sm text-slate-700 break-all">
            {generatedLink}
          </div>
          <div className="flex gap-3">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              {copied ? <><Check className="w-4 h-4 text-green-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
            </button>
            {form.customerPhone && (
              <button
                onClick={textLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-green-500 hover:bg-green-600 text-white"
              >
                <MessageCircle className="w-4 h-4" /> Text to Customer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pending Quotes */}
      {pendingQuotes.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-slate-900 mb-3">Pending Quotes ({pendingQuotes.length})</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {pendingQuotes.map(q => {
              const boat = boats?.find(b => b.id === q.boatId);
              const link = `${window.location.origin}/book?quote=${q.code}`;
              return (
                <div key={q.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {q.customerName || 'Unknown'} — {boat?.name ?? `Boat #${q.boatId}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {q.charterDate} · {durationLabels[q.duration] ?? q.duration} · ${q.price}
                      {q.notes && <span className="text-slate-400"> · {q.notes}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-sky-600 bg-sky-50 px-2 py-1 rounded">{q.code}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(link); }}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50"
                      title="Copy link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {q.customerPhone && (
                      <a
                        href={`sms:${q.customerPhone}&body=${encodeURIComponent(`Hi${q.customerName ? ` ${q.customerName.split(' ')[0]}` : ''}! Here's your booking link: ${link}`)}`}
                        className="text-green-500 hover:text-green-600 p-1.5 rounded-lg hover:bg-green-50"
                        title="Text link"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booked Quotes */}
      {bookedQuotes.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-500 mb-3">Completed ({bookedQuotes.length})</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 opacity-60">
            {bookedQuotes.slice(0, 10).map(q => {
              const boat = boats?.find(b => b.id === q.boatId);
              return (
                <div key={q.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">
                      {q.customerName || 'Unknown'} — {boat?.name ?? `Boat #${q.boatId}`}
                    </p>
                    <p className="text-xs text-slate-400">{q.charterDate} · ${q.price}</p>
                  </div>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">Booked</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
