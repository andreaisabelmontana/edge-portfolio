/* moves the real hero into our layout.

   the bundle boots the whole page: it awaits allriveloaded before it mounts any
   scene, and it reads the nav, the transition layer and the rive canvases on
   the way through. so nothing is removed or hidden up front. the page loads
   exactly as it does on the live site, the head scene mounts, and only then do
   we restructure around it.

   the move itself is cheap, because there is nothing to move. every scene
   draws into one shared full-screen canvas.gl inside .gl-wrap, and the
   [data-gl="head"] div is only a bounds rectangle the renderer reads to know
   where on screen to put the head. reparent that div and the scene follows it,
   no context is touched. */
(function () {
  const slot = document.querySelector('[data-hero-slot]');
  const hero = document.querySelector('.sticky-track.home-hero');
  if (!slot || !hero) return;

  const started = performance.now();

  /* the mount div stays empty by design, so "has it mounted" cannot be asked of
     it. the honest signal is the shared gl canvas existing and her loader
     having taken itself off, which is the point the scenes are live. */
  function ready() {
    return !!document.querySelector('.gl-wrap canvas.gl') &&
      !document.getElementById('am-loader');
  }

  /* the head, whole, framed into the panel on the right.

     two facts drive this, both found the hard way:

     1. the scene takes its framing from the [data-gl="head"] mount rect, and
        only the HEIGHT matters. give it less than the full viewport height and
        her crown and chin fall outside the frame. that is what kept cutting her
        face off, so ui.css restores the mount to the full viewport and the head
        renders whole and centred, exactly as on the live site.

     2. horizontal placement is not controllable from the mount at all, so the
        only way to move her right is a css transform on .gl-wrap.

     the cost of (2) is the cursor: the scene reads mousemove, touchmove and
     pointermove straight from viewport coordinates and normalises against
     innerWidth, so it does not know about the transform and the helmet lens
     tracks a point offset from the mouse. set FRAME to false to trade the panel
     back for a true cursor. */
  const FRAME = true;

  /* where her head should sit, as fractions of the viewport, and how big.
     tune these three and nothing else. */
  const HEAD_X = 0.70;  // horizontal centre
  const HEAD_Y = 0.54;  // vertical centre
  const HEAD_K = 0.68;  // scale

  let clip = null;
  let wrap = null;

  function frameHead() {
    wrap = document.querySelector('.gl-wrap');
    if (!wrap || !FRAME) return;
    if (!clip) {
      clip = document.createElement('div');
      clip.className = 'gl-clip';
      wrap.parentNode.insertBefore(clip, wrap);
      clip.appendChild(wrap);
    }
    fit();
  }

  function fit() {
    if (!clip || !wrap) return;
    const s = slot.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // single column: she goes back to being the full backdrop
    if (vw < 1024 || !s.width) {
      clip.style.clipPath = 'none';
      wrap.style.transform = 'none';
      return;
    }

    /* no hard clip: the gradient in ui.css does the blending, so she fades into
       the ground instead of ending on a cut edge. origin 0 0 keeps the mapping
       plainly affine, so a local point p lands at t + k*p and the translation
       can be solved from where her centre should end up. */
    const k = HEAD_K;
    const tx = HEAD_X * vw - k * (vw / 2);
    const ty = HEAD_Y * vh - k * (vh / 2);

    wrap.style.transformOrigin = '0 0';
    wrap.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    clip.style.clipPath = 'none';
  }

  function restructure() {
    document.body.classList.add('edge-ready');
    frameHead();
    window.dispatchEvent(new Event('resize'));
    setTimeout(fit, 400);
    addEventListener('scroll', fit, { passive: true });
    addEventListener('resize', fit);
  }

  function wait() {
    if (ready()) { restructure(); return; }
    // the loader alone runs ~10s on a cold cache, so this has to be patient,
    // but it must not hang the page forever if the scene never arrives
    if (performance.now() - started > 25000) { restructure(); return; }
    requestAnimationFrame(wait);
  }

  wait();
})();
