/* Okunland University – site interactions (vanilla JS, no dependencies) */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // Sticky header shadow + header height var (for sticky sub-nav)
  var header = $('.site-header');
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 40);
    var tt = $('.to-top'); if (tt) tt.classList.toggle('show', y > 600);
  }
  function setHdr() { if (header) document.documentElement.style.setProperty('--hdr', header.offsetHeight + 'px'); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', setHdr); setHdr(); onScroll();

  // Mobile menu
  var toggle = $('.menu-toggle'), nav = $('.mainnav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
      document.body.style.overflow = !open && window.innerWidth < 960 ? 'hidden' : '';
    });
    $$('.sub-toggle', nav).forEach(function (b) {
      b.addEventListener('click', function () {
        var li = b.closest('li'); var o = li.classList.toggle('sub-open');
        b.setAttribute('aria-expanded', String(o)); b.textContent = o ? '−' : '+';
      });
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && nav.classList.contains('open')) { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); document.body.style.overflow = ''; }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { toggle.click(); toggle.focus(); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 960 && nav.classList.contains('open')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
    });
  }

  // Back to top
  var tt = $('.to-top');
  if (tt) tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // Reveal on scroll
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('in'); });

  // Animated counters
  function animate(el) {
    var target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '', prefix = el.dataset.prefix || '';
    var dur = 1800, start = null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = prefix + target + suffix; return; }
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString('en-NG') + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { animate(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { co.observe(c); });
  } else counters.forEach(animate);

  // Tabs (ARIA)
  $$('.tabs').forEach(function (t) {
    var tabs = $$('[role=tab]', t);
    function select(tab) {
      tabs.forEach(function (x) {
        var on = x === tab; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on;
      });
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); select(n); n.focus(); }
      });
    });
  });

  // Carousel
  $$('.carousel').forEach(function (c) {
    var track = $('.track', c), slides = $$('.slide', c), dots = $('.dots', c), idx = 0, timer;
    if (!track || !slides.length) return;
    slides.forEach(function (s, i) {
      s.setAttribute('aria-roledescription', 'slide'); s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Show testimonial ' + (i + 1));
      b.addEventListener('click', function () { go(i); restart(); }); dots.appendChild(b);
    });
    function go(i) {
      idx = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-100 * idx) + '%)';
      $$('button', dots).forEach(function (d, j) { d.setAttribute('aria-current', j === idx); });
      slides.forEach(function (s, j) { s.setAttribute('aria-hidden', j !== idx); });
    }
    function restart() { clearInterval(timer); timer = setInterval(function () { go(idx + 1); }, 7000); }
    $('.prev', c).addEventListener('click', function () { go(idx - 1); restart(); });
    $('.next', c).addEventListener('click', function () { go(idx + 1); restart(); });
    c.addEventListener('mouseenter', function () { clearInterval(timer); });
    c.addEventListener('mouseleave', restart);
    c.addEventListener('focusin', function () { clearInterval(timer); });
    var sx = null;
    track.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); restart(); } sx = null; });
    go(0); restart();
  });

  // Accordion
  $$('.acc-btn').forEach(function (b) {
    var panel = document.getElementById(b.getAttribute('aria-controls'));
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      panel.style.maxHeight = open ? '0px' : panel.scrollHeight + 'px';
    });
  });

  // Sub-nav active state on scroll
  var sublinks = $$('.subnav a[href^="#"]');
  if (sublinks.length && 'IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) sublinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sublinks.forEach(function (a) { var t = document.querySelector(a.getAttribute('href')); if (t) so.observe(t); });
  }

  // Program filter (academics page)
  var search = $('#prog-search');
  if (search) {
    var chips = $$('.chip[data-filter]'), items = $$('[data-faculty]'), active = 'all';
    function apply() {
      var q = search.value.trim().toLowerCase(), shown = 0;
      items.forEach(function (it) {
        var okF = active === 'all' || it.dataset.faculty === active;
        var okQ = !q || it.textContent.toLowerCase().indexOf(q) > -1;
        it.hidden = !(okF && okQ); if (!it.hidden) shown++;
      });
      var none = $('#prog-none'); if (none) none.hidden = shown > 0;
    }
    chips.forEach(function (ch) {
      ch.addEventListener('click', function () {
        active = ch.dataset.filter; chips.forEach(function (x) { x.setAttribute('aria-pressed', x === ch); }); apply();
      });
    });
    search.addEventListener('input', apply);
  }

  // Video / generic modal
  $$('[data-modal]').forEach(function (b) {
    var m = document.getElementById(b.dataset.modal); if (!m) return;
    b.addEventListener('click', function () { m.classList.add('open'); var c = $('.modal-close', m); if (c) c.focus(); });
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('.modal-close')) { m.classList.remove('open'); b.focus(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') m.classList.remove('open'); });
  });

  // Generic demo forms (visit / contact / prospectus): validate + friendly confirmation
  $$('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = $('.form-status', f), ok = true;
      $$('[required]', f).forEach(function (inp) {
        var valid = inp.type === 'checkbox' ? inp.checked : inp.checkValidity() && inp.value.trim() !== '';
        inp.setAttribute('aria-invalid', String(!valid)); if (!valid) ok = false;
      });
      if (!ok) { st.className = 'form-status bad'; st.textContent = 'Please complete the highlighted fields.'; return; }
      st.className = 'form-status ok'; st.textContent = f.dataset.demo; f.reset();
    });
  });

  // Footer year
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
