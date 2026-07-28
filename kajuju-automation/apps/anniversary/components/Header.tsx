export default function Header() {
  return (
    <nav className="bg-[#1a1a1a]">
      <div className="max-w-[860px] mx-auto px-5 py-3 flex items-center justify-between gap-3">
        <span className="text-white font-display text-lg leading-tight">
          Idan Barn Suites &amp; Café
          <small className="block text-[0.65rem] font-sans-label font-light tracking-[2px] uppercase text-white/60">
            Naromoru &middot; Mt Kenya
          </small>
        </span>
        <div className="flex flex-col items-end gap-1">
          <a
            href="https://wa.me/254762004417"
            className="bg-white text-barn-green font-bold text-[0.8rem] font-sans-label px-4 py-1.5 rounded-full hover:bg-barn-greenlight transition-colors whitespace-nowrap"
          >
            WhatsApp Us
          </a>
          <a
            href="tel:0762004417"
            className="text-white/70 text-[0.68rem] font-sans-label hover:text-white whitespace-nowrap"
          >
            or call 0762 004417
          </a>
        </div>
      </div>
    </nav>
  );
}
