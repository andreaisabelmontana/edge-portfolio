/* three languages, across the whole site, with no build step.

   two layers:

   1. keyed strings. anything carrying data-i18n is swapped from DICT. english
      is the markup itself, so the page is correct before this runs and a
      missing key falls back to what the html already said.

   2. her own copy. the rest of the site is her markup and is not going to be
      annotated, so PHRASES matches visible text nodes by their english wording
      and swaps them in place. every node's original is cached the first time it
      is touched, so switching back to english is exact rather than a reverse
      lookup.

   the walk is leaf level, which matters because her split-text animation breaks
   headings into per-line spans; matching whole nodes would miss them, matching
   leaves does not.

   the switcher builds itself if the page has not got one, so making another
   page mirror is one script tag and nothing else. */
(function () {
  const STORE = 'edge-lang';

  const DICT = {
    es: {
      'nav.menu': 'menú',
      'hero.eyebrow': 'CS e IA, IE University · Madrid, España',
      'hero.lead': 'Diseño en el borde donde la inteligencia digital se encuentra con el mundo físico.',
      'hero.facts': 'CS e IA en IE University · antes Trinity College Dublin · aprendizaje automático, visión por computador e interacción persona-computador · 3D interactivo, UX/UI y desarrollo web · Python, JavaScript, C',
      'hero.status': 'Disponible para prácticas en otoño de 2026 y verano de 2027',
      'hero.work': 'Ver el trabajo',
      'panel.projects.title': 'PROYECTOS',
      'panel.projects.desc': '3D interactivo, visión por computador y aprendizaje automático, hechos para la web.',
      'panel.experience.title': 'Experiencia',
      'panel.experience.desc': 'Estudios y trabajo, situados donde ocurrieron.',
      'panel.offline.title': 'Fuera de línea',
      'panel.offline.desc': 'La vida lejos de la pantalla.',
      'panel.about.title': 'SOBRE MÍ',
      'panel.about.desc': 'CS e IA en IE University. De Bogotá a Dublín a Madrid, y hacia dónde voy.',
      'cta.view': 'Ver',
    },
    de: {
      'nav.menu': 'Menü',
      'hero.eyebrow': 'CS & KI, IE University · Madrid, Spanien',
      'hero.lead': 'Ich gestalte dort, wo digitale Intelligenz auf die physische Welt trifft.',
      'hero.facts': 'CS & KI an der IE University · zuvor Trinity College Dublin · Machine Learning, Computer Vision und Mensch-Computer-Interaktion · interaktives 3D, UX/UI und Webentwicklung · Python, JavaScript, C',
      'hero.status': 'Offen für Praktika im Herbst 2026 und Sommer 2027',
      'hero.work': 'Zur Arbeit',
      'panel.projects.title': 'PROJEKTE',
      'panel.projects.desc': 'Interaktives 3D, Computer Vision und Machine Learning, fürs Web gebaut.',
      'panel.experience.title': 'Erfahrung',
      'panel.experience.desc': 'Studium und Arbeit, verortet wo sie stattfanden.',
      'panel.offline.title': 'Offline',
      'panel.offline.desc': 'Das Leben abseits des Bildschirms.',
      'panel.about.title': 'ÜBER MICH',
      'panel.about.desc': 'CS & KI an der IE University. Von Bogotá über Dublin nach Madrid, und worauf ich hinarbeite.',
      'cta.view': 'Ansehen',
    },
  };

  /* her own wording, matched on the english. proper nouns are deliberately
     absent: LinkedIn, Instagram, Youtube, GitHub and GALLERY stay as they are
     in every language. */
  const PHRASES = {
    'Home': { es: 'Inicio', de: 'Startseite' },
    'Online': { es: 'En línea', de: 'Online' },
    'Offline': { es: 'Fuera de línea', de: 'Offline' },
    'Calendar': { es: 'Calendario', de: 'Kalender' },
    'Partnerships': { es: 'Colaboraciones', de: 'Kooperationen' },
    'Sign Up': { es: 'Suscríbete', de: 'Anmelden' },
    'contact': { es: 'contacto', de: 'kontakt' },
    'Contact': { es: 'Contacto', de: 'Kontakt' },
    'CONTACT': { es: 'CONTACTO', de: 'KONTAKT' },
    'Go to home': { es: 'Ir al inicio', de: 'Zur Startseite' },
    'All rights reserved': { es: 'Todos los derechos reservados', de: 'Alle Rechte vorbehalten' },
    'Computer Science and': { es: 'Ciencias de la Computación e', de: 'Informatik und' },
    'Artificial Intelligence': { es: 'Inteligencia Artificial', de: 'Künstliche Intelligenz' },
    'BCSAI @ IE University': { es: 'BCSAI en IE University', de: 'BCSAI an der IE University' },
    'Please rotate your device,': { es: 'Gira tu dispositivo,', de: 'Bitte dreh dein Gerät,' },
    'This is a vertical drive.': { es: 'Esta experiencia es vertical.', de: 'Das ist eine vertikale Fahrt.' },
    'Project portfolio of code and research.': { es: 'Portafolio de proyectos de código e investigación.', de: 'Portfolio aus Code und Forschung.' },
    'My personal life away from the screen.': { es: 'Mi vida personal lejos de la pantalla.', de: 'Mein Leben abseits des Bildschirms.' },
  };

  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CANVAS', 'SVG']);

  const nodes = [...document.querySelectorAll('[data-i18n]')];
  const EN = {};
  nodes.forEach((n) => { EN[n.getAttribute('data-i18n')] = n.innerHTML; });

  // text node -> its original english, filled lazily on the first pass
  const originals = new Map();

  function collect() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (SKIP.has(n.parentNode.nodeName)) return NodeFilter.FILTER_REJECT;
        if (n.parentNode.closest && n.parentNode.closest('[data-i18n]')) return NodeFilter.FILTER_REJECT;
        return PHRASES[n.nodeValue.trim()] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    let n;
    while ((n = walker.nextNode())) {
      if (!originals.has(n)) originals.set(n, n.nodeValue);
    }
  }

  function apply(lang) {
    const dict = lang === 'en' ? EN : DICT[lang];
    if (!dict) return;

    nodes.forEach((n) => {
      const key = n.getAttribute('data-i18n');
      const value = dict[key] !== undefined ? dict[key] : EN[key];
      if (value !== undefined) n.innerHTML = value;
    });

    collect();
    originals.forEach((original, node) => {
      if (!node.isConnected) return;
      const key = original.trim();
      const phrase = PHRASES[key];
      if (lang === 'en' || !phrase || !phrase[lang]) {
        node.nodeValue = original;
      } else {
        // keep whatever spacing the original had around the word
        node.nodeValue = original.replace(key, phrase[lang]);
      }
    });

    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach((b) => {
      const on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    try { localStorage.setItem(STORE, lang); } catch (e) {}
  }

  /* build the switcher if this page has not got one, so a page mirrors with
     nothing but this script added to it */
  function ensureSwitcher() {
    let sw = document.querySelector('[data-lang-switch]');
    if (!sw) {
      sw = document.createElement('div');
      sw.className = 'lang';
      sw.setAttribute('data-lang-switch', '');
      sw.setAttribute('role', 'group');
      sw.setAttribute('aria-label', 'Language');
      sw.innerHTML = ['en', 'es', 'de']
        .map((l) => `<button type="button" data-lang="${l}">${l}</button>`)
        .join('<span aria-hidden="true">/</span>');
    }
    sw.hidden = false;
    const inner = document.querySelector('.nav .nav-inner');
    const ham = document.querySelector('.nav-ham, .btn-layout.is-nav');
    if (inner && !inner.contains(sw)) {
      if (ham && ham.parentElement === inner) inner.insertBefore(sw, ham);
      else inner.appendChild(sw);
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (btn) apply(btn.getAttribute('data-lang'));
  });

  function boot() {
    ensureSwitcher();
    let saved = 'en';
    try { saved = localStorage.getItem(STORE) || 'en'; } catch (e) {}
    apply(saved);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // her bundle rewrites headings into per-line spans after load, so re-apply
  // once things have settled or those lines come back in english
  window.addEventListener('load', () => setTimeout(boot, 1200));
})();
