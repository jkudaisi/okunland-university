/* ==========================================================================
   The Okunland Gazette – email list sign-up
   --------------------------------------------------------------------------
   CONFIGURE HERE. Leave GAZETTE_ENDPOINT empty to store sign-ups in this
   browser's localStorage (demo mode). See README.md for Mailchimp,
   Formspree, Google Sheets (Apps Script) and Supabase set-ups.
   ========================================================================== */
var GAZETTE_ENDPOINT = '';          // e.g. 'https://formspree.io/f/abcdwxyz' or an Apps Script /exec URL
var GAZETTE_MODE = 'json';          // 'json' (Formspree, Apps Script, custom API), 'form' (urlencoded POST), 'supabase'
var GAZETTE_HEADERS = {};           // extra headers, e.g. Supabase: { apikey: 'ANON_KEY', Authorization: 'Bearer ANON_KEY' }
var GAZETTE_STORAGE_KEY = 'oku_gazette_signups';   // ONE shared list for every form on the site
var GAZETTE_POPUP_DELAY_DAYS = 14;  // after "No thanks", wait this long before showing the slide-in again

(function () {
  'use strict';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var FLAG_SUB = 'oku_gz_subscribed', FLAG_POP = 'oku_gz_popup_dismissed', FLAG_BAR = 'oku_gz_bar_dismissed';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function daysSince(k) { var t = +get(k); return t ? (Date.now() - t) / 864e5 : Infinity; }
  function readLocal() { try { return JSON.parse(localStorage.getItem(GAZETTE_STORAGE_KEY)) || []; } catch (e) { return []; } }
  function writeLocal(list) { localStorage.setItem(GAZETTE_STORAGE_KEY, JSON.stringify(list)); }

  function send(data) {
    if (!GAZETTE_ENDPOINT) {
      var list = readLocal();
      if (list.some(function (r) { return r.email === data.email; })) return Promise.resolve({ duplicate: true });
      list.push(data); writeLocal(list); return Promise.resolve({ ok: true });
    }
    var headers = Object.assign({ 'Accept': 'application/json' }, GAZETTE_HEADERS), body;
    if (GAZETTE_MODE === 'form') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(data).toString();
    } else if (GAZETTE_MODE === 'supabase') {
      headers['Content-Type'] = 'application/json'; headers['Prefer'] = 'return=minimal';
      body = JSON.stringify({ email: data.email, first_name: data.first_name, role: data.role, consent: true, source: data.source });
    } else {
      // Apps Script web apps reject CORS preflights, so send JSON as text/plain
      headers['Content-Type'] = /script\.google\.com/.test(GAZETTE_ENDPOINT) ? 'text/plain;charset=utf-8' : 'application/json';
      body = JSON.stringify(data);
    }
    return fetch(GAZETTE_ENDPOINT, { method: 'POST', headers: headers, body: body }).then(function (r) {
      if (r.status === 409) return { duplicate: true };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { ok: true };
    });
  }

  function setErr(input, msg) {
    if (!input) return;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var holder = input.closest('.field'), m = holder && holder.querySelector('.err-msg');
    if (m) m.textContent = msg || '';
  }

  document.querySelectorAll('form.gazette-form').forEach(function (form) {
    var status = form.querySelector('.form-status'), btn = form.querySelector('button[type=submit]');
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('[name=email]'), first = form.querySelector('[name=first_name]'),
          role = form.querySelector('[name=role]'), consent = form.querySelector('[name=consent]'),
          hp = form.querySelector('[name=website]');
      status.className = 'form-status'; status.textContent = '';
      // Honeypot: bots fill hidden fields. Pretend success and drop it.
      if (hp && hp.value) { status.className = 'form-status ok'; status.textContent = 'Thank you!'; form.reset(); return; }
      var ok = true, val = (email.value || '').trim().toLowerCase();
      if (!val) { setErr(email, 'Please enter your email address.'); ok = false; }
      else if (!EMAIL_RE.test(val)) { setErr(email, 'That email address doesn\u2019t look right.'); ok = false; }
      else setErr(email, '');
      if (first && first.value.length > 60) { setErr(first, 'Please keep it under 60 characters.'); ok = false; }
      if (consent && !consent.checked) { setErr(consent, 'Please tick the box so we can email you.'); ok = false; } else setErr(consent, '');
      if (!ok) { status.className = 'form-status bad'; status.textContent = 'Please fix the highlighted fields.'; (form.querySelector('[aria-invalid=true]') || email).focus(); return; }
      var data = {
        email: val,
        first_name: first ? first.value.trim() : '',
        role: role ? role.value : '',
        consent: 'yes',
        source: form.dataset.source || location.pathname.split('/').pop() || 'index.html',
        submitted_at: new Date().toISOString()
      };
      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Subscribing\u2026';
      send(data).then(function (res) {
        status.className = 'form-status ok';
        status.textContent = res.duplicate
          ? 'You\u2019re already on the list \u2013 thank you! The next issue of The Okunland Gazette is on its way.'
          : 'Welcome aboard' + (data.first_name ? ', ' + data.first_name : '') + '! You\u2019re subscribed to The Okunland Gazette.';
        form.reset();
        set(FLAG_SUB, data.email);
        hidePromos();
      }).catch(function () {
        status.className = 'form-status bad';
        status.textContent = 'Sorry, we couldn\u2019t subscribe you just now. Please try again in a moment or email info@okunland.edu.ng.';
      }).then(function () { btn.disabled = false; btn.textContent = label; });
    });
  });

  // ---------- Promotions: announcement bar + slide-in ----------
  var bar = document.getElementById('announce'), pop = document.getElementById('gz-pop'), toTop = document.querySelector('.to-top');
  var isSubscribePage = /subscribe\.html$/.test(location.pathname);
  function hidePopup() { if (!pop) return; pop.classList.remove('show'); if (toTop) toTop.classList.remove('lift'); setTimeout(function () { pop.hidden = true; }, 400); }
  function hidePromos() { if (bar) bar.hidden = true; if (pop && pop.classList.contains('show')) setTimeout(hidePopup, 2500); }
  if (bar) {
    if (get(FLAG_SUB) || daysSince(FLAG_BAR) < 7) bar.hidden = true;
    bar.querySelector('.x').addEventListener('click', function () { bar.hidden = true; set(FLAG_BAR, Date.now()); });
    var cta = bar.querySelector('[data-gz-cta]'), hero = document.getElementById('hero-signup');
    if (cta && hero) cta.addEventListener('click', function (e) {
      e.preventDefault(); hero.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { hero.querySelector('[name=email]').focus({ preventScroll: true }); }, 500);
    });
  }
  if (pop && !isSubscribePage && !get(FLAG_SUB) && daysSince(FLAG_POP) >= GAZETTE_POPUP_DELAY_DAYS) {
    var shown = false;
    function maybeShow() {
      if (shown) return;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0 && window.scrollY / h > 0.45) {
        // don't interrupt someone typing in another form
        var a = document.activeElement; if (a && a.closest && a.closest('form') && !pop.contains(a)) return;
        shown = true; pop.hidden = false; requestAnimationFrame(function () { pop.classList.add('show'); });
        if (toTop) toTop.classList.add('lift');
        window.removeEventListener('scroll', maybeShow);
      }
    }
    window.addEventListener('scroll', maybeShow, { passive: true });
    function dismiss() { set(FLAG_POP, Date.now()); hidePopup(); }
    pop.querySelector('.close').addEventListener('click', dismiss);
    pop.querySelector('.later').addEventListener('click', dismiss);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop.classList.contains('show')) dismiss(); });
  }

  // ---------- Hidden admin view: subscribe.html?admin=1 ----------
  var admin = document.getElementById('gazette-admin');
  if (admin && /[?&]admin=1/.test(location.search)) {
    admin.hidden = false;
    var tbody = admin.querySelector('tbody'), count = admin.querySelector('[data-count-subs]');
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    var summary = admin.querySelector('[data-summary]');
    function render() {
      var list = readLocal(); count.textContent = list.length;
      if (summary) {
        var by = {}; list.forEach(function (r) { by[r.source || 'unknown'] = (by[r.source || 'unknown'] || 0) + 1; });
        summary.textContent = list.length ? 'By form: ' + Object.keys(by).map(function (k) { return k + ' ' + by[k]; }).join(' \u00b7 ') : '';
      }
      tbody.innerHTML = list.length ? list.map(function (r, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.email) + '</td><td>' + esc(r.first_name) + '</td><td>' + esc(r.role) + '</td><td>' + esc(r.source) + '</td><td>' + esc((r.submitted_at || '').replace('T', ' ').slice(0, 16)) + '</td></tr>';
      }).join('') : '<tr><td colspan="6">No sign-ups stored in this browser yet.</td></tr>';
    }
    admin.querySelector('[data-export]').addEventListener('click', function () {
      var list = readLocal(), cols = ['email', 'first_name', 'role', 'consent', 'source', 'submitted_at'];
      var csv = [cols.join(',')].concat(list.map(function (r) {
        return cols.map(function (c) { return '"' + String(r[c] == null ? '' : r[c]).replace(/"/g, '""') + '"'; }).join(',');
      })).join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'okunland-gazette-subscribers-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
    });
    var imp = admin.querySelector('[data-import]');
    if (imp) imp.addEventListener('change', function () {
      var file = imp.files[0]; if (!file) return;
      file.text().then(function (txt) {
        var rows = txt.split(/\r?\n/).filter(Boolean), head = rows.shift().split(',').map(function (h) { return h.replace(/"/g, '').trim().toLowerCase(); });
        var list = readLocal(), seen = {}, added = 0;
        list.forEach(function (r) { seen[r.email] = 1; });
        rows.forEach(function (line) {
          var cells = (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map(function (c) { return c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'); });
          var r = {}; head.forEach(function (h, i) { r[h] = cells[i] || ''; });
          r.email = (r.email || '').trim().toLowerCase();
          if (EMAIL_RE.test(r.email) && !seen[r.email]) { seen[r.email] = 1; r.source = r.source || 'import'; r.consent = r.consent || 'yes'; r.submitted_at = r.submitted_at || new Date().toISOString(); list.push(r); added++; }
        });
        writeLocal(list); render(); alert(added + ' new subscriber(s) imported; duplicates skipped.'); imp.value = '';
      });
    });
    admin.querySelector('[data-clear]').addEventListener('click', function () {
      if (confirm('Delete all sign-ups stored in this browser?')) { writeLocal([]); render(); }
    });
    render();
    var note = admin.querySelector('[data-mode]');
    if (note) note.textContent = GAZETTE_ENDPOINT ? 'Live endpoint configured: new sign-ups go to ' + GAZETTE_ENDPOINT + ' (this table only shows older local entries).' : 'Demo mode: no endpoint configured, so sign-ups are stored only in this browser.';
  }
})();
