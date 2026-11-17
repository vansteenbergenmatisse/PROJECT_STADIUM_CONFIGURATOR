// @ts-check
/**
 * @fileoverview world/ground: the lush mottled meadow (3000 x 3000 m) and the terracotta paved plaza ring.
 *
 * WHY: ground is the first scene content and the first consumer of the shared rand, so it comes first in the build order.
 * BUILDS: 1 plane (meadow), 1 ring strip (plaza, 26 m wide).
 * DEPENDS ON: three, config/constants.js, core/geometry.js, core/materials.js.
 * USED BY: src/main.js.
 * LIFECYCLE: static; frozen with the rest of the scene.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. meadow canvas 1024 px repeated 16 x 16; paving blocks 64 px.
 * NOT HERE: pitch (world/pitch.js).
 */
import * as THREE from 'three';
import { TAU, FACADE_D } from '../config/constants.js';
import { ringStrip } from '../core/geometry.js';
import { dbl } from '../core/materials.js';

/**
 * Build the meadow plane and the paved plaza ring.
 * Side effects: draws the meadow and paving canvases (consumes the shared rand in that order) and adds 2 meshes to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, rand, canvasTex.
 * @returns {void} nothing; everything is added to ctx.scene.
 */
export function buildGround(ctx) {
  const { scene, rand, canvasTex } = ctx;
  {
    const earth = canvasTex(1024, 1024, (g, w, h) => {                      // lush meadow: olive-green base, dark clover mottles, lighter sunlit patches, fine grain
      g.fillStyle = '#5f7d2e'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { g.fillStyle = `hsla(${84 + rand() * 18},${34 + rand() * 12}%,${20 + rand() * 14}%,.34)`; g.beginPath(); g.arc(rand() * w, rand() * h, 4 + rand() * 30, 0, TAU); g.fill(); }
      for (let i = 0; i < 900; i++) { g.fillStyle = `hsla(${68 + rand() * 16},${44 + rand() * 14}%,${40 + rand() * 12}%,.26)`; g.beginPath(); g.arc(rand() * w, rand() * h, 5 + rand() * 24, 0, TAU); g.fill(); }
      for (let i = 0; i < 26000; i++) { const v = 70 + rand() * 70; g.fillStyle = `rgba(${v * 0.8},${v + 20},${v * 0.35},.22)`; g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2); }
    }, { repeat: [16, 16] });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ map: earth, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  }
  // terracotta paving: blocks with joints, tonal variation and darker laid bands
  const pavingTex = (base, jointA = 0.10) => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const B = 64;
    for (let y = 0; y < h; y += B) for (let x = 0; x < w; x += B) { const v = (rand() - 0.5) * 26; g.fillStyle = `rgba(${v > 0 ? 255 : 60},${v > 0 ? 230 : 40},${v > 0 ? 220 : 40},${Math.abs(v) / 120})`; g.fillRect(x, y, B, B); }
    g.strokeStyle = `rgba(60,35,30,${jointA})`; g.lineWidth = 2; for (let i = 0; i <= w; i += B) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    for (let i = 0; i < 9000; i++) { const v = 120 + rand() * 90; g.fillStyle = `rgba(${v},${v - 40},${v - 55},.18)`; g.fillRect(rand() * w, rand() * h, 2, 2); }
  }, { repeat: [1, 1] });
  {
    const plazaTex = pavingTex('#c48f7a', 0.05); plazaTex.repeat.set(70, 3);
    scene.add(ringStrip([{ d: FACADE_D, y: 0.15 }, { d: FACADE_D + 26, y: 0.15 }], dbl(0xffffff, { map: plazaTex, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), { cast: false, cumV: true }));
  }
}
