import { useState } from 'react'

const DAYS_OPTIONS = ['2', '3', '4', '5+']
const WHO_OPTIONS = ['Solo', 'Couple', 'Family', 'Group of friends']
const INTERESTS = ['Hiking', 'Wildlife', 'Nature walks', 'Relaxing', 'Adventure', 'Culture', 'Food & drink']

export default function TripForm({ onSubmit, loading }) {
  const [days, setDays] = useState('')
  const [who, setWho] = useState('')
  const [interests, setInterests] = useState([])
  const [origin, setOrigin] = useState('Nairobi')

  const toggleInterest = (item) => {
    setInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  const isValid = days && who && interests.length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValid || loading) return
    onSubmit({ days, who, interests, origin: origin.trim() || 'Nairobi' })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-2xl"
    >
      {/* How many days */}
      <fieldset className="mb-6">
        <legend className="block text-xs tracking-[0.2em] uppercase text-charcoal/55 font-lato mb-3">
          How many days?
        </legend>
        <div className="flex flex-wrap gap-2">
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`chip-base ${days === d ? 'chip-active-green' : 'chip-idle'}`}
            >
              {d} days
            </button>
          ))}
        </div>
      </fieldset>

      {/* Who's coming */}
      <fieldset className="mb-6">
        <legend className="block text-xs tracking-[0.2em] uppercase text-charcoal/55 font-lato mb-3">
          Who's coming?
        </legend>
        <div className="flex flex-wrap gap-2">
          {WHO_OPTIONS.map(w => (
            <button
              key={w}
              type="button"
              onClick={() => setWho(w)}
              className={`chip-base ${who === w ? 'chip-active-green' : 'chip-idle'}`}
            >
              {w}
            </button>
          ))}
        </div>
      </fieldset>

      {/* What do you love */}
      <fieldset className="mb-6">
        <legend className="block text-xs tracking-[0.2em] uppercase text-charcoal/55 font-lato mb-3">
          What do you love?
        </legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => toggleInterest(item)}
              className={`chip-base ${interests.includes(item) ? 'chip-active-sand' : 'chip-idle'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Where from */}
      <div className="mb-8">
        <label
          htmlFor="origin"
          className="block text-xs tracking-[0.2em] uppercase text-charcoal/55 font-lato mb-3"
        >
          Where are you coming from?
        </label>
        <input
          id="origin"
          type="text"
          value={origin}
          onChange={e => setOrigin(e.target.value)}
          placeholder="Nairobi"
          className="w-full border border-charcoal/20 rounded-lg px-4 py-3 text-sm font-lato text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-forest transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={!isValid || loading}
        className={`w-full py-4 rounded-xl text-base font-lato font-bold tracking-wide transition-all duration-200 ${
          isValid && !loading
            ? 'bg-forest text-white hover:bg-forest/90 active:scale-[0.99]'
            : 'bg-charcoal/15 text-charcoal/35 cursor-not-allowed'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Planning your escape...
          </span>
        ) : (
          'Plan my trip →'
        )}
      </button>
    </form>
  )
}
