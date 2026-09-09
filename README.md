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
assets/logos/     wordmark svgs for the stack cloud
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

**Panels are the mobile navigation.** Under 640px the nav bar keeps only the
brand and the CV pill, since the four panels directly below lead to the same
four places.

## Still to build

- `projects/` index, filterable, driven by a project data file
- `projects/<slug>/` pages
- `experience/`, `offline/`, `about/`, `cv/`

## Content to confirm

- The status line reads "Graduating 2027 · open to internships". The year comes
  from the existing site; the availability half is an assumption worth checking.
- The stack cloud shows Three.js, React, Python, Docker and GitHub, each backed
  by a public repo. Add more only where a repo supports it.
