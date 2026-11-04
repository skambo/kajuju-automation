/* Photo strips, covers, the property gallery grid and the full screen viewer.
   Reads the photo list from images/photos.js (PHOTOS). Plain JavaScript, no libraries.

   Markup hooks:
   data-photo-strip="twin-garden"      swipeable strip for a room card (one photo shows a single image)
   data-photo-cover="pool:1"           one photo, category or category:index
   data-photo-grid="shared" data-pick="pool:0,cafe:2"   curated grid for the property gallery
   data-gallery-open="shared" data-index="3"            opens the full screen viewer */
(function () {
  if (typeof PHOTOS === 'undefined') return;

  /* The shared property gallery is pool, grounds and café together. */
  PHOTOS.shared = [].concat(PHOTOS.pool || [], PHOTOS.grounds || [], PHOTOS.cafe || []);

  function url(p, w) { return '/images/' + p.folder + '/' + p.name + '-' + w + '.webp'; }
  function pick(p, max) {
    var ok = p.widths.filter(function (w) { return w <= max; });
    return ok.length ? ok[ok.length - 1] : p.widths[0];
  }
  function srcset(p) {
    return p.widths.map(function (w) { return url(p, w) + ' ' + w + 'w'; }).join(', ');
  }
  function makeImg(p, sizes) {
    var img = document.createElement('img');
    img.src = url(p, pick(p, 800));
    img.srcset = srcset(p);
    img.sizes = sizes;
    img.width = p.w;
    img.height = p.h;
    img.alt = p.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }
  function button(cls, label, cat, index) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('data-gallery-open', cat);
    b.setAttribute('data-index', index);
    if (label) b.setAttribute('aria-label', label);
    return b;
  }
  /* "cat" or "cat:index" */
  function resolve(spec) {
    var parts = spec.split(':');
    var list = PHOTOS[parts[0]] || [];
    return { cat: parts[0], list: list, index: parts[1] ? parseInt(parts[1], 10) : 0 };
  }

  /* ── Room card strips ── */
  document.querySelectorAll('[data-photo-strip]').forEach(function (slot) {
    var cat = slot.getAttribute('data-photo-strip');
    var list = PHOTOS[cat] || [];
    if (!list.length) return;
    if (list.length === 1) {
      var only = button('strip-single', 'Open photo: ' + list[0].alt, cat, 0);
      only.appendChild(makeImg(list[0], '(max-width:600px) 90vw, 560px'));
      slot.appendChild(only);
    } else {
      var strip = document.createElement('div');
      strip.className = 'photo-strip';
      list.forEach(function (p, i) {
        var item = button('strip-item', 'Open photo ' + (i + 1) + ' of ' + list.length + ': ' + p.alt, cat, i);
        item.appendChild(makeImg(p, '(max-width:600px) 70vw, 300px'));
        strip.appendChild(item);
      });
      slot.appendChild(strip);
      var more = button('gallery-link', '', cat, 0);
      more.textContent = 'See more photos →';
      slot.appendChild(more);
    }
    slot.classList.add('filled');
  });

  /* ── Single cover photos ── */
  document.querySelectorAll('[data-photo-cover]').forEach(function (slot) {
    var r = resolve(slot.getAttribute('data-photo-cover'));
    var p = r.list[r.index];
    if (p) slot.appendChild(makeImg(p, '(max-width:600px) 90vw, 400px'));
  });

  /* ── Curated grid for the shared gallery ── */
  document.querySelectorAll('[data-photo-grid]').forEach(function (grid) {
    var cat = grid.getAttribute('data-photo-grid');
    var all = PHOTOS[cat] || [];
    (grid.getAttribute('data-pick') || '').split(',').forEach(function (spec) {
      var r = resolve(spec.trim());
      var p = r.list[r.index];
      if (!p) return;
      var at = all.indexOf(p);
      var tile = button('grid-tile', 'Open photo: ' + p.alt, cat, at < 0 ? 0 : at);
      tile.appendChild(makeImg(p, '(max-width:600px) 45vw, 260px'));
      grid.appendChild(tile);
    });
  });
  document.querySelectorAll('[data-photo-count]').forEach(function (el) {
    var n = (PHOTOS[el.getAttribute('data-photo-count')] || []).length;
    if (n) el.textContent = el.textContent.replace('{n}', n);
  });

  /* ── Full screen viewer ── */
  var dlg, imgEl, capEl, list = [], pos = 0, lastFocus = null;

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'viewer';
    dlg.setAttribute('aria-label', 'Photo viewer');
    dlg.innerHTML =
      '<button type="button" class="v-close" aria-label="Close photo viewer">×</button>' +
      '<button type="button" class="v-prev" aria-label="Previous photo">‹</button>' +
      '<figure><img alt="" /><figcaption></figcaption></figure>' +
      '<button type="button" class="v-next" aria-label="Next photo">›</button>';
    document.body.appendChild(dlg);
    imgEl = dlg.querySelector('img');
    capEl = dlg.querySelector('figcaption');
    dlg.querySelector('.v-close').addEventListener('click', function () { dlg.close(); });
    dlg.querySelector('.v-prev').addEventListener('click', function () { show(pos - 1); });
    dlg.querySelector('.v-next').addEventListener('click', function () { show(pos + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(pos - 1);
      if (e.key === 'ArrowRight') show(pos + 1);
    });
    var x0 = null;
    dlg.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) show(pos + (dx < 0 ? 1 : -1));
    });
  }

  function show(i) {
    if (!list.length) return;
    pos = (i + list.length) % list.length;
    var p = list[pos];
    imgEl.srcset = srcset(p);
    imgEl.sizes = '100vw';
    imgEl.src = url(p, pick(p, 1200));
    imgEl.alt = p.alt;
    capEl.textContent = p.alt + '  (' + (pos + 1) + ' of ' + list.length + ')';
    var single = list.length < 2;
    dlg.querySelector('.v-prev').hidden = single;
    dlg.querySelector('.v-next').hidden = single;
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-gallery-open]') : null;
    if (!el) return;
    list = PHOTOS[el.getAttribute('data-gallery-open')] || [];
    if (!list.length) return;
    if (!dlg) build();
    lastFocus = el;
    show(parseInt(el.getAttribute('data-index'), 10) || 0);
    dlg.showModal();
  });
})();
