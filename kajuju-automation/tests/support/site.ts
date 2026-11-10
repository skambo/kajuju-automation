/** Facts about the site that several specs share. Defined once, here. */

/**
 * The Hotelogix booking-engine URL every "book" button must use. Hotelogix rejects visitors whose
 * Referer is not the hotel's own domain, so the links also have to send no Referer.
 */
/**
 * TODO: TEMPORARY. Booking is routed to our own /book page while Hotelogix is being configured.
 * Restore: point the specs back at HOTELOGIX_URL (search "TEMP-BOOKING" in tests/) and re-enable the
 * noreferrer assertions. Keep in step with BOOKING_URL in apps/landing-pages/site-config.js.
 */
export const BOOKING_URL = 'https://rates.idanbarnsuites.com/book';

export const HOTELOGIX_URL =
  'https://booking.staygrid.com/webv2/index/home/c/WWhSOTFXNlQvRUhodTdsRDlYNCtKUzZXNjhka3BiZU9ObzJ3dEJTdWhMZDlWVU0yNTQ3WHlRSUt4NjA4QU5lODdYbkZDNkFRZkwrUUlpU1pUUU11UkJJQTBKRzM2a0hkZkRObDcwZ1FaVGRtdm9wNlFQa1pyZ2had3A3SXFwM2s/language/en';
