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
      'hero.eyebrow': 'CS e IA · IE University, Madrid · Graduación 2028',
      'tag.ml': 'Aprendizaje automático',
      'tag.cv': 'Visión por computador',
      'hero.lead': 'Diseño en el borde donde la inteligencia digital se encuentra con el mundo físico.',
      'hero.facts': 'Aprendizaje automático, visión por computador e interacción persona-computador, llevados a 3D interactivo y desarrollo web completo.',
      'tag.dsa': 'Algoritmos y estructuras de datos',
      'hero.status': 'Disponible para prácticas y empleo en otoño de 2026 y verano de 2027',
      'hero.work': 'Ver el trabajo',
      'panel.projects.title': 'PROYECTOS',
      'panel.projects.desc': 'Visión por computador, aprendizaje automático y 3D en tiempo real, desde un motor en C hasta desarrollo web completo. Demo y código de cada proyecto.',
      'panel.experience.title': 'Experiencia',
      'panel.experience.desc': 'Estudios y trabajo, situados donde ocurrieron.',
      'panel.offline.title': 'Fuera de línea',
      'panel.offline.desc': 'La vida lejos de la pantalla.',
      'panel.about.title': 'SOBRE MÍ',
      'panel.about.desc': 'CS e IA en IE University, graduación 2028. Trayectoria, premios en competiciones y lo que busco a continuación.',
      'cta.view': 'Ver',
    },
    de: {
      'nav.menu': 'Menü',
      'hero.eyebrow': 'CS & KI · IE University, Madrid · Abschluss 2028',
      'tag.ml': 'Machine Learning',
      'tag.cv': 'Computer Vision',
      'hero.lead': 'Ich gestalte dort, wo digitale Intelligenz auf die physische Welt trifft.',
      'hero.facts': 'Machine Learning, Computer Vision und Mensch-Computer-Interaktion, umgesetzt als interaktives 3D und Full-Stack-Web.',
      'tag.dsa': 'Algorithmen und Datenstrukturen',
      'hero.status': 'Offen für Praktika und Stellen im Herbst 2026 und Sommer 2027',
      'hero.work': 'Zur Arbeit',
      'panel.projects.title': 'PROJEKTE',
      'panel.projects.desc': 'Computer Vision, Machine Learning und Echtzeit-3D, von einer C-Engine bis Full-Stack-Web. Demo und Quellcode zu jedem Projekt.',
      'panel.experience.title': 'Erfahrung',
      'panel.experience.desc': 'Studium und Arbeit, verortet wo sie stattfanden.',
      'panel.offline.title': 'Offline',
      'panel.offline.desc': 'Das Leben abseits des Bildschirms.',
      'panel.about.title': 'ÜBER MICH',
      'panel.about.desc': 'CS & KI an der IE University, Abschluss 2028. Werdegang, Wettbewerbserfolge und was als Nächstes kommt.',
      'cta.view': 'Ansehen',
    },
  };

  /* her own wording, matched on the english. proper nouns are deliberately
     absent: LinkedIn, Instagram, Youtube, GitHub and GALLERY stay as they are
     in every language. */
  const PHRASES = {
    'Home': { es: 'Inicio', de: 'Startseite' },
    'Projects': { es: 'Proyectos', de: 'Projekte' },
    'About': { es: 'Sobre mí', de: 'Über mich' },
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

  /* every known wording of a phrase, in any language, mapped back to its
     english key.

     the first version cached each text node's original english and reverted by
     node identity. that breaks the moment her markup is rebuilt: the menu
     overlay's contents are recreated when it opens, so those nodes were not the
     ones that had been cached, and the menu stayed in spanish after switching
     back to english.

     matching on the text itself is stateless. a node can be found in any
     language, at any time, and still resolves to the right target. */
  const CANON = new Map();
  Object.keys(PHRASES).forEach((en) => {
    CANON.set(en, en);
    Object.values(PHRASES[en]).forEach((variant) => CANON.set(variant, en));
  });

  function translateNodes(lang) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (SKIP.has(n.parentNode.nodeName)) return NodeFilter.FILTER_REJECT;
        if (n.parentNode.closest && n.parentNode.closest('[data-i18n]')) return NodeFilter.FILTER_REJECT;
        return CANON.has(n.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const found = [];
    let n;
    while ((n = walker.nextNode())) found.push(n);

    found.forEach((node) => {
      const current = node.nodeValue.trim();
      const key = CANON.get(current);
      if (!key) return;
      const target = lang === 'en' ? key : (PHRASES[key][lang] || key);
      if (target !== current) node.nodeValue = node.nodeValue.replace(current, target);
    });
  }

  function apply(lang) {
    const dict = lang === 'en' ? EN : DICT[lang];
    if (!dict) return;

    nodes.forEach((n) => {
      const key = n.getAttribute('data-i18n');
      const value = dict[key] !== undefined ? dict[key] : EN[key];
      if (value !== undefined) n.innerHTML = value;
    });

    translateNodes(lang);

    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach((b) => {
      const on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    try { localStorage.setItem(STORE, lang); } catch (e) {}
  }

  function current() {
    try { return localStorage.getItem(STORE) || 'en'; } catch (e) { return 'en'; }
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
    if (btn) { apply(btn.getAttribute('data-lang')); return; }

    // her menu builds its contents as it opens, so run again once it is there
    if (e.target.closest('.nav-ham, .btn-layout.is-nav, .nav-menu-w')) {
      setTimeout(() => apply(current()), 120);
      setTimeout(() => apply(current()), 600);
    }
  });

  function boot() {
    ensureSwitcher();
    apply(current());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // her bundle rewrites headings into per-line spans after load, so re-apply
  // once things have settled or those lines come back in english
  window.addEventListener('load', () => setTimeout(boot, 1200));
})();
