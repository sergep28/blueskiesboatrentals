import { Outlet, Link, useLocation } from 'react-router-dom';
import { Anchor, Menu, X, Instagram, Facebook, ChevronDown, MapPin, Phone, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const destinations = [
  { to: '/key-largo', label: 'Key Largo', type: 'location' },
  { to: '/islamorada', label: 'Islamorada', type: 'location' },
  { to: '/marathon', label: 'Marathon', type: 'location' },
];

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'Our Story' },
  { to: '/experiences', label: 'Experiences' },
  { type: 'dropdown', label: 'Destinations' },
  { to: '/stays', label: 'Homes' },
  { to: '/guide', label: 'Keys Guide' },
  { to: '/gift', label: 'Gift Cards' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/blog', label: 'The Log' },
  { to: '/loyalty', label: 'Rewards' },
  { to: '/partners', label: 'Partners' },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [mobileDestOpen, setMobileDestOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setDestOpen(false);
    setMobileOpen(false);
    setMobileDestOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isDestActive = destinations.some(d => location.pathname === d.to);
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-lg shadow-sm border-b border-slate-100'
          : isHome ? 'bg-transparent' : 'bg-white border-b border-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex flex-col leading-none">
            <span className={`font-heading text-base font-semibold tracking-wide ${scrolled || !isHome ? 'text-slate-900' : 'text-white'}`}>Blue Skies</span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-sky-500 font-medium">Boat Rentals</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link, i) => {
              if (link.type === 'dropdown') {
                return (
                  <div key="destinations" ref={dropdownRef} className="relative">
                    <button
                      onClick={() => setDestOpen(!destOpen)}
                      className={`text-xs tracking-wide px-3 py-2 rounded-full transition-all flex items-center gap-1 ${
                        isDestActive
                          ? 'bg-sky-50 text-sky-600'
                          : scrolled || !isHome
                            ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {link.label}
                      <ChevronDown className={`w-3 h-3 transition-transform ${destOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {destOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl shadow-slate-200/50"
                        >
                          <div className="py-2">
                            {destinations.map((dest) => (
                              <Link
                                key={dest.to}
                                to={dest.to}
                                className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                                  location.pathname === dest.to
                                    ? 'text-sky-600 bg-sky-50'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                <MapPin className="w-3 h-3 text-sky-400" />
                                {dest.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link
                  key={link.to}
                  to={link.to!}
                  className={`text-xs tracking-wide px-3 py-2 rounded-full transition-all ${
                    location.pathname === link.to
                      ? 'bg-sky-50 text-sky-600'
                      : scrolled || !isHome
                        ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              to="/book"
              className="ml-2 px-6 py-2.5 rounded-full text-xs font-semibold tracking-[0.1em] uppercase transition-all hover:scale-105 bg-sky-500 text-white shadow-lg shadow-sky-500/25 hover:bg-sky-600"
            >
              Book Now
            </Link>
          </nav>

          <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen
              ? <X className={`w-6 h-6 ${scrolled || !isHome ? 'text-slate-800' : 'text-white'}`} />
              : <Menu className={`w-6 h-6 ${scrolled || !isHome ? 'text-slate-800' : 'text-white'}`} />
            }
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden bg-white border-t border-slate-100"
            >
              <div className="px-4 py-4 flex flex-col gap-1">
                {navLinks.map((link) => {
                  if (link.type === 'dropdown') {
                    return (
                      <div key="destinations-mobile">
                        <button
                          onClick={() => setMobileDestOpen(!mobileDestOpen)}
                          className="flex items-center justify-between w-full py-2.5 text-slate-600 hover:text-sky-600 font-medium"
                        >
                          Destinations
                          <ChevronDown className={`w-4 h-4 transition-transform ${mobileDestOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {mobileDestOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-4 pb-2 space-y-1">
                                {destinations.map(dest => (
                                  <Link
                                    key={dest.to}
                                    to={dest.to}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-2 py-2 text-slate-400 hover:text-sky-600 text-sm"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    {dest.label}
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={link.to}
                      to={link.to!}
                      onClick={() => setMobileOpen(false)}
                      className="py-2.5 text-slate-600 hover:text-sky-600 font-medium"
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <Link
                  to="/book"
                  onClick={() => setMobileOpen(false)}
                  className="bg-sky-500 text-white text-center px-4 py-2.5 rounded-full font-semibold mt-2"
                >
                  Book Now
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex flex-col leading-none mb-4">
                <span className="font-heading text-base font-semibold tracking-wide text-white">Blue Skies</span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-sky-400 font-medium">Boat Rentals</span>
              </div>
              <p className="text-sm text-slate-500">Boat rentals in the Florida Keys. Based in Islamorada, serving Key Largo to Marathon.</p>
            </div>
            <div>
              <h4 className="text-xs tracking-[0.15em] uppercase text-slate-500 mb-3">Destinations</h4>
              <div className="flex flex-col gap-2 text-sm">
                {destinations.map(d => (
                  <Link key={d.to} to={d.to} className="text-slate-500 hover:text-sky-400 transition-colors">{d.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs tracking-[0.15em] uppercase text-slate-500 mb-3">Quick Links</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link to="/book" className="text-slate-500 hover:text-sky-400 transition-colors">Book a Boat</Link>
                <Link to="/gallery" className="text-slate-500 hover:text-sky-400 transition-colors">Gallery</Link>
                <Link to="/blog" className="text-slate-500 hover:text-sky-400 transition-colors">The Log</Link>
                <Link to="/partners" className="text-slate-500 hover:text-sky-400 transition-colors">Partner Program</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs tracking-[0.15em] uppercase text-slate-500 mb-3">Contact</h4>
              <div className="text-sm space-y-1 text-slate-500">
                <p>Islamorada, Florida Keys</p>
                <p>info@blueskiescharter.com</p>
                <p>(516) 587-0438</p>
              </div>
              <div className="flex gap-3 mt-4">
                <a href="https://www.instagram.com/blueskiescharter/" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-pink-400 transition-colors"><Instagram className="w-4 h-4" /></a>
                <a href="https://facebook.com/blueskiescharter" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-blue-400 transition-colors"><Facebook className="w-4 h-4" /></a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-slate-800 text-center text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Blue Skies Boat Rentals. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating Text Us Button — hidden on booking page to avoid covering Continue button */}
      {!location.pathname.startsWith('/book') && (
        <a
          href="sms:5165870438&body=Hi! I have a question about booking a boat with Blue Skies."
          className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all hover:scale-105 flex items-center gap-2 pl-5 pr-6 py-3.5 group"
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-sm">Text Us</span>
        </a>
      )}
    </div>
  );
}
