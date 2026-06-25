import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, User, Award, Star, Instagram, Gift, ShieldCheck, Copy, Check } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import SEO from '../components/SEO';

// Soft-launch switch: keep the customer-facing Crew Waivers card hidden until
// the final ION-approved waiver language is in place. Flip to true to go live.
const SHOW_CREW_WAIVERS = false;

export default function BookingSuccessPage() {
  const { ref } = useParams();
  const { data: booking } = trpc.bookings.getByRef.useQuery(ref ?? '');
  const { data: waiverRoster } = trpc.waivers.byBooking.useQuery(booking?.bookingRef ?? '', { enabled: !!booking?.bookingRef });
  const [showProfile, setShowProfile] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const [password, setPassword] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const confettiFired = useRef(false);

  const waiverLink = booking ? `${window.location.origin}/waiver/${booking.bookingRef}` : '';
  const signedCount = waiverRoster?.length ?? 0;

  useEffect(() => {
    if (waiverLink) QRCode.toDataURL(waiverLink, { width: 220, margin: 1 }).then(setQr).catch(() => {});
  }, [waiverLink]);

  const copyLink = () => {
    navigator.clipboard?.writeText(waiverLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const createProfile = trpc.users.createProfile.useMutation({
    onSuccess: () => setProfileCreated(true),
  });

  // Fire confetti when booking loads as confirmed
  useEffect(() => {
    if (booking && booking.paymentStatus !== 'pending' && !confettiFired.current) {
      confettiFired.current = true;
      // Initial burst
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#0ea5e9', '#f59e0b', '#10b981', '#3b82f6', '#ffffff'] });
      // Second wave
      setTimeout(() => {
        confetti({ particleCount: 50, spread: 100, origin: { y: 0.5, x: 0.3 }, colors: ['#0ea5e9', '#f59e0b', '#10b981'] });
        confetti({ particleCount: 50, spread: 100, origin: { y: 0.5, x: 0.7 }, colors: ['#0ea5e9', '#f59e0b', '#10b981'] });
      }, 400);
    }
  }, [booking]);

  const handleCreateProfile = () => {
    if (booking?.customerEmail && password.length >= 6) {
      createProfile.mutate({ email: booking.customerEmail, password });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <SEO title="Booking Confirmed" noindex={true} path="/booking/success" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
        </motion.div>

        <h1 className="font-heading text-3xl font-normal text-slate-900 mb-2">
          {booking?.paymentStatus === 'pending' ? 'Payment Processing...' : 'Booking Confirmed!'}
        </h1>
        <p className="text-slate-500 mb-6">
          {booking?.paymentStatus === 'pending' ? 'Your payment is being processed. This page will update shortly.' : 'Your adventure awaits'}
        </p>

        {/* Points celebration banner */}
        {booking && booking.paymentStatus !== 'pending' && booking.loyaltyPointsEarned > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200 rounded-2xl p-5 mb-6"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="inline-block"
            >
              <Gift className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            </motion.div>
            <p className="text-amber-800 font-bold text-lg">You just earned {booking.loyaltyPointsEarned} points!</p>
            <p className="text-amber-600 text-sm mt-1">Create a free profile below to save your points and unlock rewards like free upgrades, discounts, and more.</p>
          </motion.div>
        )}

        {booking && (
          <div className="bg-slate-50 rounded-xl p-6 text-left space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Reference</span>
              <span className="font-mono text-sky-600">{booking.bookingRef}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Date</span>
              <span className="font-medium">{booking.charterDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Duration</span>
              <span className="font-medium">{booking.duration.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Total Paid</span>
              <span className="text-lg font-medium">${booking.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Points Earned</span>
              <span className="font-medium text-sky-600">+{booking.loyaltyPointsEarned} pts</span>
            </div>
          </div>
        )}

        {/* Crew Waivers */}
        {SHOW_CREW_WAIVERS && booking && booking.paymentStatus !== 'pending' && (
          <div className="bg-white border-2 border-sky-200 rounded-2xl p-5 text-left mb-6">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-sky-500 flex-shrink-0" />
              <h3 className="font-semibold text-slate-900 text-sm">Crew Waivers — required before your trip</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed mb-4">
              <strong>Every person aboard</strong> must sign a liability waiver before departure (it's required by our insurance).
              Share this with your group — each person enters the trip code and signs in under a minute.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {qr && <img src={qr} alt="Waiver QR code" className="w-28 h-28 rounded-lg border border-slate-100 mx-auto sm:mx-0" />}
              <div className="flex-1 w-full">
                <div className="text-xs text-slate-500">Trip code</div>
                <div className="font-mono text-lg text-sky-600 tracking-wider mb-2">{booking.bookingRef}</div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 truncate">{waiverLink}</div>
                  <button onClick={copyLink} title="Copy link"
                    className="flex-shrink-0 p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-sm text-slate-600 mb-3">
                  <span className="font-semibold text-slate-900">{signedCount}</span> of {booking.guestCount} signed
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/waiver/${booking.bookingRef}?renter=1`}
                    className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors">
                    Sign my waiver
                  </Link>
                  <a href={`sms:&body=${encodeURIComponent(`Sign the waiver for our Blue Skies boat trip (required for everyone before we go): ${waiverLink} — trip code ${booking.bookingRef}`)}`}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-full transition-colors">
                    Text to my group
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Creation Prompt */}
        {!showProfile && !profileCreated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-sky-50 border border-sky-200 rounded-xl p-5 text-left mb-6"
          >
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-sky-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-slate-900 font-medium text-sm mb-1">
                  {booking?.loyaltyPointsEarned ? `Claim your ${booking.loyaltyPointsEarned} points — create a free profile` : 'Create a profile & earn rewards'}
                </p>
                <p className="text-slate-500 text-xs leading-relaxed mb-3">
                  {booking?.loyaltyPointsEarned
                    ? 'Your points are waiting! Create a profile in 10 seconds to save them. Use points for free upgrades, discounts, and exclusive perks on future trips.'
                    : 'Save your info for faster rebooking, track loyalty points, and unlock exclusive perks. Takes 10 seconds.'
                  }
                </p>
                <button
                  onClick={() => setShowProfile(true)}
                  className="text-xs font-semibold px-5 py-2.5 rounded-full transition-colors bg-sky-500 text-white hover:bg-sky-600"
                >
                  {booking?.loyaltyPointsEarned ? 'Claim Points & Create Profile' : 'Create Profile'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showProfile && !profileCreated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-slate-50 rounded-xl p-5 text-left mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-600" />
              <p className="font-medium text-slate-900 text-sm">Create your profile</p>
            </div>
            <p className="text-slate-500 text-xs mb-4">
              We already have your name and email from the booking. Just set a password.
            </p>
            <div className="space-y-3">
              <div className="bg-white rounded-lg px-4 py-2.5 text-sm text-slate-400 border border-slate-200">
                {booking?.customerEmail}
              </div>
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                onClick={handleCreateProfile}
                disabled={password.length < 6}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                Create Profile
              </button>
            </div>
          </motion.div>
        )}

        {profileCreated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-50 rounded-xl p-4 text-left text-sm text-green-700 mb-6 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium">Profile created!</p>
              <p className="text-green-600 text-xs">You can now track bookings and earn loyalty rewards.</p>
            </div>
          </motion.div>
        )}

        <div className="bg-sky-50 rounded-xl p-4 text-left text-sm text-slate-700 mb-6">
          <h3 className="font-semibold mb-2">Next Steps:</h3>
          <ul className="space-y-1">
            <li>• We'll text you with marina details before your trip</li>
            <li>• Arrive 15 minutes before departure</li>
            <li>• Bring sunscreen, sunglasses, and a great attitude</li>
          </ul>
        </div>

        {/* Earn Extra Points */}
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-5 text-left mb-6">
          <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-sky-500" /> Earn Bonus Points
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-slate-900 text-sm font-medium">Tag us on Instagram — <span className="text-sky-600">+50 points</span></p>
                <p className="text-slate-500 text-xs">Post a photo or reel and tag <span className="font-medium">@blueskiescharter</span>. We'll add the points to your account.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-slate-900 text-sm font-medium">Leave a Google Review — <span className="text-sky-600">+100 points</span></p>
                <p className="text-slate-500 text-xs">Share your honest experience. Text us after posting and we'll credit your account.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.65a8.35 8.35 0 004.76 1.49V6.69h-1z"/></svg>
              </div>
              <div>
                <p className="text-slate-900 text-sm font-medium">Post on TikTok — <span className="text-sky-600">+75 points</span></p>
                <p className="text-slate-500 text-xs">Tag <span className="font-medium">@blueskiescharter</span> in a TikTok from your trip.</p>
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-[10px] mt-4">Text us your handle after posting and we'll add points within 24 hours.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/" className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-3 rounded-xl font-semibold transition-colors">
            Back Home
          </Link>
          <Link to="/my-bookings" className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
            <Award className="w-4 h-4" /> View My Points
          </Link>
          <Link to="/book" className="flex-1 bg-sky-500 hover:bg-sky-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors">
            Book Another
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
