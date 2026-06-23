import { useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle, Anchor, ShieldCheck, AlertCircle } from 'lucide-react';
import { trpc } from '../lib/trpc';
import SignaturePad from '../components/SignaturePad';
import SEO from '../components/SEO';

// ⚠️ DRAFT placeholder language — replace with your final ION-approved waiver text.
const WAIVER_TEXT: { heading: string; body: string }[] = [
  {
    heading: 'Release of Liability, Waiver of Claims, Assumption of Risk & Indemnity',
    body: 'By signing below you acknowledge that boating and in-water activities carry inherent risks — including serious injury or death — and you voluntarily assume all such risks. To the fullest extent permitted by law, you waive and release Blue Skies Charter LLC and its owners, operators, agents, and insurers from any and all claims, and agree to indemnify and hold them harmless, arising out of your participation, except where caused by gross negligence or intentional misconduct.',
  },
  {
    heading: 'In-Water Activities',
    body: 'If you participate in in-water activities (swimming, snorkeling, kayaking), you confirm you will wear a flotation aid at all times, stay within the permitted area, and accept the additional risks of those activities. Scuba and use of oxygen tanks are not permitted.',
  },
  {
    heading: 'Acknowledgment',
    body: 'You confirm you are physically able to participate, are not under the influence of alcohol or drugs, and have read and understand this agreement. By signing you are aware that you are waiving certain legal rights, including the right to sue.',
  },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500';

export default function WaiverPage() {
  const { ref } = useParams();
  const [params] = useSearchParams();
  const isRenter = params.get('renter') === '1';

  const [code, setCode] = useState((ref ?? '').toUpperCase());
  const [submittedCode, setSubmittedCode] = useState(ref ? ref.toUpperCase() : '');

  const tripQuery = trpc.waivers.tripInfo.useQuery(submittedCode, { enabled: !!submittedCode });
  const trip = tripQuery.data;

  // Sign-form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [inWater, setInWater] = useState(false);
  const [printed, setPrinted] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ signedCount: number; guestCount: number } | null>(null);

  // Prefill the renter's details when they arrive from the confirmation page.
  useEffect(() => {
    if (isRenter && trip) {
      setName(prev => prev || trip.renterName);
      setEmail(prev => prev || trip.renterEmail);
    }
  }, [isRenter, trip]);

  const create = trpc.waivers.create.useMutation({
    onSuccess: (res) => { setDone(res); setError(''); },
    onError: (e) => setError(e.message),
  });

  const resetForm = () => {
    setName(''); setEmail(''); setIsMinor(false); setGuardianName('');
    setInWater(false); setPrinted(''); setSignature(null); setAgreed(false);
    setDone(null); setError('');
  };

  const submit = () => {
    setError('');
    if (!name.trim()) return setError('Please enter the full name.');
    if (isMinor && !guardianName.trim()) return setError('A parent/guardian name is required for a minor.');
    if (!printed.trim()) return setError('Please type the printed name of the person signing.');
    if (!signature) return setError('Please draw a signature.');
    if (!agreed) return setError('Please check the box to confirm you agree.');
    create.mutate({
      bookingRef: submittedCode,
      participantName: name.trim(),
      participantEmail: email.trim() || undefined,
      isMinor,
      guardianName: isMinor ? guardianName.trim() : undefined,
      signaturePrinted: printed.trim(),
      signatureData: signature,
      inWaterActivity: inWater,
      isRenter,
    });
  };

  // --- Entry screen: enter trip code + email ---
  if (!submittedCode || (tripQuery.isFetched && !trip)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <SEO title="Sign Your Trip Waiver" noindex={true} path="/waiver" />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-heading text-2xl text-slate-900 text-center mb-1">Join Your Trip</h1>
          <p className="text-slate-500 text-sm text-center mb-6">
            Enter the trip code your group leader gave you, plus your email, to sign the required waiver.
          </p>
          {submittedCode && tripQuery.isFetched && !trip && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> Trip code not found. Double-check and try again.
            </div>
          )}
          <div className="space-y-3">
            <Field label="Trip code">
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="BSC-XXXXXXXX"
                className={inputCls + ' font-mono tracking-wider'} />
            </Field>
            <Field label="Your email">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" className={inputCls} />
            </Field>
            <button
              onClick={() => setSubmittedCode(code.trim().toUpperCase())}
              disabled={!code.trim()}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Loading trip ---
  if (tripQuery.isLoading || !trip) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading trip…</div>;
  }

  // --- Signed confirmation ---
  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <SEO title="Waiver Signed" noindex={true} path="/waiver" />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="font-heading text-2xl text-slate-900 mb-1">Waiver Signed ✅</h1>
          <p className="text-slate-500 text-sm mb-5">
            Thanks, <span className="font-medium text-slate-700">{name}</span>. You're all set for
            {' '}<span className="font-medium text-slate-700">{trip.boatName}</span> on {trip.charterDate}.
          </p>
          <div className="bg-slate-50 rounded-lg py-3 px-4 text-sm text-slate-600 mb-5">
            <span className="font-semibold text-slate-900">{done.signedCount}</span> of {done.guestCount} guest{done.guestCount === 1 ? '' : 's'} signed
          </div>
          <button onClick={resetForm} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-lg transition-colors">
            Sign for Another Passenger
          </button>
          <p className="text-slate-400 text-xs mt-3">Pass the device to the next person in your group.</p>
        </div>
      </div>
    );
  }

  // --- Sign form ---
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <SEO title="Sign Your Trip Waiver" noindex={true} path="/waiver" />
      <div className="max-w-lg mx-auto">
        {/* Trip header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 text-sky-300 text-xs uppercase tracking-wider mb-1">
            <Anchor className="w-4 h-4" /> Blue Skies Charter
          </div>
          <h1 className="font-heading text-2xl">{trip.boatName}</h1>
          <p className="text-white/70 text-sm">{trip.charterDate} · Trip {trip.bookingRef} · {trip.renterName}'s party</p>
          <p className="text-white/50 text-xs mt-1">{trip.signedCount} of {trip.guestCount} guests signed so far</p>
        </div>

        {/* Waiver text */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-5">
          <p className="text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-4">
            Notice — by signing this document you may be waiving certain legal rights, including the right to sue.
          </p>
          <div className="space-y-4">
            {WAIVER_TEXT.map(s => (
              <div key={s.heading}>
                <h2 className="text-slate-900 font-semibold text-sm mb-1">{s.heading}</h2>
                <p className="text-slate-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sign form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="text-slate-900 font-semibold text-base">Sign the waiver</h2>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={isMinor} onChange={e => setIsMinor(e.target.checked)} className="w-4 h-4 accent-sky-500" />
            This waiver is for a minor (under 18)
          </label>

          <Field label={isMinor ? "Minor's full name" : 'Full name'}>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </Field>

          {isMinor && (
            <Field label="Parent / guardian full name (signing on behalf of the minor)">
              <input value={guardianName} onChange={e => setGuardianName(e.target.value)} className={inputCls} />
            </Field>
          )}

          <Field label="Email">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@email.com" className={inputCls} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={inWater} onChange={e => setInWater(e.target.checked)} className="w-4 h-4 accent-sky-500" />
            Will participate in in-water activities (swimming, snorkeling, kayaking)
          </label>

          <Field label={isMinor ? 'Printed name of parent/guardian' : 'Printed name'}>
            <input value={printed} onChange={e => setPrinted(e.target.value)} placeholder="Type full name" className={inputCls} />
          </Field>

          <Field label="Signature">
            <SignaturePad onChange={setSignature} />
          </Field>

          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-4 h-4 accent-sky-500 mt-0.5" />
            <span>I have read and understand this agreement and agree to its terms. I am aware that I am waiving certain legal rights, including the right to sue.</span>
          </label>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={create.isPending}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {create.isPending ? 'Submitting…' : 'Sign & Submit Waiver'}
          </button>
        </div>
      </div>
    </div>
  );
}
