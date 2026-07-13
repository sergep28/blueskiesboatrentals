import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Mail, CheckCircle2, XCircle, Send, Search, X, Loader2 } from 'lucide-react';

type Tab = 'sent' | 'settings';

// Every email type we send, in the order a customer would receive them.
const TYPE_LABELS: Record<string, string> = {
  booking_confirmation: 'Booking confirmation',
  waiver_packet: 'Waiver packet',
  pre_trip_reminder: 'Pre-trip reminder',
  review_request: 'Review request',
  deposit_alert: 'Deposit paid',
  deposit_settlement: 'Deposit settled',
  marketing: 'Agent / marketing',
  admin_notification: 'Admin alert',
  custom: 'Custom',
};

export default function AdminEmail() {
  const [tab, setTab] = useState<Tab>('sent');

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
        <Mail className="w-6 h-6" /> Email
      </h1>
      <p className="text-slate-500 text-sm mb-6">
        Every message that has gone out to a customer. You are BCC'd on all of them.
      </p>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        {([
          { key: 'sent', label: 'Sent mail' },
          { key: 'settings', label: 'Settings & test' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sent' ? <SentMail /> : <EmailSettings />}
    </div>
  );
}

function SentMail() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [openId, setOpenId] = useState<number | null>(null);

  const emails = trpc.system.sentEmails.useQuery({ search: search || undefined, type });
  const body = trpc.system.sentEmailBody.useQuery(
    { id: openId ?? 0 },
    { enabled: openId !== null },
  );

  const rows = emails.data ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer, email, subject, or booking ref…"
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {emails.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}

      {!emails.isLoading && rows.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-400">No emails match that.</p>
      )}

      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Sent</th>
              <th className="px-4 py-2.5 text-left font-medium">Customer</th>
              <th className="px-4 py-2.5 text-left font-medium">Type</th>
              <th className="px-4 py-2.5 text-left font-medium">Subject</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(e => (
              <tr
                key={e.id}
                onClick={() => setOpenId(e.id)}
                className="cursor-pointer border-t border-slate-100 hover:bg-sky-50"
              >
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                  {new Date(e.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  <span className="ml-1 text-slate-400">
                    {new Date(e.sentAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-800">{e.customerName ?? '—'}</div>
                  <div className="text-xs text-slate-500">{e.customerEmail}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                  {TYPE_LABELS[e.type] ?? e.type}
                  {e.bookingRef && <div className="text-xs text-slate-400">{e.bookingRef}</div>}
                </td>
                <td className="max-w-xs truncate px-4 py-2.5 text-slate-700">{e.subject}</td>
                <td className="px-4 py-2.5">
                  {e.status === 'sent' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      <CheckCircle2 className="w-3 h-3" /> Delivered
                    </span>
                  ) : (
                    <span
                      title={e.error ?? ''}
                      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                    >
                      <XCircle className="w-3 h-3" /> Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* The exact email the customer received */}
      {openId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6"
          onClick={() => setOpenId(null)}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">{body.data?.subject}</div>
                <div className="text-xs text-slate-500">
                  To {body.data?.customerEmail}
                  {body.data?.bookingRef ? ` · ${body.data.bookingRef}` : ''}
                </div>
              </div>
              <button onClick={() => setOpenId(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {body.isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            )}

            {body.data && (
              body.data.htmlBody ? (
                <iframe
                  title="Sent email"
                  srcDoc={body.data.htmlBody}
                  sandbox=""
                  className="h-[65vh] w-full rounded-b-2xl border-0"
                />
              ) : (
                <p className="p-6 text-sm text-slate-500">
                  This one was recorded before we started storing the full body.
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmailSettings() {
  const status = trpc.system.emailStatus.useQuery();
  const [to, setTo] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const sendTest = trpc.system.sendTestEmail.useMutation({
    onSuccess: (r) => setResult(r),
    onError: (e) => setResult({ ok: false, message: e.message }),
  });

  const configured = status.data?.configured;

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-3">Status</h2>
        {status.isLoading ? (
          <p className="text-slate-400 text-sm">Checking…</p>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {configured
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <XCircle className="w-5 h-5 text-red-500" />}
              <span className={configured ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                {configured ? 'Resend API key is connected' : 'Resend API key is NOT set (add RESEND_API_KEY in Render)'}
              </span>
            </div>
            <p className="text-slate-500">Sending from: <span className="font-mono text-slate-700">{status.data?.fromEmail}</span></p>
            <p className="text-slate-500">You are BCC'd at: <span className="font-mono text-slate-700">{status.data?.adminEmail}</span></p>
            <p className="text-slate-400 text-xs mt-2">Note: a connected key still needs your domain verified in Resend for email to deliver. The test below shows the real result.</p>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Send a test email</h2>
        <div className="flex gap-2">
          <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="you@example.com"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
          <button onClick={() => { setResult(null); sendTest.mutate({ to }); }}
            disabled={!to || sendTest.isPending}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
            <Send className="w-4 h-4" /> {sendTest.isPending ? 'Sending…' : 'Send test'}
          </button>
        </div>
        {result && (
          <div className={`mt-3 rounded-lg p-3 text-sm flex items-start gap-2 ${result.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
            {result.ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
