import { useState } from 'react'
import TripForm from './components/TripForm'
import Itinerary from './components/Itinerary'

export default function App() {
  const [itinerary, setItinerary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePlan = async ({ days, who, interests, origin }) => {
    setItinerary('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, who, interests, origin }),
      })

      if (!response.ok) {
        throw new Error('Could not generate your itinerary. Please try again.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              setItinerary(prev => prev + parsed.delta.text)
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Hero + Form */}
      <section className="hero-bg min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <div className="hero-content text-center mb-10 max-w-xl">
          <p className="font-lato text-sand/80 text-xs tracking-[0.3em] uppercase mb-4">
            Idan Barn Suites &amp; Café &middot; Naro Moru, Kenya
          </p>
          <h1 className="font-playfair text-4xl md:text-6xl text-cream font-bold leading-tight">
            Plan Your
            <br />
            <em>Nanyuki Escape</em>
          </h1>
          <p className="font-lato text-cream/60 mt-5 text-base md:text-lg leading-relaxed">
            Tell us a little about your trip. We'll build you a day-by-day itinerary rooted in the best of Mt Kenya country.
          </p>
        </div>

        <div className="hero-content w-full max-w-lg">
          <TripForm onSubmit={handlePlan} loading={loading} />
        </div>
      </section>

      {/* Itinerary output */}
      {(loading || itinerary || error) && (
        <section className="bg-cream px-4 py-16 md:py-20">
          <div className="max-w-2xl mx-auto">
            <Itinerary text={itinerary} error={error} loading={loading} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-charcoal py-6 text-center">
        <p className="font-lato text-white/30 text-xs tracking-widest uppercase">
          Idan Barn Suites &amp; Café &middot; Naro Moru, Kenya
        </p>
      </footer>
    </>
  )
}
