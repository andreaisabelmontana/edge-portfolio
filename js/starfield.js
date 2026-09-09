/* starfield backdrop.

   a canvas rather than a few hundred dom nodes, and drawn once per resize
   rather than per frame: the stars do not move, so an animation loop would
   burn a core to redraw the same picture. a slow css opacity drift on a
   second layer does the twinkle instead. */
(function () {
  var canvas = document.querySelector('[data-starfield]');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var DENSITY = 0.00018; // stars per css pixel, so big screens are not sparse

  function draw() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || !h) return;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var count = Math.round(w * h * DENSITY);
    for (var i = 0; i < count; i++) {
      var x = Math.random() * w;
      var y = Math.random() * h;
      var r = Math.random() * 1.05 + 0.18;
      // most stars are faint; a few carry the accent so the field is not grey
      var tinted = Math.random() > 0.94;
      ctx.globalAlpha = 0.18 + Math.random() * 0.62;
      ctx.fillStyle = tinted ? '#bc13fe' : '#f4f4ed';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var pending;
  function onResize() {
    clearTimeout(pending);
    pending = setTimeout(draw, 150);
  }

  draw();
  window.addEventListener('resize', onResize);
})();
