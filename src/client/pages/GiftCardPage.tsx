import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, ArrowRight, Check, Anchor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const presetAmounts = [500, 750, 1000, 1200, 1500, 2000];

export default function GiftCardPage() {
  useEffect(() => { document.title = 'Boat Rental Gift Cards | Florida Keys | Blue Skies Boat Rentals'; }, []);
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'details' | 'success'>('amount');
  const [form, setForm] = useState({
    recipientName: '',
    recipientEmail: '',
    senderName: '',
    senderEmail: '',
    message: '',
    deliveryDate: '',
  });
  const [giftCode, setGiftCode] = useState('');

  const finalAmount = amount ?? (Number(customAmount) || 0);

  const handlePurchase = () => {
    // Generate gift code
    const code = 'BSBR-GIFT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setGiftCode(code);
    setStep('success');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative bg-sky-600 py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: 'url(/keys-sunset.jpeg)' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <Gift className="w-8 h-8 mx-auto mb-4 text-white" />
          <h1 className="font-heading text-4xl md:text-5xl font-normal text-white mb-4">Give the Gift of the Keys</h1>
          <p className="text-white/70 text-lg">
            A Blue Skies Boat Rentals gift card — redeemable for any boat, any day, any experience.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step 1: Choose Amount */}
        {step === 'amount' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-heading text-2xl text-slate-900 mb-2">Choose an amount</h2>
            <p className="text-slate-500 text-sm mb-8">Select a preset amount or enter your own.</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {presetAmounts.map(a => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustomAmount(''); }}
                  className={`rounded-xl p-5 text-center transition-all border ${
                    amount === a
                      ? 'bg-sky-50 border-sky-300 text-sky-700'
                      : 'border-slate-100 hover:border-slate-200 text-slate-900'
                  }`}
                >
                  <p className="font-heading text-2xl">${a.toLocaleString()}</p>
                  {a === 750 && <p className="text-[10px] text-slate-400 mt-1">Covers a half day</p>}
                  {a === 1000 && <p className="text-[10px] text-slate-400 mt-1">Covers a full day</p>}
                  {a === 2000 && <p className="text-[10px] text-slate-400 mt-1">Premium full day</p>}
                </button>
              ))}
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">Or enter a custom amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                <input
                  type="number"
                  min={100}
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setAmount(null); }}
                  placeholder="Enter amount (min $100)"
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-lg outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <button
              disabled={finalAmount < 100}
              onClick={() => setStep('details')}
              className={`w-full py-4 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-40 flex items-center justify-center gap-2 ${
                finalAmount >= 100 ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-slate-300 text-slate-500'
              }`}
            >
              Continue — ${finalAmount.toLocaleString()} Gift Card <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 2: Recipient Details */}
        {step === 'details' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-heading text-2xl text-slate-900 mb-2">${finalAmount.toLocaleString()} Gift Card</h2>
            <p className="text-slate-500 text-sm mb-8">Who is this gift for?</p>

            <div className="space-y-5">
              <div className="bg-slate-50 rounded-xl p-5">
                <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wider">Recipient</p>
                <div className="space-y-3">
                  <input
                    value={form.recipientName}
                    onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))}
                    placeholder="Recipient's name"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <input
                    type="email"
                    value={form.recipientEmail}
                    onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                    placeholder="Recipient's email (we'll send the gift card here)"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5">
                <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wider">From</p>
                <div className="space-y-3">
                  <input
                    value={form.senderName}
                    onChange={e => setForm(f => ({ ...f, senderName: e.target.value }))}
                    placeholder="Your name"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <input
                    type="email"
                    value={form.senderEmail}
                    onChange={e => setForm(f => ({ ...f, senderEmail: e.target.value }))}
                    placeholder="Your email"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Personal message (optional)</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                  placeholder="e.g. Happy Birthday! Enjoy a day on the water in the Keys."
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Delivery date</label>
                <input
                  type="date"
                  value={form.deliveryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-slate-400 text-xs mt-1">Leave blank to send immediately</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep('amount')} className="px-6 py-3 text-slate-600 text-sm font-medium">Back</button>
              <button
                disabled={!form.recipientName || !form.recipientEmail || !form.senderName || !form.senderEmail}
                onClick={handlePurchase}
                className="flex-1 py-4 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-40 flex items-center justify-center gap-2 bg-sky-500 text-white hover:bg-sky-600"
              >
                Purchase Gift Card — ${finalAmount.toLocaleString()}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-sky-500">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-heading text-3xl text-slate-900 mb-2">Gift Card Purchased!</h2>
            <p className="text-slate-500 mb-8">
              {form.deliveryDate
                ? `It will be delivered to ${form.recipientName} on ${new Date(form.deliveryDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : `It's on its way to ${form.recipientName} now`}
            </p>

            {/* Gift Card Preview */}
            <div className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-2xl p-8 text-white max-w-md mx-auto mb-8 text-left">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-white" />
                  <span className="text-xs tracking-[0.2em] uppercase">Blue Skies Boat Rentals</span>
                </div>
                <Gift className="w-5 h-5 text-white" />
              </div>
              <p className="font-heading text-4xl mb-1">${finalAmount.toLocaleString()}</p>
              <p className="text-white/60 text-sm mb-6">Gift Card</p>
              <div className="border-t border-white/20 pt-4">
                <p className="text-white/70 text-xs mb-1">To: {form.recipientName}</p>
                <p className="text-white/70 text-xs mb-3">From: {form.senderName}</p>
                {form.message && <p className="text-white/50 text-xs italic">"{form.message}"</p>}
              </div>
              <div className="mt-6 bg-white/10 rounded-lg px-4 py-2 text-center">
                <p className="text-white/60 text-[10px] uppercase tracking-wider">Redemption Code</p>
                <p className="text-white font-mono text-lg tracking-wider">{giftCode}</p>
              </div>
            </div>

            <p className="text-slate-400 text-xs mb-6">
              The recipient will receive an email with this gift card and instructions to book.
              <br />Gift cards never expire and are redeemable for any boat, any day.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setStep('amount'); setAmount(null); setCustomAmount(''); setForm({ recipientName: '', recipientEmail: '', senderName: '', senderEmail: '', message: '', deliveryDate: '' }); }}
                className="px-6 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50"
              >
                Buy Another
              </button>
              <a href="/" className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium text-sm">
                Back Home
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
