import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import SignaturePad from '../components/SignaturePad';
import SEO from '../components/SEO';
import { resizeImage } from './InspectionPage';
import { Camera, X, Check, Anchor } from 'lucide-react';

const FUEL_LEVELS = ['full', '3/4', '1/2', '1/4', 'empty'] as const;
type FuelLevel = typeof FUEL_LEVELS[number];
type Kind = 'meter' | 'fuel' | 'boat' | 'damage';
type Photo = { kind: Kind; imageData: string };
const MIN_BOAT_PHOTOS = 4;

export default function ReturnPage() {
  const { ref } = useParams();
  const code = (ref ?? '').trim().toUpperCase();

  const tripQuery = trpc.waivers.tripInfo.useQuery(code, { enabled: !!code });
  const trip = tripQuery.data;
  const statusQuery = trpc.returns.statusByBooking.useQuery(code, { enabled: !!code });
  const start = statusQuery.data?.startMeterHours ?? null;

  const [endMeterHours, setEndMeterHours] = useState('');
  const [fuelLevel, setFuelLevel] = useState<FuelLevel | ''>('');
  const [newDamage, setNewDamage] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [printed, setPrinted] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ hoursUsed: number | null } | null>(null);

  const submit = trpc.returns.submit.useMutation({
    onSuccess: (r) => setDone({ hoursUsed: r.hoursUsed }),
    onError: (e) => setError(e.message),
  });

  const addPhotos = async (kind: Kind, files: FileList | null) => {
    if (!files) return;
    const next: Photo[] = [];
    for (const file of Array.from(files)) {
      try { next.push({ kind, imageData: await resizeImage(file) }); } catch { /* skip bad file */ }
    }
    setPhotos(p => [...p, ...next]);
  };
  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));
  const count = (k: Kind) => photos.filter(p => p.kind === k).length;

  const handleSubmit = () => {
    setError('');
    const reading = endMeterHours.trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(reading) || Number(reading) > 9999999.99) {
      return setError('Please enter the ending boat meter reading in hours (up to two decimals).');
    }
    if (start != null && Number(reading) < Number(start)) {
      return setError(`The ending reading can't be lower than the starting reading (${start} hours). Please double-check the meter.`);
    }
    if (count('meter') < 1) return setError('Please add a photo of the hour meter.');
    if (!fuelLevel) return setError('Please select the fuel level.');
    if (count('boat') < MIN_BOAT_PHOTOS) return setError(`Please add at least ${MIN_BOAT_PHOTOS} photos of the boat (all sides + deck).`);
    if (newDamage === null) return setError('Please tell us whether there is any new damage.');
    if (newDamage && !notes.trim()) return setError('Please describe the new damage.');
    if (!printed.trim()) return setError('Please type your name to sign.');
    if (!signature) return setError('Please draw your signature.');
    if (!acknowledged) return setError('Please check the acknowledgment box.');
    submit.mutate({
      bookingRef: code,
      endMeterHours: Number(reading),
      fuelLevel,
      newDamage,
      notes: notes.trim() || undefined,
      acknowledged: true,
      signaturePrinted: printed.trim(),
      signatureData: signature,
      photos,
    });
  };

  const photoRow = (kind: Kind) => (
    <div className="flex flex-wrap gap-2 items-center">
      {photos.map((p, i) => p.kind === kind ? (
        <div key={i} className="relative">
          <img src={p.imageData} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
          <button type="button" onClick={() => removePhoto(i)}
            className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
        </div>
      ) : null)}
      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer text-slate-400 hover:border-sky-400 hover:text-sky-500">
        <Camera className="w-5 h-5" />
        <input type="file" accept="image/*" multiple className="hidden" onChange={e => addPhotos(kind, e.target.files)} />
      </label>
    </div>
  );

  // --- States ---
  if (!code) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <p className="text-slate-500">This return link is missing a trip code. Please use the link Blue Skies sent you.</p>
      </div>
    );
  }
  if (tripQuery.isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading trip…</div>;
  }
  if (tripQuery.isFetched && !trip) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <p className="text-slate-500">We couldn't find that trip. Please double-check the link Blue Skies sent you.</p>
      </div>
    );
  }
  if (done || statusQuery.data?.submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="font-heading text-2xl text-slate-900 mb-2">Boat returned</h1>
          <p className="text-slate-500 text-sm">
            Thanks{trip ? `, ${trip.renterName}` : ''}! Your return check-in has been recorded
            {done?.hoursUsed != null ? ` (${done.hoursUsed} engine hours this trip)` : ''}. We'll review it and be in touch about your deposit. Hope you had a great day on the water! 🌊
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <SEO title="Boat Return Check-In" noindex={true} path="/return" />
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sky-300 text-sm mb-1"><Anchor className="w-4 h-4" /> Boat Return Check-In</div>
          <h1 className="font-heading text-2xl">{trip?.boatName}</h1>
          <p className="text-white/70 text-sm">{trip?.charterDate} · Trip {trip?.bookingRef} · {trip?.renterName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
        {/* Meter */}
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <label htmlFor="endMeterHours" className="block text-sm font-medium text-slate-700 mb-1">Ending boat hour-meter reading (hours) *</label>
          <p className="text-slate-500 text-xs mb-3">
            Enter the number shown on the boat's hour meter now, including decimals.
            {start != null && <> Starting reading was <span className="font-medium text-slate-700">{start} hours</span>.</>}
          </p>
          <input id="endMeterHours" type="number" inputMode="decimal" min="0" max="9999999.99" step="0.01" required
            value={endMeterHours} onChange={e => setEndMeterHours(e.target.value)} placeholder="e.g. 134.2"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 mb-3" />
          <p className="text-sm font-medium text-slate-700 mb-2">Photo of the hour meter *</p>
          {photoRow('meter')}
        </div>

        {/* Fuel */}
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <p className="text-sm font-medium text-slate-700 mb-2">Fuel level *</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {FUEL_LEVELS.map(f => (
              <button key={f} type="button" onClick={() => setFuelLevel(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${fuelLevel === f ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                {f === 'full' ? 'Full' : f === 'empty' ? 'Empty' : f}
              </button>
            ))}
          </div>
          <p className="text-slate-500 text-xs mb-2">Photo of the fuel gauge (optional)</p>
          {photoRow('fuel')}
        </div>

        {/* Boat photos */}
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-1">Boat photos *</h2>
          <p className="text-slate-500 text-xs mb-3">
            At least {MIN_BOAT_PHOTOS}: port side, starboard side, bow, stern/engines, plus the deck. ({count('boat')} added)
          </p>
          {photoRow('boat')}
        </div>

        {/* Damage */}
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <p className="text-sm font-medium text-slate-700 mb-2">Any new damage, incidents, or issues during the trip? *</p>
          <div className="flex gap-2 mb-3">
            {([false, true] as const).map(v => (
              <button key={String(v)} type="button" onClick={() => setNewDamage(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${newDamage === v
                  ? v ? 'bg-red-500 border-red-500 text-white' : 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600'}`}>
                {v ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder={newDamage ? 'Describe what happened and where (required)' : 'Anything else we should know? (optional)'}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 mb-3" />
          {newDamage && <>
            <p className="text-slate-500 text-xs mb-2">Photos of the damage</p>
            {photoRow('damage')}
          </>}
        </div>

        {/* Acknowledgment */}
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-2">Acknowledgment</h2>
          <p className="text-slate-500 text-xs mb-3">
            I confirm the meter reading, fuel level and photos above accurately show the vessel as I returned it, and that I have reported
            any damage, incidents or issues that occurred during my rental. I understand Blue Skies will inspect the vessel and may deduct
            fuel, damage or cleaning charges from my security deposit under the rental agreement.
          </p>
          <label className="flex items-start gap-2 cursor-pointer mb-4">
            <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="w-5 h-5 mt-0.5 rounded text-sky-500" />
            <span className="text-sm text-slate-700">I confirm the above.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700 mb-1">Print name</label>
          <input value={printed} onChange={e => setPrinted(e.target.value)} placeholder="Full name"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 mb-3" />
          <label className="block text-sm font-medium text-slate-700 mb-1">Signature</label>
          <SignaturePad onChange={setSignature} />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button onClick={handleSubmit} disabled={submit.isPending}
          className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-6 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2">
          {submit.isPending ? 'Submitting…' : 'Submit Return Check-In'}
        </button>
      </div>
    </div>
  );
}
