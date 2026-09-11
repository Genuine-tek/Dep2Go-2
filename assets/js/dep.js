/* Direct Equipment Parts — site behaviour.
 *
 * Plain ES5-compatible DOM code, no dependencies. This replaces the five
 * React component classes the Claude Design export carried in
 * <script type="text/x-dc"> blocks (Header, Footer, Sidebar, Contact,
 * Hiring), which only ran inside the Design app.
 *
 * Everything binds off data-* hooks, so one file serves every page and a
 * page that lacks a given widget simply skips it.
 */
(function () {
  'use strict';

  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------ nav
   * The header band pins to the top once it would scroll away. A spacer
   * takes over its height so the page does not jump, and --dep-band is
   * published for dep.css's scroll-margin-top (anchor links must clear the
   * fixed band).
   */
  function initHeader() {
    var band = $('[data-band]');
    var spacer = $('[data-band-spacer]');
    if (!band || !spacer) return;

    var trigger = null, bandH = 0, pinned = false;

    // The sticky pill row is absolute at top:100%, so it sits outside the
    // band's own box. Anything republishing --dep-band has to add it back or
    // the row's height quietly goes missing and anchors land underneath it.
    function stickyExtra() {
      var sticky = $('[data-stickypills]');
      return (sticky && sticky.getAttribute('data-show') === 'true')
        ? sticky.offsetHeight : 0;
    }

    function pin() {
      band.style.position = 'fixed';
      band.style.top = '0';
      band.style.left = '0';
      band.style.right = '0';
      band.style.boxShadow = '0 2px 10px rgba(8,36,58,.14)';
      spacer.style.height = bandH + 'px';
      pinned = true;
      // Showing the sticky pills makes the band taller than it measured
      // unpinned, so republish the height anchors depend on.
      band.setAttribute('data-pinned', 'true');
      document.documentElement.style.setProperty('--dep-band',
        (band.offsetHeight + stickyExtra()) + 'px');
    }
    function unpin() {
      band.style.position = 'static';
      band.style.boxShadow = 'none';
      spacer.style.height = '0px';
      pinned = false;
      band.removeAttribute('data-pinned');
      document.documentElement.style.setProperty('--dep-band', bandH + 'px');
    }
    function onScroll() {
      if (trigger === null) return;
      var should = window.scrollY >= trigger;
      if (should !== pinned) { should ? pin() : unpin(); }
    }
    function measure() {
      var was = pinned;
      if (was) unpin();
      trigger = spacer.getBoundingClientRect().top + window.scrollY;
      bandH = band.offsetHeight;
      document.documentElement.style.setProperty('--dep-band', bandH + 'px');
      if (was) pin();
      onScroll();
    }

    unpin();
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(band);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    // Mobile disclosure menu
    var toggle = $('[data-navtoggle]');
    var list = $('[data-navlist]');
    if (toggle && list) {
      toggle.addEventListener('click', function () {
        var open = list.getAttribute('data-open') !== 'true';
        list.setAttribute('data-open', open ? 'true' : 'false');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        measure();
      });
    }

  }

  /* -------------------------------------------------------- sticky pills
   * The pinned band carries a second copy of the action pills. Pinning alone
   * is the wrong trigger: the band pins while the page's own pill row is
   * still on screen, which shows the same two buttons twice.
   *
   * So it waits until that first row has travelled up behind the nav — its
   * bottom edge level with the nav's — and only then swaps in. Revealing it
   * makes the band taller, so --dep-band is republished too; anchor offsets
   * and the sticky sidebar both read it.
   */
  function initStickyPills() {
    var band = $('[data-band]');
    var sticky = $('[data-stickypills]');
    if (!band || !sticky) return;
    var nav = band.querySelector('nav');
    var pageRow = null;
    $$('[data-pillrow]').forEach(function (row) {
      if (!band.contains(row)) pageRow = row;
    });
    if (!nav || !pageRow) return;

    var shown = null;
    function update() {
      var next = band.getAttribute('data-pinned') === 'true' &&
        pageRow.getBoundingClientRect().bottom <= nav.offsetHeight;
      if (next === shown) return;
      shown = next;
      sticky.setAttribute('data-show', next ? 'true' : 'false');
      if (band.getAttribute('data-pinned') === 'true') {
        // The row hangs outside the band's box, so add it in by hand.
        document.documentElement.style.setProperty('--dep-band',
          (band.offsetHeight + (next ? sticky.offsetHeight : 0)) + 'px');
      }
    }

    update();
    // after initHeader's own handler, so data-pinned is current when this runs
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  /* --------------------------------------------------------------- forms */

  function fail(form, message) {
    var box = $('[data-error]', form);
    if (box) { box.textContent = message; box.hidden = false; }
    return false;
  }

  function clearError(form) {
    var box = $('[data-error]', form);
    if (box) { box.hidden = true; box.textContent = ''; }
  }

  // Swap the form out for the success panel that sits beside it.
  function succeed(form) {
    var panel = form.parentNode ? $('[data-success]', form.parentNode) : null;
    if (!panel) {
      var scope = form.closest('section, div');
      panel = scope ? $('[data-success]', scope) : null;
    }
    if (!panel) return;
    var stamp = $('[data-stamp]', panel);
    if (stamp) {
      stamp.textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: '2-digit'
      });
    }
    form.hidden = true;
    form.style.display = 'none';
    panel.hidden = false;
    panel.focus && panel.focus();
  }

  function initRequestForms() {
    $$('[data-request-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearError(form);
        var data = new FormData(form);
        var name = String(data.get('name') || '').trim();
        var email = String(data.get('email') || '').trim();
        if (!name) return fail(form, 'Add your name so we know who to call back.');
        if (!EMAIL.test(email)) return fail(form, 'Add a valid email address for the quote.');

        // Anything else the form marks required has to be filled in too. The
        // older forms carry no required attributes, so nothing changes for
        // them; data-ask lets a field say what it wants in plain words.
        var blank = $$('[required]', form).filter(function (el) {
          return !String(el.value || '').trim();
        })[0];
        if (blank) {
          return fail(form, blank.getAttribute('data-ask') ||
            'Fill in every field marked required.');
        }

        succeed(form);
      });
    });
  }

  function initApplyForm() {
    $$('[data-apply-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearError(form);
        var email = String(new FormData(form).get('email') || '').trim();
        if (!EMAIL.test(email)) return fail(form, 'Add a valid email address so we can reply.');
        succeed(form);
      });
    });
  }

  function initSubscribe() {
    var form = $('[data-subscribe-form]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = String(new FormData(form).get('email') || '').trim();
      if (!EMAIL.test(email)) return;
      var note = $('[data-subscribed]', form);
      if (note) note.hidden = false;
      form.reset();
    });
  }


  /* -------------------------------------------------------------- sidebar
   * The request-form sidebar is taller than most viewports, so pinning it to
   * the top left its lower half — submit button included — permanently below
   * the fold. What it wants is to scroll with the article until its foot
   * reaches the bottom of the screen, then hold while the article scrolls on.
   *
   * CSS alone cannot express that. `bottom:` shifts a sticky element upward
   * and only within its containing block; this column starts flush at the top
   * of the shell, so there is nowhere to shift and the constraint never fires.
   * A negative `top` does the job, but it depends on the element's own height,
   * which no CSS length can reference — so it is measured here.
   *
   * Short sidebars (Contact, Hiring — no form) keep the normal top offset.
   */
  function initSidebar() {
    var side = $('[data-side]');
    if (!side || !side.querySelector('[data-request-form]')) return;
    var GAP = 14;

    function measure() {
      if (window.innerWidth <= 1000) { side.style.top = ''; return; }
      var band = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--dep-band'), 10) || 123;
      var rest = band + GAP;
      var h = side.offsetHeight;
      // Taller than the viewport: hold once the foot arrives, via negative top.
      // Otherwise behave normally and sit below the pinned header band.
      side.style.top = (h + rest + GAP > window.innerHeight)
        ? (window.innerHeight - h - GAP) + 'px'
        : rest + 'px';
    }

    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(side);
    window.addEventListener('resize', measure);
  }

  /* ------------------------------------------------------- number ticker
   * Counts a figure up when it scrolls into view (the same idea as MagicUI's
   * NumberTicker, without pulling in React). The finished number is already
   * written in the HTML, so with JS off, reduced motion, or no
   * IntersectionObserver the reader still just sees the value.
   *
   *   <span data-ticker="2000" data-prefix="$" data-suffix="+">$2,000+</span>
   */
  function initTickers() {
    var els = $$('[data-ticker]');
    if (!els.length) return;
    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) return;

    function run(el) {
      var to = parseFloat(el.getAttribute('data-ticker'));
      if (isNaN(to)) return;
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var DURATION = 1400;
      var started = null;

      function frame(now) {
        if (started === null) started = now;
        var p = Math.min(1, (now - started) / DURATION);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(to * eased).toLocaleString('en-US') + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.5 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* -------------------------------------------------------- header video
   * The slot starts as plain white space. Only once the video actually has
   * frames to paint does data-ready go on, fading it in and bringing back the
   * frame border — otherwise an empty bordered box flashes while the file
   * downloads. If it never loads, the slot simply stays white.
   */
  function initHeaderVideo() {
    var slot = $('[data-headervideo]');
    if (!slot) return;
    var video = slot.querySelector('video');
    if (!video) return;

    function ready() { slot.setAttribute('data-ready', 'true'); }

    // HAVE_CURRENT_DATA or better means there is a frame to show.
    if (video.readyState >= 2) ready();
    else {
      video.addEventListener('loadeddata', ready);
      video.addEventListener('canplay', ready);
    }

    // The file is large, so it waits its turn: the source is parked in
    // data-src and only attached once the page has finished loading and the
    // browser has a spare moment. Nothing above the fold depends on it.
    var source = slot.querySelector('source[data-src]');
    if (!source) return;

    function attach() {
      if (!source.getAttribute('data-src')) return;
      source.setAttribute('src', source.getAttribute('data-src'));
      source.removeAttribute('data-src');
      video.load();
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* autoplay refused; fine */ });
    }

    function schedule() {
      if (window.requestIdleCallback) requestIdleCallback(attach, { timeout: 2500 });
      else setTimeout(attach, 300);
    }

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule);
  }

  /* ---------------------------------------------------------- mobile bar
   * The fixed Call / Request bar stays out of the way until the visitor has
   * committed to the page - it slides in once they are 3% through it, and
   * back out if they scroll above that point again. CSS owns the animation;
   * this only flips data-shown.
   */
  function initMobileBar() {
    var bar = $('[data-mobilebar]');
    if (!bar) return;

    var shown = null;
    function update() {
      var doc = document.documentElement;
      var range = doc.scrollHeight - window.innerHeight;
      // A page too short to scroll has no 3% point; leave the bar hidden.
      var next = range > 0 && window.pageYOffset >= range * 0.03;
      if (next === shown) return;
      shown = next;
      bar.setAttribute('data-shown', next ? 'true' : 'false');
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  /* -------------------------------------------------------- hash landing
   * Arriving on contact.html#schedule-a-call, the browser scrolls before this
   * file has run: scroll-margin-top still holds its fallback, and the sticky
   * pill row has not appeared yet, so the section heading ends up behind the
   * band. Once both have settled, line the target back up. Two passes,
   * because the first scroll is what makes the pills appear.
   */
  function initHashLanding() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    var target;
    try { target = document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch (e) { return; }
    if (!target) return;

    function band() {
      return parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--dep-band'), 10) || 0;
    }

    // Offsets, not a bounding rect: the reveal animation holds the section
    // 14px lower than it lands, and a rect would take that in and scroll us
    // 14px too far — straight back under the band.
    function docTop(el) {
      var y = 0;
      for (var n = el; n; n = n.offsetParent) y += n.offsetTop;
      return y;
    }

    // Re-align on every frame the band's height changes, for half a second.
    // One pass is not enough: the scroll that align() performs is what makes
    // the sticky pills appear, and that arrives on a later scroll event.
    var frames = 0, last = -1, live = true;
    function stop() { live = false; }
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
      window.addEventListener(ev, stop, { passive: true, once: true });
    });

    function tick() {
      if (!live) return;
      var h = band();
      if (h !== last) {
        last = h;
        window.scrollTo(0, Math.max(0, docTop(target) - h - 14));
      }
      if (++frames < 30) requestAnimationFrame(tick);
      else stop();
    }
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------- gallery
   * A one-at-a-time slider that advances itself every three seconds, and a
   * lightbox for looking properly. The two share an index: open the lightbox
   * from slide 3 and it opens on slide 3, close it and the slider carries on
   * from wherever the lightbox was left.
   *
   * Autoplay stops while the pointer is over the gallery, while focus is
   * inside it, while the lightbox is open, and while the tab is in the
   * background - nothing should be moving under a reader.
   */
  function initGalleries() {
    var box = $('[data-lightbox]');

    $$('[data-gallery]').forEach(function (root) {
      var track = $('[data-track]', root);
      if (!track) return;
      var slides = $$('li', track);
      if (slides.length < 2) return;
      var dots = $$('[data-go]', root);
      var DELAY = 3000;
      var index = 0;
      var timer = null;
      var held = false;      // pointer or focus is holding it still

      var reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function show(i) {
        index = (i + slides.length) % slides.length;
        track.style.transform = 'translateX(' + (-index * 100) + '%)';
        slides.forEach(function (li, n) {
          li.setAttribute('aria-hidden', n === index ? 'false' : 'true');
        });
        dots.forEach(function (d, n) {
          if (n === index) d.setAttribute('aria-current', 'true');
          else d.removeAttribute('aria-current');
        });
      }

      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      function start() {
        stop();
        if (reduced || held || (box && !box.hidden) || document.hidden) return;
        timer = setInterval(function () { show(index + 1); }, DELAY);
      }
      function hold(on) { held = on; on ? stop() : start(); }

      $('[data-prev]', root).addEventListener('click', function () {
        show(index - 1); start();
      });
      $('[data-next]', root).addEventListener('click', function () {
        show(index + 1); start();
      });
      dots.forEach(function (d) {
        d.addEventListener('click', function () {
          show(parseInt(d.getAttribute('data-go'), 10)); start();
        });
      });

      root.addEventListener('mouseenter', function () { hold(true); });
      root.addEventListener('mouseleave', function () { hold(false); });
      root.addEventListener('focusin', function () { hold(true); });
      root.addEventListener('focusout', function () {
        if (!root.contains(document.activeElement)) hold(false);
      });
      document.addEventListener('visibilitychange', start);

      // click a slide to open it large
      if (box) {
        slides.forEach(function (li, n) {
          var img = li.querySelector('img');
          if (!img) return;
          img.addEventListener('click', function () { openBox(slides, n, show, start); });
        });
      }

      show(0);
      start();
      root._galleryStart = start;
    });

    if (box) wireBox(box);
  }

  /* The lightbox is a single element shared by every gallery on the page. It
   * borrows the slide list it was opened from, so prev / next inside it walk
   * the same images. */
  var boxState = { slides: null, index: 0, sync: null, resume: null };

  function openBox(slides, index, sync, resume) {
    var box = $('[data-lightbox]');
    if (!box) return;
    boxState.slides = slides;
    boxState.sync = sync;
    boxState.resume = resume;
    boxState.lastFocus = document.activeElement;
    paint(index);
    box.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    var close = $('[data-lb-close]', box);
    if (close) close.focus();
  }

  function paint(i) {
    var box = $('[data-lightbox]');
    var slides = boxState.slides;
    if (!box || !slides) return;
    boxState.index = (i + slides.length) % slides.length;
    var src = slides[boxState.index].querySelector('img');
    var img = $('[data-lb-img]', box);
    var cap = $('[data-lb-caption]', box);
    img.src = src.getAttribute('src');
    img.alt = src.getAttribute('alt') || '';
    if (cap) {
      cap.textContent = (boxState.index + 1) + ' of ' + slides.length +
        (src.getAttribute('alt') ? ' \u00b7 ' + src.getAttribute('alt') : '');
    }
  }

  function closeBox() {
    var box = $('[data-lightbox]');
    if (!box || box.hidden) return;
    box.hidden = true;
    document.documentElement.style.overflow = '';
    // put the slider back where the lightbox was left, then let it run on
    if (boxState.sync) boxState.sync(boxState.index);
    if (boxState.resume) boxState.resume();
    if (boxState.lastFocus && boxState.lastFocus.focus) boxState.lastFocus.focus();
  }

  function wireBox(box) {
    $('[data-lb-close]', box).addEventListener('click', closeBox);
    $('[data-lb-prev]', box).addEventListener('click', function () { paint(boxState.index - 1); });
    $('[data-lb-next]', box).addEventListener('click', function () { paint(boxState.index + 1); });
    // clicking the backdrop closes; clicking the picture does not
    box.addEventListener('click', function (e) { if (e.target === box) closeBox(); });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') { closeBox(); }
      else if (e.key === 'ArrowLeft') { paint(boxState.index - 1); }
      else if (e.key === 'ArrowRight') { paint(boxState.index + 1); }
    });
  }

  function init() {
    initHeader();
    initStickyPills();
    initSidebar();
    initRequestForms();
    initApplyForm();
    initSubscribe();
    initHeaderVideo();
    initTickers();
    initMobileBar();
    initHashLanding();
    initGalleries();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
