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

    function pin() {
      band.style.position = 'fixed';
      band.style.top = '0';
      band.style.left = '0';
      band.style.right = '0';
      band.style.boxShadow = '0 2px 10px rgba(8,36,58,.14)';
      spacer.style.height = bandH + 'px';
      pinned = true;
    }
    function unpin() {
      band.style.position = 'static';
      band.style.boxShadow = 'none';
      spacer.style.height = '0px';
      pinned = false;
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

  function init() {
    initHeader();
    initSidebar();
    initRequestForms();
    initApplyForm();
    initSubscribe();
    initMobileBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
