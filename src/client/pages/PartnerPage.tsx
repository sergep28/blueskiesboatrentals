import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Handshake, DollarSign, BarChart3, Copy, Check, Ship, Shield, Users, MessageCircle, ArrowRight } from 'lucide-react';
import { trpc } from '../lib/trpc';

export default function PartnerPage() {
  useEffect(() => { document.title = 'Partner Program — Hotels & Vacation Rentals | Blue Skies Boat Rentals'; }, []);
  const [mode, setMode] = useState<'info' | 'register' | 'dashboard'>('info');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    businessName: '', contactName: '', email: '', phone: '',
    type: 'hotel' as 'airbnb_host' | 'hotel' | 'restaurant' | 'concierge' | 'other',
  });

  const { data: partner } = trpc.partners.getByCode.useQuery(code, { enabled: mode === 'dashboard' && !!code });
  const registerMutation = trpc.partners.register.useMutation({
    onSuccess: (data) => {
      setCode(data.referralCode);
      setMode('dashboard');
    },
  });

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-normal mb-2">Partner Program</h1>
            <p className="text-white/80 text-sm">Earn 10% commission on every referral. No fees, no minimums.</p>
          </div>
          <div className="flex gap-3">
            {mode === 'info' && (
              <>
                <button onClick={() => setMode('register')}
                  className="px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:scale-105 bg-white text-sky-600 hover:bg-sky-50">
                  Become a Partner
                </button>
                <button onClick={() => { const c = prompt('Enter your referral code:'); if (c) { setCode(c); setMode('dashboard'); } }}
                  className="border border-white/30 hover:bg-white hover:text-sky-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-all">
                  Partner Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Info mode — how it works */}
        {mode === 'info' && (
          <div>
            {/* How it works — compact row */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Handshake, title: 'Share Your Code', desc: 'Give guests your unique referral code. They get 5% off their booking.' },
                { icon: DollarSign, title: 'Earn Commission', desc: '10% commission on every completed booking that uses your code.' },
                { icon: BarChart3, title: 'Track Earnings', desc: 'Real-time dashboard to monitor referrals, revenue, and payouts.' },
              ].map((item) => (
                <div key={item.title} className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl p-5 text-center text-white">
                  <item.icon className="w-6 h-6 text-white mx-auto mb-2" />
                  <h3 className="font-heading text-sm font-normal mb-1">{item.title}</h3>
                  <p className="text-white/60 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Two columns: Who can partner + List your vessel */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Who can partner */}
              <div>
                <h2 className="font-heading text-2xl font-normal mb-4">Who Can Partner?</h2>
                <div className="space-y-3">
                  {[
                    { type: 'Hotels & Resorts', desc: 'Offer guests a premium boat day — earn on every referral' },
                    { type: 'Airbnb Hosts', desc: 'Add a boat rental to your guest experience' },
                    { type: 'Restaurants & Bars', desc: 'Recommend us to diners looking for water activities' },
                    { type: 'Concierge Services', desc: 'Expand your offerings with vetted, premium charters' },
                  ].map(item => (
                    <div key={item.type} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3">
                      <Handshake className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-900 text-sm font-medium">{item.type}</p>
                        <p className="text-slate-500 text-xs">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* List your vessel */}
              <div>
                <h2 className="font-heading text-2xl font-normal mb-4">Own a Boat?</h2>
                <div className="bg-slate-900 rounded-xl p-6 text-white">
                  <Ship className="w-5 h-5 mb-3 text-sky-400" />
                  <h3 className="font-heading text-lg font-normal mb-2">List your vessel with us</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Premium vessel in the Keys? We handle bookings, marketing, and customer service. You provide the boat.
                  </p>
                  <div className="space-y-2 mb-5">
                    {['Well-maintained, premium brand', 'Florida Keys based (Key Largo to Marathon)', 'Current insurance & registration', 'Meets our inspection standards'].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <p className="text-slate-400 text-xs">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {['1. Text us', '2. Inspection', '3. We list it', '4. You earn'].map(step => (
                      <div key={step} className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-white/60 text-[10px]">{step}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <a href="sms:5165870438&body=Hi, I'm a boat owner in the Keys and I'm interested in listing my vessel with Blue Skies Boat Rentals."
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all hover:scale-105 bg-sky-500 text-white hover:bg-sky-600">
                      <MessageCircle className="w-3.5 h-3.5" /> Inquire
                    </a>
                    <a href="tel:5165870438" className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors">
                      (516) 587-0438
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Register form */}
        {mode === 'register' && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-lg mx-auto">
            <h2 className="font-heading text-2xl font-normal mb-4">Register as a Partner</h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Business Name" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-sky-500" />
                <input placeholder="Contact Name" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-sky-500" />
                <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-sky-500">
                <option value="hotel">Hotel / Resort</option>
                <option value="airbnb_host">Airbnb Host</option>
                <option value="restaurant">Restaurant / Bar</option>
                <option value="concierge">Concierge Service</option>
                <option value="other">Other</option>
              </select>
              <button onClick={() => registerMutation.mutate(form)}
                disabled={!form.businessName || !form.contactName || !form.email}
                className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white py-3 rounded-xl font-semibold">
                Submit Application
              </button>
            </div>
          </motion.div>
        )}

        {/* Dashboard */}
        {mode === 'dashboard' && partner && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-heading text-2xl font-normal">{partner.businessName}</h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                partner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>{partner.status}</span>
            </div>

            <div className="grid sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-slate-500 text-xs">Referrals</p>
                <p className="font-heading text-2xl font-normal">{partner.totalReferrals}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-slate-500 text-xs">Revenue</p>
                <p className="font-heading text-2xl font-normal">${partner.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-slate-500 text-xs">Commission</p>
                <p className="font-heading text-2xl font-normal text-green-600">${partner.totalCommission.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-slate-500 text-xs mb-1">Your Code</p>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-50 px-3 py-1 rounded-lg font-mono text-sm text-sky-600">{partner.referralCode}</code>
                  <button onClick={copyCode} className="text-slate-400 hover:text-slate-600">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-slate-400 text-[10px] mt-1">Guests get 5% off • You earn {partner.commissionRate}%</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
