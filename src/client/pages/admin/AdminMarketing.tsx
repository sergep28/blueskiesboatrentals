import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Mail, Check, Users, Send, X, AlertCircle, Sparkles, Eye } from 'lucide-react';

const templates = [
  {
    key: 'custom',
    label: 'Custom Message',
    subject: '',
    message: '',
  },
  {
    key: 'summer_promo',
    label: 'Summer Promo',
    subject: 'Summer on the Water Starts Now ☀️',
    message: `Summer is officially here and the water is calling!\n\nWhether you want to cruise the sandbars, chase mahi offshore, or just float with your crew — we've got you covered.\n\nBook this week and mention this email for a complimentary cooler setup (ice, cups, and bottled water on us).\n\nSlots are filling up fast — the Keys don't wait.`,
  },
  {
    key: 'repeat_customer',
    label: 'Welcome Back',
    subject: 'We Saved Your Spot on the Water 🚤',
    message: `It's been a minute since your last trip with us and we miss having you out there!\n\nThe water has been incredible lately — calm seas, warm temps, and the fishing has been on fire.\n\nAs a past guest, you're part of the Blue Skies family. Book your next trip and we'll make sure it's even better than the last one.\n\nText us anytime to lock in your date — we'll work with your schedule.`,
  },
  {
    key: 'fishing_season',
    label: 'Fishing Season',
    subject: 'The Bite Is On — Mahi, Tuna & More 🎣',
    message: `If you've been waiting for the right time to get out on the water, this is it.\n\nThe mahi run is in full swing, tuna are showing up offshore, and the reef fishing has been nonstop action. Our captains are putting people on fish every single day.\n\nWhether you're a seasoned angler or bringing the family for their first deep-sea trip, we'll put together the perfect charter for you.\n\nDon't sleep on this — peak season books up fast.`,
  },
  {
    key: 'holiday',
    label: 'Holiday / Long Weekend',
    subject: 'Make This Weekend One to Remember 🌊',
    message: `Long weekend coming up? There's no better way to spend it than out on the water in the Florida Keys.\n\nPicture this: cruising through the mangroves, anchoring at a sandbar with crystal clear water, cold drinks in hand, zero cell service, zero stress.\n\nWe still have a few spots open this weekend — but they won't last. Grab yours before someone else does.`,
  },
  {
    key: 'review_followup',
    label: 'Review Request',
    subject: 'Quick Favor? It Takes 30 Seconds ⭐',
    message: `We hope you had an amazing time on the water with us!\n\nIf you did, we'd really appreciate a quick Google review. It takes about 30 seconds and helps other families find us when they're planning their Keys trip.\n\nAs a thank-you, leave a review and reply to this email — we'll add bonus loyalty points to your account.\n\nhttps://www.google.com/maps/place/Blue+Skies+Charter+Florida+Keys/?hl=en`,
  },
  {
    key: 'loyalty_reminder',
    label: 'Loyalty Points Reminder',
    subject: 'You Have Points Waiting for You 🏆',
    message: `Did you know you have loyalty points saved up with us?\n\nEvery dollar you spend earns points toward discounts on your next trip. The more you ride, the more you save.\n\nCheck your balance and see what rewards you've unlocked — you might be closer to your next discount than you think.\n\nBook your next trip and put those points to work!`,
  },
];

const heroImages: Record<string, string> = {
  summer_promo: '/freedom-aerial.jpg',
  repeat_customer: '/hero-keys-view.jpg',
  fishing_season: '/catch-mahi.jpg',
  holiday: '/boat-sunset.jpeg',
  review_followup: '/drone-boats.jpeg',
  loyalty_reminder: '/freedom-running.jpg',
  custom: '/hero-keys-view.jpg',
};

const taglines: Record<string, string> = {
  summer_promo: 'Your Keys Adventure Awaits',
  repeat_customer: 'Welcome Back to Paradise',
  fishing_season: 'Tight Lines & Blue Water',
  holiday: 'Make It a Weekend to Remember',
  review_followup: 'Thanks for Riding With Us',
  loyalty_reminder: 'You Have Rewards Waiting',
  custom: 'Life Is Better on the Water',
};

function EmailPreview({ subject, message, template, name }: { subject: string; message: string; template: string; name: string }) {
  const firstName = name.split(' ')[0] || 'Friend';
  const heroImage = heroImages[template] || heroImages.custom;
  const tagline = taglines[template] || taglines.custom;
  const bodyHtml = message.replace(/\n/g, '<br>');

  return (
    <div style={{ background: '#f0f4f8', padding: 16, borderRadius: 12, maxHeight: '70vh', overflowY: 'auto' }}>
      <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: '0 0 8px', letterSpacing: 1 }}>PREVIEW</p>
      <div style={{ maxWidth: 400, margin: '0 auto', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        {/* Header */}
        <div style={{ background: '#0c4a6e', padding: '18px 20px', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 300, letterSpacing: 3 }}>BLUE SKIES</div>
          <div style={{ width: 30, height: 2, background: '#f59e0b', margin: '5px auto' }} />
          <div style={{ color: '#bae6fd', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase' as const }}>Boat Rentals</div>
        </div>

        {/* Hero */}
        <img src={heroImage} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />

        {/* Tagline */}
        <div style={{ background: '#0c4a6e', padding: '10px 16px', textAlign: 'center' }}>
          <div style={{ color: '#f59e0b', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as const, fontWeight: 600 }}>{tagline}</div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 12px' }}>
          <p style={{ fontSize: 14, fontWeight: 300, margin: '0 0 12px', color: '#0f172a' }}>Hey {firstName},</p>
          {message ? (
            <div style={{ fontSize: 11, lineHeight: 1.8, color: '#334155' }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          ) : (
            <p style={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>Your message will appear here...</p>
          )}
        </div>

        {/* Divider */}
        <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 12, letterSpacing: 8 }}>~ ~ ~</div>

        {/* CTA */}
        <div style={{ padding: '12px 20px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#f59e0b', color: '#0c4a6e', fontSize: 10, fontWeight: 800, padding: '10px 28px', borderRadius: 4, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
            Book Your Next Trip →
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#0c4a6e', padding: '18px 16px', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 11, fontWeight: 300, letterSpacing: 2 }}>BLUE SKIES</div>
          <div style={{ color: '#f59e0b', fontSize: 7, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' as const, margin: '2px 0 8px' }}>Boat Rentals</div>
          <div style={{ color: '#bae6fd', fontSize: 9 }}>Islamorada, Florida Keys</div>
          <div style={{ color: '#fff', fontSize: 10, fontWeight: 600, marginTop: 6 }}>(754) 254-2293</div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <span style={{ color: '#7dd3fc', fontSize: 9, margin: '0 6px' }}>Instagram</span>
            <span style={{ color: '#7dd3fc', fontSize: 9, margin: '0 6px' }}>TikTok</span>
            <span style={{ color: '#7dd3fc', fontSize: 9, margin: '0 6px' }}>Website</span>
          </div>
        </div>
      </div>
      {subject && (
        <p style={{ fontSize: 10, color: '#64748b', textAlign: 'center', margin: '8px 0 0' }}>
          Subject: <strong>{subject}</strong>
        </p>
      )}
    </div>
  );
}

export default function AdminMarketing() {
  const { data: users } = trpc.users.list.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();
  const sendEmail = trpc.marketing.sendEmail.useMutation();

  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showCompose, setShowCompose] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const customers = users?.filter(u => u.role !== 'admin') ?? [];

  const segments = [
    { key: 'all', label: 'All Customers' },
    { key: 'has_booked', label: 'Has Booked' },
    { key: 'repeat', label: 'Repeat (2+)' },
    { key: 'high_value', label: 'High Value ($2k+)' },
    { key: 'captain', label: 'Captain Tier' },
    { key: 'first_mate', label: 'First Mate Tier' },
    { key: 'crew', label: 'Crew Tier' },
    { key: 'inactive', label: 'Never Booked' },
  ];

  const filteredCustomers = customers.filter(u => {
    if (filter === 'all') return true;
    if (filter === 'has_booked') return u.bookingCount > 0;
    if (filter === 'repeat') return u.bookingCount > 1;
    if (filter === 'high_value') return u.totalSpent >= 2000;
    if (filter === 'inactive') return u.bookingCount === 0;
    if (filter === 'captain') return u.loyaltyPoints >= 5000;
    if (filter === 'first_mate') return u.loyaltyPoints >= 2500 && u.loyaltyPoints < 5000;
    if (filter === 'crew') return u.loyaltyPoints < 2500;
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

  const applyTemplate = (key: string) => {
    setSelectedTemplate(key);
    const tpl = templates.find(t => t.key === key);
    if (tpl) {
      setSubject(tpl.subject);
      setMessage(tpl.message);
    }
  };

  const handleSend = async () => {
    if (!confirmSend) {
      setConfirmSend(true);
      return;
    }

    const recipients = customers
      .filter(u => selectedUsers.has(u.id) && u.email)
      .map(u => ({ email: u.email, name: u.name }));

    if (recipients.length === 0) return;

    try {
      const result = await sendEmail.mutateAsync({
        recipients,
        subject,
        message,
        template: selectedTemplate,
      });
      setSendResult(result);
    } catch (err: any) {
      setSendResult({ sent: 0, failed: recipients.length, errors: [err?.message ?? 'Unknown error'] });
    }
  };

  const closeCompose = () => {
    setShowCompose(false);
    setSubject('');
    setMessage('');
    setSelectedTemplate('custom');
    setSendResult(null);
    setConfirmSend(false);
    setShowPreview(false);
  };

  const selectedList = customers.filter(u => selectedUsers.has(u.id));
  const selectedWithEmail = selectedList.filter(u => u.email);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Marketing</h1>
        <button
          disabled={selectedUsers.size === 0}
          onClick={() => setShowCompose(true)}
          className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <Mail className="w-4 h-4" /> Send Email ({selectedUsers.size})
        </button>
      </div>

      {/* Segments */}
      <div className="flex flex-wrap gap-2 mb-6">
        {segments.map(seg => {
          const count = customers.filter(u => {
            if (seg.key === 'all') return true;
            if (seg.key === 'has_booked') return u.bookingCount > 0;
            if (seg.key === 'repeat') return u.bookingCount > 1;
            if (seg.key === 'high_value') return u.totalSpent >= 2000;
            if (seg.key === 'inactive') return u.bookingCount === 0;
            if (seg.key === 'captain') return u.loyaltyPoints >= 5000;
            if (seg.key === 'first_mate') return u.loyaltyPoints >= 2500 && u.loyaltyPoints < 5000;
            if (seg.key === 'crew') return u.loyaltyPoints < 2500;
            return true;
          }).length;
          return (
            <button
              key={seg.key}
              onClick={() => { setFilter(seg.key); setSelectedUsers(new Set()); setSelectAll(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === seg.key ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {seg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
              className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="w-10 px-4 py-2.5"></th>
              <th className="text-left px-4 py-2.5 font-medium">Customer</th>
              <th className="text-left px-4 py-2.5 font-medium">Email</th>
              <th className="text-center px-4 py-2.5 font-medium">Bookings</th>
              <th className="text-right px-4 py-2.5 font-medium">Spent</th>
              <th className="text-center px-4 py-2.5 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(user => (
              <tr key={user.id} className={`border-t border-slate-50 ${selectedUsers.has(user.id) ? 'bg-sky-50' : 'hover:bg-slate-50/50'}`}>
                <td className="px-4 py-2.5">
                  <input type="checkbox" checked={selectedUsers.has(user.id)} onChange={() => toggleUser(user.id)}
                    className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500" />
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{user.name}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{user.email || <span className="text-red-400">No email</span>}</td>
                <td className="px-4 py-2.5 text-center">{user.bookingCount}</td>
                <td className="px-4 py-2.5 text-right font-medium">${user.totalSpent.toFixed(0)}</td>
                <td className="px-4 py-2.5 text-center text-amber-600">{user.loyaltyPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No customers match this filter</div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeCompose} />
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${showPreview ? 'max-w-5xl' : 'max-w-2xl'}`}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-500" /> Compose Email
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showPreview ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button onClick={closeCompose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className={showPreview ? 'flex' : ''}>
            <div className={showPreview ? 'flex-1 min-w-0' : ''}>
            {sendResult ? (
              <div className="px-6 py-12 text-center">
                {sendResult.failed === 0 ? (
                  <>
                    <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="font-bold text-slate-900 text-xl mb-1">Emails Sent!</p>
                    <p className="text-slate-500">Successfully sent to {sendResult.sent} customer{sendResult.sent > 1 ? 's' : ''}</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <p className="font-bold text-slate-900 text-xl mb-1">Partially Sent</p>
                    <p className="text-slate-500 mb-4">{sendResult.sent} sent, {sendResult.failed} failed</p>
                    {sendResult.errors.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-4 text-left text-xs text-red-700 max-h-32 overflow-y-auto">
                        {sendResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                      </div>
                    )}
                  </>
                )}
                <button onClick={closeCompose} className="mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Close
                </button>
              </div>
            ) : (
              <div className="px-6 py-6 space-y-5">
                {/* Recipients */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">
                    Sending to {selectedWithEmail.length} customer{selectedWithEmail.length > 1 ? 's' : ''} with email
                    {selectedList.length > selectedWithEmail.length && (
                      <span className="text-amber-500"> ({selectedList.length - selectedWithEmail.length} skipped — no email)</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {selectedWithEmail.slice(0, 12).map(u => (
                      <span key={u.id} className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded">{u.name}</span>
                    ))}
                    {selectedWithEmail.length > 12 && <span className="text-xs text-slate-400">+{selectedWithEmail.length - 12} more</span>}
                  </div>
                </div>

                {/* Templates */}
                <div>
                  <label className="block text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Email Templates
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map(tpl => (
                      <button
                        key={tpl.key}
                        onClick={() => applyTemplate(tpl.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          selectedTemplate === tpl.key
                            ? 'bg-sky-50 border-sky-300 text-sky-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Subject *</label>
                  <input value={subject} onChange={e => { setSubject(e.target.value); setSelectedTemplate('custom'); }}
                    placeholder="e.g. Summer on the Water Starts Now ☀️"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Message *</label>
                  <textarea value={message} onChange={e => { setMessage(e.target.value); setSelectedTemplate('custom'); }}
                    rows={10}
                    placeholder="Write your message here. Each email will be personalized with the customer's first name..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed" />
                  <p className="text-xs text-slate-400 mt-1">
                    Emails are sent from Blue Skies Boat Rentals with your branded template. Replies go to info@blueskiescharter.com.
                  </p>
                </div>

                {/* Send */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button onClick={closeCompose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>

                  {confirmSend ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-amber-600 font-medium">Send to {selectedWithEmail.length} people?</span>
                      <button
                        onClick={() => setConfirmSend(false)}
                        className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
                      >
                        No
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={sendEmail.isPending}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Send className="w-4 h-4" /> {sendEmail.isPending ? 'Sending...' : 'Yes, Send Now'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!message || !subject || selectedWithEmail.length === 0}
                      className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Send className="w-4 h-4" /> Send Email
                    </button>
                  )}
                </div>
              </div>
            )}
            </div>
            {showPreview && (
              <div className="w-[380px] flex-shrink-0 border-l border-slate-100 p-4 bg-slate-50/50">
                <EmailPreview
                  subject={subject}
                  message={message}
                  template={selectedTemplate}
                  name={selectedWithEmail[0]?.name || 'Customer'}
                />
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
