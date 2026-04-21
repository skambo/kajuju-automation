import { useEffect, useRef } from 'react'

const BOOKING_LINE = 'Idan Barn has availability — check rates and book: rates.idanbarnsuites.com'

export default function Itinerary({ text, error, loading }) {
  const topRef = useRef(null)

  useEffect(() => {
    if ((text || error) && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [!!text, !!error])

  if (error) {
    return (
      <div ref={topRef} className="bg-red-50 border border-red-200 rounded-xl p-6 font-lato text-red-700 text-sm">
        {error}
      </div>
    )
  }

  if (!text && loading) {
    return (
      <div ref={topRef} className="text-center py-20">
        <div className="inline-block w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin mb-5" />
        <p className="font-lato text-charcoal/50 text-xs tracking-[0.3em] uppercase">
          Planning your escape...
        </p>
      </div>
    )
  }

  if (!text) return null

  const bookingIdx = text.indexOf(BOOKING_LINE)
  const mainText = bookingIdx >= 0 ? text.slice(0, bookingIdx).trim() : text
  const hasBooking = bookingIdx >= 0

  return (
    <div ref={topRef}>
      <h2 className="font-playfair text-3xl md:text-4xl text-charcoal font-bold mb-8">
        Your itinerary
      </h2>

      <div className="space-y-0">
        {renderParagraphs(mainText, loading && !hasBooking)}
      </div>

      {hasBooking && (
        <div className="booking-callout">
          <p className="font-lato text-white/60 text-xs tracking-[0.25em] uppercase mb-3">
            Ready to go?
          </p>
          <a
            href="https://rates.idanbarnsuites.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-playfair text-xl md:text-2xl text-sand hover:text-white transition-colors font-semibold block"
          >
            Check rates &amp; book at Idan Barn →
          </a>
          <p className="font-lato text-white/40 text-xs mt-2 tracking-widest">
            rates.idanbarnsuites.com
          </p>
        </div>
      )}

      {loading && !hasBooking && text.length > 0 && (
        <span className="inline-block w-1.5 h-5 bg-sand rounded-sm animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  )
}

function renderParagraphs(text, isStreaming) {
  const paragraphs = text.split(/\n+/).filter(p => p.trim())
  return paragraphs.map((para, i) => {
    const trimmed = para.trim()

    // Day heading: **Day N — Title** or Day N — Title
    const dayMatch = trimmed.match(/^\*{0,2}(Day \d+\s*[—\-–]\s*.+?)\*{0,2}$/)
    if (dayMatch) {
      const label = dayMatch[1].replace(/\*/g, '').trim()
      const dashIdx = label.search(/[—\-–]/)
      const dayNum = label.slice(0, dashIdx).trim()
      const title = label.slice(dashIdx + 1).trim()
      return (
        <h3 key={i} className="day-heading first:mt-0">
          {dayNum} — {title}
        </h3>
      )
    }

    const isLast = i === paragraphs.length - 1
    return (
      <p key={i} className={`itinerary-prose${isLast && isStreaming ? ' streaming-cursor' : ''}`}>
        {inlineBold(trimmed)}
      </p>
    )
  })
}

function inlineBold(text) {
  const parts = text.split(/(\*\*.*?\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}
