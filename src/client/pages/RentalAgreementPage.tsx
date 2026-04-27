import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Rental Period & Fees',
    items: [
      'The rental period begins at the agreed-upon pickup time and ends at the agreed-upon return time.',
      'All fees are due at the time of booking. Pricing includes the boat rental only — fuel, captain (if applicable), and optional add-ons are additional.',
      'Multi-day rentals are priced per day. Custom pricing may apply for weekly or monthly rentals.',
      'A security deposit may be required and will be refunded upon safe return of the vessel in its original condition.',
    ],
  },
  {
    title: '2. Fuel Policy',
    items: [
      'The boat will be provided with a full tank of fuel.',
      'The renter is responsible for returning the boat with a full tank. A fuel dock is available at the marina.',
      'If the boat is not returned with a full tank, a refueling fee will be charged at the prevailing marina rate plus a $50 service fee.',
    ],
  },
  {
    title: '3. Cancellation & Weather Policy',
    items: [
      'Cancellations made 48 hours or more before the rental date will receive a full refund.',
      'Cancellations made within 48 hours of the rental date are non-refundable but may be rescheduled at our discretion.',
      'In the event of unsafe weather conditions (small craft advisory, tropical storm, etc.), Blue Skies will offer a full reschedule or refund at no charge.',
      'Weather-related decisions are made by Blue Skies management and are final.',
    ],
  },
  {
    title: '4. Operator Requirements',
    items: [
      'The primary operator must be at least 25 years of age.',
      'A valid government-issued photo ID (driver\'s license or passport) is required at pickup.',
      'The operator must complete a safety briefing and boat orientation before departure.',
      'If a captain is not requested, the renter assumes full responsibility for the safe operation of the vessel.',
      'No prior boating experience is required for captained charters.',
    ],
  },
  {
    title: '5. Rules of Operation',
    items: [
      'Maximum passenger capacity must not be exceeded at any time.',
      'The operator must comply with all federal, state, and local boating laws and regulations.',
      'No operation of the vessel under the influence of alcohol or drugs.',
      'No towing of tubes, skis, wakeboards, or any other towable devices.',
      'The vessel must remain within the agreed-upon operating area (Florida Keys waters).',
      'No smoking on board.',
      'All passengers must have access to a life jacket at all times. Children under 6 must wear a life jacket.',
    ],
  },
  {
    title: '6. Damage & Liability',
    items: [
      'The renter is responsible for any damage to the vessel, equipment, or third-party property caused during the rental period.',
      'The renter agrees to report any damage, mechanical issues, or incidents immediately to Blue Skies management.',
      'Blue Skies is not liable for personal injury, loss of personal property, or any indirect damages arising from the use of the vessel.',
      'The renter agrees to indemnify and hold harmless Blue Skies Charter Florida Keys, its owners, employees, and agents from any claims, damages, or liabilities.',
    ],
  },
  {
    title: '7. Return of Vessel',
    items: [
      'The vessel must be returned to the designated marina at the agreed-upon time.',
      'Late returns will be charged at a rate of $100 per hour.',
      'The vessel must be returned in the same condition as received, reasonable wear and tear excepted.',
      'All personal belongings, trash, and fishing debris must be removed from the vessel upon return.',
    ],
  },
  {
    title: '8. Assumption of Risk',
    items: [
      'The renter acknowledges that boating involves inherent risks including but not limited to: changing weather conditions, sea conditions, equipment failure, encounters with marine life, and the actions of other boaters.',
      'The renter voluntarily assumes all risks associated with the rental and use of the vessel.',
      'The renter agrees that this assumption of risk extends to all passengers and guests aboard the vessel during the rental period.',
    ],
  },
  {
    title: '9. Agreement & Acknowledgment',
    items: [
      'By signing below, the renter acknowledges that they have read, understood, and agree to all terms and conditions of this Rental Agreement.',
      'This agreement constitutes the entire agreement between Blue Skies Charter Florida Keys and the renter.',
      'Electronic signatures and checkbox acceptance are legally binding and equivalent to a handwritten signature.',
    ],
  },
];

export default function RentalAgreementPage() {
  useEffect(() => {
    document.title = 'Rental Agreement | Blue Skies Boat Rentals';
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading text-3xl md:text-4xl font-normal mb-2">Rental Agreement</h1>
          <p className="text-white/60 text-sm">Blue Skies Charter Florida Keys — Boat Rental Terms & Conditions</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="prose prose-slate prose-sm max-w-none">
          <p className="text-slate-500 text-sm mb-8">
            This Rental Agreement ("Agreement") is entered into between Blue Skies Charter Florida Keys ("Blue Skies", "we", "us")
            and the individual renting the vessel ("Renter", "you"). By booking a rental and signing this agreement,
            you agree to the following terms and conditions.
          </p>

          {sections.map((section) => (
            <div key={section.title} className="mb-8">
              <h2 className="text-slate-900 font-semibold text-base mb-3">{section.title}</h2>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="text-slate-600 text-sm leading-relaxed pl-4 border-l-2 border-slate-100">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="border-t border-slate-200 pt-8 mt-12">
            <p className="text-slate-400 text-xs">
              Last updated: April 2026. This agreement is governed by the laws of the State of Florida.
              For questions, contact us at info@blueskiescharter.com or text (516) 587-0438.
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
