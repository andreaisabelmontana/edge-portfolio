/* the loading screen: her portrait as a halftone dot field.

   drawn from assets/head/diffuse.webp rather than played from a video. the
   live site ships a 2.5MB mp4 for this, which has to finish downloading before
   the loading screen can appear, so the loader needs a loader. the portrait is
   already being fetched for the hero, so this costs one decode and nothing on
   the wire.

   dots grow in on a wave from the centre. the overlay leaves once the wave has
   finished and the page is actually ready, with a hard timeout so a slow asset
   can never strand a visitor behind it. */
(function () {
  const overlay = document.querySelector('[data-loader]');
  if (!overlay) return;

  const canvas = overlay.querySelector('canvas');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) { overlay.remove(); return; }

  const COLS = 46;
  const GROW_MS = 1250;
  const TIMEOUT_MS = 8000;
  /* on a warm cache the page is ready before the wave has drawn, and the
     screen flashes past as a glitch rather than reading as a loading screen.
     this floor is measured from script start, so a slow load never adds to it. */
  const MIN_MS = 1900;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cells = null;
  let started = 0;
  let waveDone = false;
  let pageReady = false;
  let gone = false;
  const openedAt = performance.now();

  function done() {
    if (gone || !waveDone || !pageReady) return;
    const held = performance.now() - openedAt;
    if (held < MIN_MS) { setTimeout(done, MIN_MS - held); return; }
    gone = true;
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 700);
  }

  // whichever of these lands last releases the screen
  if (document.readyState === 'complete') pageReady = true;
  else window.addEventListener('load', () => { pageReady = true; done(); });
  setTimeout(() => { waveDone = true; pageReady = true; done(); }, TIMEOUT_MS);

  const img = new Image();
  img.onload = () => {
    // sample the portrait down to the dot grid once
    const s = document.createElement('canvas');
    s.width = COLS;
    s.height = COLS;
    const sctx = s.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(img, 0, 0, COLS, COLS);
    const px = sctx.getImageData(0, 0, COLS, COLS).data;

    cells = [];
    for (let y = 0; y < COLS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = (y * COLS + x) * 4;
        // rec.709 luma; the portrait is on black so this doubles as the mask
        const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
        if (lum < 0.04) continue;
        const dx = x / (COLS - 1) - 0.5;
        const dy = y / (COLS - 1) - 0.5;
        cells.push({ x, y, lum, d: Math.hypot(dx, dy) / 0.707 });
      }
    }
    started = performance.now();
    requestAnimationFrame(draw);
  };
  img.onerror = () => { waveDone = true; pageReady = true; done(); };
  img.src = 'assets/head/diffuse.webp';

  function draw(now) {
    if (gone || !cells) return;

    const size = canvas.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const step = size / COLS;
    const t = reduced ? 1 : Math.min((now - started) / GROW_MS, 1);

    ctx.fillStyle = '#f4f4ed';
    for (const c of cells) {
      // each dot waits its turn by distance from the centre
      const local = Math.max(0, Math.min(1, (t - c.d * 0.45) / 0.55));
      if (local <= 0) continue;
      const r = c.lum * step * 0.62 * (local * local * (3 - 2 * local));
      if (r < 0.15) continue;
      ctx.beginPath();
      ctx.arc((c.x + 0.5) * step, (c.y + 0.5) * step, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t >= 1) {
      if (!waveDone) { waveDone = true; done(); }
      // hold the finished frame rather than burning cycles redrawing it
      if (gone) return;
      setTimeout(() => requestAnimationFrame(draw), 120);
      return;
    }
    requestAnimationFrame(draw);
  }
})();
