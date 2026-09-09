/* three languages, no build step.

   english is the markup itself, so the page is correct before this file runs
   and stays correct if it never does. spanish and german are overlays keyed to
   data-i18n; a missing key falls back to whatever the html already said rather
   than blanking the element.

   the choice is remembered and written to <html lang> so screen readers and
   hyphenation follow it too. */
(function () {
  const STORE = 'edge-lang';

  const DICT = {
    es: {
      'nav.cv': 'CV',
      'nav.menu': 'menú',
      'nav.close': 'cerrar',
      'hero.eyebrow': 'CS e IA, IE University · Madrid, España',
      'hero.lead': 'Diseño en el borde donde la inteligencia digital se encuentra con el mundo físico.',
      'hero.facts': 'CS e IA en IE University · antes Trinity College Dublin · estudiante deportista · 3D interactivo, visión por computador y web',
      'hero.status': 'Disponible para prácticas en otoño de 2026 y verano de 2027',
      'hero.work': 'Ver el trabajo',
      'panel.projects.title': 'Proyectos',
      'panel.projects.desc': '3D interactivo, mapas y tiendas, filtrables por lo que los compone.',
      'panel.experience.title': 'Experiencia',
      'panel.experience.desc': 'Estudios y trabajo, situados donde ocurrieron.',
      'panel.offline.title': 'Fuera de línea',
      'panel.offline.desc': 'La vida lejos de la pantalla.',
      'panel.about.title': 'Sobre mí',
      'panel.about.desc': 'De Bogotá a Dublín a Madrid, y hacia dónde voy.',
      'cta.view': 'Ver',
    },
    de: {
      'nav.cv': 'Lebenslauf',
      'nav.menu': 'Menü',
      'nav.close': 'schließen',
      'hero.eyebrow': 'CS & KI, IE University · Madrid, Spanien',
      'hero.lead': 'Ich gestalte dort, wo digitale Intelligenz auf die physische Welt trifft.',
      'hero.facts': 'CS & KI an der IE University · zuvor Trinity College Dublin · Studentin und Sportlerin · interaktives 3D, Computer Vision und Web',
      'hero.status': 'Offen für Praktika im Herbst 2026 und Sommer 2027',
      'hero.work': 'Zur Arbeit',
      'panel.projects.title': 'Projekte',
      'panel.projects.desc': 'Interaktives 3D, Karten und Shops, filterbar nach ihren Bestandteilen.',
      'panel.experience.title': 'Erfahrung',
      'panel.experience.desc': 'Studium und Arbeit, verortet wo sie stattfanden.',
      'panel.offline.title': 'Offline',
      'panel.offline.desc': 'Das Leben abseits des Bildschirms.',
      'panel.about.title': 'Über mich',
      'panel.about.desc': 'Von Bogotá über Dublin nach Madrid, und worauf ich hinarbeite.',
      'cta.view': 'Ansehen',
    },
  };

  const nodes = [...document.querySelectorAll('[data-i18n]')];
  // english is whatever shipped in the html
  const EN = {};
  nodes.forEach((n) => { EN[n.getAttribute('data-i18n')] = n.innerHTML; });

  function apply(lang) {
    const dict = lang === 'en' ? EN : DICT[lang];
    if (!dict) return;
    nodes.forEach((n) => {
      const key = n.getAttribute('data-i18n');
      const value = dict[key] !== undefined ? dict[key] : EN[key];
      if (value !== undefined) n.innerHTML = value;
    });
    document.documentElement.lang = lang;
    [...document.querySelectorAll('[data-lang]')].forEach((b) => {
      const on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    try { localStorage.setItem(STORE, lang); } catch (e) {}
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (btn) apply(btn.getAttribute('data-lang'));
  });

  let saved = 'en';
  try { saved = localStorage.getItem(STORE) || 'en'; } catch (e) {}
  apply(saved);
})();
