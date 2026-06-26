import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Ship, Users, Handshake, BarChart3, Anchor, ArrowLeft, Award, Mail, Link2, Menu, X, FileText, Lock, Home, ShieldCheck, ClipboardCheck, AtSign } from 'lucide-react';

const sidebarLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/quotes', label: 'Send Booking Link', icon: Link2 },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/waivers', label: 'Waivers', icon: ShieldCheck },
  { to: '/admin/inspections', label: 'Inspections', icon: ClipboardCheck },
  { to: '/admin/fleet', label: 'Fleet', icon: Ship },
  { to: '/admin/stays', label: 'Stays', icon: Home },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/rewards', label: 'Rewards', icon: Award },
  { to: '/admin/blog', label: 'Blog Posts', icon: FileText },
  { to: '/admin/marketing', label: 'Marketing', icon: Mail },
  { to: '/admin/email', label: 'Email', icon: AtSign },
  { to: '/admin/partners', label: 'Partners', icon: Handshake },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const ADMIN_PIN = '1101';

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleLogin = () => {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem('admin_auth', 'true');
      setAuthed(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-sky-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-heading text-2xl text-slate-900 mb-1">Admin Access</h1>
          <p className="text-slate-500 text-sm mb-6">Enter your PIN to continue</p>
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Enter PIN"
            className={`w-full border ${pinError ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-lg px-4 py-3 text-center text-lg tracking-[0.3em] outline-none focus:ring-2 focus:ring-sky-500 mb-4`}
            autoFocus
          />
          {pinError && <p className="text-red-500 text-sm mb-4">Wrong PIN. Try again.</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            Enter Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white flex items-center justify-between px-4 py-3 md:hidden">
        <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg">
          <Anchor className="w-5 h-5 text-sky-400" />
          <span>BSBR <span className="text-sky-400">Admin</span></span>
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-full z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <div className="p-4 border-b border-slate-700 hidden md:block">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg">
            <Anchor className="w-5 h-5 text-sky-400" />
            <span>BSBR <span className="text-sky-400">Admin</span></span>
          </Link>
        </div>
        <div className="h-12 md:hidden" /> {/* Spacer for mobile header */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map(link => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-sky-500/20 text-sky-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to Site
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto mt-12 md:mt-0">
        <Outlet />
      </main>
    </div>
  );
}
