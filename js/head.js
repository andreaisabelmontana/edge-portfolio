/* the hero head.

   her portrait, given real depth: a plane is subdivided, then every vertex is
   pushed along z by the matching pixel of her depth map, so the face genuinely
   stands out of the plane rather than faking it with a shader trick. the same
   displaced geometry is drawn twice, once as the photo and once as a wireframe
   that forms over it, which is the look the live site opens on.

   the displacement is done once on the cpu at load rather than in a vertex
   shader, so the geometry is real: the wireframe pass gets the same vertices
   and the two layers can never drift apart.

   MeshBasicMaterial throughout, because the photo is already lit. anything
   shaded would multiply her face by a light and change her skin tone. */

import * as THREE from '../vendor/three.module.js';

const SEG = 190;           // grid resolution. 190^2 verts is plenty for a face
const DEPTH_SCALE = 0.42;  // how far the nose comes off the plane
const INTRO_MS = 2600;

const host = document.querySelector('[data-head]');
if (host) init(host);

const ease = (t) => t * t * (3 - 2 * t);

function init(host) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 4.2);

  const group = new THREE.Group();
  scene.add(group);

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const loader = new THREE.TextureLoader();

  Promise.all([
    load(loader, 'assets/head/diffuse.webp', THREE.SRGBColorSpace),
    load(loader, 'assets/head/alpha.webp', THREE.NoColorSpace),
    readPixels('assets/head/depth.webp'),
  ])
    .then(([diffuse, alpha, depth]) => build(diffuse, alpha, depth))
    .catch(() => { /* leave the hero empty rather than throwing at the visitor */ });

  function build(diffuse, alpha, depth) {
    const geo = new THREE.PlaneGeometry(2.2, 2.2, SEG, SEG);
    displace(geo, depth);
    geo.computeVertexNormals();

    const photo = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        map: diffuse,
        alphaMap: alpha,
        transparent: true,
        alphaTest: 0.12,
        toneMapped: false,
      }),
    );

    // drawn slightly in front so the lines never z-fight with the photo
    const wire = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0,
        alphaMap: alpha,
        alphaTest: 0.35,
        depthWrite: false,
      }),
    );
    wire.position.z = 0.006;

    group.add(photo, wire);
    host.setAttribute('data-head-ready', '');

    let start = null;
    let elapsed = 0;
    let last = null;

    function frame(t) {
      if (last !== null) elapsed += t - last;
      last = t;
      if (start === null) start = t;

      const k = ease(Math.min(elapsed / INTRO_MS, 1));

      // the mesh draws itself on, then settles to a trace that reads as
      // structure rather than as a filter over her face
      const settle = 0.3;
      wire.material.opacity = reduced
        ? settle
        : elapsed < INTRO_MS
          ? 0.55 * Math.sin(k * Math.PI) + settle * k
          : settle + 0.05 * Math.sin(elapsed / 900);

      if (!reduced) {
        // ease toward the pointer, and drift gently when it is not moving
        const drift = elapsed / 1000;
        const ty = targetX * 0.34 + Math.sin(drift * 0.42) * 0.03;
        const tx = targetY * 0.24 + Math.cos(drift * 0.31) * 0.02;
        group.rotation.y += (ty - group.rotation.y) * 0.06;
        group.rotation.x += (tx - group.rotation.x) * 0.06;
        group.position.y = Math.sin(drift * 0.5) * 0.02;
      }

      group.scale.setScalar(0.94 + 0.06 * k);

      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(frame);

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            last = null;
            renderer.setAnimationLoop(frame);
          } else {
            renderer.setAnimationLoop(null);
          }
        },
        { threshold: 0 },
      );
      io.observe(host);
    }
  }

  // pointer parallax, normalised to the viewport and clamped so the head never
  // swings far enough to show the plane edge-on
  let targetX = 0;
  let targetY = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );
}

function load(loader, url, colorSpace) {
  return new Promise((res, rej) => {
    loader.load(
      url,
      (t) => {
        t.colorSpace = colorSpace;
        res(t);
      },
      undefined,
      rej,
    );
  });
}

/* the depth map has to be read as numbers, not just handed to the gpu, so it
   goes through a canvas once. */
function readPixels(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      res(ctx.getImageData(0, 0, c.width, c.height));
    };
    img.onerror = rej;
    img.src = url;
  });
}

function displace(geo, depth) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const { width: w, height: h, data } = depth;

  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    // uv origin is bottom left, image rows run top down
    const x = Math.min(w - 1, Math.max(0, Math.round(u * (w - 1))));
    const y = Math.min(h - 1, Math.max(0, Math.round((1 - v) * (h - 1))));
    const lum = data[(y * w + x) * 4] / 255;
    pos.setZ(i, lum * DEPTH_SCALE);
  }
  pos.needsUpdate = true;
}
