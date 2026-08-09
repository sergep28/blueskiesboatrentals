import { useState, useRef, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { Bot, Send, Sparkles, Check, X, Pencil, Eye, MessageSquare, FileImage, Loader2, Trash2, FileText, AlertTriangle, Info, CheckCircle, Globe, Search, TrendingUp, TrendingDown, FolderOpen } from 'lucide-react';

type Tab = 'chat' | 'content' | 'blog' | 'seo';

export default function AdminAgent() {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">AI Agent</h1>
          <p className="text-sm text-slate-500">Chat, content creation, and marketing automation</p>
        </div>
      </div>

      {/* Health alerts */}
      <HealthAlerts />

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        {([
          { key: 'chat', label: 'Chat', icon: MessageSquare },
          { key: 'content', label: 'Social', icon: FileImage },
          { key: 'blog', label: 'Blog', icon: FileText },
          { key: 'seo', label: 'SEO', icon: Search },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <t.icon className="w-4 h-4 inline mr-1.5 -mt-0.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'chat' && <ChatPanel />}
      {tab === 'content' && <ContentPanel />}
      {tab === 'blog' && <BlogPanel />}
      {tab === 'seo' && <SeoPanel />}
    </div>
  );
}

function ChatPanel() {
  const [input, setInput] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const history = trpc.agent.chatHistory.useQuery(undefined, { refetchInterval: false });
  const pending = trpc.agent.pendingActions.useQuery();
  const chatMut = trpc.agent.chat.useMutation({
    onSuccess: () => {
      history.refetch();
      pending.refetch();
      setInput('');
    },
  });
  const clearMut = trpc.agent.clearChat.useMutation({
    onSuccess: () => history.refetch(),
  });

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.data, chatMut.isPending]);

  const send = () => {
    const msg = input.trim();
    if (!msg || chatMut.isPending) return;
    chatMut.mutate({ message: msg });
  };

  const messages = history.data || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col" style={{ height: 'calc(100vh - 240px)', minHeight: '500px' }}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-slate-700">Blue Skies Agent</span>
        </div>
        <button
          onClick={() => { if (confirm('Clear all chat history?')) clearMut.mutate(); }}
          className="text-slate-400 hover:text-red-500 p-1"
          title="Clear history"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-12">
            <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Ask me anything about your business</p>
            <div className="mt-4 space-y-2">
              {[
                'How are bookings looking this week?',
                'Generate social media posts for today',
                'Which customers should I follow up with?',
                'What\'s my revenue this month?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="block mx-auto text-sm text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-lg transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              m.role === 'user'
                ? 'bg-sky-500 text-white rounded-br-md'
                : 'bg-slate-100 text-slate-800 rounded-bl-md'
            }`}>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          </div>
        ))}

        {chatMut.isPending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          </div>
        )}

        {(pending.data ?? []).map(action => (
          <ApprovalCard
            key={action.id}
            action={action}
            onResolved={() => { pending.refetch(); history.refetch(); }}
          />
        ))}

        <div ref={chatEnd} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about bookings, revenue, marketing..."
            rows={1}
            className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <button
            onClick={send}
            disabled={chatMut.isPending || !input.trim()}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 text-white disabled:text-slate-400 p-3 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// The approval gate, as the user sees it. The agent has staged an outward-facing
// action but has NOT performed it — nothing reaches a customer until Approve is
// clicked here.
type AgentAction = {
  id: number;
  kind: 'send_email' | 'deposit_link';
  status: 'pending' | 'executing' | 'approved' | 'rejected' | 'failed';
  summary: string;
  payload: string;
  result: string | null;
  bookingRef: string | null;
};

function ApprovalCard({ action, onResolved }: { action: AgentAction; onResolved: () => void }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const approveMut = trpc.agent.approveAction.useMutation({ onSettled: onResolved });
  const retryMut = trpc.agent.retryAction.useMutation({ onSettled: onResolved });
  const rejectMut = trpc.agent.rejectAction.useMutation({ onSuccess: onResolved });
  const dismissMut = trpc.agent.dismissAction.useMutation({ onSuccess: onResolved });
  const editMut = trpc.agent.updateAction.useMutation({
    onSuccess: () => { setEditing(false); onResolved(); },
  });

  const preview = trpc.agent.previewEmail.useQuery(
    { actionId: action.id },
    { enabled: previewing },
  );

  const payload = JSON.parse(action.payload) as Record<string, string | number | boolean>;
  const [draft, setDraft] = useState({
    to: String(payload.to ?? ''),
    subject: String(payload.subject ?? ''),
    body: String(payload.body ?? ''),
  });
  const result = action.result
    ? (JSON.parse(action.result) as { checkoutUrl?: string; sent_to?: string; error?: string; emailError?: string })
    : null;
  const busy = approveMut.isPending || rejectMut.isPending || retryMut.isPending;

  // SUCCEEDED — stays on screen until dismissed, so the Stripe URL can actually
  // be copied. (It used to vanish the instant it was created.)
  if (action.status === 'approved') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800">
            <Check className="w-4 h-4" />
            {result?.sent_to ? `Email sent to ${result.sent_to}` : 'Deposit link created'}
          </div>
          <button
            onClick={() => dismissMut.mutate({ actionId: action.id })}
            className="text-xs font-medium text-green-700 hover:text-green-900"
          >
            Done
          </button>
        </div>

        {result?.checkoutUrl && (
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-xs text-slate-600 border border-green-200">
              {result.checkoutUrl}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.checkoutUrl!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              {copied ? 'Copied' : 'Copy to text'}
            </button>
          </div>
        )}

        {result?.emailError && (
          <div className="mt-2 text-xs text-amber-700">
            The link is valid, but emailing it failed ({result.emailError}). Copy it above and text it instead.
          </div>
        )}
      </div>
    );
  }

  // FAILED — nothing was delivered, so the draft is preserved and retryable.
  if (action.status === 'failed') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-red-800">
          <AlertTriangle className="w-4 h-4" />
          Not sent — it failed
        </div>
        <div className="mt-1 text-sm text-slate-700">{action.summary}</div>
        <div className="mt-1 text-xs text-red-600">{result?.error}</div>
        <div className="mt-3 flex gap-2">
          <button
            disabled={busy}
            onClick={() => retryMut.mutate({ actionId: action.id })}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {retryMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Retry
          </button>
          <button
            disabled={busy}
            onClick={() => rejectMut.mutate({ actionId: action.id })}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  const error = approveMut.error?.message ?? retryMut.error?.message ?? editMut.error?.message ?? null;

  // EDITING — change recipient/subject/body before it goes anywhere.
  if (editing) {
    return (
      <div className="rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-sky-800">Editing draft</div>
        <div className="mt-2 space-y-2">
          <input
            value={draft.to}
            onChange={e => setDraft({ ...draft, to: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="To"
          />
          <input
            value={draft.subject}
            onChange={e => setDraft({ ...draft, subject: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Subject"
          />
          <textarea
            value={draft.body}
            onChange={e => setDraft({ ...draft, body: e.target.value })}
            rows={12}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
          />
          <p className="text-xs text-slate-500">
            Use <code className="rounded bg-white px-1">{'{{DEPOSIT_LINK}}'}</code> and{' '}
            <code className="rounded bg-white px-1">{'{{WAIVER_LINK}}'}</code> for links — they become real
            buttons when you approve. Pasting a raw Stripe URL will be rejected.
          </p>
        </div>

        {error && <div className="mt-2 text-xs font-medium text-red-600">{error}</div>}

        <div className="mt-3 flex gap-2">
          <button
            disabled={editMut.isPending}
            onClick={() => editMut.mutate({ actionId: action.id, ...draft })}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {editMut.isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
        <AlertTriangle className="w-4 h-4" />
        Needs your approval — nothing has been sent
      </div>

      <div className="mt-2 text-sm font-medium text-slate-800">{action.summary}</div>

      <div className="mt-3 space-y-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-xs text-slate-700">
        {action.kind === 'send_email' ? (
          <>
            <div><span className="text-slate-500">To:</span> {payload.to as string}</div>
            <div><span className="text-slate-500">Subject:</span> {payload.subject as string}</div>
            <div className="whitespace-pre-wrap border-t border-slate-100 pt-2 leading-relaxed">
              {payload.body as string}
            </div>
          </>
        ) : (
          <>
            <div><span className="text-slate-500">Customer:</span> {payload.customerName as string}</div>
            <div><span className="text-slate-500">Booking:</span> {action.bookingRef}</div>
            <div><span className="text-slate-500">Amount:</span> ${Number(payload.amount).toLocaleString()} refundable deposit</div>
            <div className="text-slate-500">
              {payload.alsoEmail
                ? `On approval: Stripe link created and emailed to ${payload.customerEmail}.`
                : 'On approval: Stripe link created for you to text. No email sent.'}
            </div>
          </>
        )}
      </div>

      {error && <div className="mt-2 text-xs font-medium text-red-600">{error}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => approveMut.mutate({ actionId: action.id })}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {approveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {action.kind === 'send_email' ? 'Approve & send' : 'Approve & create link'}
        </button>

        {action.kind === 'send_email' && (
          <>
            <button
              disabled={busy}
              onClick={() => setPreviewing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button
              disabled={busy}
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
          </>
        )}

        <button
          disabled={busy}
          onClick={() => rejectMut.mutate({ actionId: action.id })}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Discard
        </button>
      </div>

      {/* Preview — the exact branded email the customer will receive. */}
      {previewing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6"
          onClick={() => setPreviewing(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Email preview</div>
                <div className="text-xs text-slate-500">
                  To {preview.data?.to} — nothing has been sent
                </div>
              </div>
              <button onClick={() => setPreviewing(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {preview.isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            )}

            {preview.data && (
              <iframe
                title="Email preview"
                srcDoc={preview.data.html}
                sandbox=""
                className="h-[65vh] w-full rounded-b-2xl border-0"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ContentPanel() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'posted'>('pending');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const postsQuery = trpc.agent.listPosts.useQuery({ status });
  const generateMut = trpc.agent.generatePosts.useMutation({
    onSuccess: () => postsQuery.refetch(),
  });
  const approveMut = trpc.agent.approvePost.useMutation({
    onSuccess: () => postsQuery.refetch(),
  });
  const rejectMut = trpc.agent.rejectPost.useMutation({
    onSuccess: () => postsQuery.refetch(),
  });
  const editMut = trpc.agent.editPost.useMutation({
    onSuccess: () => { postsQuery.refetch(); setEditingId(null); },
  });

  const posts = postsQuery.data || [];

  const platformLabel: Record<string, string> = {
    instagram: 'Instagram', facebook: 'Facebook', google_business: 'Google Business',
  };
  const platformColor: Record<string, string> = {
    instagram: 'bg-pink-100 text-pink-700', facebook: 'bg-blue-100 text-blue-700', google_business: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['pending', 'approved', 'posted'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${status === s ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => generateMut.mutate({})}
          disabled={generateMut.isPending}
          className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          {generateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generateMut.isPending ? 'Generating...' : 'Generate Posts'}
        </button>
      </div>

      {posts.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <FileImage className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No {status} posts</p>
          {status === 'pending' && <p className="text-sm mt-1">Click "Generate Posts" to create today's content</p>}
        </div>
      )}

      <div className="space-y-4">
        {posts.map(p => (
          <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Post header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-50">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">BS</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {p.platform === 'instagram' ? '@blueskiescharter' : 'Blue Skies Boat Rentals'}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${platformColor[p.platform] || 'bg-slate-100 text-slate-600'}`}>
                  {platformLabel[p.platform] || p.platform}
                </span>
              </div>
              <span className="text-xs text-slate-400 capitalize">{p.theme.replace('_', ' ')}</span>
            </div>

            {/* Photo */}
            {p.photoFileId ? (
              <img
                src={`/api/drive-photo/${p.photoFileId}`}
                alt={p.photoName || 'Post photo'}
                className="w-full max-h-[500px] object-cover bg-slate-100"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <FileImage className="w-10 h-10 text-slate-300" />
              </div>
            )}

            {/* Post content */}
            <div className="px-5 py-4">
              {editingId === p.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={6}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => editMut.mutate({ id: p.id, content: editContent })} className="bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
                    <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{p.content}</p>
              )}
              {p.hashtags && <p className="text-sm text-sky-600 mt-3 leading-relaxed">{p.hashtags}</p>}
              {p.imageSuggestion && (
                <p className="text-xs text-slate-400 mt-3 italic bg-slate-50 px-3 py-2 rounded-lg">
                  Photo idea: {p.imageSuggestion}
                </p>
              )}
              {p.scheduledFor && (
                <p className="text-xs text-slate-400 mt-2">Approved: {new Date(p.scheduledFor).toLocaleDateString()}</p>
              )}
              {p.postedAt && (
                <p className="text-xs text-green-600 mt-2">Posted: {new Date(p.postedAt).toLocaleDateString()}</p>
              )}
            </div>

            {/* Actions */}
            {status === 'pending' && editingId !== p.id && (
              <div className="flex border-t border-slate-100">
                <button
                  onClick={() => approveMut.mutate({ id: p.id })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => { setEditingId(p.id); setEditContent(p.content); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors border-x border-slate-100"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Reason (optional):');
                    rejectMut.mutate({ id: p.id, reason: reason || undefined });
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthAlerts() {
  const alerts = trpc.agent.healthCheck.useQuery(undefined, { refetchInterval: 60000 });
  if (!alerts.data?.length) return null;

  const iconMap = {
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
    success: <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />,
  };
  const bgMap = {
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
  };

  // Only show warnings and important info by default
  const important = alerts.data.filter(a => a.type === 'warning' || a.type === 'info');
  if (!important.length) return null;

  return (
    <div className="mb-6 space-y-2">
      {important.map((a, i) => (
        <div key={i} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${bgMap[a.type]}`}>
          {iconMap[a.type]}
          <p className="text-sm text-slate-700">{a.message}</p>
        </div>
      ))}
    </div>
  );
}

function BlogPanel() {
  const [topic, setTopic] = useState('');
  const drafts = trpc.agent.listBlogDrafts.useQuery();
  const generateMut = trpc.agent.generateBlog.useMutation({
    onSuccess: () => { drafts.refetch(); setTopic(''); },
  });
  const publishMut = trpc.agent.publishBlog.useMutation({
    onSuccess: () => drafts.refetch(),
  });

  const blogDrafts = drafts.data || [];

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Generate Blog Post</h3>
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Topic (optional — agent will pick an SEO-friendly topic)"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            onKeyDown={e => { if (e.key === 'Enter') generateMut.mutate({ topic: topic || undefined }); }}
          />
          <button
            onClick={() => generateMut.mutate({ topic: topic || undefined })}
            disabled={generateMut.isPending}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap"
          >
            {generateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generateMut.isPending ? 'Writing...' : 'Generate'}
          </button>
        </div>
      </div>

      {blogDrafts.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No blog drafts</p>
          <p className="text-sm mt-1">Generate a post or give a topic above</p>
        </div>
      )}

      <div className="space-y-4">
        {blogDrafts.map(post => (
          <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{post.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{post.excerpt}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{post.category}</span>
                    <span className="text-xs bg-sky-50 text-sky-600 px-2 py-1 rounded-full">/{post.slug}</span>
                    <span className="text-xs text-slate-400">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              </div>

              {/* Content preview */}
              <details className="mt-3">
                <summary className="text-sm text-sky-600 cursor-pointer hover:text-sky-700">Preview content</summary>
                <div
                  className="mt-3 prose prose-sm max-w-none border border-slate-100 rounded-xl p-4 max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: post.content || '' }}
                />
              </details>
            </div>

            {/* Cover image preview */}
            {post.coverImage && (
              <div className="px-5 pb-2">
                <img
                  src={post.coverImage}
                  alt="Cover"
                  className="w-full h-48 object-cover rounded-xl border border-slate-100"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex border-t border-slate-100">
              <button
                onClick={() => publishMut.mutate({ id: post.id })}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors"
              >
                <Globe className="w-4 h-4" /> Publish
              </button>
              <a
                href={`/admin/blog?edit=${post.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors border-l border-slate-100"
              >
                <Pencil className="w-4 h-4" /> Edit in Blog Manager
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeoPanel() {
  const seoData = trpc.agent.seoData.useQuery();
  const refreshMut = trpc.agent.seoRefresh.useMutation({
    onSuccess: () => seoData.refetch(),
  });
  const organizeMut = trpc.agent.organizePhotos.useMutation();

  const { queries = [], alerts = [], lastUpdated } = seoData.data || {};

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Search Console Rankings</h3>
          {lastUpdated && <p className="text-xs text-slate-400">Last updated: {lastUpdated}</p>}
          {!lastUpdated && <p className="text-xs text-slate-400">No data yet — click refresh to pull from Search Console</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => organizeMut.mutate()}
            disabled={organizeMut.isPending}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
          >
            {organizeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
            {organizeMut.isPending ? 'Organizing...' : 'Organize Photos'}
          </button>
          <button
            onClick={() => refreshMut.mutate()}
            disabled={refreshMut.isPending}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
          >
            {refreshMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {refreshMut.isPending ? 'Fetching...' : 'Refresh SEO Data'}
          </button>
        </div>
      </div>

      {refreshMut.isSuccess && (
        <div className={`${refreshMut.data?.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'} border rounded-xl px-4 py-3 mb-4 text-sm`}>
          {refreshMut.data?.error
            ? `SEO fetch error: ${refreshMut.data.error}`
            : `Fetched ${refreshMut.data?.queries || 0} queries, ${refreshMut.data?.alerts || 0} alerts`}
        </div>
      )}

      {organizeMut.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
          Photos organized! {organizeMut.data && 'error' in organizeMut.data
            ? organizeMut.data.error
            : `${(organizeMut.data as any)?.organized || 0} photos sorted into ${(organizeMut.data as any)?.folders?.length || 0} folders`}
        </div>
      )}

      {/* SEO Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Ranking Changes</h4>
          <div className="space-y-2">
            {alerts.map((a: any) => (
              <div key={a.id} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${
                a.type === 'rank_up' || a.type === 'new_query' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                {a.type === 'rank_up' || a.type === 'new_query'
                  ? <TrendingUp className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  : <TrendingDown className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                <p className="text-sm text-slate-700">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Queries */}
      {queries.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700">Top Search Queries</h4>
          </div>
          <div className="divide-y divide-slate-50">
            <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-medium text-slate-400 uppercase">
              <span className="col-span-5">Query</span>
              <span className="col-span-2 text-right">Clicks</span>
              <span className="col-span-2 text-right">Impressions</span>
              <span className="col-span-1 text-right">CTR</span>
              <span className="col-span-2 text-right">Position</span>
            </div>
            {queries.slice(0, 30).map((q: any) => (
              <div key={q.id} className="grid grid-cols-12 gap-2 px-5 py-2.5 text-sm hover:bg-slate-50">
                <span className="col-span-5 text-slate-800 truncate" title={q.query}>{q.query}</span>
                <span className="col-span-2 text-right font-medium text-slate-900">{q.clicks}</span>
                <span className="col-span-2 text-right text-slate-500">{q.impressions}</span>
                <span className="col-span-1 text-right text-slate-500">{(q.ctr * 100).toFixed(1)}%</span>
                <span className={`col-span-2 text-right font-medium ${q.position <= 10 ? 'text-green-600' : q.position <= 20 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {q.position.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No SEO data yet</p>
          <p className="text-sm mt-1">Click "Refresh SEO Data" to pull rankings from Google Search Console</p>
        </div>
      )}
    </div>
  );
}
