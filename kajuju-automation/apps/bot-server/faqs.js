'use strict';

const FAQS = [
  {
    keywords: ['cake', 'birthday cake', 'surprise cake', 'order cake'],
    response: `We'd love to arrange a birthday cake surprise! 🎂

• Notice required: 48 hours minimum
• Cost: From KES 1,800 depending on size and flavour
• We'll coordinate timing with our kitchen so it's ready at the perfect moment
• Please let us know any dietary requirements (e.g. no nuts, gluten free)`
  },
  {
    keywords: ['decor', 'rose petals', 'candles', 'romantic', 'anniversary', 'surprise setup', 'room decoration'],
    response: `We can set up a beautiful romantic surprise in your room 🌹

• Notice required: 24 hours minimum
• Cost: KES 3,500
• Includes: bed decor, balloons (feel free to request any personalised touch e.g. a bouquet or wine)
• Let us know the occasion and we'll make it special`
  },
  {
    keywords: ['early check in', 'arrive early', 'check in before', 'early arrival'],
    response: `Standard check-in is from 1pm. Early check-in is available subject to room availability on the day.

We can't guarantee it in advance, but message us on the morning of your arrival and we'll do our best! 😊`
  },
  {
    keywords: ['late check out', 'stay longer', 'check out time', 'extend stay', 'checkout', 'check out'],
    response: `Checkout time at Idan Barn Suites & Café is typically at 11:00 AM. If you need a late checkout, let us know and we will check availability.`
  },
  {
    keywords: ['directions', 'how to get there', 'location', 'where are you', 'find you', 'navigate', 'maps'],
    response: `Here's our Google Maps pin 📍 → https://maps.app.goo.gl/aBz2RvSirP1C87jL7

We're in Naromoru, 1km off the Nyeri-Nanyuki Highway.

From Nairobi: roughly 3 hours depending on traffic. From Nanyuki: about 20 minutes.

Any issues finding us, call or WhatsApp us directly: +254 762 004 417`
  },
  {
    keywords: ['road', 'tarmac', 'dirt road', '4x4', 'saloon car', 'accessible', 'can my car make it', 'all cars', 'gravel', 'small car'],
    response: `We're 1km off the main highway — the last stretch is an all-weather murram road that all cars can navigate comfortably. 🚗`
  },
  {
    keywords: ['parking', 'park my car', 'where to park', 'secure parking'],
    response: `We have free on-site parking — secure and within the property grounds. 🅿️`
  },
  {
    keywords: ['wifi', 'internet', 'connectivity', 'work remotely', 'starlink', 'speeds'],
    response: `We run on Starlink — fast, reliable internet throughout the property 📶

Perfect for remote work, video calls, and everything in between. It's one of the reasons our Workation package is so popular!`
  },
  {
    keywords: ['pets', 'dog', 'cat', 'bring my pet', 'animal', 'puppy'],
    response: `We love animals! 🐾 Here's our pet policy:

• Pets are not allowed inside the rooms
• Pets on a leash are welcome in the restaurant and outdoor areas
• Please let us know in advance if you're bringing a pet`
  },
  {
    keywords: ['cancel', 'cancellation', 'refund', 'change dates', 'cancel booking'],
    response: `Our cancellation policy:

• 72 hours or more before arrival: full refund ✅
• Within 48 hours of arrival: no refund ❌
• Date changes are subject to availability — message us and we'll do our best`
  },
  {
    keywords: ['quiet hours', 'noise', 'music', 'loud', 'generator', 'curfew'],
    response: `Quiet hours are from 9pm to 7am 🌙

We're a retreat property — we ask all guests to be mindful of noise during these hours so everyone can enjoy the peace and the Mt. Kenya night sky ✨`
  },
  {
    keywords: ['activities', 'things to do', 'what to do', 'hike', 'horseback', 'excursions', 'explore', 'birdwatching'],
    response: `There's plenty to keep you busy! 🏔️

*On the property:*
• Nature walks and birdwatching
• Cosy fireplace evenings
• Café with freshly prepared meals and drinks

*Nearby (within 30–45 mins):*
• Mt. Kenya National Park — hiking trails, game drives
• Mau Mau caves nature walk starting from Bantu
• Ebike rides
• Horseback riding along the foothills
• Ol Pejeta Conservancy — rhinos, lions, chimpanzee sanctuary
• Nanyuki town — local market and shopping
• Trout fishing at nearby farms

Let us know if you'd like help arranging any excursions!`
  },
  {
    keywords: ['food', 'meals', 'breakfast', 'lunch', 'dinner', 'menu', 'restaurant', 'dining', 'eat', 'half board', 'full board'],
    response: `We have an on-site café serving freshly prepared meals and drinks. Last food orders at 9pm 🍽️

*Meal packages:*
• Bed & Breakfast (B&B) — included in Deluxe and Twin Garden room rates
• Half Board — breakfast + lunch or dinner (+KES 2,500/person/day)
• Full Board — all meals (+KES 3,300/person/day)
• Self Catering — kitchen access in Penthouse Loft and Cottage

Let us know your preference when booking!`
  },
  {
    keywords: ['children', 'kids', 'family', 'baby', 'toddler', 'child friendly'],
    response: `We're family-friendly! 👶

• Children of all ages are welcome
• The Cottage (3-bed, sleeps up to 6) is perfect for families
• We can arrange a cot for infants on request
• The grounds are safe for kids to explore`
  },
  {
    keywords: ['pool', 'swimming', 'gym', 'spa', 'facilities'],
    response: `We don't have a swimming pool just yet — but it's in progress and construction is halfway done! 🏊

In the meantime, the Mt. Kenya views are pretty hard to beat 😊`
  },
  {
    keywords: ['rates', 'prices', 'how much', 'cost', 'pricing', 'nightly rate', 'weekend rate'],
    response: `Here's our full rate card with all room types and pricing 👇
https://rates.idanbarnsuites.com

Rates vary by room type and season (weekday / weekend / peak).

Want a quote for specific dates? Just share your dates and preferred room and I'll check availability!`
  },
];

function matchFaq(message) {
  const lower = message.toLowerCase();
  for (const faq of FAQS) {
    if (faq.keywords.some(kw => lower.includes(kw))) {
      return faq.response;
    }
  }
  return null;
}

module.exports = { matchFaq };
