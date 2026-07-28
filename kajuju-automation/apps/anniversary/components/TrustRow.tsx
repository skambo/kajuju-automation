interface TrustRowProps {
  promoCode: string;
}

export default function TrustRow({ promoCode }: TrustRowProps) {
  const displayCode = promoCode?.trim() || null;

  return (
    <div className="bg-white border-b border-barn-cardborder">
      <div className="max-w-[860px] mx-auto px-5 py-3 flex flex-wrap items-center justify-center gap-2">
        {displayCode && (
          <span className="inline-block bg-gray-50 text-barn-ink text-[0.8rem] font-sans-label px-4 py-1.5 rounded-full border border-barn-cardborder">
            Your invite code: <strong>{displayCode}</strong>
          </span>
        )}
        <a
          href="https://www.tripadvisor.com/Hotel_Review-g311292-d34000728-Reviews-Idan_Barn_Suites_And_Cafe-Naro_Moru_Rift_Valley_Province.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-gray-50 text-barn-ink text-[0.8rem] font-sans-label px-4 py-1.5 rounded-full border border-barn-cardborder hover:bg-gray-100 transition-colors"
        >
          ★★★★★ #1 of 5 hotels in Naro Moru, TripAdvisor
        </a>
      </div>
    </div>
  );
}
