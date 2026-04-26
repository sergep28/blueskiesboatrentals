import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Ship, Users, Handshake, BarChart3, Anchor, ArrowLeft, Award, Mail, Link2 } from 'lucide-react';

const sidebarLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/quotes', label: 'Send Booking Link', icon: Link2 },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/fleet', label: 'Fleet', icon: Ship },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/rewards', label: 'Rewards', icon: Award },
  { to: '/admin/marketing', label: 'Marketing', icon: Mail },
  { to: '/admin/partners', label: 'Partners', icon: Handshake },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg">
            <Anchor className="w-5 h-5 text-sky-400" />
            <span>BSBR <span className="text-sky-400">Admin</span></span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map(link => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
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

      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
