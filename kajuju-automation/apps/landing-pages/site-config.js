/* Shared config for the rates page and the Christmas page.
   Change the booking or WhatsApp link here and every button updates. */
var SITE = {
  HOTELOGIX_URL: 'https://booking.staygrid.com/webv2/index/home/c/WWhSOTFXNlQvRUhodTdsRDlYNCtKUzZXNjhka3BiZU9ObzJ3dEJTdWhMZDlWVU0yNTQ3WHlRSUt4NjA4QU5lODdYbkZDNkFRZkwrUUlpU1pUUU11UkJJQTBKRzM2a0hkZkRObDcwZ1FaVGRtdm9wNlFQa1pyZ2had3A3SXFwM2s/language/en',
  WHATSAPP: 'https://wa.me/254762004417',
  WHATSAPP_TEXT: "Hello, I'd like to enquire about booking at Idan Barn Suites.",
  WHATSAPP_TEXT_CHRISTMAS: "Hi, I'd like to enquire about Christmas at Idan Barn Suites.",
  WHATSAPP_TEXT_DINING: "Hi, I'd like to reserve festive meals at Idan Barn Suites.",

  /* Confirmation switches for the Christmas page. A switch stays false until its content is approved.
     LAZY_BREAKFAST_CONFIRMED was approved for 25, 26 and 31 December and 1 January.
     To enable one, change false to true below. The wording lives in FLAG_COPY, so while a switch
     is false that wording is not in the page at all. */
  LAZY_BREAKFAST_CONFIRMED: true,
  POOL_SUPERVISION_LINE_APPROVED: false,
  FLAG_COPY: {
    'lazy-until': { flag: 'LAZY_BREAKFAST_CONFIRMED', text: 'Lazy Breakfast until 11 am.' },
    'lazy-newyear': { flag: 'LAZY_BREAKFAST_CONFIRMED', text: 'Lazy Breakfast, an extended breakfast service.' },
    'pool-supervision': { flag: 'POOL_SUPERVISION_LINE_APPROVED', text: 'Children must be supervised by an adult at all times.' }
  }
};

/* Sends a GA4 event only if the Google tag is on the page. Does nothing otherwise. */
function track(name, params) {
  try {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  } catch (e) {}
}

(function () {
  /* Fill every booking and WhatsApp link from the constants above. */
  document.querySelectorAll('[data-hotelogix]').forEach(function (a) {
    a.href = SITE.HOTELOGIX_URL;
    /* Hotelogix rejects visitors whose Referer is not idanbarnsuites.com (error EIUA),
       so these links must not send a Referer. Only Hotelogix links get this. */
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.referrerPolicy = 'no-referrer';
  });
  /* Flag controlled copy: <span data-flag-copy="key"></span> is filled when its switch is true
     and removed when it is false, so the wording never reaches the page while a switch is off. */
  document.querySelectorAll('[data-flag-copy]').forEach(function (el) {
    var c = SITE.FLAG_COPY[el.getAttribute('data-flag-copy')];
    if (c && SITE[c.flag] === true) {
      el.textContent = c.text;
      el.hidden = false;
    } else {
      el.remove();
    }
  });
  document.querySelectorAll('[data-whatsapp]').forEach(function (a) {
    /* data-whatsapp="christmas" and "dining" use their own messages */
    var kind = a.getAttribute('data-whatsapp');
    var text = kind === 'christmas' ? SITE.WHATSAPP_TEXT_CHRISTMAS : kind === 'dining' ? SITE.WHATSAPP_TEXT_DINING : SITE.WHATSAPP_TEXT;
    a.href = SITE.WHATSAPP + '?text=' + encodeURIComponent(text);
  });

  /* Click tracking. The Hotelogix link cannot carry tracking parameters,
     so we measure the click on our own site. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-hotelogix],[data-whatsapp],[data-gallery-open]') : null;
    if (!el) return;
    var params = { cta_location: el.getAttribute('data-cta') || '', page_location: window.location.href };
    if (el.hasAttribute('data-hotelogix')) {
      params.event_category = 'conversion';
      track('book_direct_click', params);
    } else if (el.hasAttribute('data-whatsapp')) {
      params.event_category = 'conversion';
      track('whatsapp_click', params);
    } else {
      params.gallery = el.getAttribute('data-gallery-open') || '';
      track('gallery_open', params);
    }
  });
})();
