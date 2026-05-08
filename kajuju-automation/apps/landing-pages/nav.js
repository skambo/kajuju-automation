(function () {
  var currentPage = (document.currentScript && document.currentScript.getAttribute('data-page')) || '';

  var css = [
    '.site-nav{background:#1a1a1a;padding:0}',
    '.nav-inner{max-width:860px;margin:0 auto;padding:.85rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;width:100%}',
    '.nav-brand{color:#fff;font-family:\'Playfair Display\',Georgia,serif;font-size:1.1rem;text-decoration:none;line-height:1.3}',
    '.nav-brand small{display:block;font-size:.7rem;font-family:\'Lato\',sans-serif;font-weight:300;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.6)}',
    '.nav-links{display:flex;gap:1.25rem;flex-wrap:wrap;align-items:center}',
    '.nav-links a{color:rgba(255,255,255,.8);text-decoration:none;font-size:.82rem;letter-spacing:.8px;text-transform:uppercase;transition:color .2s}',
    '.nav-links a:hover{color:#fff}',
    '.nav-links a.nav-plan{color:rgba(255,255,255,.85);font-weight:600}',
    '.nav-links a.nav-active{color:#fff;font-weight:700}',
    '.nav-links a.nav-book{background:#fff;color:#2d5a27;font-weight:700;padding:.35rem .9rem;border-radius:20px;font-size:.8rem}',
    '.nav-links a.nav-book:hover{background:#eaf3de}',
    '.nav-toggle{display:none;background:none;border:1.5px solid rgba(255,255,255,.4);color:#fff;font-size:1.2rem;padding:.35rem .65rem;cursor:pointer;border-radius:3px;line-height:1}',
    '@media(max-width:768px){',
    '.nav-toggle{display:block}',
    '.nav-links{display:none;flex-direction:column;width:100%;gap:0;padding:.5rem 0}',
    '.nav-links.open{display:flex}',
    '.nav-links a{padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:.82rem}',
    '.nav-links a:last-child{border-bottom:none}',
    '}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function cls(targetPage, extraClass) {
    var classes = [];
    if (extraClass) classes.push(extraClass);
    if (currentPage === targetPage) classes.push('nav-active');
    return classes.length ? ' class="' + classes.join(' ') + '"' : '';
  }

  var nav =
    '<nav class="site-nav"><div class="nav-inner">' +
    '<a href="/" class="nav-brand">Idan Barn Suites &amp; Café <small>Naromoru · Mt Kenya</small></a>' +
    '<button class="nav-toggle" aria-label="Menu" aria-expanded="false">&#9776;</button>' +
    '<div class="nav-links">' +
    '<a href="/?tab=rates"' + cls('rates') + '>Rates</a>' +
    '<a href="/?tab=packages"' + cls('packages') + '>Packages</a>' +
    '<a href="/?tab=activities"' + cls('activities') + '>Activities</a>' +
    '<a href="/?tab=menu"' + cls('menu') + '>Menu</a>' +
    '<a href="/plan"' + cls('plan', 'nav-plan') + '>Plan</a>' +
    '<a href="https://idanbarnsuites.com/hotel-booking" class="nav-book">Book Now</a>' +
    '</div></div></nav>';

  document.currentScript.insertAdjacentHTML('beforebegin', nav);

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        links.classList.toggle('open');
        this.setAttribute('aria-expanded', links.classList.contains('open') ? 'true' : 'false');
      });
    }
  });
}());
