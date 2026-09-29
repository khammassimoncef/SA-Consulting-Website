#!/usr/bin/env node
/**
 * SA Consulting — génération du site statique (sans dépendance).
 *
 *   npm run build      (ou : node src/build.mjs)
 *
 * Entrées : src/site.config.json   coordonnées, URL
 *           src/i18n/{fr,en,ar}.json  textes des trois langues
 *           public/                fichiers statiques (CSS, JS, images, polices, icônes)
 * Sortie  : dist/                  site complet, prêt à être mis en ligne
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { icons, directional, connectIcons } from './icons.mjs';

const SRC = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SRC, '..');
const PUBLIC = join(ROOT, 'public');
const DIST = join(ROOT, 'dist');
const cfg = JSON.parse(readFileSync(join(SRC, 'site.config.json'), 'utf8'));
const LANGS = ['fr', 'en', 'ar'];
const T = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(readFileSync(join(SRC, 'i18n', `${l}.json`), 'utf8'))]));
// Typographie française : espaces insécables avant ? ! : ; et » (évite les retours à la ligne orphelins)
const frNbsp = (v) => typeof v === 'string' ? v.replace(/ ([?!:;»])/g, '\u00A0$1').replace(/« /g, '«\u00A0')
  : Array.isArray(v) ? v.map(frNbsp) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, frNbsp(x)])) : v;
T.fr = frNbsp(T.fr);
const BASE = cfg.siteUrl.replace(/\/$/, '');
// Version des fichiers CSS/JS (empreinte du contenu) pour invalider le cache navigateur après une mise à jour.
const ASSET_V = createHash('sha1').update(['css/style.css', 'js/main.js', 'js/config.js'].map((f) => readFileSync(join(PUBLIC, f))).join('')).digest('hex').slice(0, 8);

/* ---------- Utilitaires ---------- */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const fill = (s) => String(s)
  .replaceAll('{email}', cfg.email)
  .replaceAll('{phone1}', cfg.phones[0].display)
  .replaceAll('{phone2}', cfg.phones[1].display);
const icon = (name, cls = '') => {
  if (!icons[name]) throw new Error(`Unknown icon: ${name}`);
  const c = ['icon', cls, directional.has(name) ? 'icon--dir' : ''].filter(Boolean).join(' ');
  return `<svg class="${c}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
};
const sprite = () => `<svg class="sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${Object.entries(icons)
  .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}</svg>`;
const ltr = (s) => `<span dir="ltr" class="ltr">${esc(s)}</span>`;
const waLink = (lang) => `https://wa.me/${cfg.whatsapp.number}?text=${encodeURIComponent(T[lang].whatsappMessage)}`;
const mailto = `mailto:${cfg.email}`;
const tel = (i) => `tel:${cfg.phones[i].tel}`;
const out = (rel, html) => { const p = join(DIST, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, html); console.log('  ✓', rel); };
const hasPlaceholders = (page) => page.sections.some((s) => (s.rows || []).some((r) => r[1] === null));

/* ---------- Blocs communs ---------- */
const SOCIAL_ICONS = { linkedin: 'linkedin' };
function socialLinks(t) {
  const items = Object.entries(cfg.social).filter(([k, v]) => v && SOCIAL_ICONS[k]);
  if (!items.length) return '';
  return `<ul class="footer-social">${items.map(([k, v]) => `<li><a href="${esc(v)}" target="_blank" rel="noopener" aria-label="${esc(t.contact[k + 'Aria'] || k)}" title="${esc(t.contact[k + 'Action'] || k)}">${icon(SOCIAL_ICONS[k])}</a></li>`).join('')}</ul>`;
}
function head({ t, lang, pageKey, title, description, robots = 'index, follow', alternates = true }) {
  const m = t.meta;
  const url = `${BASE}/${m.pages[pageKey]}`;
  const alt = alternates ? LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${BASE}/${T[l].meta.pages[pageKey]}">`).join('\n  ')
    + (pageKey === 'home' ? `\n  <link rel="alternate" hreflang="x-default" href="${BASE}/">` : '') : '';
  const preload = lang === 'ar'
    ? ['ibm-plex-sans-arabic-arabic-400-normal', 'ibm-plex-sans-arabic-arabic-700-normal']
    : ['plus-jakarta-sans-latin-wght-normal', 'inter-latin-wght-normal'];
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${url}">
  ${alt}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SA Consulting">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(pageKey === 'home' ? m.ogTitle : title)}">
  <meta property="og:description" content="${esc(pageKey === 'home' ? m.ogDescription : description)}">
  <meta property="og:image" content="${BASE}/images/site/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="SA Consulting">
  <meta property="og:locale" content="${m.locale}">
  ${LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${T[l].meta.locale}">`).join('\n  ')}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0A0F0D">
  <link rel="icon" href="../favicon.ico" sizes="48x48">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../apple-touch-icon.png">
  <link rel="manifest" href="../site.webmanifest">
  ${preload.map((f) => `<link rel="preload" href="../assets/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`).join('\n  ')}
  <link rel="stylesheet" href="../css/style.css?v=${ASSET_V}">
  <script>document.documentElement.classList.add('js')</script>
  <script src="../js/config.js?v=${ASSET_V}" defer></script>
  <script src="../js/main.js?v=${ASSET_V}" defer></script>`;
}

function header({ t, lang, pageKey, onHome }) {
  const h = onHome ? '' : './';
  const nav = [['home', 'home'], ['about', 'about'], ['expertise', 'expertise'], ['approach', 'process'], ['contact', 'contact']];
  return `<a class="skip-link" href="#main">${esc(t.nav.skip)}</a>
<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="${h}#home" aria-label="${esc(t.nav.homeLink)}">
      <img src="../images/logo/sa-consulting-logo-light.svg" width="128" height="50" alt="SA Consulting">
    </a>
    <nav class="main-nav" id="main-nav" aria-label="${esc(t.nav.mainLabel)}" data-nav>
      <ul class="nav-list">
        ${nav.map(([id, key]) => `<li><a class="nav-link" href="${h}#${id}" data-nav-link>${esc(t.nav[key])}</a></li>`).join('\n        ')}
      </ul>
      <div class="nav-extra">
        <a class="btn btn--primary btn--block" href="${h}#contact" data-booking>${icon('calendar')}<span>${esc(t.nav.cta)}</span></a>
        <div class="nav-extra-contacts">
          <a href="${tel(0)}">${icon('phone')}${ltr(cfg.phones[0].display)}</a>
          <a href="${mailto}">${icon('mail')}<span>${esc(cfg.email)}</span></a>
        </div>
      </div>
    </nav>
    <div class="header-actions">
      <ul class="lang-switch" aria-label="${esc(t.nav.langLabel)}">
        ${LANGS.map((l) => `<li><a href="../${T[l].meta.pages[pageKey]}" hreflang="${l}" lang="${l}" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''} title="${esc(T[l].meta.label)}">${T[l].meta.short}</a></li>`).join('')}
      </ul>
      <a class="btn btn--primary btn--sm header-cta" href="${h}#contact" data-booking>${esc(t.nav.cta)}</a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" data-menu-toggle
        data-label-open="${esc(t.nav.menu)}" data-label-close="${esc(t.nav.close)}">
        <span class="menu-toggle-box" aria-hidden="true"><span></span><span></span><span></span></span>
        <span class="sr-only" data-menu-label>${esc(t.nav.menu)}</span>
      </button>
    </div>
  </div>
</header>`;
}

function footer({ t, lang, onHome }) {
  const h = onHome ? '' : './';
  const nav = [['home', 'home'], ['about', 'about'], ['expertise', 'expertise'], ['approach', 'process'], ['contact', 'contact']];
  return `<footer class="site-footer on-dark">
  <div class="container footer-grid">
    <div class="footer-brand">
      <img src="../images/logo/sa-consulting-logo-light.svg" width="164" height="64" alt="SA Consulting" loading="lazy">
      <p class="footer-tagline">${esc(t.footer.tagline)}</p>
      <p class="footer-partner">${esc(t.footer.partner)}</p>
      ${socialLinks(t)}
    </div>
    <nav class="footer-col" aria-label="${esc(t.footer.navTitle)}">
      <h2 class="footer-title">${esc(t.footer.navTitle)}</h2>
      <ul>${nav.map(([id, key]) => `<li><a href="${h}#${id}">${esc(t.nav[key])}</a></li>`).join('')}</ul>
    </nav>
    <div class="footer-col">
      <h2 class="footer-title">${esc(t.footer.contactTitle)}</h2>
      <ul class="footer-contact">
        <li><a href="${mailto}">${icon('mail')}<span>${esc(cfg.email)}</span></a></li>
        <li><a href="${tel(0)}">${icon('phone')}${ltr(cfg.phones[0].display)}</a></li>
        <li><a href="${tel(1)}">${icon('phone')}${ltr(cfg.phones[1].display)}</a></li>
        <li><span>${icon('pin')}<span>${esc(t.contact.locationValue)}</span></span></li>
      </ul>
    </div>
    <div class="footer-col">
      <h2 class="footer-title">${esc(t.footer.legalTitle)}</h2>
      <ul>
        <li><a href="../${t.meta.pages.legal}">${esc(t.footer.legal)}</a></li>
        <li><a href="../${t.meta.pages.privacy}">${esc(t.footer.privacy)}</a></li>
      </ul>
      <ul class="footer-langs" aria-label="${esc(t.nav.langLabel)}">
        ${LANGS.map((l) => `<li><a href="../${T[l].meta.pages.home}" hreflang="${l}" lang="${l}" data-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${esc(T[l].meta.label)}</a></li>`).join('')}
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>© ${cfg.year} SA Consulting. ${esc(t.footer.rights)}</p>
    <a class="back-top" href="#top">${icon('arrowUp')}<span>${esc(t.footer.backTop)}</span></a>
  </div>
  <a class="wa-float" href="${waLink(lang)}" target="_blank" rel="noopener" aria-label="${esc(t.whatsappFloat)}" title="${esc(t.whatsappFloat)}">${icon('whatsapp')}</a>
</footer>`;
}

function jsonLd(t, lang) {
  const services = t.services.items.map((s) => s.title);
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfessionalService',
        '@id': `${BASE}/#organization`,
        name: 'SA Consulting',
        url: `${BASE}/`,
        logo: `${BASE}/images/logo/sa-consulting-logo.png`,
        image: `${BASE}/images/site/og-image.jpg`,
        description: t.meta.description,
        email: cfg.email,
        telephone: cfg.phones.map((p) => p.tel),
        address: { '@type': 'PostalAddress', addressCountry: 'TN' },
        areaServed: { '@type': 'Country', name: 'Tunisia' },
        availableLanguage: ['fr', 'en', 'ar'],
        slogan: t.hero.tagline,
        sameAs: Object.values(cfg.social).filter(Boolean),
        knowsAbout: services,
        contactPoint: cfg.phones.map((p) => ({ '@type': 'ContactPoint', telephone: p.tel, email: cfg.email, contactType: 'customer service', areaServed: 'TN', availableLanguage: ['French', 'English', 'Arabic'] })),
        hasOfferCatalog: { '@type': 'OfferCatalog', name: t.services.title, itemListElement: t.services.items.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.desc } })) }
      },
      { '@type': 'WebSite', '@id': `${BASE}/#website`, url: `${BASE}/`, name: 'SA Consulting', inLanguage: ['fr', 'en', 'ar'], publisher: { '@id': `${BASE}/#organization` } },
      { '@type': 'WebPage', '@id': `${BASE}/${t.meta.pages.home}#webpage`, url: `${BASE}/${t.meta.pages.home}`, name: t.meta.title, description: t.meta.description, inLanguage: lang, isPartOf: { '@id': `${BASE}/#website` }, about: { '@id': `${BASE}/#organization` } }
    ]
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function clientData(t, lang) {
  const d = { lang, email: cfg.email, form: t.form, subjectPrefix: t.form.subject, whatsapp: waLink(lang) };
  return `<script type="application/json" id="i18n-data">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`;
}

const sectionHead = (kicker, title, subtitle, id, extra = '') => `<div class="section-head${extra}">
        <p class="kicker">${esc(kicker)}</p>
        <h2 class="section-title" id="${id}-title">${esc(title)}</h2>
        ${subtitle ? `<p class="section-sub">${esc(subtitle)}</p>` : ''}
      </div>`;

/* ---------- Page d'accueil ---------- */
function homePage(lang) {
  const t = T[lang];
  const html = `<!doctype html>
<html lang="${lang}" dir="${t.meta.dir}">
<head>
  ${head({ t, lang, pageKey: 'home', title: t.meta.title, description: t.meta.description })}
  ${jsonLd(t, lang)}
</head>
<body id="top">
${sprite()}
${header({ t, lang, pageKey: 'home', onHome: true })}
<main id="main">

  <!-- Accueil -->
  <section id="home" class="hero on-dark" aria-labelledby="home-title">
    <div class="hero-bg" aria-hidden="true">
      <svg class="hero-wave" viewBox="0 0 1440 320" preserveAspectRatio="none"><defs><linearGradient id="hw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1B8E64" stop-opacity=".0"/><stop offset=".55" stop-color="#1B8E64" stop-opacity=".55"/><stop offset="1" stop-color="#34AC7B" stop-opacity=".9"/></linearGradient></defs><path d="M0 320V300c240-10 420-40 620-90 230-58 360-160 560-190 110-16 190-12 260 0v300z" fill="url(#hw)" opacity=".35"/><path d="M0 300c250-6 460-30 660-80 230-58 350-150 540-178 100-14 180-10 240 0" fill="none" stroke="#34AC7B" stroke-opacity=".55" stroke-width="1.5"/></svg>
      <div class="hero-glow"></div>
    </div>
    <div class="container hero-grid">
      <div class="hero-content">
        <p class="eyebrow">${esc(t.hero.eyebrow)}</p>
        <h1 class="hero-title" id="home-title">${t.hero.title.map((w, i) => `<span${i === 2 ? ' class="accent"' : ''}>${esc(w)}</span>`).join(' ')}</h1>
        <p class="hero-sub">${esc(t.hero.subtitle)}</p>
        <div class="hero-actions">
          <a class="btn btn--primary btn--lg" href="#contact" data-booking>${icon('calendar')}<span>${esc(t.hero.ctaPrimary)}</span></a>
          <a class="btn btn--ghost btn--lg" href="#expertise"><span>${esc(t.hero.ctaSecondary)}</span>${icon('arrow')}</a>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-emblem" aria-hidden="true">
          <span class="ring ring--1"></span><span class="ring ring--2"></span><span class="ring ring--3"></span>
          <img src="../images/logo/sa-consulting-mark-light.svg" width="200" height="178" alt="" fetchpriority="high">
        </div>
        <p class="hero-tagline"><span class="hero-tagline-bar" aria-hidden="true"></span>${esc(t.hero.tagline)}<small>${esc(t.hero.taglineSub)}</small></p>
      </div>
    </div>
    <div class="container">
      <ul class="hero-pillars">${t.hero.pillars.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    </div>
  </section>

  <!-- À propos -->
  <section id="about" class="section about" aria-labelledby="about-title">
    <div class="container about-grid">
      <div class="about-intro reveal">
        <p class="kicker">${esc(t.about.kicker)}</p>
        <h2 class="section-title" id="about-title">${esc(t.about.title)}</h2>
        <p class="about-lead">${esc(t.about.lead)}</p>
      </div>
      <div class="about-body reveal">
        ${t.about.body.map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
        <h3 class="values-title">${esc(t.about.valuesTitle)}</h3>
        <ul class="values-grid">
          ${t.about.values.map((v) => `<li>${icon(v.icon)}<span>${esc(v.label)}</span></li>`).join('\n          ')}
        </ul>
      </div>
    </div>
  </section>

  <!-- Expertises -->
  <section id="expertise" class="section section--paper services" aria-labelledby="expertise-title">
    <div class="container">
      ${sectionHead(t.services.kicker, t.services.title, t.services.subtitle, 'expertise', ' section-head--split reveal')}
      <ol class="services-grid">
        ${t.services.items.map((s, i) => `<li class="service-card reveal">
          <div class="service-top">
            <span class="service-icon">${icon(s.icon)}</span>
            <span class="service-num" aria-hidden="true">${pad(i + 1)}</span>
          </div>
          <h3 class="service-title">${esc(s.title)}</h3>
          <p class="service-desc">${esc(s.desc)}</p>
          <a class="service-link" href="#contact" data-service="${s.id}" aria-label="${esc(`${t.services.more} : ${s.title}`)}"><span>${esc(t.services.more)}</span>${icon('arrow')}</a>
        </li>`).join('\n        ')}
      </ol>
    </div>
  </section>

  <!-- Nous accompagnons -->
  <section id="clients" class="section on-dark clients" aria-labelledby="clients-title">
    <div class="container clients-grid">
      <div class="clients-aside reveal">
        <p class="kicker">${esc(t.clients.kicker)}</p>
        <h2 class="section-title" id="clients-title">${esc(t.clients.title)}</h2>
        <p class="section-sub">${esc(t.clients.intro)}</p>
        <a class="btn btn--ghost" href="#contact">${esc(t.clients.cta)}${icon('arrow')}</a>
      </div>
      <ul class="clients-list">
        ${t.clients.items.map((c, i) => `<li class="client reveal">
          <span class="client-icon">${icon(c.icon)}</span>
          <div class="client-text"><h3>${esc(c.title)}</h3><p>${esc(c.desc)}</p></div>
          <span class="client-num" aria-hidden="true">${pad(i + 1)}</span>
        </li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <!-- Pourquoi SA Consulting -->
  <section id="why" class="section section--paper why" aria-labelledby="why-title">
    <div class="container">
      ${sectionHead(t.why.kicker, t.why.title, t.why.subtitle, 'why', ' section-head--split reveal')}
      <ul class="why-grid">
        ${t.why.items.map((w) => `<li class="why-card reveal">
          <span class="why-icon">${icon(w.icon)}</span>
          <h3>${esc(w.title)}</h3>
          <p>${esc(w.desc)}</p>
        </li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <!-- Démarche -->
  <section id="approach" class="section approach" aria-labelledby="approach-title">
    <div class="container">
      ${sectionHead(t.process.kicker, t.process.title, t.process.subtitle, 'approach', ' section-head--center reveal')}
      <ol class="process">
        ${t.process.steps.map((s, i) => `<li class="step reveal">
          <span class="step-num">${pad(i + 1)}</span>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.desc)}</p>
        </li>`).join('\n        ')}
      </ol>
    </div>
  </section>

  <!-- Appel à l'action -->
  <section class="cta on-dark" aria-labelledby="cta-title">
    <div class="cta-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 400" preserveAspectRatio="none"><path d="M0 400V250C200 330 420 350 640 300s420-200 800-180v330z" fill="#1B8E64" opacity=".28"/><path d="M0 250C200 330 420 350 640 300s420-200 800-180" fill="none" stroke="#34AC7B" stroke-opacity=".6" stroke-width="1.5"/></svg>
    </div>
    <div class="container cta-inner reveal">
      <h2 id="cta-title">${esc(t.cta.title)}</h2>
      <p>${esc(t.cta.text)}</p>
      <div class="cta-actions">
        <a class="btn btn--primary btn--lg" href="#contact" data-booking>${icon('calendar')}<span>${esc(t.cta.booking)}</span></a>
        <a class="btn btn--ghost btn--lg" href="${waLink(lang)}" target="_blank" rel="noopener">${icon('whatsapp')}<span>${esc(t.cta.whatsapp)}</span></a>
        <a class="btn btn--ghost btn--lg" href="${tel(0)}">${icon('phone')}<span>${esc(t.cta.call)}</span></a>
        <a class="btn btn--ghost btn--lg" href="${mailto}">${icon('mail')}<span>${esc(t.cta.email)}</span></a>
      </div>
    </div>
  </section>

  <!-- Contact -->
  <section id="contact" class="section contact" aria-labelledby="contact-title">
    <div class="container contact-grid">
      <div class="contact-info reveal">
        <p class="kicker">${esc(t.contact.kicker)}</p>
        <h2 class="section-title" id="contact-title">${esc(t.contact.title)}</h2>
        <p class="section-sub">${esc(t.contact.intro)}</p>
        <ul class="contact-list">
          <li><a class="contact-item" href="${mailto}"><span class="contact-icon">${icon('mail')}</span><span><small>${esc(t.contact.email)}</small><strong>${esc(cfg.email)}</strong></span></a></li>
          <li><a class="contact-item" href="${tel(0)}"><span class="contact-icon">${icon('phone')}</span><span><small>${esc(t.contact.phone)}</small><strong>${ltr(cfg.phones[0].display)}</strong></span></a></li>
          <li><a class="contact-item" href="${tel(1)}"><span class="contact-icon">${icon('phone')}</span><span><small>${esc(t.contact.phone2)}</small><strong>${ltr(cfg.phones[1].display)}</strong></span></a></li>
          <li><a class="contact-item" href="${waLink(lang)}" target="_blank" rel="noopener"><span class="contact-icon contact-icon--wa">${icon('whatsapp')}</span><span><small>${esc(t.contact.whatsapp)} — ${esc(t.contact.whatsappAction)}</small><strong>${ltr(cfg.whatsapp.display)}</strong></span></a></li>
          ${cfg.social.linkedin ? `<li><a class="contact-item" href="${esc(cfg.social.linkedin)}" target="_blank" rel="noopener" aria-label="${esc(t.contact.linkedinAria)}"><span class="contact-icon">${icon('linkedin')}</span><span><small>${esc(t.contact.linkedin)}</small><strong>${esc(t.contact.linkedinAction)}</strong></span></a></li>` : ''}
          <li><div class="contact-item contact-item--static"><span class="contact-icon">${icon('pin')}</span><span><small>${esc(t.contact.location)}</small><strong>${esc(t.contact.locationValue)}</strong></span></div></li>
        </ul>
      </div>

      <div class="form-card reveal">
        <form class="contact-form" id="contact-form" novalidate data-form>
          <h3 class="form-title">${esc(t.form.title)}</h3>
          <p class="form-note">${esc(t.form.requiredNote)}</p>
          <div class="form-summary" role="alert" hidden data-form-summary></div>
          <div class="form-grid">
            ${field('name', t.form.name, 'text', true, 'name', lang)}
            ${field('company', t.form.company, 'text', false, 'organization', lang)}
            ${field('email', t.form.email, 'email', true, 'email', lang)}
            ${field('phone', t.form.phone, 'tel', false, 'tel', lang)}
            <div class="field field--full">
              <label for="f-service">${esc(t.form.service)} <span class="req" aria-hidden="true">*</span></label>
              <div class="select-wrap">
                <select id="f-service" name="service" required aria-required="true" aria-describedby="f-service-err">
                  <option value="">${esc(t.form.servicePlaceholder)}</option>
                  ${t.services.items.map((s, i) => `<option value="${s.id}">${pad(i + 1)} — ${esc(s.title)}</option>`).join('\n                  ')}
                  <option value="autre">${esc(t.form.serviceOther)}</option>
                </select>
              </div>
              <p class="field-error" id="f-service-err" hidden></p>
            </div>
            <div class="field field--full">
              <label for="f-message">${esc(t.form.message)} <span class="req" aria-hidden="true">*</span></label>
              <textarea id="f-message" name="message" rows="5" required aria-required="true" minlength="10" maxlength="4000" placeholder="${esc(t.form.messagePlaceholder)}" aria-describedby="f-message-err"></textarea>
              <p class="field-error" id="f-message-err" hidden></p>
            </div>
          </div>
          <div class="hp-field" aria-hidden="true">
            <label for="f-botcheck">Leave empty</label>
            <input type="checkbox" id="f-botcheck" name="botcheck" tabindex="-1" autocomplete="off">
          </div>
          <div class="form-status" role="status" aria-live="polite" hidden data-form-status></div>
          <div class="form-footer">
            <button class="btn btn--primary btn--lg btn--submit" type="submit" data-submit>
              <span class="spinner" aria-hidden="true"></span>
              <span data-submit-label>${esc(t.form.submit)}</span>
            </button>
            <a class="btn btn--outline" href="${mailto}" hidden data-mail-fallback>${icon('mail')}<span>${esc(t.form.mailFallback)}</span></a>
          </div>
          <p class="form-privacy">${esc(t.form.privacy)} <a href="../${t.meta.pages.privacy}">${esc(t.form.privacyLink)}</a>.</p>
        </form>
      </div>
    </div>
  </section>
</main>
${footer({ t, lang, onHome: true })}
${clientData(t, lang)}
</body>
</html>
`;
  out(t.meta.pages.home + 'index.html', html);
}

function field(name, label, type, required, autocomplete, lang) {
  const dirAttr = (type === 'email' || type === 'tel') && lang === 'ar' ? ' dir="ltr"' : '';
  return `<div class="field">
              <label for="f-${name}">${esc(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
              <input id="f-${name}" name="${name}" type="${type}" autocomplete="${autocomplete}"${required ? ' required aria-required="true"' : ''}${type === 'tel' ? ' inputmode="tel"' : ''} maxlength="${name === 'email' ? 254 : 120}"${dirAttr} aria-describedby="f-${name}-err">
              <p class="field-error" id="f-${name}-err" hidden></p>
            </div>`;
}

/* ---------- Mentions légales / confidentialité ---------- */
function docPage(lang, pageKey, page) {
  const t = T[lang];
  const noindex = hasPlaceholders(page);
  const ph = `<span class="placeholder">${esc(t.meta.placeholder)}</span>`;
  const renderValue = (v) => {
    if (v === null) return ph;
    const s = fill(v);
    if (s === cfg.email) return `<a href="${mailto}">${esc(s)}</a>`;
    if (s.includes('+216')) return ltr(s);
    return esc(s);
  };
  const body = page.sections.map((s) => `<section class="doc-section">
        <h2>${esc(s.h)}</h2>
        ${s.rows ? `<dl class="doc-rows">${s.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${renderValue(v)}</dd></div>`).join('')}</dl>` : ''}
        ${s.p ? `<p>${esc(fill(s.p)).replace(esc(cfg.email), `<a href="${mailto}">${esc(cfg.email)}</a>`)}</p>` : ''}
      </section>`).join('\n      ');
  const html = `<!doctype html>
<html lang="${lang}" dir="${t.meta.dir}">
<head>
  ${head({ t, lang, pageKey, title: `${page.title} | SA Consulting`, description: page.metaDescription, robots: noindex ? 'noindex, follow' : 'index, follow' })}
</head>
<body id="top" class="page-doc">
${sprite()}
${header({ t, lang, pageKey, onHome: false })}
<main id="main" class="doc">
  <div class="doc-hero on-dark">
    <div class="container container--narrow">
      <a class="doc-back" href="./">${icon('arrow', 'icon--back')}<span>${esc(t.legalBack)}</span></a>
      <h1>${esc(page.title)}</h1>
      <p>${esc(page.intro)}</p>
    </div>
  </div>
  <div class="container container--narrow doc-body">
      ${body}
  </div>
</main>
${footer({ t, lang, onHome: false })}
${clientData(t, lang)}
</body>
</html>
`;
  out(t.meta.pages[pageKey], html);
  return !noindex;
}

/* ---------- Fichiers racine ---------- */
function rootIndex() {
  const alts = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${BASE}/${T[l].meta.pages.home}">`).join('\n  ');
  const html = `<!doctype html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SA Consulting | Cabinet de conseil en Tunisie</title>
  <meta name="description" content="${esc(T.fr.meta.description)}">
  <link rel="canonical" href="${BASE}/">
  ${alts}
  <link rel="alternate" hreflang="x-default" href="${BASE}/">
  <meta name="theme-color" content="#0A0F0D">
  <link rel="icon" href="favicon.ico" sizes="48x48">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <script>
    /* Langue mémorisée (FR / EN / AR), sinon français. */
    (function () {
      var l = 'fr';
      try { var s = localStorage.getItem('sa-lang'); if (s === 'fr' || s === 'en' || s === 'ar') l = s; } catch (e) {}
      var target = l + '/' + (location.protocol === 'file:' ? 'index.html' : '');
      location.replace(target + location.hash);
    })();
  </script>
  <noscript><meta http-equiv="refresh" content="0; url=fr/"></noscript>
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0F0D;color:#F7F5EF;font-family:system-ui,sans-serif}a{color:#93CBA8;margin:0 .6em}</style>
</head>
<body>
  <p><a href="fr/" hreflang="fr">Français</a> <a href="en/" hreflang="en">English</a> <a href="ar/" hreflang="ar" lang="ar">العربية</a></p>
</body>
</html>
`;
  out('index.html', html);
}

function notFound() {
  const blocks = LANGS.map((l) => `<div lang="${l}" dir="${T[l].meta.dir}" class="nf-block"><h2>${esc(T[l].notFound.title)}</h2><p>${esc(T[l].notFound.text)}</p><a class="btn btn--primary" href="/${T[l].meta.pages.home}">${esc(T[l].notFound.back)}</a></div>`).join('');
  const html = `<!doctype html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 | SA Consulting</title>
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#0A0F0D">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/style.css?v=${ASSET_V}">
</head>
<body class="page-404 on-dark">
  <main id="main" class="nf">
    <img src="/images/logo/sa-consulting-logo-light.svg" width="180" height="70" alt="SA Consulting">
    <h1 class="nf-code"><span class="sr-only">Page introuvable — Page not found — الصفحة غير موجودة — </span>404</h1>
    <div class="nf-grid">${blocks}</div>
  </main>
</body>
</html>
`;
  out('404.html', html);
}

function sitemap(indexable) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  for (const key of ['home', 'legal', 'privacy']) {
    if (key !== 'home' && !indexable[key]) continue;
    for (const l of LANGS) {
      const alts = LANGS.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${BASE}/${T[a].meta.pages[key]}"/>`).join('\n')
        + (key === 'home' ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/"/>` : '');
      urls.push(`  <url>\n    <loc>${BASE}/${T[l].meta.pages[key]}</loc>\n    <lastmod>${today}</lastmod>\n${alts}\n  </url>`);
    }
  }
  out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`);
  out('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);
}

function manifest() {
  out('site.webmanifest', JSON.stringify({
    name: 'SA Consulting', short_name: 'SA Consulting', lang: 'fr', start_url: '/', display: 'standalone',
    background_color: '#0A0F0D', theme_color: '#0A0F0D',
    icons: [{ src: '/images/logo/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/images/logo/icon-512.png', sizes: '512x512', type: 'image/png' }]
  }, null, 2) + '\n');
}

/* ---------- Page de contact rapide /connect/ (QR code des cartes de visite) ---------- */
function connectPage() {
  // Espace insécable avant chaque « • » : un séparateur ne se retrouve jamais en début de ligne.
  const C = Object.fromEntries(LANGS.map((l) => [l, { ...T[l].connect, tagline: T[l].connect.tagline.replaceAll(' • ', '\u00A0• ') }]));
  const fr = C.fr;
  const url = `${BASE}/connect/`;
  const CV = createHash('sha1').update(readFileSync(join(PUBLIC, 'css', 'connect.css'))).digest('hex').slice(0, 8);
  const ico = { ...icons, ...connectIcons };
  const used = ['globe', 'whatsapp', 'mail', 'linkedin', 'phone', 'chevron'];
  const spr = `<svg class="sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${used.map((k) => `<symbol id="i-${k}" viewBox="0 0 24 24">${ico[k]}</symbol>`).join('')}</svg>`;
  const i = (n) => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  const perLang = Object.fromEntries(LANGS.map((l) => [l, {
    ...C[l],
    dir: T[l].meta.dir,
    site: `../${T[l].meta.pages.home}`,
    privacyUrl: `../${T[l].meta.pages.privacy}`,
    wa: waLink(l)
  }]));
  const row = (cls, href, icon, labelKey, sub, extra = '') => `<li><a class="connect-link${cls}" href="${esc(href)}"${extra}>
          <span class="connect-link-icon">${i(icon)}</span>
          <span class="connect-link-text"><strong${labelKey ? ` data-i18n="${labelKey}"` : ''}>${labelKey ? esc(fr[labelKey]) : ltr(sub.label)}</strong>${sub.text !== undefined ? `<small${sub.key ? ` data-i18n="${sub.key}"` : ''}>${sub.ltr ? ltr(sub.text) : esc(sub.text)}</small>` : ''}</span>
          <span class="connect-link-go">${i('chevron')}</span>
        </a></li>`;
  const html = `<!doctype html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(fr.title)}</title>
  <meta name="description" content="${esc(fr.description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SA Consulting">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(fr.title)}">
  <meta property="og:description" content="${esc(fr.description)}">
  <meta property="og:image" content="${BASE}/images/site/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="fr_TN">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0A0F0D">
  <link rel="icon" href="../favicon.ico" sizes="48x48">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../apple-touch-icon.png">
  <link rel="preload" href="../assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="../assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../css/style.css?v=${ASSET_V}">
  <link rel="stylesheet" href="../css/connect.css?v=${CV}">
</head>
<body class="connect-page on-dark">
${spr}
<main class="connect" id="main">
  <div class="connect-bg" aria-hidden="true">
    <svg viewBox="0 0 400 300" preserveAspectRatio="none"><path d="M0 300V230c70 10 140 0 210-30s120-80 190-90v190z" fill="#1B8E64" opacity=".28"/><path d="M0 230c70 10 140 0 210-30s120-80 190-90" fill="none" stroke="#34AC7B" stroke-opacity=".55" stroke-width="1.2"/></svg>
  </div>
  <div class="connect-card">
    <div class="connect-top">
      <div class="connect-lang" role="group" aria-label="${esc(fr.langLabel)}" data-i18n-attr="aria-label:langLabel">
        ${LANGS.map((l) => `<button type="button" lang="${l}" data-lang="${l}" aria-pressed="${l === 'fr'}">${T[l].meta.short}</button>`).join('')}
      </div>
    </div>
    <header class="connect-head">
      <img class="connect-logo" src="../images/logo/sa-consulting-logo-light.svg" width="200" height="78" alt="SA Consulting">
      <h1 class="sr-only">SA Consulting</h1>
      <p class="connect-tagline" data-i18n="tagline">${esc(fr.tagline)}</p>
    </header>
    <nav aria-labelledby="connect-links-title">
      <h2 class="sr-only" id="connect-links-title" data-i18n="linksLabel">${esc(fr.linksLabel)}</h2>
      <ul class="connect-links">
        ${row(' connect-link--primary', perLang.fr.site, 'globe', 'website', { text: fr.websiteSub, ltr: true }, ' data-link="site"')}
        ${row('', perLang.fr.wa, 'whatsapp', 'whatsapp', { text: cfg.whatsapp.display, ltr: true }, ' target="_blank" rel="noopener" data-link="wa"')}
        ${row('', `mailto:${cfg.email}`, 'mail', 'email', { text: cfg.email, ltr: true })}
        ${row('', cfg.social.linkedin, 'linkedin', 'linkedin', { text: fr.linkedinSub, key: 'linkedinSub' }, ' target="_blank" rel="noopener"')}
        ${row('', `tel:${cfg.phones[0].tel}`, 'phone', null, { label: cfg.phones[0].display, text: fr.phoneSub, key: 'phoneSub' })}
        ${row('', `tel:${cfg.phones[1].tel}`, 'phone', null, { label: cfg.phones[1].display, text: fr.phoneSub, key: 'phoneSub' })}
      </ul>
    </nav>
    <footer class="connect-foot">
      <p>© SA Consulting</p>
      <a href="${perLang.fr.privacyUrl}" data-link="privacy" data-i18n="privacy">${esc(fr.privacy)}</a>
    </footer>
  </div>
</main>
<script type="application/json" id="connect-i18n">${JSON.stringify(perLang).replace(/</g, '\\u003c')}</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById('connect-i18n').textContent);
  var root = document.documentElement;
  function apply(lang) {
    var t = data[lang] || data.fr;
    root.lang = lang; root.dir = t.dir;
    document.title = t.title;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t[el.getAttribute('data-i18n')]; });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      var p = el.getAttribute('data-i18n-attr').split(':'); el.setAttribute(p[0], t[p[1]]);
    });
    document.querySelector('[data-link="site"]').href = t.site;
    document.querySelector('[data-link="wa"]').href = t.wa;
    document.querySelector('[data-link="privacy"]').href = t.privacyUrl;
    document.querySelectorAll('.connect-lang [data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
  }
  var q = new URLSearchParams(location.search).get('lang');
  var saved = null;
  try { saved = localStorage.getItem('sa-lang'); } catch (e) {}
  var initial = data[q] ? q : (data[saved] ? saved : 'fr');
  if (initial !== 'fr') apply(initial);
  document.querySelectorAll('.connect-lang [data-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      var l = b.getAttribute('data-lang'); apply(l);
      try { localStorage.setItem('sa-lang', l); } catch (e) {}
    });
  });
})();
</script>
</body>
</html>
`;
  out('connect/index.html', html);
}

/* ---------- Exécution ---------- */
console.log('Building SA Consulting → dist/');
rmSync(DIST, { recursive: true, force: true });
cpSync(PUBLIC, DIST, { recursive: true });
const indexable = { legal: true, privacy: true };
for (const l of LANGS) {
  homePage(l);
  indexable.legal = docPage(l, 'legal', T[l].legal) && indexable.legal;
  indexable.privacy = docPage(l, 'privacy', T[l].privacyPage) && indexable.privacy;
}
rootIndex();
notFound();
connectPage();
sitemap(indexable);
manifest();
console.log('Done.');
