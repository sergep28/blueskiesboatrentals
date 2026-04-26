import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Anchor } from 'lucide-react';

export default function NotFoundPage() {
  useEffect(() => { document.title = 'Page Not Found | Blue Skies Boat Rentals'; }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center">
        <Anchor className="w-12 h-12 text-sky-300 mx-auto mb-4" />
        <h1 className="font-heading text-5xl text-slate-900 mb-2">404</h1>
        <p className="text-slate-500 mb-8">This page drifted out to sea.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
            Back Home
          </Link>
          <Link to="/book" className="border border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-colors">
            Book a Boat
          </Link>
        </div>
      </div>
    </div>
  );
}
