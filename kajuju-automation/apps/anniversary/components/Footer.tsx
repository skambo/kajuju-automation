export default function Footer() {
  return (
    <footer className="bg-barn-navy text-white/60 px-5 py-8 text-[0.78rem] leading-relaxed">
      <div className="max-w-[860px] mx-auto">
        <p className="text-white/80 font-bold uppercase tracking-wide text-[0.72rem] mb-3 font-sans-label">
          Terms &amp; conditions
        </p>
        <ul className="space-y-2 list-disc list-outside pl-4">
          <li>Valid for bookings made 25 July &ndash; 31 August 2026, for stays taken up to 30 September 2026.</li>
          <li>
            Meals &amp; drinks on us worth KES 1,500 (single/couple) or KES 3,000 (groups of
            4+/families) &mdash; valid on any food and beverages at Idan Barn Café during your stay,
            on any room type. Unused balance does not carry over and cannot be refunded or
            exchanged for cash.
          </li>
          <li>
            Self-catering guests (Penthouse, Cottage): this includes your meals at the Barn
            Café for the stay, even though your room itself doesn&apos;t include breakfast.
          </li>
          <li>Payment: choose to pay a 50% deposit now (balance on arrival) or the full amount upfront.</li>
          <li>
            Cancellation: fully refundable if cancelled more than 48 hours before check-in. No
            refund for cancellations within 48 hours of check-in, or no-shows.
          </li>
          <li>This is available for direct online bookings only.</li>
          <li>
            Questions? Call or WhatsApp us on{' '}
            <a href="tel:0762004417" className="text-[#aabfa6] hover:underline">
              0762 004417
            </a>
            .
          </li>
        </ul>
        <p className="mt-6 text-white/40 text-center">
          &copy; {new Date().getFullYear()} Idan Barn Suites &amp; Café, Naromoru
        </p>
      </div>
    </footer>
  );
}
