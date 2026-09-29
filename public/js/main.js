/* SA Consulting — interactions (vanilla JS, sans dépendance) */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var CONFIG = window.SA_CONFIG || { form: {}, booking: {} };
  var I18N = {};
  try { I18N = JSON.parse((doc.getElementById('i18n-data') || {}).textContent || '{}'); } catch (e) { I18N = {}; }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Ouverture locale (file://) : liens de dossier → index.html ---------- */
  if (location.protocol === 'file:') {
    doc.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (/^(https?:|mailto:|tel:|#)/.test(h)) return;
      var parts = h.split('#');
      if (/\/$/.test(parts[0]) || parts[0] === './') {
        a.setAttribute('href', parts[0] + 'index.html' + (parts[1] !== undefined ? '#' + parts[1] : ''));
      }
    });
  }

  /* ---------- 2. Langue : mémorisation du choix ---------- */
  doc.querySelectorAll('[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('sa-lang', a.getAttribute('data-lang')); } catch (e) { /* stockage indisponible */ }
    });
  });
  // La page affichée devient la préférence (ex. arrivée directe sur /en/ depuis Google).
  try { if (I18N.lang) localStorage.setItem('sa-lang', I18N.lang); } catch (e) { /* ignore */ }

  /* ---------- 3. Header : état au défilement ---------- */
  var header = doc.querySelector('[data-header]');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 12); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 4. Menu mobile accessible ---------- */
  var toggle = doc.querySelector('[data-menu-toggle]');
  var nav = doc.querySelector('[data-nav]');
  var mq = window.matchMedia('(max-width: 1140px)');
  function setMenu(open, returnFocus) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    doc.body.classList.toggle('menu-open', open);
    var label = toggle.querySelector('[data-menu-label]');
    if (label) label.textContent = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
    if (open) { var first = nav.querySelector('a'); if (first) first.focus({ preventScroll: true }); }
    else if (returnFocus) toggle.focus();
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
      // Piège de focus simple dans le menu ouvert
      if (e.key === 'Tab' && nav.classList.contains('is-open')) {
        var items = [toggle].concat(Array.prototype.slice.call(nav.querySelectorAll('a, button')));
        var firstEl = items[0], lastEl = items[items.length - 1];
        if (e.shiftKey && doc.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && doc.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    });
    var onMq = function () { if (!mq.matches) setMenu(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------- 5. Lien actif dans la navigation ---------- */
  var navLinks = doc.querySelectorAll('[data-nav-link]');
  if ('IntersectionObserver' in window && navLinks.length) {
    var map = {};
    navLinks.forEach(function (a) { var id = (a.getAttribute('href').split('#')[1] || ''); if (id) map[id] = a; });
    var sections = Object.keys(map).map(function (id) { return doc.getElementById(id); }).filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        var link = map[en.target.id]; if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 6. Apparitions au défilement ---------- */
  var reveals = doc.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 7. Prise de rendez-vous (prête pour Calendly / Google Agenda) ---------- */
  var form = doc.querySelector('[data-form]');
  function focusForm() {
    var target = doc.getElementById('contact');
    if (!target) return false;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    var first = form && form.querySelector('input[name="name"]');
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, reduceMotion ? 0 : 650);
    return true;
  }
  doc.querySelectorAll('[data-booking]').forEach(function (btn) {
    if (CONFIG.booking && CONFIG.booking.url) {
      btn.setAttribute('href', CONFIG.booking.url);
      if (CONFIG.booking.newTab !== false) { btn.setAttribute('target', '_blank'); btn.setAttribute('rel', 'noopener'); }
      return;
    }
    btn.addEventListener('click', function (e) { if (focusForm()) { e.preventDefault(); history.replaceState(null, '', '#contact'); } });
  });

  /* ---------- 8. « Échanger sur ce besoin » → présélection du service ---------- */
  doc.querySelectorAll('[data-service]').forEach(function (a) {
    a.addEventListener('click', function () {
      var select = doc.getElementById('f-service');
      if (select) { select.value = a.getAttribute('data-service'); clearError(select); }
    });
  });

  /* ---------- 9. Formulaire de contact ---------- */
  if (!form) return;
  var T = I18N.form || {};
  var startedAt = Date.now();
  var submitBtn = form.querySelector('[data-submit]');
  var submitLabel = form.querySelector('[data-submit-label]');
  var statusBox = form.querySelector('[data-form-status]');
  var summary = form.querySelector('[data-form-summary]');
  var mailBtn = form.querySelector('[data-mail-fallback]');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[+()\d\s.-]{8,20}$/;

  function errorEl(field) { return doc.getElementById(field.id + '-err'); }
  function setError(field, msg) {
    field.setAttribute('aria-invalid', 'true');
    var el = errorEl(field); if (el) { el.textContent = msg; el.hidden = false; }
  }
  function clearError(field) {
    field.removeAttribute('aria-invalid');
    var el = errorEl(field); if (el) { el.textContent = ''; el.hidden = true; }
  }
  function validateField(field) {
    var v = (field.value || '').trim();
    var E = T.errors || {};
    if (field.required && !v) return E.required;
    if (field.name === 'email' && v && !EMAIL_RE.test(v)) return E.email;
    if (field.name === 'phone' && v && !PHONE_RE.test(v)) return E.phone;
    if (field.name === 'message' && v && v.length < 10) return E.message;
    return '';
  }
  var fields = Array.prototype.slice.call(form.querySelectorAll('input[name]:not([name="botcheck"]), select[name], textarea[name]'));
  fields.forEach(function (f) {
    f.addEventListener('blur', function () { if (f.value) { var m = validateField(f); if (m) setError(f, m); else clearError(f); } });
    f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true' && !validateField(f)) clearError(f); });
    f.addEventListener('change', function () { if (f.getAttribute('aria-invalid') === 'true' && !validateField(f)) clearError(f); });
  });

  function showStatus(type, msg) {
    statusBox.className = 'form-status is-' + type;
    statusBox.textContent = msg;
    statusBox.hidden = false;
  }
  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? T.sending : T.submit;
  }
  function payload() {
    var data = {};
    fields.forEach(function (f) { data[f.name] = (f.value || '').trim(); });
    var sel = form.querySelector('select[name="service"]');
    data.service = sel && sel.selectedIndex > 0 ? sel.options[sel.selectedIndex].text : data.service;
    return data;
  }
  function buildMailto(d) {
    var body = [
      (T.name || 'Nom') + ' : ' + d.name,
      (T.company || 'Entreprise') + ' : ' + (d.company || '—'),
      (T.email || 'Email') + ' : ' + d.email,
      (T.phone || 'Téléphone') + ' : ' + (d.phone || '—'),
      (T.service || 'Service') + ' : ' + d.service,
      '',
      d.message
    ].join('\n');
    return 'mailto:' + I18N.email + '?subject=' + encodeURIComponent((I18N.subjectPrefix || '') + ' — ' + d.service) + '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusBox.hidden = true; summary.hidden = true; if (mailBtn) mailBtn.hidden = true;

    // Validation
    var firstInvalid = null;
    fields.forEach(function (f) {
      var m = validateField(f);
      if (m) { setError(f, m); if (!firstInvalid) firstInvalid = f; } else clearError(f);
    });
    if (firstInvalid) {
      summary.textContent = (T.errors || {}).summary || '';
      summary.hidden = false;
      firstInvalid.focus();
      return;
    }

    // Anti-spam : pot de miel + délai minimal
    var hp = form.querySelector('[name="botcheck"]');
    var minMs = ((CONFIG.form && CONFIG.form.minFillSeconds) || 3) * 1000;
    if ((hp && hp.checked) || Date.now() - startedAt < minMs) {
      showStatus('error', T.spam);
      return;
    }

    var d = payload();

    // Formulaire non encore configuré : aucune simulation de succès.
    if (!CONFIG.form || !CONFIG.form.accessKey || !CONFIG.form.endpoint) {
      showStatus('error', T.notConfigured);
      if (mailBtn) { mailBtn.href = buildMailto(d); mailBtn.hidden = false; }
      return;
    }

    setBusy(true);
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, CONFIG.form.timeoutMs || 15000);

    fetch(CONFIG.form.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: CONFIG.form.accessKey,
        subject: (I18N.subjectPrefix || 'Nouvelle demande') + ' — ' + d.service,
        from_name: 'Site SA Consulting',
        replyto: d.email,
        botcheck: false,
        'Nom et prénom': d.name,
        Entreprise: d.company || '—',
        Email: d.email,
        'Téléphone': d.phone || '—',
        'Service recherché': d.service,
        Message: d.message,
        Langue: (I18N.lang || 'fr').toUpperCase(),
        Page: location.href.split('#')[0]
      }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { return { ok: res.ok, json: json }; }); })
      .then(function (r) {
        if (r.ok && r.json && r.json.success === true) {
          // Succès RÉEL confirmé par le service d'envoi
          form.reset();
          fields.forEach(clearError);
          startedAt = Date.now();
          showStatus('success', T.success);
          statusBox.setAttribute('tabindex', '-1');
          statusBox.focus();
        } else {
          throw new Error((r.json && r.json.message) || 'send-failed');
        }
      })
      .catch(function () {
        showStatus('error', T.error);
        if (mailBtn) { mailBtn.href = buildMailto(d); mailBtn.hidden = false; }
      })
      .then(function () { clearTimeout(timer); setBusy(false); });
  });
})();
