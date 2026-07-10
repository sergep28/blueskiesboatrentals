import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { RENTAL_AGREEMENT_SECTIONS as sections, AGREEMENT_INTRO, AGREEMENT_ACKNOWLEDGMENT, AGREEMENT_VERSION } from '../lib/rentalAgreementText';

export default function RentalAgreementPage() {
  return (
    <div className="bg-white min-h-screen">
      <SEO title="Rental Agreement" description="Blue Skies Boat Rentals rental agreement and terms. Review before your Florida Keys boat rental." path="/rental-agreement" noindex={true} />
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl font-normal mb-2">Rental Agreement</h1>
          <p className="text-white/60 text-sm">Blue Skies Charter LLC — Bareboat Charter Terms & Conditions</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="prose prose-slate prose-sm max-w-none">
          <p className="text-slate-500 text-sm mb-8">{AGREEMENT_INTRO}</p>

          {sections.map((section) => (
            <div key={section.title} className="mb-8">
              <h2 className="text-slate-900 font-semibold text-base mb-1">{section.title}</h2>
              {section.subtitle && <p className="text-slate-600 text-sm font-medium mb-2">{section.subtitle}</p>}
              {section.intro && <p className="text-slate-600 text-sm mb-3">{section.intro}</p>}
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="text-slate-600 text-sm leading-relaxed pl-4 border-l-2 border-slate-100">
                    {item}
                  </li>
                ))}
              </ul>
              {section.footer && (
                <p className="text-slate-600 text-sm mt-3 pl-4 border-l-2 border-amber-200 bg-amber-50 py-2 pr-3 rounded-r">
                  {section.footer}
                </p>
              )}
            </div>
          ))}

          <div className="border-t border-slate-200 pt-8 mt-12">
            <p className="text-slate-900 text-sm font-medium mb-2">Acknowledgment</p>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">{AGREEMENT_ACKNOWLEDGMENT}</p>
            <p className="text-slate-400 text-xs">
              Last updated: June 2026. Agreement version {AGREEMENT_VERSION}. This agreement is governed by the laws of the State of Florida.
              For questions, contact us at info@blueskiescharter.com or text (754) 254-2293.
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            to="/book"
            className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Book a Boat
          </Link>
          <Link
            to="/"
            className="text-slate-500 hover:text-slate-700 px-6 py-3 text-sm font-medium transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
