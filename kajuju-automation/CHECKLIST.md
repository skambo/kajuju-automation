# Post-Deployment SEO Checklist — Kajuju rate-card site
_(Domain and identifying details redacted — this is a portfolio repo)_

## Google Search Console
- [ ] Add property: [rate-card domain]
- [ ] Verify using the HTML meta tag placeholder in index.html
- [ ] Deploy verification tag, then confirm in Search Console
- [ ] Submit sitemap: [rate-card domain]/sitemap.xml
- [ ] URL Inspection → Request Indexing for /

## Google Analytics GA4
- [ ] Go to analytics.google.com
- [ ] Find or create GA4 property for [rate-card domain]
- [ ] Copy Measurement ID (format: G-XXXXXXXXXX)
- [ ] Replace GA_MEASUREMENT_ID in index.html with real ID
- [ ] Redeploy
- [ ] Link GA4 to Search Console:
      GA4 → Admin → Search Console Links

## Quality Checks
- [x] Confirm geo coordinates in schema are correct (redacted here — verified against Google Maps pin)
- [ ] Test on mobile — all sections, CTAs and blog links
- [ ] Run through PageSpeed Insights:
      https://pagespeed.web.dev/?url=[rate-card domain]
- [ ] Test WhatsApp button opens correct chat with pre-filled message
- [ ] Test Book Direct button goes to the sister booking site
- [ ] Verify both blog links load correctly (slugs redacted here)

## Visibility Boost
- [ ] Add [rate-card domain] to your Booking.com
      property description (where permitted)
- [ ] Add [rate-card domain] to your Airbnb listing description
- [ ] Add [rate-card domain] to Instagram and Facebook bio
- [ ] Add [rate-card domain] to TripAdvisor listing description
- [ ] Share the rates page in relevant Facebook groups (list redacted here)
