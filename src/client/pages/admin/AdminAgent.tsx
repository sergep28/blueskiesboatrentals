import { useState, useRef, useEffect } from 'react';
import { trpc } from '../../lib/trpc';
import { Bot, Send, Sparkles, Check, X, Pencil, MessageSquare, FileImage, Loader2, Trash2 } from 'lucide-react';

type Tab = 'chat' | 'content';

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

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('chat')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'chat' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <MessageSquare className="w-4 h-4 inline mr-1.5 -mt-0.5" />Chat
        </button>
        <button
          onClick={() => setTab('content')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'content' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileImage className="w-4 h-4 inline mr-1.5 -mt-0.5" />Content
        </button>
      </div>

      {tab === 'chat' && <ChatPanel />}
      {tab === 'content' && <ContentPanel />}
    </div>
  );
}

function ChatPanel() {
  const [input, setInput] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const history = trpc.agent.chatHistory.useQuery(undefined, { refetchInterval: false });
  const chatMut = trpc.agent.chat.useMutation({
    onSuccess: () => {
      history.refetch();
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
