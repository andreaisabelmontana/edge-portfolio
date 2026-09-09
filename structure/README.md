# edge-portfolio

Personal site and CS portfolio of Andrea Montana. Plain HTML, CSS and
JavaScript, no build step and no dependencies, so it deploys to GitHub Pages by
pushing.

```bash
python -m http.server 8920
```

## Layout

```
index.html        the landing
css/tokens.css    palette, type scale, motion curves. reskin starts here
css/base.css      reset, typography, shared primitives
css/home.css      the landing's own layout
js/starfield.js   canvas backdrop
js/reveal.js      staggered entrance, driven by data-reveal
js/menu.js        overlay menu, focus trapped
js/i18n.js        en / es / de, overlaid on the english markup
js/loader.js      halftone loading screen, drawn from the portrait
js/head.js        the hero: portrait, helmet lens, hologram
vendor/           three.module.js, vendored so there is nothing to install
assets/head/      portrait diffuse, depth and alpha
assets/gl/        helmet glb, its livery, draco decoder
assets/panels/    panel background photos
```

## Conventions

**Colour, type and motion live in `css/tokens.css`.** Nothing else hard-codes a
hex value. Changing the palette is an edit to that one file.

**Entrances are declarative.** Put `data-reveal` on an element and it fades and
lifts in. The value is a delay in milliseconds, so a hero cascades by giving its
children `0`, `60`, `120` and so on. Anything below the fold waits for an
intersection observer instead of firing on load. With JavaScript off nothing is
hidden, because the starting state is injected by the script rather than sitting
in the stylesheet.

**The bar has no tabs.** Every destination lives in the overlay menu. The bar
carries the astronaut, the language switcher, the CV pill and the menu button,
and under 480px it drops the CV pill too since the menu already lists it.

**English is the markup.** `js/i18n.js` reads the page as the English source and
overlays Spanish and German onto `data-i18n` keys. A missing key falls back to
what the HTML already said, so a gap in a translation degrades to English
instead of blanking an element.

**The head is real geometry.** `js/head.js` subdivides a plane, then pushes each
vertex along z by the matching pixel of her depth map, so the photo and the
wireframe drawn over it share one displaced mesh and cannot drift apart. The
displacement runs once on the CPU at load rather than in a vertex shader, which
is what makes the two layers share vertices.

**The helmet is a lens, not a toggle.** It is cut into bands and only exists
near the pointer: the fragment shader turns `gl_FragCoord` back into normalised
coordinates, measures the distance to the cursor, and discards everything
outside. On load an envelope assembles the shell whole, holds it, then drops it
and hands over to the pointer. `window.__hero` exposes the fit and the uniforms
so the helmet can be nudged against the photo without an edit-reload cycle.

**The hologram uses edges, not wireframe.** The shell carries 17k vertices, so
`wireframe: true` draws every triangle and turns into a solid mass with her face
nowhere in it. `EdgesGeometry` at 20 degrees keeps only real structure: the
seams, the visor aperture, the vents.

**The loader draws itself.** The live site ships a 2.5MB mp4 for its loading
screen, which has to download before the loading screen can appear. This one
halftones the portrait that the hero is already fetching, so it costs a decode
and nothing on the wire.

## Still to build

- `projects/` index, filterable, driven by a project data file
- `projects/<slug>/` pages
- `experience/`, `offline/`, `about/`, `cv/`

## Content to confirm

- The Spanish and German copy is a first pass. Worth a read before it ships.
