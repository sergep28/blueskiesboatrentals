import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Anchor, Star, ArrowRight, MessageCircle, ChevronDown, ChevronRight, ChevronLeft, Wind, Droplets, Thermometer, Check, MapPin, Calendar, Users, Ship, Sun, Fish, Waves, Phone } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { useEffect, useState, useMemo, useRef } from 'react';

const weatherCodes: Record<number, string> = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 51: 'Light Drizzle', 53: 'Drizzle', 61: 'Light Rain',
  63: 'Rain', 65: 'Heavy Rain', 80: 'Showers', 95: 'Thunderstorm',
};

const heroSlides = [
  { img: '/boat-sunset.jpeg', kenBurns: 'animate-kb-2', duration: 10000 },
  { img: '/hero-keys-view.jpg', kenBurns: 'animate-kb-3', duration: 7000 },
  { img: '/freedom-aerial.jpg', kenBurns: 'animate-kb-1', duration: 6000 },
  { img: '/alligator-reef.jpg', kenBurns: 'animate-kb-2', duration: 6000 },
  { img: '/freedom-anchored.jpg', kenBurns: 'animate-kb-1', duration: 6000 },
  { img: '/freedom-running.jpg', kenBurns: 'animate-kb-3', duration: 6000 },
];

const reelsMedia = [
  { type: 'video' as const, src: '/reel-1.mp4', poster: '/freedom-running.jpg' },
  { type: 'image' as const, src: '/carousel-mahi.jpeg' },
  { type: 'video' as const, src: '/reel-2.mp4', poster: '/freedom-aerial.jpg' },
  { type: 'image' as const, src: '/carousel-sandbar.jpeg' },
  { type: 'video' as const, src: '/reel-3.mp4', poster: '/fishing-grady-action.jpg' },
  { type: 'image' as const, src: '/carousel-catch.webp' },
  { type: 'video' as const, src: '/reel-4.mp4', poster: '/freedom-anchored.jpg' },
  { type: 'image' as const, src: '/carousel-offshore.jpeg' },
  { type: 'image' as const, src: '/carousel-boat.webp' },
];

function ReelsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' });
  };

  return (
    <section className="py-16 bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sky-400 font-semibold text-sm uppercase tracking-[0.15em] mb-1">From the Water</p>
            <h2 className="font-heading text-3xl text-white">Real trips. Real catches. Real Keys life.</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex-shrink-0 w-[max(0px,calc((100vw-80rem)/2))]" />
        {reelsMedia.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex-shrink-0 w-72 h-[28rem] rounded-2xl overflow-hidden snap-start relative group"
          >
            {item.type === 'video' ? (
              <video
                src={item.src}
                poster={item.poster}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
                className="w-full h-full object-cover bg-slate-900"
              />
            ) : (
              <img src={item.src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </motion.div>
        ))}
        <div className="flex-shrink-0 w-8" />
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <a
          href="https://www.instagram.com/blueskiescharter/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          Follow @blueskiescharter
        </a>
      </div>
    </section>
  );
}

const googleReviews = [
  { name: 'Sarah Conklin', time: '2 months ago', text: 'What a day and what an experience! From the moment we stepped on board, everything felt welcoming and effortless. The boat was immaculate, beautifully maintained, and incredibly comfortable, making for a smooth and relaxing ride the entire time. It truly felt like a luxury escape on the water.' },
  { name: 'Michelle Mroueh', time: '3 months ago', text: 'Had the best time out on the water! The boat was super clean, comfortable, and everything felt very well organized. Such a smooth ride and an amazing day overall. Highly recommend for anyone looking to enjoy a stress-free boat day! I will definitely be booking with them again.' },
  { name: 'Patricia Nelson-Reade', time: 'a year ago', text: 'What a day with BlueSkies Charter! The 29\' Grady White was very comfortable, nicely equipped and 2 Yamaha 300\'s ran like tops. We had an amazing fishing experience catching tuna, grouper and mahi. The fishing guide recommended by BlueSkies was just great.' },
  { name: 'Claudio Lunghi', time: '10 months ago', text: 'Rented a boat with a few buddies for a fishing trip and we chose blue skies because of the reviews and the Grady White boat they have. We were on a mission for tuna. Safe to say\u2014we weren\'t disappointed. The boat was super clean and the electronics were next level.' },
  { name: 'Robert A. Garan', time: 'a year ago', text: 'Had an incredible time renting a boat from Blue Skies Charter for a day in the Keys! The management team was super easy to work with\u2014friendly, professional, and made sure everything was set up perfectly for us. The boat was beautiful and in great shape.' },
  { name: 'Matt Forman', time: 'a year ago', text: 'I highly recommend Blue Skies Charters. Having rented boats multiple times in the Keys this was by far my best experience. Serge was a pleasure to deal with. The booking was simple and he made sure we had everything we needed.' },
  { name: 'Chria Maresca', time: 'a month ago', text: 'Had a blast out on the water perfect sunny day, clean boat, alligator reef and the lighthouse is a must see! 100% coming back Captain Bob was great.' },
  { name: 'Otto Conde', time: '10 months ago', text: 'Rented a boat for a fishing trip with a few friends out of Marathon, Florida. On the way to the humps, we got into a great mahi mahi bite and loaded up on some beautiful fish. It was an awesome day on the water!' },
  { name: 'Matt Vogel', time: 'a year ago', text: 'Myself and a few friends rented the Grady White from Blue Skies charter for a diving and fishing trip. The customer service was fantastic and easy. We went diving on the ocean side of Islamorada and Marathon and saw some gorgeous reefs and wildlife.' },
  { name: 'Jillian Courteau', time: '2 months ago', text: 'Was looking for something to do with my friends and we stumbled upon BlueSkies Charter. Bob set us up with a captain and a beautiful boat for a day at the Islamorada sandbar, and it was so much fun.' },
  { name: 'nicholas rydz', time: '9 months ago', text: 'Rented The Grady White freedom from blue skies in Islamorada and my friends and I took it down to Marathon for the weekend. It was so much fun the boat is very powerful very clean and it\'s able to fit a good amount of people.' },
  { name: 'Anastasia Polintan', time: '6 months ago', text: 'I had a great experience. I spoke to Bob and he set me up on a great trip. We had an absolutely great time we went to a sandbar and hung out there for a few hours. The boat was very clean and the best part is that there was a bathroom on board.' },
  { name: 'Edward Moseley', time: '3 months ago', text: 'My friends and I had a really really fantastic time with this company we went out for a sunset cruise and it was a great time. The captain made sure to make the ride as smooth as possible for us. I would go again.' },
  { name: 'Reilly Connell', time: '6 months ago', text: 'I would highly recommend Blue Skies. Booked through Bob and we had a great time on the boat we went to the Islamorada sandbar and had a great time. The boat came loaded with ice and fuel all we had to do was hop on do the safety briefing and go.' },
  { name: 'Sean Elliott', time: '9 months ago', text: 'I went down to the keys with some friends and we found blue skies charters on Google with some pretty good reviews so we decided to give them a try and it was pretty dang good. We actually took the boat to a restaurant on the water, which was super cool.' },
  { name: 'Kevin Geraldino Dominicano', time: '3 months ago', text: 'Best of the best, had a sick time fishing islamorada! Blue skies hooked us up with a sick boat! Ask for Bob!' },
  { name: 'Gloria Garan', time: '3 months ago', text: 'Highly recommend Blue Skies. Also book with Bob he helped us have an amazing trip. My family had an amazing time.' },
  { name: 'Jill Doucette', time: 'a year ago', text: 'Thanks Blue Skies for an amazing time in the Keys! Boat was clean / well maintained, seas were calm and the sky was blue. Had everything we needed for a fantastic day out on the water. The Blue Skies team was very professional.' },
  { name: 'Ashley Snoozy', time: '8 months ago', text: 'Took a charter out to the sandbar, was an awesome time! Good vibes, good peeps, great views, awesome memories. Would use Blue Skies Charter again for sure.' },
  { name: 'Andrew Woroch', time: '7 months ago', text: 'Rented the boat with some buddies. Boat was well kept and we came back with a huge haul from fishing. Owner was friendly and location is fantastic. Ate at the square grouper restaurant at the marina.' },
  { name: 'Lexi Friedrichs', time: '7 months ago', text: 'I rented a boat with my friends and it was so much fun super clean good time really enjoyed myself. If you rent ask for Sergey he will hook your trip up!' },
  { name: 'Elizabeth DiBiase', time: 'a year ago', text: 'I went down to the keys with a couple of my friends and we chose Blue Sky Charters to rent a boat and I can honestly say that was the best experience I have ever had. BSC had exceptional service, immaculate clean boat.' },
  { name: 'Courtney Ellison', time: 'a year ago', text: 'We went on a tour and it was all you could ask for! White glove service, beautiful locations, water that\'s out of this world. Anyone looking for a top notch trip should book here.' },
  { name: 'Mariko Delanoza', time: 'a year ago', text: 'Amazing experience with first class service! Everything went perfectly and the owner is outstanding.' },
  { name: 'sean case', time: '7 months ago', text: 'Had an amazing time out at the alligator reef then we went to the Islamorada Sandbar. They set us up good with a great captain. Reach out to Bob, he will get it done for you.' },
  { name: 'Michael Dane', time: '6 months ago', text: 'Great time went out yesterday on the boat. He set us up on the Grady. It was a lot of fun. Also asked to go to alligator reef. The weather was really good so we got to do it and it was a lot of fun.' },
  { name: 'Taylor Bray', time: '6 months ago', text: 'I went out to Islamorada with my friends and we rented through blue skies charters. I went to the islamorada sandbar and Bob set us up with a great charter. We had a fantastic time. Spent all day out in the sandbar.' },
];

function GoogleReviewsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [paused, setPaused] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -380 : 380, behavior: 'smooth' });
  };

  // Auto-scroll every 4 seconds, pause on hover or manual interaction
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 10;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 380, behavior: 'smooth' });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <section className="py-20 px-4 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {/* Google "G" icon */}
              <svg className="w-7 h-7" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              </div>
              <span className="text-slate-900 font-bold text-lg">5.0</span>
            </div>
            <h2 className="font-heading text-3xl md:text-4xl text-slate-900">Why our guests love us</h2>
            <p className="text-slate-500 mt-1">34 five-star reviews on Google</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setPaused(true); scroll('left'); setTimeout(() => setPaused(false), 8000); }}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center text-slate-600 transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setPaused(true); scroll('right'); setTimeout(() => setPaused(false), 8000); }}
              disabled={!canScrollRight}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center text-slate-600 transition-all shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        className="flex gap-5 overflow-x-auto scrollbar-hide px-4 max-w-7xl mx-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {googleReviews.map((review, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[340px] bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow snap-start flex flex-col"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {review.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-slate-900 font-semibold text-sm truncate">{review.name}</p>
                <p className="text-slate-400 text-xs">{review.time}</p>
              </div>
              <svg className="w-5 h-5 ml-auto flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div className="flex gap-0.5 mb-3">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-slate-600 text-sm leading-relaxed flex-1">"{review.text}"</p>
          </div>
        ))}
        <div className="flex-shrink-0 w-[340px] snap-start">
          <a
            href="https://www.google.com/maps/place/Blue+Skies+Charter+Florida+Keys/"
            target="_blank"
            rel="noopener noreferrer"
            className="h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 hover:border-sky-400 p-6 transition-colors group"
          >
            <svg className="w-10 h-10 mb-3 text-slate-400 group-hover:text-sky-500 transition-colors" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="currentColor" opacity=".6"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" opacity=".6"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" opacity=".6"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" opacity=".6"/>
            </svg>
            <p className="text-slate-600 font-semibold text-sm group-hover:text-sky-600 transition-colors">Read all reviews</p>
            <p className="text-slate-400 text-xs mt-1">on Google Maps</p>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data: boats } = trpc.boats.list.useQuery();
  const [weather, setWeather] = useState<any>(null);
  const [selectedBoat, setSelectedBoat] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const experiencesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/weather').then(r => r.json()).then(setWeather).catch(() => {});
  }, []);

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSlide(prev => (prev + 1) % heroSlides.length);
    }, heroSlides[activeSlide].duration);
    return () => clearTimeout(timer);
  }, [activeSlide]);

  const navigate = useNavigate();
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedBoat, setPickedBoat] = useState<number | null>(null);
  const { data: bookings } = trpc.bookings.list.useQuery();

  const activeBoats = boats?.filter(b => b.status === 'active') ?? [];

  const bookedDates = useMemo(() => {
    if (!bookings) return new Set<string>();
    return new Set(bookings.filter(b => b.status !== 'cancelled').map(b => `${b.boatId}-${b.charterDate}`));
  }, [bookings]);

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════
          HERO — Cinematic crossfading slideshow with Ken Burns
      ═══════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative h-screen flex items-center overflow-hidden -mt-16 pt-16">
        {/* Slideshow layers */}
        {heroSlides.map((slide, i) => (
          <div
            key={slide.img}
            className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
              i === activeSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className={`absolute inset-0 bg-cover bg-center ${slide.kenBurns} ${
                i === activeSlide ? 'running' : 'paused'
              }`}
              style={{ backgroundImage: `url(${slide.img})` }}
            />
          </div>
        ))}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />

        {/* Content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-4 w-full py-20">
          <div className="max-w-2xl">
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-sky-300 text-sm font-medium tracking-[0.2em] uppercase mb-4"
            >
              Islamorada, Florida Keys
            </motion.p>

            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="font-heading text-5xl md:text-7xl text-white mb-6 leading-[1.05]"
            >
              Boat Rentals in the Florida Keys
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-white/70 text-lg md:text-xl mb-10 leading-relaxed max-w-lg"
            >
              Premium Grady White boats available bareboat or with a captain.
              Based in Islamorada, serving Key Largo to Marathon.
            </motion.p>

            {/* Inline booking prompt */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link
                to="/book"
                className="group bg-sky-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:bg-sky-600 shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2"
              >
                Check Availability
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="sms:5165870438"
                className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl text-lg font-medium transition-all hover:bg-white/20 border border-white/20 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Text Us
              </a>
            </motion.div>

            {/* Weather chip */}
            {weather?.current && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-8 inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 text-sm text-white/80 border border-white/10"
              >
                <span className="flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-300" />
                  {Math.round(weather.current.temperature_2m)}°F
                </span>
                <span className="w-px h-4 bg-white/20" />
                <span>{weatherCodes[weather.current.weather_code] ?? 'Clear'}</span>
                <span className="w-px h-4 bg-white/20" />
                <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{Math.round(weather.current.wind_speed_10m)} mph</span>
              </motion.div>
            )}
          </div>

          {/* Slide indicators */}
          <div className="absolute bottom-10 right-8 flex gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`transition-all duration-500 rounded-full ${
                  i === activeSlide
                    ? 'w-8 h-2 bg-sky-400'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHY BLUE SKIES — Quality differentiators
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-2">The Blue Skies Difference</p>
            <h2 className="font-heading text-3xl md:text-4xl text-slate-900">Built for boaters who know the difference.</h2>
            <p className="text-slate-500 mt-3 max-w-2xl mx-auto">No deck boats. No beat-up pontoons. No apologies when you step on board.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Ship,
                title: 'Grady White Only',
                desc: 'We run Grady Whites — period. Deep-V hulls, SeaV² technology, twin Yamahas. Built for offshore performance and engineered to handle anything the Keys throw at you.',
              },
              {
                icon: Check,
                title: 'Detailed Before Every Trip',
                desc: 'Every boat is fully detailed before every departure. Fresh cushions, polished hardware, stocked cooler, topped-off fuel. When you step on board, it feels new.',
              },
              {
                icon: Anchor,
                title: 'Maintained, Not Patched',
                desc: 'We run a preventive maintenance program — not a "fix it when it breaks" operation. Twin Yamaha 300s serviced on schedule. Electronics calibrated. Hull inspected weekly.',
              },
              {
                icon: Star,
                title: 'Fully Rigged & Ready',
                desc: 'Garmin GPS, fish finder, outriggers, livewells, rod holders, Bluetooth, freshwater shower, onboard head. Everything you\'d put on your own boat — already on ours.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-50 rounded-2xl p-6 hover:shadow-lg transition-shadow border border-slate-100"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-500 text-white flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <h3 className="text-slate-900 font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/about" className="inline-flex items-center gap-2 text-sky-600 font-semibold hover:text-sky-700 transition-colors">
              Read our story <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          REELS CAROUSEL — Photos & Videos
      ═══════════════════════════════════════════════════════════ */}
      <ReelsCarousel />

      {/* ═══════════════════════════════════════════════════════════
          THE FLEET — Side by side cards
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-1">The Fleet</p>
            <h2 className="font-heading text-3xl md:text-4xl text-slate-900">Grady White fleet. Pristine. Ready to go.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {activeBoats.map((boat, i) => {
              const features = boat.features ? JSON.parse(boat.features as string) : [];
              const isPickedBoat = pickedBoat === boat.id;

              // Calendar logic
              const cy = calendarMonth.getFullYear(), cm = calendarMonth.getMonth();
              const firstDay = new Date(cy, cm, 1).getDay();
              const daysInMonth = new Date(cy, cm + 1, 0).getDate();
              const today = new Date(); today.setHours(0, 0, 0, 0);

              const calDays = [];
              for (let d = 0; d < firstDay; d++) calDays.push(<div key={`e${d}`} />);
              for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(cy, cm, d);
                const ds = date.toISOString().split('T')[0];
                const past = date < today;
                const booked = bookedDates.has(`${boat.id}-${ds}`);
                const selected = isPickedBoat && pickedDate === ds;

                calDays.push(
                  <button
                    key={d}
                    disabled={past || booked}
                    onClick={() => { setPickedBoat(boat.id); setPickedDate(ds); }}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
                      selected ? 'bg-sky-500 text-white font-semibold shadow-sm' :
                      past ? 'text-slate-300' :
                      booked ? 'bg-red-50 text-red-300 line-through' :
                      'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                    }`}
                  >
                    {d}
                  </button>
                );
              }

              return (
                <div
                  key={boat.id}
                  className="group bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-300/40 hover:shadow-2xl hover:shadow-sky-500/20 transition-all duration-500 border border-slate-200/80 hover:border-sky-300 ring-1 ring-slate-100 hover:ring-sky-200"
                >
                  <div>
                    {/* Photo */}
                    <div className="relative h-80 overflow-hidden">
                      <img src={boat.imageUrl ?? ''} alt={boat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-sky-500/30">{boat.lengthFt}ft</span>
                        <span className="bg-white/95 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">Up to {boat.capacity} guests</span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center gap-1 bg-amber-400/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          <Star className="w-3 h-3 fill-current" /> 5.0
                        </div>
                      </div>
                      <div className="absolute bottom-5 left-5 right-5">
                        <div className="inline-block bg-white/15 backdrop-blur-sm text-white/90 text-xs font-semibold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-2">
                          {boat.name === 'Freedom' ? 'Family Favorite' : 'Offshore Beast'}
                        </div>
                        <h3 className="font-heading text-4xl text-white drop-shadow-lg mb-1">{boat.name}</h3>
                        <p className="text-white/70 text-sm font-medium tracking-wide">{boat.model}</p>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-7 flex flex-col">
                      <div className="flex items-center gap-2 mb-5">
                        <span className="flex items-center gap-1.5 text-sky-700 text-xs font-semibold bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100">
                          <MapPin className="w-3.5 h-3.5" /> {boat.homePort}
                        </span>
                        <span className="text-slate-500 text-xs bg-slate-100 px-3 py-1.5 rounded-full font-medium">
                          {boat.type === 'dual_console' ? 'Dual Console' : 'Center Console'}
                        </span>
                      </div>

                      <p className="text-slate-600 text-[15px] leading-relaxed mb-6">{boat.description}</p>

                      {/* Features grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-6">
                        {features.slice(0, 6).map((f: string) => (
                          <div key={f} className="flex items-center gap-2.5">
                            <div className="w-5 h-5 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-sky-600" />
                            </div>
                            <span className="text-slate-700 text-sm">{f}</span>
                          </div>
                        ))}
                        {features.length > 6 && (
                          <Link to={`/boat/${boat.id}`} className="text-sky-500 text-sm font-medium flex items-center gap-1 hover:text-sky-600">
                            +{features.length - 6} more <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>

                      {/* Trust badges */}
                      <div className="flex items-center gap-5 mb-7 py-4 border-y border-slate-100 bg-slate-50/50 -mx-7 px-7">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <span className="text-slate-600 text-sm font-medium">Detailed before every trip</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <span className="text-slate-600 text-sm font-medium">Free weather reschedule</span>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex items-center gap-4 mt-auto">
                        <Link
                          to={`/book?boat=${boat.id}`}
                          className="group/btn bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white px-8 py-4 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 flex items-center gap-2"
                        >
                          Check Availability <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                          to={`/boat/${boat.id}`}
                          className="text-slate-500 hover:text-sky-600 px-4 py-4 text-sm font-semibold transition-colors"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SOCIAL PROOF — Google Reviews Carousel
      ═══════════════════════════════════════════════════════════ */}
      <GoogleReviewsCarousel />

      {/* ═══════════════════════════════════════════════════════════
          EXPERIENCES — Horizontal scroll cards
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-1">Experiences</p>
              <h2 className="font-heading text-3xl md:text-4xl text-slate-900">What do you want to do?</h2>
            </div>
            <Link to="/experiences" className="hidden md:flex items-center gap-1 text-sky-600 font-medium text-sm hover:text-sky-700">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div ref={experiencesRef} className="flex gap-5 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {[
              { title: 'Offshore Fishing', desc: 'Mahi, wahoo, tuna — the Gulf Stream is right there.', img: '/catch-queen-snapper.jpg', icon: Fish },
              { title: 'Sandbar & Islands', desc: 'Alligator Reef, Indian Key, crystal clear shallows.', img: '/alligator-reef.jpg', icon: Waves },
              { title: 'Sunset Cruises', desc: 'BYOB. We bring the views.', img: '/boat-sunset.jpeg', icon: Sun },
              { title: 'Just Cruising', desc: 'No agenda. Pick a spot, drop anchor, enjoy the day.', img: '/freedom-anchored.jpg', icon: Ship },
            ].map((exp, i) => (
              <motion.div
                key={exp.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex-shrink-0 w-72 snap-start"
              >
                <Link to="/book" className="block group">
                  <div className="relative h-80 rounded-2xl overflow-hidden mb-4">
                    <img src={exp.img} alt={exp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-semibold text-lg">{exp.title}</h3>
                      <p className="text-white/70 text-sm mt-1">{exp.desc}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHY BLUE SKIES — Punchy, single row
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-sky-50 border-y border-sky-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-slate-900 text-center mb-12">Why people choose us.</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { title: 'Pristine boats', desc: 'Detailed before every trip. Not just clean — immaculate.', icon: '✓' },
              { title: 'No hidden fees', desc: 'The price you see is the price you pay. Period.', icon: '✓' },
              { title: 'Free reschedule', desc: 'Bad weather? We move your trip, no charge, no hassle.', icon: '✓' },
              { title: 'Text us anytime', desc: 'Real people. Fast answers. Before, during, or after your trip.', icon: '✓' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ y: 15, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WEATHER + DESTINATIONS — Combined
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Destinations */}
            <div>
              <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-1">Where we go</p>
              <h3 className="font-heading text-2xl text-slate-900 mb-6">From our dock, you can reach:</h3>
              <div className="space-y-4">
                {[
                  { name: 'Key Largo', time: '~20 min', desc: 'Diving capital. John Pennekamp, coral reefs, crystal water.', slug: 'key-largo' },
                  { name: 'Islamorada', time: 'Home base', desc: 'Sport fishing capital. Sandbars, Alligator Reef, sunset spots.', slug: 'islamorada' },
                  { name: 'Marathon', time: '~45 min', desc: 'Heart of the Keys. Sombrero Reef, Seven Mile Bridge, family-friendly.', slug: 'marathon' },
                ].map((dest) => (
                  <Link key={dest.name} to={`/${dest.slug}`} className="flex items-start gap-4 group p-3 -mx-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 transition-colors">
                      <MapPin className="w-5 h-5 text-sky-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{dest.name}</h4>
                        <span className="text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{dest.time}</span>
                      </div>
                      <p className="text-slate-500 text-sm mt-0.5">{dest.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 mt-3 group-hover:text-sky-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Weather */}
            {weather?.daily && (
              <div>
                <p className="text-sky-500 font-semibold text-sm uppercase tracking-[0.15em] mb-1">This week</p>
                <h3 className="font-heading text-2xl text-slate-900 mb-6">Islamorada forecast</h3>
                <div className="grid grid-cols-4 gap-3">
                  {weather.daily.time.slice(0, 4).map((date: string, i: number) => (
                    <div key={date} className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <p className="text-slate-500 text-xs mb-2">
                        {i === 0 ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className="text-2xl font-bold text-slate-900">{Math.round(weather.daily.temperature_2m_max[i])}°</p>
                      <p className="text-slate-400 text-xs">{Math.round(weather.daily.temperature_2m_min[i])}°</p>
                      {weather.daily.precipitation_probability_max && (
                        <p className="text-sky-500 text-xs mt-1">
                          <Droplets className="w-3 h-3 inline" /> {weather.daily.precipitation_probability_max[i]}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-6 bg-sky-50 rounded-xl p-4 border border-sky-100">
                  <p className="text-sky-800 text-sm font-medium">Good weather? Lock in your date.</p>
                  <p className="text-sky-600 text-xs mt-1">Popular days fill up fast, especially weekends.</p>
                  <Link to="/book" className="inline-flex items-center gap-1 text-sky-600 font-semibold text-sm mt-3 hover:text-sky-700">
                    Check availability <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ — Conversational, fewer questions
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-3xl text-slate-900 text-center mb-10">Quick answers</h2>
          <div className="space-y-3">
            {[
              { q: 'Do I need a boating license?', a: 'Nope. No license required in Florida. We\'ll walk you through everything before you leave the dock.' },
              { q: 'Can I get a captain?', a: 'Yes — all our boats are available bareboat (you drive) or with a USCG-licensed captain. Just select it when booking.' },
              { q: 'How much does it cost?', a: 'Half-day rentals start at $700, full-day at $900. That includes safety gear, cooler, ice, and a full boat walkthrough. No hidden fees.' },
              { q: 'What should I bring?', a: 'Sunscreen, sunglasses, drinks, snacks, and a towel. We handle the rest — safety equipment, fishing/snorkeling gear available on board.' },
              { q: 'What if the weather is bad?', a: 'Free reschedule, no questions asked. We watch the forecast and reach out proactively if your day looks rough.' },
              { q: 'Where do I pick up the boat?', a: 'Our marina is in Islamorada. We send you the exact address and slip number after you book.' },
            ].map((faq, i) => (
              <details key={i} className="bg-white rounded-xl group border border-slate-100">
                <summary className="flex items-center justify-between cursor-pointer p-5 text-slate-800 font-medium text-sm list-none">
                  {faq.q}
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-5 pb-5 text-slate-500 text-sm leading-relaxed -mt-1">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA — Clean, direct
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/boat-sunset.jpeg)' }} />
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-4xl md:text-5xl text-white mb-4">
              Ready?
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-md mx-auto">
              Pick a boat, pick a day, and we'll see you at the dock.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/book"
                className="group bg-sky-500 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all hover:bg-sky-600 shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2"
              >
                Book Your Boat
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="sms:5165870438"
                className="text-white/50 hover:text-white px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" /> or text us
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
