import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Ruler, Ship, ArrowRight, ChevronLeft, ChevronRight, X, Check, Calendar, MessageCircle, Star, Anchor, Clock, Shield } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { useState, useEffect, useMemo } from 'react';
import SEO from '../components/SEO';

const durationOptions = [
  { value: 'half_day_am', label: 'Half Day — Morning', hours: '8am – 12pm', type: 'half' },
  { value: 'half_day_pm', label: 'Half Day — Afternoon', hours: '1pm – 5pm', type: 'half' },
  { value: 'full_day', label: 'Full Day', hours: '8am – 5pm', type: 'full' },
  { value: 'multi_day', label: 'Multi-Day', hours: 'Custom dates', type: 'multi' },
];

function AvailabilityCalendar({ boatId, onSelectDates }: { boatId: number; onSelectDates: (start: string, end: string | null) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const { data: blockedList } = trpc.bookings.bookedDates.useQuery(boatId, { enabled: boatId > 0 });
  const bookedDates = useMemo(() => new Set(blockedList ?? []), [blockedList]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleClick = (dateStr: string) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(dateStr);
      setEndDate(null);
      onSelectDates(dateStr, null);
    } else {
      // Set end date
      if (dateStr < startDate) {
        setStartDate(dateStr);
        setEndDate(startDate);
        onSelectDates(dateStr, startDate);
      } else if (dateStr === startDate) {
        // Same day = single day selection
        onSelectDates(dateStr, null);
      } else {
        setEndDate(dateStr);
        onSelectDates(startDate, dateStr);
      }
    }
  };

  const isInRange = (dateStr: string) => {
    if (!startDate) return false;
    const end = endDate || hoverDate;
    if (!end) return false;
    const [s, e] = startDate < end ? [startDate, end] : [end, startDate];
    return dateStr >= s && dateStr <= e;
  };

  const isRangeStart = (dateStr: string) => {
    if (!startDate) return false;
    const end = endDate || hoverDate;
    if (!end) return dateStr === startDate;
    return dateStr === (startDate < end ? startDate : end);
  };

  const isRangeEnd = (dateStr: string) => {
    const end = endDate || hoverDate;
    if (!startDate || !end) return false;
    return dateStr === (startDate < end ? end : startDate);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().split('T')[0];
    const isPast = date < today;
    const isBooked = bookedDates.has(dateStr);
    const inRange = isInRange(dateStr);
    const rangeStart = isRangeStart(dateStr);
    const rangeEnd = isRangeEnd(dateStr);
    const isStart = dateStr === startDate;
    const isEnd = dateStr === endDate;
    const isToday = date.getTime() === today.getTime();

    days.push(
      <button
        key={d}
        disabled={isPast || isBooked}
        onClick={() => !isPast && !isBooked && handleClick(dateStr)}
        onMouseEnter={() => startDate && !endDate && setHoverDate(dateStr)}
        onMouseLeave={() => setHoverDate(null)}
        className={`aspect-square flex items-center justify-center text-sm transition-all relative ${
          rangeStart ? 'bg-sky-500 text-white font-semibold rounded-l-lg rounded-r-none' :
          rangeEnd ? 'bg-sky-500 text-white font-semibold rounded-r-lg rounded-l-none' :
          (isStart && !endDate && !hoverDate) ? 'bg-sky-500 text-white font-semibold rounded-lg shadow-lg shadow-sky-500/30' :
          inRange ? 'bg-sky-100 text-sky-700' :
          isPast ? 'text-slate-300 cursor-default rounded-lg' :
          isBooked ? 'bg-red-50 text-red-300 line-through cursor-default rounded-lg' :
          isToday ? 'bg-sky-50 text-sky-600 font-medium hover:bg-sky-100 rounded-lg' :
          'text-slate-600 hover:bg-slate-50 rounded-lg'
        }`}
      >
        {d}
      </button>
    );
  }

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      {/* Selection Display */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className={`px-4 py-2 rounded-lg border text-sm ${startDate ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-400'}`}>
          {startDate ? formatDate(startDate) : 'Start date'}
        </div>
        <span className="text-slate-300">&rarr;</span>
        <div className={`px-4 py-2 rounded-lg border text-sm ${endDate ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-400'}`}>
          {endDate ? formatDate(endDate) : 'End date (optional)'}
        </div>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(null); setEndDate(null); onSelectDates('', null); }}
            className="text-slate-400 hover:text-red-500 text-xs ml-2">Clear</button>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-slate-900 font-semibold">{monthName}</p>
        <button onClick={nextMonth} className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-slate-400 text-xs font-medium py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">{days}</div>
      <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-400">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-50 border border-slate-100" /> Available</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-50 border border-red-100" /> Booked</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-sky-100 border border-sky-200" /> Your dates</div>
      </div>
    </div>
  );
}

export default function BoatDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: boat } = trpc.boats.getById.useQuery(Number(id));
  const { data: reviews } = trpc.reviews.approved.useQuery();
  const [currentImg, setCurrentImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [boat]);

  if (!boat) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400">Loading...</div>;

  const images = boat.galleryImages ? JSON.parse(boat.galleryImages) as string[] : [boat.imageUrl ?? ''];
  if (boat.imageUrl && !images.includes(boat.imageUrl)) images.unshift(boat.imageUrl);
  const features = boat.features ? JSON.parse(boat.features) as string[] : [];
  const typeLabel = boat.type === 'dual_console' ? 'Dual Console' : boat.type === 'center_console' ? 'Center Console' : boat.type.replace('_', ' ');

  const prevImg = () => setCurrentImg(i => (i - 1 + images.length) % images.length);
  const nextImg = () => setCurrentImg(i => (i + 1) % images.length);

  const getPrice = () => {
    if (!selectedDuration) return null;
    if (selectedDuration.includes('half')) return boat.priceHalfDay;
    if (selectedDuration === 'multi_day') return boat.priceMultiDay ?? boat.priceFullDay;
    return boat.priceFullDay;
  };

  return (
    <div className="bg-white min-h-screen">
      <SEO title={`${boat.name} — ${boat.model}`} description={boat.description?.slice(0, 155) ?? ''} path={`/boat/${boat.id}`} image={boat.imageUrl ?? undefined} />

      {/* Photo Gallery */}
      <section className="relative bg-slate-900">
        <div className="relative h-[50vh] md:h-[60vh] overflow-hidden cursor-pointer" onClick={() => setLightbox(true)}>
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImg}
              src={images[currentImg]}
              alt={boat.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevImg(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={(e) => { e.stopPropagation(); nextImg(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"><ChevronRight className="w-5 h-5" /></button>
            </>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-slate-900 text-xs px-4 py-1.5 rounded-full font-medium shadow">
            {currentImg + 1} / {images.length} — Click to view all
          </div>
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 px-6 py-3 bg-slate-900 overflow-x-auto">
            {images.map((img, i) => (
              <button key={i} onClick={() => setCurrentImg(i)}
                className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all ${i === currentImg ? 'ring-2 ring-sky-400 opacity-100' : 'opacity-40 hover:opacity-70'}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 text-white/60 hover:text-white"><X className="w-8 h-8" /></button>
            <button onClick={prevImg} className="absolute left-4 text-white/40 hover:text-white"><ChevronLeft className="w-8 h-8" /></button>
            <img src={images[currentImg]} alt="" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" />
            <button onClick={nextImg} className="absolute right-4 text-white/40 hover:text-white"><ChevronRight className="w-8 h-8" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Info */}
      <section className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sky-600 text-xs font-semibold tracking-[0.15em] uppercase mb-2">{typeLabel} — {boat.homePort}</p>
              <h1 className="font-heading text-4xl md:text-5xl text-slate-900">{boat.name}</h1>
              <p className="text-slate-500 mt-1">{boat.model}</p>
            </div>
            <div className="flex items-baseline gap-4">
              <div className="text-right">
                <span className="text-slate-900 font-heading text-3xl">${boat.priceHalfDay}</span>
                <span className="text-slate-400 text-sm ml-1">/ half day</span>
              </div>
              <div className="text-right">
                <span className="text-slate-900 font-heading text-3xl">${boat.priceFullDay}</span>
                <span className="text-slate-400 text-sm ml-1">/ full day</span>
              </div>
            </div>
          </div>

          {/* Quick Specs */}
          <div className="flex flex-wrap gap-6 mt-6">
            {[
              { icon: Ruler, label: `${boat.lengthFt} ft` },
              { icon: Users, label: `Up to ${boat.capacity} guests` },
              { icon: Ship, label: typeLabel },
              { icon: MapPin, label: boat.homePort ?? '' },
            ].map(spec => (
              <div key={spec.label} className="flex items-center gap-2 text-slate-600 text-sm">
                <spec.icon className="w-4 h-4 text-sky-500" />
                {spec.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content — Two Column */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-5 gap-10">

          {/* Left Column — Boat Info */}
          <div className="md:col-span-3 space-y-8">
            <div>
              <h2 className="font-heading text-2xl text-slate-900 mb-3">About This Vessel</h2>
              <p className="text-slate-600 leading-relaxed text-sm">{boat.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Features & Equipment</h3>
                {features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-slate-600 text-sm py-1">
                    <Check className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">What's Included</h3>
                {['Safety equipment & life jackets', 'Cooler & ice', 'Bluetooth sound system', 'Freshwater shower', 'Shade top', 'Full safety orientation'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-slate-600 text-sm py-1">
                    <Check className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
                <div className="flex items-center gap-2 text-slate-600 text-sm py-1">
                  <Anchor className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  Captain available — add at booking
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-sky-500" />
                  <p className="text-slate-900 font-medium text-sm">Our Promise</p>
                </div>
                <div className="space-y-2">
                  {[
                    'Satisfaction guaranteed',
                    'Inspected before every trip',
                    'Transparent pricing — no hidden fees',
                    'Free reschedule if weather is unsafe',
                    '24/7 text support',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2">
                      <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-600 text-xs">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 font-medium text-sm mb-3">Not Included</p>
                <div className="space-y-2 text-amber-700 text-xs">
                  <p>• Fuel — return full</p>
                  <p>• Food & drinks — bring your own</p>
                  <p>• Fishing tackle & bait</p>
                  <p>• Delivery to other locations</p>
                  <p>• Captain gratuity (if applicable)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Calendar & Booking */}
          <div className="md:col-span-2">
            <div className="sticky top-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-sky-500" />
                <h2 className="text-slate-900 font-semibold text-lg">Check Availability</h2>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <AvailabilityCalendar boatId={boat.id} onSelectDates={(s, e) => {
                  setStartDate(s || null);
                  setEndDate(e);
                  if (e) {
                    setSelectedDuration('multi_day');
                  } else {
                    setSelectedDuration(null);
                  }
                }} />
              </div>

              {/* Duration Selection — single day */}
              {startDate && !endDate && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-slate-600 text-sm font-medium mb-3 text-center">
                    Duration for <span className="text-sky-600">{new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {durationOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedDuration(opt.value)}
                        className={`rounded-xl p-3 text-center transition-all border ${
                          selectedDuration === opt.value
                            ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        <p className="font-semibold text-xs">{opt.label}</p>
                        <p className={`text-[10px] mt-0.5 ${selectedDuration === opt.value ? 'text-white/70' : 'text-slate-400'}`}>{opt.hours}</p>
                        <p className={`font-semibold text-sm mt-1 ${selectedDuration === opt.value ? 'text-white' : 'text-slate-900'}`}>
                          ${opt.type === 'half' ? boat.priceHalfDay : opt.type === 'multi' ? (boat.priceMultiDay ?? boat.priceFullDay) : boat.priceFullDay}
                        </p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Multi-day summary */}
              {startDate && endDate && (() => {
                const start = new Date(startDate + 'T12:00:00');
                const end = new Date(endDate + 'T12:00:00');
                const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const dailyRate = boat.priceMultiDay ?? boat.priceFullDay;
                const total = dailyRate * nights;
                return (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                      <p className="text-slate-600 text-sm mb-2">
                        <span className="font-semibold text-slate-900">{nights} day{nights > 1 ? 's' : ''}</span> —{' '}
                        {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to{' '}
                        {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                        <span>${dailyRate}/day × {nights}</span>
                        <span className="text-slate-900 font-semibold text-lg">${total.toLocaleString()}</span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">+ 7.5% FL tax</p>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Book Button */}
              {startDate && (selectedDuration || endDate) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <Link
                    to={`/book?boat=${boat.id}&date=${startDate}${endDate ? `&endDate=${endDate}` : ''}&duration=${endDate ? 'multi_day' : selectedDuration}`}
                    className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-wider uppercase px-8 py-4 rounded-full bg-sky-500 text-white transition-all hover:scale-105 shadow-lg"
                  >
                    Continue to Booking
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-slate-400 text-xs mt-2">Free cancellation 48+ hours out</p>
                </motion.div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h2 className="font-heading text-2xl text-slate-900 mb-8">Guest Reviews</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {reviews.slice(0, 4).map(review => (
                <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-slate-400 text-xs font-medium">{review.customerName}</span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">"{review.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Text CTA */}
      <section className="border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center bg-slate-50 rounded-2xl p-8">
              <h3 className="font-heading text-xl text-slate-900 mb-2">Questions?</h3>
              <p className="text-slate-500 text-sm mb-5">We're real people and we answer fast.</p>
              <a
                href="sms:5165870438"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-semibold text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Text Us
              </a>
            </div>
            <div className="text-center bg-sky-50 rounded-2xl p-8">
              <h3 className="font-heading text-xl text-slate-900 mb-2">Custom Quote</h3>
              <p className="text-slate-500 text-sm mb-5">Groups, multi-day trips, special events — let's plan it together.</p>
              <a
                href={`sms:5165870438&body=Hi, I'm interested in the ${boat.name} and would like to discuss a custom quote.`}
                className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full bg-sky-500 text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Request Custom Quote
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Book CTA */}
      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-slate-900 font-semibold text-sm">{boat.name} — {boat.model}</p>
            <p className="text-slate-500 text-xs">From ${boat.priceHalfDay}/half day · ${boat.priceFullDay}/full day</p>
          </div>
          <Link
            to={`/book?boat=${boat.id}`}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all shadow-lg shadow-sky-500/25"
          >
            Book This Boat <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
