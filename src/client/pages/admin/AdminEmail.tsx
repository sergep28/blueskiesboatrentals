import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Mail, CheckCircle2, XCircle, Send } from 'lucide-react';

export default function AdminEmail() {
  const status = trpc.system.emailStatus.useQuery();
  const [to, setTo] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const sendTest = trpc.system.sendTestEmail.useMutation({
    onSuccess: (r) => setResult(r),
    onError: (e) => setResult({ ok: false, message: e.message }),
  });

  const configured = status.data?.configured;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2"><Mail className="w-6 h-6" /> Email</h1>
      <p className="text-slate-500 text-sm mb-6">Check whether your site can send email (Resend) and send yourself a test.</p>

      {/* Status */}
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
            <p className="text-slate-500">Admin notifications: <span className="font-mono text-slate-700">{status.data?.adminEmail}</span></p>
            <p className="text-slate-400 text-xs mt-2">Note: a connected key still needs your domain verified in Resend for email to deliver. The test below shows the real result.</p>
          </div>
        )}
      </div>

      {/* Test send */}
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
