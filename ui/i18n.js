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
      'tag.ml': 'Aprendizaje automático e IA',
      'tag.cv': 'Visión por computador',
      'tag.rt3d': '3D en tiempo real y Unreal',
      'tag.ui': 'Interfaces interactivas e IPC',
      'tag.js': 'JavaScript y React',
      'tag.cloud': 'Docker y cloud-native',
      'hero.lead': 'Diseño en el borde donde la inteligencia digital se encuentra con el mundo físico.',
      'hero.facts': 'Aprendizaje automático, visión por computador e interacción persona-computador, llevados a 3D interactivo y desarrollo web completo.',
      'tag.dsa': 'Estructuras de datos y algoritmos',
      'hero.status': 'Disponible para prácticas y empleo en otoño de 2026 y verano de 2027',
      'hero.work': 'Ver el trabajo',
      'panel.projects.desc': 'Visión por computador, aprendizaje automático y 3D en tiempo real, desde un motor en C hasta desarrollo web completo. Demo y código de cada proyecto.',
      'panel.experience.title': 'Experiencia',
      'panel.experience.desc': 'Estudios y trabajo, situados donde ocurrieron.',
      'panel.offline.title': 'Fuera de línea',
      'panel.offline.desc': 'La vida lejos de la pantalla.',
      'panel.about.desc': 'De Bogotá a Dublín a Madrid. Titulación, premios en competiciones y hasta dónde me ha llevado el trabajo.',
      'cta.view': 'Ver',
    },
    de: {
      'nav.menu': 'Menü',
      'hero.eyebrow': 'CS & KI · IE University, Madrid · Abschluss 2028',
      'tag.ml': 'Machine Learning und KI',
      'tag.cv': 'Computer Vision',
      'tag.rt3d': 'Echtzeit-3D und Unreal',
      'tag.ui': 'Interaktive UI und MCI',
      'tag.js': 'JavaScript und React',
      'tag.cloud': 'Docker und Cloud-native',
      'hero.lead': 'Ich gestalte dort, wo digitale Intelligenz auf die physische Welt trifft.',
      'hero.facts': 'Machine Learning, Computer Vision und Mensch-Computer-Interaktion, umgesetzt als interaktives 3D und Full-Stack-Web.',
      'tag.dsa': 'Datenstrukturen und Algorithmen',
      'hero.status': 'Offen für Praktika und Stellen im Herbst 2026 und Sommer 2027',
      'hero.work': 'Zur Arbeit',
      'panel.projects.desc': 'Computer Vision, Machine Learning und Echtzeit-3D, von einer C-Engine bis Full-Stack-Web. Demo und Quellcode zu jedem Projekt.',
      'panel.experience.title': 'Erfahrung',
      'panel.experience.desc': 'Studium und Arbeit, verortet wo sie stattfanden.',
      'panel.offline.title': 'Offline',
      'panel.offline.desc': 'Das Leben abseits des Bildschirms.',
      'panel.about.desc': 'Von Bogotá über Dublin nach Madrid. Abschluss, Wettbewerbserfolge und wohin die Arbeit geführt hat.',
      'cta.view': 'Ansehen',
    },
  };

  /* her own wording, matched on the english. proper nouns are deliberately
     absent: LinkedIn, Instagram, Youtube, GitHub and GALLERY stay as they are
     in every language. */
  const PHRASES = {
    'Projects': { es: 'Proyectos', de: 'Projekte' },
    'PROJECTS': { es: 'PROYECTOS', de: 'PROJEKTE' },
    'ABOUT': { es: 'SOBRE MÍ', de: 'ÜBER MICH' },
    'EXPERIENCE': { es: 'EXPERIENCIA', de: 'ERFAHRUNG' },
    'About': { es: 'Sobre mí', de: 'Über mich' },
    'Home': { es: 'Inicio', de: 'Start' },
    'Experience': { es: 'Experiencia', de: 'Erfahrung' },
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

    /* the hall of ideas */
    'Hall of Ideas': { es: 'Salón de Ideas', de: 'Halle der Ideen' },
    'Every project here ships with a live demo and its source, not a screenshot. Filter by what one is made of, or what it was built for.': {
      es: 'Cada proyecto aquí viene con una demo en vivo y su código, no con una captura. Filtra por aquello de lo que está hecho, o por aquello para lo que fue construido.',
      de: 'Jedes Projekt hier kommt mit einer Live-Demo und seinem Quellcode, nicht mit einem Screenshot. Filtere danach, woraus es gebaut ist oder wofür es gebaut wurde.',
    },

    /* the filter row. these match on the visible label only: every pill keeps
       its english data-value, which is what the filter compares against, so
       translating the face of a pill cannot change what it selects. */
    'TYPE': { es: 'TIPO', de: 'ART' },
    'DOMAIN': { es: 'ÁMBITO', de: 'BEREICH' },
    'YEAR': { es: 'AÑO', de: 'JAHR' },
    'All': { es: 'Todo', de: 'Alle' },
    'Coursework': { es: 'Académico', de: 'Studium' },
    'Personal': { es: 'Personal', de: 'Privat' },
    'AI & ML': { es: 'IA y ML', de: 'KI & ML' },
    'Algorithms': { es: 'Algoritmos', de: 'Algorithmen' },
    'Cloud & DevOps': { es: 'Cloud y DevOps', de: 'Cloud & DevOps' },
    'Computer Vision': { es: 'Visión por computador', de: 'Computer Vision' },
    'Games': { es: 'Videojuegos', de: 'Spiele' },
    'Real-time 3D': { es: '3D en tiempo real', de: 'Echtzeit-3D' },
    'UI & UX': { es: 'UI y UX', de: 'UI & UX' },
    'Motion capture': { es: 'Captura de movimiento', de: 'Motion Capture' },

    /* the journey section. the timeline entries are built by experience.js
       after this script has already run, which is exactly the case the
       observer at the bottom of this file exists for: they are translated when
       they appear rather than on a guess about when that will be. */
    'JOURNEY': { es: 'TRAYECTORIA', de: 'WERDEGANG' },
    'My experience log: studies and work, mapped where they happened.': {
      es: 'Mi registro de experiencia: estudios y trabajo, situados donde ocurrieron.',
      de: 'Mein Erfahrungsprotokoll: Studium und Arbeit, verortet wo sie stattfanden.',
    },
    'STUDENT · COLEGIO NUEVA GRANADA': { es: 'ESTUDIANTE · COLEGIO NUEVA GRANADA', de: 'STUDENTIN · COLEGIO NUEVA GRANADA' },
    'STUDENT · TRINITY COLLEGE DUBLIN': { es: 'ESTUDIANTE · TRINITY COLLEGE DUBLIN', de: 'STUDENTIN · TRINITY COLLEGE DUBLIN' },
    'STUDENT · IE UNIVERSITY': { es: 'ESTUDIANTE · IE UNIVERSITY', de: 'STUDENTIN · IE UNIVERSITY' },
    'American AP diploma + Bachiller Colombiano': {
      es: 'Diploma AP estadounidense + Bachiller Colombiano',
      de: 'Amerikanisches AP-Diplom + Bachiller Colombiano',
    },
    'Bachelor of Computer Science (transferred to IE University)': {
      es: 'Grado en Ciencias de la Computación (traslado a IE University)',
      de: 'Bachelor of Computer Science (Wechsel an die IE University)',
    },
    'Bachelor of Computer Science and Artificial Intelligence': {
      es: 'Grado en Ciencias de la Computación e Inteligencia Artificial',
      de: 'Bachelor of Computer Science and Artificial Intelligence',
    },
    'Bogota, Colombia · 2010 to 2022': { es: 'Bogotá, Colombia · 2010 a 2022', de: 'Bogotá, Kolumbien · 2010 bis 2022' },
    'Dublin, Ireland · 2022 to 2023': { es: 'Dublín, Irlanda · 2022 a 2023', de: 'Dublin, Irland · 2022 bis 2023' },
    'Madrid, Spain · 2023 to present': { es: 'Madrid, España · 2023 a hoy', de: 'Madrid, Spanien · 2023 bis heute' },
  };

  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CANVAS', 'SVG']);

  // set up at the bottom, but apply() clears its queue, and apply() runs first
  let watcher = null;

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

  /* the same map again, with every space removed.

     her line splitter cuts a paragraph into one span per rendered line, so a
     sentence stops being one text node and no node-level match can ever see it
     whole. the pieces do still concatenate back to the sentence, but not
     reliably with the spaces intact, so comparing on squeezed text is what
     makes a split paragraph findable again. */
  const tight = (s) => (s || '').replace(/\s+/g, '').toLowerCase();

  const CANON_TIGHT = new Map();
  CANON.forEach((en, variant) => CANON_TIGHT.set(tight(variant), en));

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

  /* whole paragraphs, for the ones the splitter has already taken apart.

     only split-text="lines" is touched. that is body copy, and rewriting it
     costs nothing but the line spans, which are re-revealed as plain visible
     text. split-text="chars" is deliberately left alone: those are the nav
     labels and buttons whose hover animation is bound to the individual char
     spans, and flattening them would kill it.

     none of this runs on a first load in another language anyway. this script
     goes before her splitter, so the paragraph is still one text node when it
     is translated and the split then happens on the translated words with the
     animation fully intact. this is the path for switching language later, on
     a page that has already been split. */
  function translateBlocks(lang) {
    document.querySelectorAll('[split-text="lines"]').forEach((el) => {
      if (el.closest('[data-i18n]')) return;

      // the splitter copies the pre-split wording into aria-label, which is a
      // cleaner source than reassembled spans
      const key = CANON_TIGHT.get(tight(el.getAttribute('aria-label') || el.textContent));
      if (!key) return;

      const target = lang === 'en' ? key : (PHRASES[key][lang] || key);
      if (tight(el.textContent) === tight(target)) return;
      el.textContent = target;
    });
  }

  function apply(lang) {
    const dict = lang === 'en' ? EN : DICT[lang];
    if (!dict) return;

    nodes.forEach((n) => {
      const key = n.getAttribute('data-i18n');
      const value = dict[key] !== undefined ? dict[key] : EN[key];
      if (value === undefined) return;

      /* never rewrite an element that already reads correctly.

         this is what kept killing the sweeps. her bundle splits these into
         span.line elements and binds the highlight to them, and setting
         innerHTML replaced those spans with a bare string, so the animation had
         nothing left to drive. the re-apply after load did it every time, in
         the same language, for no reason.

         comparing the rendered text against the target means a repeat pass is a
         no-op and the spans survive. a real language change still rewrites, and
         loses the split, but by then the sweep has already played so there is
         nothing to see. */
      const target = document.createElement('div');
      target.innerHTML = value;
      if (n.textContent.trim() === target.textContent.trim()) return;

      n.innerHTML = value;
    });

    translateNodes(lang);
    translateBlocks(lang);

    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach((b) => {
      const on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    try { localStorage.setItem(STORE, lang); } catch (e) {}

    /* anything that renders its own words rather than carrying them in the
       markup, like the project count on the hall of ideas, cannot be reached by
       either pass. this tells those scripts to redraw themselves. */
    document.dispatchEvent(new CustomEvent('edge:lang', { detail: lang }));

    // discard the mutations this pass just made, so the observer below does not
    // read our own writing as a change and call us straight back
    if (watcher) watcher.takeRecords();
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

  /* re-translate whatever her bundle rebuilds.

     this used to be two fixed timeouts, on the guess that everything would have
     settled by then. it does not: the splitter, the menu overlay and the filter
     row each rewrite their part of the page on their own schedule, and anything
     landing after the last timeout simply stayed in english.

     watching for the rebuild instead of predicting when it happens covers all
     of them, including anything added later. only structure and text are
     watched, not attributes, so gsap writing inline styles every frame does not
     reach this. apply() changes nothing when the page already reads correctly,
     and clears its own mutations on the way out, so a redundant pass is free and
     cannot feed itself. */
  let pass = 0;
  watcher = new MutationObserver(() => {
    clearTimeout(pass);
    pass = setTimeout(() => apply(current()), 250);
  });
  watcher.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
