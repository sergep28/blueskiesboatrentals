import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, CalendarDays, User, CreditCard, Check, ChevronRight, ChevronLeft, MapPin, Users as UsersIcon, Calendar, ArrowRight, MessageCircle, RotateCcw } from 'lucide-react';
import { trpc } from '../lib/trpc';
import SignatureCanvas from 'react-signature-canvas';

const durationLabels: Record<string, string> = {
  half_day_am: 'Half Day (9am–12pm)',
  full_day: 'Full Day (9am–5pm)',
  custom: 'Custom',
  multi_day: 'Multi-Day',
};

const durationOptions = [
  { value: 'half_day_am', label: 'Half Day', hours: '9am–12pm', type: 'half' },
  { value: 'full_day', label: 'Full Day', hours: '9am–5pm', type: 'full' },
  { value: 'custom', label: 'Custom', hours: 'Multi-day or custom times', type: 'custom' },
];

const charterTypes = ['fishing', 'cruising', 'sunset', 'sandbar', 'custom'] as const;

function MiniCalendar({ boatId, onSelect, selected, endDate, onSelectRange }: {
  boatId: number;
  onSelect: (date: string) => void;
  selected: string | null;
  endDate?: string | null;
  onSelectRange?: (start: string, end: string | null) => void;
}) {
  const [month, setMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const { data: bookings } = trpc.bookings.list.useQuery();

  const bookedDates = useMemo(() => {
    if (!bookings) return new Set<string>();
    return new Set(bookings.filter(b => b.boatId === boatId && b.status !== 'cancelled').map(b => b.charterDate));
  }, [bookings, boatId]);

  const y = month.getFullYear(), m = month.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const handleClick = (ds: string) => {
    if (onSelectRange) {
      if (!selected || (selected && endDate)) {
        // Start new selection
        onSelectRange(ds, null);
      } else if (ds === selected) {
        // Same day = single day
        onSelect(ds);
      } else if (ds < selected) {
        onSelectRange(ds, selected);
      } else {
        onSelectRange(selected, ds);
      }
    } else {
      onSelect(ds);
    }
  };

  const isInRange = (ds: string) => {
    if (!selected) return false;
    const end = endDate || hoverDate;
    if (!end) return false;
    const [s, e] = selected < end ? [selected, end] : [end, selected];
    return ds > s && ds < e;
  };

  const isRangeStart = (ds: string) => {
    if (!selected) return false;
    const end = endDate || hoverDate;
    if (!end) return ds === selected;
    return ds === (selected < end ? selected : end);
  };

  const isRangeEnd = (ds: string) => {
    const end = endDate || hoverDate;
    if (!selected || !end) return false;
    return ds === (selected < end ? end : selected);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const ds = date.toISOString().split('T')[0];
    const past = date < today;
    const booked = bookedDates.has(ds);
    const inRange = isInRange(ds);
    const rangeStart = isRangeStart(ds);
    const rangeEnd = isRangeEnd(ds);
    const isSingle = ds === selected && !endDate && !hoverDate;

    days.push(
      <button key={d} disabled={past || booked}
        onClick={() => !past && !booked && handleClick(ds)}
        onMouseEnter={() => selected && !endDate && onSelectRange && setHoverDate(ds)}
        onMouseLeave={() => setHoverDate(null)}
        className={`aspect-square flex items-center justify-center text-xs transition-all ${
          rangeStart ? 'bg-sky-500 text-white font-semibold rounded-l-md' :
          rangeEnd ? 'bg-sky-500 text-white font-semibold rounded-r-md' :
          isSingle ? 'bg-sky-500 text-white font-semibold rounded-md' :
          inRange ? 'bg-sky-100 text-sky-700' :
          past ? 'text-slate-300 rounded-md' :
          booked ? 'bg-red-50 text-red-300 line-through rounded-md' :
          'text-slate-600 hover:bg-sky-50 rounded-md'
        }`}>{d}</button>
    );
  }

  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      {/* Date display */}
      {(selected || endDate) && (
        <div className="flex items-center justify-center gap-2 mb-3 text-xs">
          <span className={`px-2 py-1 rounded ${selected ? 'bg-sky-50 text-sky-700' : 'text-slate-400'}`}>
            {selected ? fmt(selected) : 'Start'}
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-2 py-1 rounded ${endDate ? 'bg-sky-50 text-sky-700' : 'text-slate-400'}`}>
            {endDate ? fmt(endDate) : 'End (optional)'}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonth(new Date(y, m - 1, 1))} className="text-slate-400 hover:text-slate-700 p-1"><ChevronLeft className="w-3 h-3" /></button>
        <p className="text-slate-900 font-medium text-xs">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <button onClick={() => setMonth(new Date(y, m + 1, 1))} className="text-slate-400 hover:text-slate-700 p-1"><ChevronRight className="w-3 h-3" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="text-center text-slate-400 text-[9px]">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0">{days}</div>
      <p className="text-[10px] text-slate-400 text-center mt-2">Click once for single day, twice for a range</p>
    </div>
  );
}

export default function BookingPage() {
  useEffect(() => { document.title = 'Book a Boat Rental in the Florida Keys | Blue Skies Boat Rentals'; }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlBoat = searchParams.get('boat');
  const urlDate = searchParams.get('date');
  const urlDuration = searchParams.get('duration');
  const quoteCode = searchParams.get('quote');

  // Load quote if present
  const { data: quote } = trpc.quotes.getByCode.useQuery(quoteCode ?? '', { enabled: !!quoteCode });
  const markQuoteBooked = trpc.quotes.markBooked.useMutation();

  const hasUrlParams = !!(urlBoat && urlDate && urlDuration);
  const hasQuote = !!(quote && quote.status === 'pending');

  const [step, setStep] = useState(hasUrlParams ? 'details' : 'select');
  const [form, setForm] = useState({
    boatId: urlBoat ? Number(urlBoat) : 0,
    date: urlDate ?? '',
    endDate: '' as string,
    duration: urlDuration ?? '',
    captainRequested: false,
    charterType: 'cruising' as string,
    guestCount: 2,
    pickupTime: '09:00',
    dropoffTime: '17:00',
    departurePort: '',
    specialRequests: '',
    referralCode: '',
    name: '',
    email: '',
    phone: '',
    agreedToTerms: false,
    signature: '' as string,
    quotePrice: null as number | null,
  });
  const sigRef = useRef<SignatureCanvas>(null);
  const quoteLoaded = useRef(false);

  // Pre-fill form from quote
  useEffect(() => {
    if (quote && quote.status === 'pending' && !quoteLoaded.current) {
      quoteLoaded.current = true;
      setForm(f => ({
        ...f,
        boatId: quote.boatId,
        date: quote.charterDate,
        endDate: quote.endDate ?? '',
        duration: quote.duration,
        name: quote.customerName ?? '',
        phone: quote.customerPhone ?? '',
        email: quote.customerEmail ?? '',
        quotePrice: quote.price,
      }));
      setStep('details');
    }
  }, [quote]);

  const { data: boats } = trpc.boats.list.useQuery();
  const { data: referralCheck } = trpc.partners.validateCode.useQuery(form.referralCode, { enabled: form.referralCode.length >= 6 });

  const createBooking = trpc.bookings.create.useMutation({
    onSuccess: (data) => {
      // Mark quote as booked
      if (quoteCode) markQuoteBooked.mutate(quoteCode);
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        navigate(`/booking/success/${data.bookingRef}`);
      }
    },
  });

  const selectedBoat = boats?.find(b => b.id === form.boatId);
  useEffect(() => {
    if (selectedBoat && !form.departurePort) {
      setForm(f => ({ ...f, departurePort: selectedBoat.homePort ?? '' }));
    }
  }, [selectedBoat]);

  const getPrice = () => {
    if (form.quotePrice !== null) return form.quotePrice;
    if (!selectedBoat) return 0;
    return form.duration === 'full_day' || form.duration === 'multi_day' ? selectedBoat.priceFullDay : selectedBoat.priceHalfDay;
  };

  const subtotal = getPrice();
  const discount = referralCheck?.valid ? subtotal * 0.05 : 0;
  const beforeTax = subtotal - discount;
  const tax = beforeTax * 0.075;
  const total = beforeTax + tax;

  const handleSubmit = () => {
    createBooking.mutate({
      boatId: form.boatId,
      captainRequested: form.captainRequested,
      customerName: form.name,
      customerEmail: form.email,
      customerPhone: form.phone,
      charterDate: form.date,
      duration: form.duration as any,
      charterType: form.charterType as any,
      guestCount: form.guestCount,
      departurePort: form.departurePort,
      specialRequests: form.specialRequests,
      referralCode: form.referralCode || undefined,
    });
  };

  const stepIndex = step === 'select' ? 0 : step === 'details' ? 1 : step === 'info' ? 2 : 3;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl font-normal mb-4">Book a Boat Rental</h1>
          <div className="flex items-center gap-2 text-sm">
            {['Select Boat & Date', 'Trip Details', 'Your Info', 'Review & Pay'].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs ${
                  i === stepIndex ? 'bg-sky-500 text-white' : i < stepIndex ? 'bg-sky-500/20 text-sky-400' : 'bg-white/10 text-white/40'
                }`}>
                  {i < stepIndex ? <Check className="w-3 h-3 inline" /> : i + 1}. {s}
                </div>
                {i < 3 && <ChevronRight className="w-3 h-3 text-white/20" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Quote banner */}
        {hasQuote && selectedBoat && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5 mb-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-emerald-900 font-semibold text-sm">Your custom quote is ready</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                {selectedBoat.name} — {new Date(form.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {form.endDate && ` to ${new Date(form.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
                {' '}— <strong>${form.quotePrice?.toLocaleString()}</strong> (agreed price)
              </p>
            </div>
          </motion.div>
        )}

        {/* Expired/booked quote */}
        {quote && quote.status !== 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-center">
            <p className="text-amber-800 font-semibold text-sm">This quote has already been {quote.status}.</p>
            <p className="text-amber-600 text-xs mt-1">Text us at (515) 587-0438 for a new quote.</p>
          </div>
        )}

        {/* Step 1: Select Boat with Calendar */}
        {step === 'select' && (
          <div>
            <h2 className="font-heading text-2xl font-normal text-slate-900 mb-6">Choose your boat and date</h2>
            <div className="space-y-8">
              {boats?.filter(b => b.status === 'active').map(boat => {
                const isSelected = form.boatId === boat.id;
                return (
                  <div key={boat.id} className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${
                    isSelected ? 'border-sky-500 shadow-lg shadow-sky-500/10' : 'border-slate-100 hover:border-slate-200'
                  }`}>
                    <div className="grid md:grid-cols-2">
                      {/* Left — Boat Info */}
                      <div className="p-6">
                        <div className="flex gap-4">
                          <img src={boat.imageUrl ?? ''} alt={boat.name} className="w-32 h-24 rounded-xl object-cover flex-shrink-0" />
                          <div>
                            <h3 className="font-heading text-xl text-slate-900">{boat.name}</h3>
                            <p className="text-slate-500 text-sm">{boat.model}</p>
                            <div className="flex gap-3 mt-2 text-xs text-slate-400">
                              <span>{boat.lengthFt}ft</span>
                              <span>Up to {boat.capacity} guests</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{boat.homePort}</span>
                            </div>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="grid grid-cols-3 gap-3 mt-5">
                          {durationOptions.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setForm(f => ({ ...f, boatId: boat.id, duration: opt.value, departurePort: boat.homePort ?? '' }))}
                              className={`rounded-lg p-3 text-center transition-all border ${
                                isSelected && form.duration === opt.value
                                  ? 'bg-sky-50 border-sky-300 text-sky-700'
                                  : 'border-slate-100 hover:border-slate-200'
                              }`}
                            >
                              <p className="font-semibold text-sm">{opt.type === 'custom' ? 'Custom' : `$${opt.type === 'half' ? boat.priceHalfDay : boat.priceFullDay}`}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{opt.label}</p>
                              <p className="text-[10px] text-slate-300">{opt.hours}</p>
                            </button>
                          ))}
                        </div>

                        <Link to={`/boat/${boat.id}`} className="mt-4 w-full block text-center text-sm text-sky-600 hover:text-sky-700 font-medium border border-sky-200 hover:border-sky-300 rounded-lg py-2 transition-colors">
                          View All Photos & Details
                        </Link>

                        {/* What's included */}
                        <div className="mt-5 bg-slate-50 rounded-xl p-4">
                          <p className="text-xs font-semibold text-slate-700 mb-2.5">Included with every rental</p>
                          <div className="space-y-1.5">
                            {['Full tank of fuel', 'Cooler & ice', 'Safety gear & life jackets', 'Bluetooth sound system', 'Safety briefing & orientation'].map(item => (
                              <div key={item} className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                <span className="text-slate-600 text-xs">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Mini review */}
                        <div className="mt-3 border border-slate-100 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 mb-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span className="text-amber-500 text-xs">★★★★★</span>
                            <span className="text-slate-400 text-[10px]">5.0 · 34 reviews</span>
                          </div>
                          <p className="text-slate-500 text-xs italic leading-relaxed">
                            "{boat.name === 'Freedom'
                              ? 'The boat was immaculate, beautifully maintained, and incredibly comfortable. It truly felt like a luxury escape on the water.'
                              : 'We chose blue skies because of the reviews and the Grady White boat they have. The electronics were next level—really impressive setup.'
                            }"
                          </p>
                          <p className="text-slate-400 text-[10px] mt-1.5">— {boat.name === 'Freedom' ? 'Sarah C.' : 'Claudio L.'}, Google Review</p>
                        </div>

                        {/* Custom time fields — only show for single-day custom */}
                        {isSelected && form.duration === 'custom' && !form.endDate && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-slate-50 rounded-lg p-4">
                            <p className="text-slate-700 text-xs font-medium mb-3">Select your dates on the calendar, then set your times:</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Pickup Time (9am–5pm)</label>
                                <select value={form.pickupTime}
                                  onChange={e => setForm(f => ({ ...f, pickupTime: e.target.value }))}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                                  {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => (
                                    <option key={t} value={t}>{t === '12:00' ? '12:00 PM' : Number(t.split(':')[0]) > 12 ? `${Number(t.split(':')[0])-12}:00 PM` : `${Number(t.split(':')[0])}:00 AM`}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Dropoff Time (9am–5pm)</label>
                                <select value={form.dropoffTime}
                                  onChange={e => setForm(f => ({ ...f, dropoffTime: e.target.value }))}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500">
                                  {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => (
                                    <option key={t} value={t}>{t === '12:00' ? '12:00 PM' : Number(t.split(':')[0]) > 12 ? `${Number(t.split(':')[0])-12}:00 PM` : `${Number(t.split(':')[0])}:00 AM`}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Multi-day summary — auto-shown when range selected */}
                        {isSelected && form.endDate && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-sky-50 border border-sky-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CalendarDays className="w-4 h-4 text-sky-600" />
                              <p className="text-sky-800 text-sm font-semibold">Multi-Day Rental</p>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <p className="text-sky-700">
                                  {new Date(form.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  {' → '}
                                  {new Date(form.endDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                                <p className="text-sky-600 text-xs mt-0.5">
                                  {Math.round((new Date(form.endDate).getTime() - new Date(form.date).getTime()) / 86400000)} days · Pickup 9am · Return by 5pm on last day
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sky-800 font-bold text-lg">
                                  ${((boat.priceMultiDay ?? boat.priceFullDay) * Math.round((new Date(form.endDate).getTime() - new Date(form.date).getTime()) / 86400000)).toLocaleString()}
                                </p>
                                <p className="text-sky-500 text-[10px]">${boat.priceMultiDay ?? boat.priceFullDay}/day</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Selected summary — single day only */}
                        {isSelected && form.date && !form.endDate && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-sky-50 rounded-lg p-3 text-sm">
                            <p className="text-sky-700">
                              <strong>{boat.name}</strong> — {new Date(form.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} — {durationLabels[form.duration] ?? 'Select duration'}
                            </p>
                          </motion.div>
                        )}
                      </div>

                      {/* Right — Calendar */}
                      <div className="border-l border-slate-100 p-6 bg-slate-50/30">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-sky-500" />
                          <p className="text-sm font-medium text-slate-900">Availability</p>
                        </div>
                        <MiniCalendar
                          boatId={boat.id}
                          selected={isSelected ? form.date : null}
                          endDate={isSelected ? form.endDate : null}
                          onSelect={(date) => setForm(f => ({
                            ...f,
                            boatId: boat.id,
                            date,
                            endDate: '',
                            departurePort: boat.homePort ?? '',
                            duration: f.boatId === boat.id && f.duration ? f.duration : 'half_day_am',
                          }))}
                          onSelectRange={(start, end) => {
                            if (end) {
                              setForm(f => ({ ...f, boatId: boat.id, date: start, endDate: end, duration: 'custom', departurePort: boat.homePort ?? '' }));
                            } else {
                              setForm(f => ({ ...f, boatId: boat.id, date: start, endDate: '', duration: f.duration || 'half_day_am', departurePort: boat.homePort ?? '' }));
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Book Button */}
                    {isSelected && form.date && form.duration && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                          {form.duration === 'custom' && form.endDate ? (
                            <>${(boat.priceMultiDay ?? boat.priceFullDay)} × {Math.round((new Date(form.endDate).getTime() - new Date(form.date).getTime()) / 86400000)} days = <strong>${((boat.priceMultiDay ?? boat.priceFullDay) * Math.round((new Date(form.endDate).getTime() - new Date(form.date).getTime()) / 86400000)).toLocaleString()}</strong> + tax · <span className="text-sky-500">Multi-day discounts available — text us</span></>
                          ) : form.duration === 'custom' ? (
                            <>Custom pricing — we'll confirm after review</>
                          ) : (
                            <>${form.duration.includes('half') ? boat.priceHalfDay : boat.priceFullDay} + tax</>
                          )}
                        </p>
                        <button
                          onClick={() => setStep('details')}
                          className="flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full transition-all hover:scale-105 bg-sky-500 text-white hover:bg-sky-600"
                        >
                          Continue <ChevronRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}

                    {/* Trust Badge */}
                    <div className="px-6 py-3 border-t border-slate-50 flex items-center justify-center gap-6 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Pre-trip inspected</span>
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Satisfaction guaranteed</span>
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Free weather reschedule</span>
                    </div>

                    {/* Custom Quote */}
                    <div className="px-6 py-4 border-t border-slate-100">
                      <a
                        href={`sms:5155870438&body=Hi, I'm interested in ${boat.name}${isSelected && form.date ? ` on ${form.date}` : ''}${isSelected && form.endDate ? ` to ${form.endDate}` : ''}. Can we discuss a custom quote?`}
                        className="flex items-center justify-between bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl px-5 py-4 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-slate-900 text-sm font-semibold">Planning a group or special event?</p>
                            <p className="text-slate-500 text-xs">Multi-day / week / month trips, corporate outings, birthdays — let's build your custom package</p>
                          </div>
                        </div>
                        <span className="text-sky-600 font-semibold text-sm group-hover:text-sky-700 flex-shrink-0 ml-3">Send Us a Question →</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Trip Details */}
        {step === 'details' && (
          <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <h2 className="font-heading text-2xl font-normal text-slate-900 mb-6">Trip Details</h2>
            {selectedBoat && (
              <div className="bg-sky-50 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={selectedBoat.imageUrl ?? ''} alt="" className="w-16 h-12 rounded-lg object-cover" />
                  <div>
                    <p className="font-medium text-slate-900">{selectedBoat.name} — {durationLabels[form.duration]}</p>
                    <p className="text-sky-700 text-sm">{new Date(form.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <button onClick={() => setStep('select')} className="text-sky-600 text-sm hover:text-sky-700">Change</button>
              </div>
            )}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Charter Type</label>
                  <select value={form.charterType} onChange={e => setForm(f => ({ ...f, charterType: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none">
                    {charterTypes.map(ct => <option key={ct} value={ct}>{ct.charAt(0).toUpperCase() + ct.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Number of Guests</label>
                  <input type="number" min={1} max={selectedBoat?.capacity ?? 10} value={form.guestCount}
                    onChange={e => setForm(f => ({ ...f, guestCount: parseInt(e.target.value) || 1 }))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none" />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.captainRequested}
                    onChange={e => setForm(f => ({ ...f, captainRequested: e.target.checked }))}
                    className="w-5 h-5 rounded text-sky-500 focus:ring-sky-500" />
                  <div>
                    <span className="font-medium text-slate-900">Add a Captain</span>
                    <p className="text-sm text-slate-500">Want a USCG-licensed captain? We'll assign one at booking</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Departure Port</label>
                <input value={form.departurePort} onChange={e => setForm(f => ({ ...f, departurePort: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Special Requests</label>
                <textarea value={form.specialRequests} onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))}
                  rows={3} placeholder="Anything we should know?"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Referral Code (optional)</label>
                <input value={form.referralCode} onChange={e => setForm(f => ({ ...f, referralCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. BS-SUNSET" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none" />
                {referralCheck?.valid && <p className="text-green-600 text-sm mt-1 flex items-center gap-1"><Check className="w-4 h-4" /> 5% discount from {referralCheck.businessName}</p>}
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep('select')} className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
              <button onClick={() => setStep('info')} className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Guest Info */}
        {step === 'info' && (
          <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <h2 className="font-heading text-2xl font-normal text-slate-900 mb-6">Your Information</h2>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  onBlur={async () => {
                    if (form.email && form.email.includes('@')) {
                      try {
                        const res = await fetch(`/api/trpc/users.getByEmail?input=${encodeURIComponent(JSON.stringify(form.email))}`);
                        const data = await res.json();
                        if (data?.result?.data) {
                          const user = data.result.data;
                          setForm(f => ({
                            ...f,
                            name: user.name || f.name,
                            phone: user.phone || f.phone,
                          }));
                        }
                      } catch {}
                    }
                  }}
                  placeholder="Enter your email"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none" />
                <p className="text-slate-400 text-xs mt-1">Returning customer? We'll auto-fill your info.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none" />
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep('details')} className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
              <button disabled={!form.name || !form.email} onClick={() => setStep('review')}
                className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                Review Booking <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Review & Pay */}
        {step === 'review' && (
          <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <h2 className="font-heading text-2xl font-normal text-slate-900 mb-6">Review & Confirm</h2>
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Trip Summary</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-500">Boat:</span> {selectedBoat?.name} ({selectedBoat?.model})</p>
                    <p><span className="text-slate-500">Date:</span> {new Date(form.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <p><span className="text-slate-500">Duration:</span> {durationLabels[form.duration]}</p>
                    {form.duration === 'custom' && (
                      <p><span className="text-slate-500">Times:</span> {form.pickupTime} — {form.dropoffTime}</p>
                    )}
                    {form.endDate && (
                      <p><span className="text-slate-500">End Date:</span> {new Date(form.endDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    )}
                    <p><span className="text-slate-500">Type:</span> {form.charterType}</p>
                    <p><span className="text-slate-500">Guests:</span> {form.guestCount}</p>
                    <p><span className="text-slate-500">Captain:</span> {form.captainRequested ? 'Yes — assigned at booking' : 'Bareboat (no captain)'}</p>
                    <p><span className="text-slate-500">Departure:</span> {form.departurePort}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Contact</h3>
                  <div className="space-y-2 text-sm">
                    <p>{form.name}</p>
                    <p>{form.email}</p>
                    <p>{form.phone}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Pricing</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Boat rental ({durationLabels[form.duration]})</span><span>${subtotal.toFixed(2)}</span></div>
                  {form.captainRequested && <div className="flex justify-between"><span>Captain</span><span>TBD</span></div>}
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>Referral Discount (5%)</span><span>-${discount.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-slate-500"><span>Florida Tax (7.5%)</span><span>${tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-slate-100"><span>Total</span><span>${total.toFixed(2)}</span></div>
                  <p className="text-xs text-slate-400 mt-1">You'll earn {Math.floor(total / 5)} loyalty points</p>
                </div>
              </div>
            </div>

            {/* What's Included / Not Included */}
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="bg-green-50 rounded-xl p-5">
                <h4 className="font-semibold text-green-800 text-sm mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4" /> What's Included
                </h4>
                <ul className="space-y-1.5 text-green-700 text-xs">
                  <li>• Safety equipment & life jackets</li>
                  <li>• Cooler & ice</li>
                  <li>• Bluetooth sound system</li>
                  <li>• Freshwater shower</li>
                  <li>• Full boat orientation & safety briefing</li>
                  <li>• 24/7 text support during your trip</li>
                </ul>
              </div>
              <div className="bg-amber-50 rounded-xl p-5">
                <h4 className="font-semibold text-amber-800 text-sm mb-3">Not Included</h4>
                <ul className="space-y-1.5 text-amber-700 text-xs">
                  <li>• Fuel — boat departs with a full tank, return full (fuel dock at marina)</li>
                  <li>• Food & drinks — bring your own</li>
                  <li>• Fishing tackle & bait (available for purchase)</li>
                  <li>• Delivery/pickup to other locations (available for a fee — text us)</li>
                  <li>• Gratuity for captain (if applicable)</li>
                </ul>
              </div>
            </div>

            {/* Rental Agreement & Signature */}
            <div className="mt-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-5">
                <h4 className="font-semibold text-slate-900 text-sm mb-2">Driver's License Required</h4>
                <p className="text-slate-500 text-xs">
                  A valid driver's license or government-issued photo ID is required for all renters.
                  Please bring it with you on your rental day.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-5">
                <div className="mb-4">
                  <p className="text-slate-900 text-sm font-medium mb-1">Rental Agreement</p>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    By signing below, I confirm that I am at least 25 years old, hold a valid ID,
                    and agree to the{' '}
                    <Link to="/rental-agreement" target="_blank" className="text-sky-500 underline underline-offset-2 hover:text-sky-600">
                      Rental Agreement
                    </Link>
                    , including the fuel policy (return full), cancellation policy (free reschedule 48hrs+),
                    liability waiver, and assumption of risk.
                  </p>
                </div>

                {/* Signature Pad */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl bg-white relative overflow-hidden"
                  style={{ touchAction: 'none' }}
                >
                  <SignatureCanvas
                    ref={sigRef}
                    canvasProps={{
                      className: 'w-full',
                      style: { width: '100%', height: '160px' },
                    }}
                    penColor="#1e293b"
                    backgroundColor="white"
                    onEnd={() => {
                      if (sigRef.current) {
                        setForm(f => ({
                          ...f,
                          signature: sigRef.current!.toDataURL(),
                          agreedToTerms: true,
                        }));
                      }
                    }}
                  />
                  {!form.signature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-300 text-sm">Sign here with your finger or mouse</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-slate-400 text-[10px]">
                    {form.signature ? 'Signature captured' : 'Please sign above to continue'}
                  </p>
                  {form.signature && (
                    <button
                      onClick={() => {
                        sigRef.current?.clear();
                        setForm(f => ({ ...f, signature: '', agreedToTerms: false }));
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep('info')} className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
              <button onClick={handleSubmit} disabled={createBooking.isPending || !form.agreedToTerms || !form.signature}
                className="px-8 py-3 rounded-xl font-semibold text-lg flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-40 bg-sky-500 text-white hover:bg-sky-600">
                {createBooking.isPending ? 'Processing...' : 'Confirm & Proceed to Payment'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
