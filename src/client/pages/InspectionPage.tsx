import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import SignaturePad from '../components/SignaturePad';
import DiagramMarker from '../components/DiagramMarker';
import SEO from '../components/SEO';
import { Camera, X, Check, ShieldCheck } from 'lucide-react';

const AREAS = [
  'Hull (Port Side)',
  'Hull (Starboard Side)',
  'Bow',
  'Stern / Swim Platform',
  'Engines (Port)',
  'Engines (Starboard)',
  'Propellers',
  'Deck & Seating',
  'Electronics / Nav Gear',
];

// Shrink a photo on the renter's device before upload so it stores light in the DB.
function resizeImage(file: File, maxDim = 1280, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
        else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas context'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type Photo = { area: string; imageData: string };
type Condition = 'good' | 'damage';

export default function InspectionPage() {
  const { ref } = useParams();
  const code = (ref ?? '').trim().toUpperCase();

  const tripQuery = trpc.waivers.tripInfo.useQuery(code, { enabled: !!code });
  const trip = tripQuery.data;
  const statusQuery = trpc.inspections.statusByBooking.useQuery(code, { enabled: !!code });

  const [operatorName, setOperatorName] = useState('');
  const [conditions, setConditions] = useState<Record<string, Condition>>(
    Object.fromEntries(AREAS.map(a => [a, 'good'])) as Record<string, Condition>
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [damageNotes, setDamageNotes] = useState('');
  const [hullDiagram, setHullDiagram] = useState<string | null>(null);
  const [outboardDiagram, setOutboardDiagram] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [printed, setPrinted] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = trpc.inspections.submit.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message),
  });

  const addPhotos = async (area: string, files: FileList | null) => {
    if (!files) return;
    const next: Photo[] = [];
    for (const file of Array.from(files)) {
      try { next.push({ area, imageData: await resizeImage(file) }); } catch { /* skip bad file */ }
    }
    setPhotos(p => [...p, ...next]);
  };

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));

  const checklist = useMemo(
    () => AREAS.map(area => ({ area, condition: conditions[area], notes: notes[area]?.trim() || undefined })),
    [conditions, notes]
  );

  const handleSubmit = () => {
    setError('');
    if (!printed.trim()) return setError('Please type your name to sign.');
    if (!signature) return setError('Please draw your signature.');
    if (!acknowledged) return setError('Please check the acknowledgment box to confirm the inspection.');
    submit.mutate({
      bookingRef: code,
      operatorName: operatorName.trim() || undefined,
      checklist,
      damageNotes: damageNotes.trim() || undefined,
      hullDiagram: hullDiagram || undefined,
      outboardDiagram: outboardDiagram || undefined,
      acknowledged,
      signaturePrinted: printed.trim(),
      signatureData: signature,
      photos,
    });
  };

  // --- States ---
  if (!code) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <p className="text-slate-500">This inspection link is missing a trip code. Please use the link Blue Skies sent you.</p>
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
  if (done || statusQuery.data?.signed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="font-heading text-2xl text-slate-900 mb-2">Inspection complete</h1>
          <p className="text-slate-500 text-sm">
            Thanks{trip ? `, ${trip.renterName}` : ''}. Your pre-departure inspection has been recorded. Have a great trip on the water! 🌊
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <SEO title="Vessel Inspection" noindex={true} path="/inspection" />
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sky-300 text-sm mb-1"><ShieldCheck className="w-4 h-4" /> Pre-Departure Inspection</div>
          <h1 className="font-heading text-2xl">{trip?.boatName}</h1>
          <p className="text-white/70 text-sm">{trip?.charterDate} · Trip {trip?.bookingRef} · {trip?.renterName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
        {/* Operator */}
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Operator name (if different from renter)</label>
          <input value={operatorName} onChange={e => setOperatorName(e.target.value)} placeholder="Who will be operating the vessel"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-1">Condition Checklist</h2>
          <p className="text-slate-500 text-xs mb-4">Mark each area, note and photograph any pre-existing damage.</p>
          <div className="space-y-4">
            {AREAS.map(area => {
              const cond = conditions[area];
              const areaPhotos = photos.map((p, i) => ({ ...p, i })).filter(p => p.area === area);
              return (
                <div key={area} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">{area}</span>
                    <div className="flex gap-1 shrink-0">
                      {(['good', 'damage'] as Condition[]).map(c => (
                        <button key={c} type="button"
                          onClick={() => setConditions(s => ({ ...s, [area]: c }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            cond === c
                              ? c === 'good' ? 'bg-green-500 border-green-500 text-white' : 'bg-red-500 border-red-500 text-white'
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}>
                          {c === 'good' ? 'Good' : 'Damage'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {cond === 'damage' && (
                    <div className="mt-3 space-y-2">
                      <input value={notes[area] ?? ''} onChange={e => setNotes(s => ({ ...s, [area]: e.target.value }))}
                        placeholder="Describe the damage"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
                      <div className="flex flex-wrap gap-2 items-center">
                        {areaPhotos.map(p => (
                          <div key={p.i} className="relative">
                            <img src={p.imageData} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                            <button type="button" onClick={() => removePhoto(p.i)}
                              className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer text-slate-400 hover:border-sky-400 hover:text-sky-500">
                          <Camera className="w-5 h-5" />
                          <input type="file" accept="image/*" multiple className="hidden" onChange={e => addPhotos(area, e.target.files)} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Damage diagrams */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-900 mb-1">Mark Damage on the Diagrams</h2>
            <p className="text-slate-500 text-xs mb-3">Circle any areas of concern directly on the diagrams below.</p>
          </div>
          <DiagramMarker src="/inspection-hull.png" label="Hull" onChange={setHullDiagram} />
          <DiagramMarker src="/inspection-outboard.png" label="Outboard / Engine" onChange={setOutboardDiagram} />
        </div>

        {/* General damage notes + photos */}
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-2">Additional Damage Notes</h2>
          <textarea value={damageNotes} onChange={e => setDamageNotes(e.target.value)} rows={3}
            placeholder="Any other pre-existing damage or notes…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500" />
          <div className="flex flex-wrap gap-2 items-center mt-3">
            {photos.map((p, i) => p.area === 'general' ? (
              <div key={i} className="relative">
                <img src={p.imageData} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                <button type="button" onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </div>
            ) : null)}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer text-slate-400 hover:border-sky-400 hover:text-sky-500">
              <Camera className="w-5 h-5" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => addPhotos('general', e.target.files)} />
            </label>
          </div>
        </div>

        {/* Acknowledgment */}
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-2">Acknowledgment</h2>
          <p className="text-slate-500 text-xs mb-3">
            I certify that I have personally participated in a pre-departure inspection of the vessel and confirm: the vessel is in good
            working condition, any pre-existing damage has been noted above, all required safety equipment is present, and the fuel level and
            overall condition have been verified. I have completed the safety briefing, accept full responsibility for the safe operation of
            the vessel and all passengers, and agree to return it in the same condition, excluding normal wear and tear.
          </p>
          <label className="flex items-start gap-2 cursor-pointer mb-4">
            <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="w-5 h-5 mt-0.5 rounded text-sky-500" />
            <span className="text-sm text-slate-700">I certify the above and agree to all terms outlined.</span>
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
          {submit.isPending ? 'Submitting…' : 'Submit Inspection'}
        </button>
      </div>
    </div>
  );
}
