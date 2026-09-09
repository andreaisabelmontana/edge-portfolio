/* the hero: her portrait, with the helmet dissolving off it.

   three layers, all sharing one scene so they parallax together:

   1. her portrait, given real depth. a plane is subdivided and every vertex is
      pushed along z by the matching pixel of her depth map, so the face
      genuinely stands out of the plane. the same displaced geometry is drawn
      again as a wireframe, which is the mesh that forms over her.

   2. the solid helmet over her head, cut into bands and revealed by a lens
      that follows the pointer. this is the part that matters: on the live site
      the helmet is not simply on or off, it materialises in fragments wherever
      the cursor is and falls away everywhere else. the cut is a discard in the
      fragment shader, so the bands have hard edges and you see her face
      through the gaps rather than a ghost of the shell.

      on load the shell assembles whole, holds, then disappears and hands over
      to the pointer.

   3. the same helmet again as a hologram: a wireframe in her cool outline
      grey, always faintly present, brightening near the lens. it is what is
      left of the shell once the solid one has gone.

   the displacement in (1) runs once on the cpu at load, so the photo and its
   wireframe are literally the same vertices and can never drift apart. */

import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { DRACOLoader } from '../vendor/DRACOLoader.js';

const SEG = 190;
const DEPTH_SCALE = 0.42;
const INTRO_MS = 2600;

/* fitted against the portrait, not guessed: her alpha map puts the top of the
   hair at 0.219 of the image and the chin near 0.60, which centres her head at
   world y 0.20 on a 2.2 unit plane. the model's own centre sits 0.072 above
   its origin at this scale, hence the y below. */
const HELMET = {
  scale: 12,
  x: -0.03,
  y: 0.128,
  z: 0.34,
};

/* how much of the viewport the pointer lens covers, and the intro timings. */
const LENS_RADIUS = 0.42;
const ASSEMBLE_MS = 1200;
const HOLD_MS = 900;
const VANISH_MS = 1400;

const host = document.querySelector('[data-head]');
if (host) init(host);

const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

function init(host) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 4.2);

  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbc13fe, 1.4);
  rim.position.set(-3, -1, -2);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  const texLoader = new THREE.TextureLoader();

  // declared before resize(), which writes the canvas size into res
  const uniforms = {
    // parked off the canvas: at (0,0) the lens sits exactly on her face, so
    // the shell would never leave. it arrives when the pointer does.
    cursor: { value: new THREE.Vector2(3, 3) },
    reveal: { value: 0 },
    res: { value: new THREE.Vector2(1, 1) },
    radius: { value: LENS_RADIUS },
  };

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const dpr = renderer.getPixelRatio();
    uniforms.res.value.set(w * dpr, h * dpr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let wire = null;
  let holo = null;

  Promise.all([
    loadTex(texLoader, 'assets/head/diffuse.webp', THREE.SRGBColorSpace),
    loadTex(texLoader, 'assets/head/alpha.webp', THREE.NoColorSpace),
    readPixels('assets/head/depth.webp'),
  ])
    .then(([diffuse, alpha, depth]) => {
      buildHead(diffuse, alpha, depth);
      host.setAttribute('data-head-ready', '');
      return loadHelmet(texLoader);
    })
    .catch(() => { /* a hero that fails is better than an error at the visitor */ });

  function buildHead(diffuse, alpha, depth) {
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

    wire = new THREE.Mesh(
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
  }

  function loadHelmet(texLoader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath('assets/gl/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    return new Promise((res, rej) => {
      loader.load('assets/gl/helmet-21.glb', (gltf) => {
        const livery = texLoader.load('assets/gl/helmet-livery.webp', (t) => {
          // the atlas is authored with u past 1, so the sampler must repeat
          t.wrapS = THREE.RepeatWrapping;
          t.wrapT = THREE.RepeatWrapping;
          t.flipY = false;
          t.colorSpace = THREE.SRGBColorSpace;
          t.needsUpdate = true;
        });

        const solid = gltf.scene;
        const meshes = [];
        solid.traverse((o) => { if (o.isMesh) meshes.push(o); });
        meshes.sort(
          (a, b) =>
            b.geometry.getAttribute('position').count -
            a.geometry.getAttribute('position').count,
        );

        meshes.forEach((m, i) => {
          const mat = new THREE.MeshPhysicalMaterial(
            i === 0
              ? { map: livery, metalness: 0.2, roughness: 0.34, clearcoat: 0.8 }
              : { color: 0x14141c, metalness: 1, roughness: 0.1 },
          );
          cursorReveal(mat, uniforms);
          m.material = mat;
        });

        /* the hologram.

           wireframe:true on this model is unusable: the shell carries 17k
           vertices, so every triangle edge draws and the result is a solid
           white mass with her face nowhere in it. EdgesGeometry keeps only
           edges where the faces meet at more than 20 degrees, which is the
           helmet's actual structure: the shell seams, the visor aperture, the
           vents. that reads as a hologram and she stays visible through it.

           each mesh's own transform inside the gltf is baked into the line
           geometry, so the group can then take the same fit as the solid. */
        const holoMat = new THREE.LineBasicMaterial({
          color: 0xa9a9c4,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        holo = new THREE.Group();
        solid.updateMatrixWorld(true);
        meshes.forEach((m) => {
          const lines = new THREE.LineSegments(
            new THREE.EdgesGeometry(m.geometry, 20),
            holoMat,
          );
          lines.applyMatrix4(m.matrixWorld);
          holo.add(lines);
        });

        [solid, holo].forEach((o) => {
          o.scale.setScalar(HELMET.scale);
          o.position.set(HELMET.x, HELMET.y, HELMET.z);
          group.add(o);
        });

        host.setAttribute('data-helmet-ready', '');
        // exposed for tuning the fit against the photo; harmless in production
        window.__hero = { solid, holo, uniforms, HELMET };
        res();
      }, undefined, rej);
    });
  }

  let elapsed = 0;
  let last = null;
  let targetX = 0;
  let targetY = 0;
  // pointer in the canvas' own normalised space, so the lens lands under the
  // cursor no matter where the hero sits on the page
  let cursorX = 3;
  let cursorY = 3;
  // the lens starts parked off-canvas, so the first real pointer position has
  // to snap rather than ease: easing from 3.0 takes seconds to cross the face
  // and reads as the effect being broken
  let pointerSeen = false;

  function frame(t) {
    if (last !== null) elapsed += t - last;
    last = t;

    const k = ease(clamp01(elapsed / INTRO_MS));

    if (wire) {
      const settle = 0.3;
      wire.material.opacity = reduced
        ? settle
        : elapsed < INTRO_MS
          ? 0.55 * Math.sin(k * Math.PI) + settle * k
          : settle + 0.05 * Math.sin(elapsed / 900);
    }

    /* intro envelope: the shell assembles whole, holds, then disappears and
       leaves the pointer in charge. after that uReveal stays at 0 and the only
       thing keeping the helmet on screen is the lens. */
    let envelope;
    if (reduced) {
      envelope = 0;
    } else if (elapsed < ASSEMBLE_MS) {
      envelope = ease(elapsed / ASSEMBLE_MS);
    } else if (elapsed < ASSEMBLE_MS + HOLD_MS) {
      envelope = 1;
    } else {
      envelope = 1 - ease(clamp01((elapsed - ASSEMBLE_MS - HOLD_MS) / VANISH_MS));
    }
    uniforms.reveal.value = envelope;

    // eased so the lens has weight, except on the first sighting
    const follow = pointerSeen ? 0.12 : 1;
    uniforms.cursor.value.x += (cursorX - uniforms.cursor.value.x) * follow;
    uniforms.cursor.value.y += (cursorY - uniforms.cursor.value.y) * follow;

    /* the ghost is always faintly there and lifts while the shell is solid, so
       the two never both vanish and leave her floating with nothing on. */
    if (holo) {
      holo.children[0].material.opacity = reduced ? 0.3 : 0.26 + envelope * 0.5;
    }

    if (!reduced) {
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

  window.addEventListener(
    'pointermove',
    (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;

      const r = host.getBoundingClientRect();
      cursorX = ((e.clientX - r.left) / r.width) * 2 - 1;
      cursorY = -(((e.clientY - r.top) / r.height) * 2 - 1);
      pointerSeen = true;
    },
    { passive: true },
  );
}

/* patches a standard material so the shell only exists near the pointer.

   onBeforeCompile rather than a ShaderMaterial, so the helmet keeps three's
   real lighting and clearcoat and only gains the cut.

   the lens is computed in screen space from gl_FragCoord, which is why the
   resolution has to come in as a uniform: it is the only way to turn a
   fragment back into the normalised coordinates the pointer is given in.

   uReveal is the intro envelope. taking max(lens, uReveal) means the shell can
   assemble whole on load and then hand over to the pointer without the two
   fighting over the same fragments. */
function cursorReveal(material, u) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCursor = u.cursor;
    shader.uniforms.uReveal = u.reveal;
    shader.uniforms.uRes = u.res;
    shader.uniforms.uRadius = u.radius;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLocalPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLocalPos = position;`);

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform vec2 uCursor;
         uniform vec2 uRes;
         uniform float uReveal;
         uniform float uRadius;
         varying vec3 vLocalPos;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>

         vec2 ndc = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;
         float aspect = uRes.x / uRes.y;
         float d = distance(vec2(ndc.x * aspect, ndc.y),
                            vec2(uCursor.x * aspect, uCursor.y));
         float lens = 1.0 - smoothstep(uRadius * 0.45, uRadius, d);

         float present = max(lens, uReveal);

         // 0 at the crown, 1 at the chin, so the bands read as horizontal
         float h = clamp((0.052 - vLocalPos.y) / 0.104, 0.0, 1.0);
         float bands = fract(h * 7.0);
         // break the edges so they are not perfect machine lines
         bands += sin(vLocalPos.x * 130.0) * 0.09;

         if (bands > present * 1.25) discard;`,
      );
  };
  material.needsUpdate = true;
}

function loadTex(loader, url, colorSpace) {
  return new Promise((res, rej) => {
    loader.load(url, (t) => { t.colorSpace = colorSpace; res(t); }, undefined, rej);
  });
}

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
    const x = Math.min(w - 1, Math.max(0, Math.round(u * (w - 1))));
    const y = Math.min(h - 1, Math.max(0, Math.round((1 - v) * (h - 1))));
    pos.setZ(i, (data[(y * w + x) * 4] / 255) * DEPTH_SCALE);
  }
  pos.needsUpdate = true;
}
