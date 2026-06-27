import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const sections = [
  {
    title: 'Vessel Operator Competency & Responsibility Agreement',
    subtitle: 'Self-Operated Vessel Acknowledgment (If Applicable)',
    intro: 'By signing below, the vessel operator acknowledges and agrees to the following:',
    items: [
      'If acting as the operator, I confirm that I am experienced in operating powerboats of similar size and horsepower to the vessel being rented.',
      'I understand that this vessel may exceed 28 feet in length and twin-engine operation and requires competent handling.',
      'I confirm that I am physically and mentally capable of safely operating the vessel.',
      'I agree to operate the vessel in accordance with all federal, state, and local boating laws and regulations.',
      'I will not operate the vessel under the influence of alcohol or drugs.',
      'I understand that I am responsible for the safe operation of the vessel and the safety of all passengers onboard.',
      'I agree to follow all operational instructions and safety briefings provided by Blue Skies Charter prior to departure.',
      'I accept responsibility for any damage caused to the vessel due to negligent operation.',
    ],
    footer: 'I understand that the operator of the vessel may be different from the individual who reserved the rental, including if operated by a captain hired by me or any person I permit to operate the vessel, I remain fully responsible and liable for the vessel at all times during the rental period.',
  },
  {
    title: 'Bareboat Charter Agreement & Transfer of Control',
    items: [
      '1. Transfer of Possession and Control — The Owner hereby agrees to lease the vessel to the Charterer on a bareboat (demise) basis. Upon commencement of the charter period, the Owner relinquishes full and exclusive possession, command, and control of the vessel to the Charterer. The Charterer assumes complete responsibility for the operation, navigation, and management of the vessel for the duration of the charter. The Charterer shall be deemed the owner pro hac vice of the vessel for the duration of the charter.',
      '2. Charterer Responsibility — The Charterer acknowledges and agrees that they are solely responsible for: the safe operation and navigation of the vessel; the conduct and safety of all passengers onboard; compliance with all applicable federal, state, and local laws; ensuring that the vessel is operated by a qualified and competent individual. The Owner shall have no authority or control over the vessel during the charter period.',
      '3. Captain Selection — The Charterer has the sole and exclusive right to select and hire a captain or operator of their choosing. The Owner may provide a list of independent, qualified captains as a courtesy only. The Charterer is under no obligation to select from this list. Any captain hired is the direct responsibility of the Charterer. Under no circumstances shall the Owner assign, require, or mandate a specific captain. Captain services are contracted and paid separately from the vessel rental and are not included in this Agreement.',
      '4. Independent Contractor Status of Captain — Any captain or operator engaged by the Charterer is an independent contractor, is not an employee, agent, or representative of Blue Skies Charter, and is selected, hired, directed, and compensated solely by the Charterer. The Charterer acknowledges and agrees that they are the responsible party for the vessel at all times during the rental period, regardless of who is operating the vessel. The Owner shall have no liability whatsoever for the acts, omissions, negligence, or conduct of any captain or operator selected by the Charterer.',
      '5. No Owner Operation or Presence — To maintain compliance with U.S. Coast Guard bareboat charter regulations: the Owner and its representatives shall not operate the vessel; the Owner shall not remain onboard during the charter period. Any violation of this provision may result in immediate termination of the charter without refund.',
      '6. Charterer Acknowledgment of Bareboat Status — The Charterer acknowledges that this agreement constitutes a bareboat charter arrangement and not a captained charter. The Charterer understands that they are assuming full control and responsibility of the vessel and that Blue Skies Charter is not providing transportation services.',
    ],
  },
  {
    title: 'Equipment & Responsibility Notice',
    intro: 'The following equipment is included with your rental:',
    items: [
      '2 Anchors & Lines, 4 Docking Lines, 2 Fire Extinguishers, 10 Life Vests, 1 Pack of Safety Flares, 2 Fenders.',
      'Renter Responsibility — As the renter, you are responsible for all of these items during your rental period. If any equipment is lost, damaged, or missing, you will be required to replace it.',
      'The renter is responsible for returning the boat the way you found it, with a FULL TANK of fuel.',
      'All renters are subject to an onboarding and offboarding inspection. Any damages or missing items identified during the offboarding inspection will be deducted from the security deposit and/or billed to the renter.',
    ],
  },
  {
    title: 'Condition Inspection Agreement',
    items: [
      'As a renter of a Blue Skies Charter vessel, you acknowledge and agree that you are fully and solely responsible for the care, custody, and condition of the vessel and all associated equipment during the entire rental period.',
      'All vessels undergo a detailed Onboarding Inspection before departure and an Offboarding Inspection upon return. These inspections are completed with both a Blue Skies Charter staff member and the renter present.',
      'Any damage found during the offboarding inspection — including structural, cosmetic, or mechanical — that was not documented at onboarding will be considered the responsibility of the renter.',
      'The Charterer agrees that any damage, missing or damaged equipment, excessive wear or cleaning, or operational misuse or negligence identified at offboarding may result in immediate deduction from the security deposit and/or additional charges billed to the Charterer.',
      'The Charterer authorizes Blue Skies Charter to charge the payment method on file without additional consent for any such costs supported by inspection findings.',
    ],
  },
  {
    title: 'Boat Safety Guidelines',
    items: [
      'Life Jackets (PFDs) — Florida law requires children under 6 years old to wear a U.S. Coast Guard-approved life jacket at all times while on a vessel under 26 feet in length. Blue Skies Charter provides 10 life vests, and they must be easily accessible for all passengers. We recommend that all non-swimmers and children wear them at all times.',
      'Safe Speeds — Operate the boat at a safe and controlled speed, especially near docks, other vessels, and in no-wake zones. Excessive speed is dangerous and subject to fines.',
      'Navigation Rules — Always stay within marked channels, avoid shallow water, and steer clear of submerged obstructions. Know and obey navigational markers and buoys.',
      'Weather Awareness — Check marine weather before departure. If conditions change while on the water, return to shore immediately. Sudden storms can be dangerous, especially in open water.',
      'Emergency Equipment — All boats are equipped with fire extinguishers, safety flares, anchors, and emergency lines. Know where these items are and how to use them.',
      'Engine Safety — Never operate the engine when people are in the water near the boat. Always perform a headcount before starting the engine.',
    ],
  },
  {
    title: 'Boating Under the Influence (BUI) — STRICTLY PROHIBITED',
    items: [
      'Boating under the influence of alcohol or drugs is illegal and extremely dangerous.',
      'Florida law considers anyone operating a vessel with a blood alcohol content (BAC) of 0.08% or higher to be impaired.',
      'Penalties for BUI include fines, arrest, imprisonment, and loss of boating privileges.',
      'A BUI incident endangers lives and will result in immediate termination of rental, full forfeiture of the security deposit, and possible legal action.',
      'We have ZERO tolerance for BUI. The operator must remain sober for the duration of the rental.',
    ],
  },
  {
    title: 'Terms and Conditions',
    items: [
      '1. Inspection of Vessel and Equipment — The Owner represents that the vessel is in good working order and seaworthy condition at the commencement of the charter. The Charterer acknowledges that they have been given the opportunity to inspect the vessel prior to departure and accepts the vessel "as-is" at the start of the charter period. Any pre-existing damage or deficiencies must be documented during the onboarding inspection and reported to the Owner prior to departure. Failure to report any discrepancies prior to departure shall constitute acceptance of the vessel in proper condition.',
      '2. Condition, Use, and Responsibility — The Charterer assumes full responsibility for the care, condition, and use of the vessel during the charter period, including but not limited to hull, engines, mechanical systems, interior, upholstery, electronics, safety equipment, and accessories. This includes damage resulting from negligence or misuse, grounding, collision, improper operation, improper anchoring, docking, or mooring, and actions of passengers or third parties onboard. The Charterer agrees to pay all costs necessary to restore the vessel to its pre-charter condition, including repairs, replacement parts, labor costs, loss of use, and towing/salvage/recovery costs.',
      '3. Prohibited Activities — Operating the vessel under the influence of alcohol or drugs; smoking onboard the vessel; operating the vessel in a reckless or unsafe manner; violating any federal, state, or local boating laws. Any violation may result in immediate termination of the charter, forfeiture of all rental payments and deposit, and additional charges for damages or cleaning.',
      '4. Charterer Requirements & Operator Designation — The Charterer must be at least 30 years of age to rent the vessel. The Charterer and/or any designated operator must have prior boating experience operating a vessel of similar size, type, and horsepower. Blue Skies Charter reserves the right to verify experience and approve or deny any operator based on reasonable safety standards. Any person operating the vessel must comply with all applicable federal, state, and local boating laws and regulations, including possession of a valid Boater Safety Education Identification Card if required under Florida law.',
      '5. Passenger Capacity and Regulatory Compliance — The maximum passenger capacity of the vessel shall not exceed 12 persons total. Blue Skies Charter does not provide captained or crewed charter services under this Agreement. Any captain or operator is independently selected, hired, and paid by the Charterer. The Charterer agrees not to represent this rental as a captained charter, commercial charter, or passenger-for-hire operation.',
      '6. Prohibited Activities — Operating the vessel under the influence of alcohol or drugs; operating the vessel in excess of manufacturer or safety limits; exceeding the vessel\'s maximum passenger capacity (12 persons total); allowing pets weighing more than 25 lbs without prior approval; smoking onboard the vessel; grilling or cooking onboard (no propane or charcoal permitted).',
      '7. Engine Operation — Engines may not be operated above 4400 RPMs. Recommended cruising range is 3400-3700 RPMs. Engine data may be monitored and reviewed upon return. Failure to comply may result in damage charges.',
      '8. Navigation Limits — The vessel may not be operated more than 20 miles from the designated home port, or more than 20 miles offshore, whichever occurs first, unless prior written approval is granted. Operation outside the permitted area constitutes a material breach of this Agreement and may void insurance coverage.',
      '9. Life Jacket Requirements — All required safety equipment must remain onboard and accessible. Children under applicable law must wear life jackets at all times. All passengers must wear life jackets while swimming from the vessel.',
      '10. Fuel, Damages, and Incident Charges — The Charterer agrees to be fully financially responsible for fuel usage, any damage to the vessel or equipment, and any incident occurring during the charter period. The Owner reserves the right to deduct such charges from the security deposit and/or charge the Charterer\'s payment method on file.',
      '11. Entire Agreement — This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements, representations, or understandings, whether written or oral.',
      '12. Governing Law and Venue — This Agreement shall be governed by and construed in accordance with the laws of the State of Florida. Any disputes shall be brought exclusively in the County Court or Circuit Court located in Monroe County, Florida. The Renter irrevocably submits to the personal jurisdiction of said courts. If Blue Skies Charter is required to pursue legal action, the Renter shall also be responsible for all reasonable attorney\'s fees, court costs, collection fees, and enforcement expenses.',
      '13. Grounding and Major Damage — In the event the vessel is grounded, the Charterer shall be deemed fully responsible for all resulting damage including repair and replacement costs, haul-out and inspection fees, towing and recovery costs, and loss of use of the vessel. The charter may be immediately terminated with no refunds for unused time.',
      '14. Late Return Policy — The Charterer is granted a 15-minute grace period beyond the scheduled return time. Late returns will be charged at the applicable hourly rate. Additional fees may apply if delays impact subsequent bookings.',
      '15. Cancellation Policy — Free cancellations up to 5 days prior to the scheduled rental start time. 50% refund for cancellations made 2-3 days prior to the rental. No refunds for cancellations made within 48 hours of the rental start time. All refunds are issued at the sole discretion of Blue Skies Charter.',
    ],
  },
  {
    title: 'Security Deposit & Payment Authorization',
    items: [
      'The Charterer shall provide a security deposit of $1,000 prior to the commencement of the rental period. This deposit is not a limitation of liability and does not cap the Charterer\'s financial responsibility under this Agreement.',
      'The security deposit may be applied toward damage to the vessel or equipment, missing items, excessive cleaning or misuse, fuel charges, contract violations, late return fees, and towing/salvage/recovery costs.',
      'Payment Authorization — The Charterer expressly authorizes Blue Skies Charter to charge the payment method on file without additional consent for any amounts owed under this Agreement, including amounts exceeding the security deposit.',
      'Blue Skies Charter reserves up to 48 hours following the return of the vessel to complete inspection. Additional charges may be applied if further damage is discovered during inspection, servicing, or repair.',
      'All charges supported by inspection findings, reports, or documentation are valid and enforceable. Disputes do not delay or prevent processing of authorized charges.',
      'Any remaining portion of the security deposit, after applicable deductions, will be refunded within a reasonable timeframe following inspection.',
    ],
  },
  {
    title: 'Release of Liability Waiver',
    items: [
      'This Watercraft Rental Agreement is entered into between Blue Skies Charter LLC ("Boat Owner") and the Renter.',
      'All rental payments are to be made via Zelle, Venmo, or credit card 24 hours before pick-up, inclusive of any refundable deposit specified in the invoice or booking confirmation. Credit card payments, if accepted, are subject to a 3% processing fee.',
      'The Boat Owner has 48 hours from the return of the vessel to inspect the boat and ensure that everything is in good order.',
      'Any refundable deposit will be returned to the Renter within 48 hours of the boat\'s return, provided that the inspection does not reveal any damage, excessive cleaning requirements, or violations of this Agreement.',
    ],
  },
];

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
          <p className="text-slate-500 text-sm mb-8">
            This Rental Agreement ("Agreement") is entered into between Blue Skies Charter LLC ("Blue Skies", "Owner", "we", "us")
            and the individual renting the vessel ("Charterer", "Renter", "you"). By booking a rental and signing this agreement,
            you agree to the following terms and conditions. Renter and vessel operator MUST provide a valid government-issued ID prior to departure.
          </p>

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
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              The Charterer acknowledges that they have read, reviewed, and fully understand all sections of this Agreement,
              and agree to be bound by all terms, conditions, policies, and attachments contained herein.
              The Charterer further acknowledges that no verbal representations or statements outside of this Agreement have been relied upon.
            </p>
            <p className="text-slate-400 text-xs">
              Last updated: June 2026. Agreement version 2026-06-07. This agreement is governed by the laws of the State of Florida.
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
