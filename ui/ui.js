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

  /* the head cannot be moved by moving markup.

     [data-gl="head"] is only a bounds rectangle, and the head scene ignores it:
     it draws into the shared .gl-wrap, which is position:fixed, z-index:-1 and
     the full size of the viewport. that is why the face sat behind the copy
     rather than beside it.

     so the canvas is framed instead. a fixed, untransformed clip layer is
     inserted around .gl-wrap, which means its own coordinate space is screen
     space and the clip can be written straight from the slot's rect. the wrap
     inside it is then translated and scaled so the head lands in the middle of
     that clip. */
  /* where her head sits inside the untransformed full-viewport render, as
     fractions of the viewport. she is composed high in frame with the shoulders
     running off the bottom, so the visual centre is well above the middle and
     matching centre to centre crops her chin. measured against the live render. */
  const HEAD_CY = 0.46;   // vertical centre of the head
  const HEAD_H = 0.78;    // head height, hair to chin
  const HEAD_FIT = 0.96;  // how much of the slot that height should fill

  let clip = null;
  let wrap = null;

  function frameHead() {
    wrap = document.querySelector('.gl-wrap');
    if (!wrap) return;

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
    if (!s.width) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    /* transform-origin is pinned to the top left so the mapping is a plain
       affine one: a local point p lands at t + k*p. that makes it possible to
       solve for t directly from where the head should end up, instead of
       guessing offsets against a centre that was never the head's centre. */
    const k = (s.height * HEAD_FIT) / (HEAD_H * vh);
    const tx = s.left + s.width / 2 - k * (vw / 2);
    const ty = s.top + s.height / 2 - k * (HEAD_CY * vh);

    wrap.style.transformOrigin = '0 0';
    wrap.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    clip.style.clipPath =
      `inset(${s.top}px ${vw - s.right}px ${vh - s.bottom}px ${s.left}px round 16px)`;
  }

  function restructure() {
    slot.appendChild(hero);
    document.body.classList.add('edge-ready');
    frameHead();

    window.dispatchEvent(new Event('resize'));
    setTimeout(fit, 400);

    // the wrap is fixed while the slot scrolls, so the frame has to follow
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
