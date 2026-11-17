// @ts-check
/**
 * @fileoverview world/facade: the outer facade ring of the stadium.
 *
 * WHY: it is one self-contained skin whose tile noise consumes the shared rand; it needs the baked env map for the glazed band.
 * BUILDS: 1 facade ring strip (720 segments), 1 glazed band strip.
 * DEPENDS ON: config/constants.js, core/geometry.js, core/materials.js.
 * USED BY: src/main.js.
 * LIFECYCLE: static.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. bulge 11 m, 15-point profile, tile height 12 px.
 * NOT HERE: gates and wall (world/gates.js).
 */
import { FACADE_D, FACADE_TOP } from '../config/constants.js';
import { ringStrip } from '../core/geometry.js';
import { dbl } from '../core/materials.js';

/**
 * Build the calabash facade: bulging pot profile with a pixel-mosaic skin, plus the teal glazed band under the roof.
 * Side effects: draws the 2048 x 512 mosaic canvas (consumes the shared rand) and adds 2 ring strips to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, rand, canvasTex, envTex.
 * @returns {void} nothing; everything is added to ctx.scene.
 */
export function buildFacade(ctx) {
  const { scene, rand, canvasTex, envTex } = ctx;
  /* ---- the calabash facade: bulging pot profile, pixel-mosaic skin (deep red at the foot -> orange -> sand -> cream at the rim) ---- */
  const FACADE_BULGE = 11;
  const facadeProfile = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; facadeProfile.push({ d: FACADE_D + FACADE_BULGE * Math.sin(Math.PI * Math.pow(t, 0.72)), y: t * FACADE_TOP }); }
  {
    const ramp = [[0, [118, 30, 20]], [0.22, [176, 52, 28]], [0.45, [214, 104, 44]], [0.68, [214, 168, 104]], [0.88, [232, 208, 150]], [1, [242, 228, 186]]];
    const rampAt = t => { for (let i = 1; i < ramp.length; i++) if (t <= ramp[i][0]) { const [t0, c0] = ramp[i - 1], [t1, c1] = ramp[i], k = (t - t0) / (t1 - t0); return c0.map((v, j) => v + (c1[j] - v) * k); } return ramp[ramp.length - 1][1]; };
    const mosaic = canvasTex(2048, 512, (g, w, h) => {
      g.fillStyle = '#8a3a22'; g.fillRect(0, 0, w, h);
      const TH = 12;                                                         // tile height (px)
      for (let y = h - TH; y > -TH; y -= TH) {
        const t = 1 - (y + TH / 2) / h;                                    // 0 at the foot, 1 at the rim
        for (let x = 0; x < w;) {
          const tw = 7 + Math.floor(rand() * 9), r = rand();
          const tt = Math.min(1, Math.max(0, t + (r < 0.22 ? (rand() - 0.5) * 0.5 : (rand() - 0.5) * 0.12)));   // 22% of tiles jump a few tones: the mosaic noise
          const c = rampAt(tt), sh = 0.9 + rand() * 0.2;
          g.fillStyle = `rgb(${c[0] * sh | 0},${c[1] * sh | 0},${c[2] * sh | 0})`; g.fillRect(x, y, tw - 1, TH - 1);
          x += tw;
        }
      }
      g.fillStyle = 'rgba(40,20,16,.55)';                                   // dark vertical expansion joints
      for (let k = 0; k < 10; k++) g.fillRect(Math.floor((k / 10 + (rand() - 0.5) * 0.03) * w), 0, 5, h);
    }, { repeat: [1, 1], nearest: true });
    const facade = ringStrip(facadeProfile, dbl(0xffffff, { map: mosaic, roughness: 0.82 }), { cumV: true, N: 720 });
    scene.add(facade);
    // glazed band under the roof (teal) and a dark lower plinth
    const glazed = dbl(0x2c5a5c, { roughness: 0.18, metalness: 0.35, envMap: envTex, envMapIntensity: 0.9 });
    const gb = facadeProfile.filter(p => p.y >= FACADE_TOP - 7).map(p => ({ d: p.d + 0.25, y: p.y }));
    scene.add(ringStrip(gb, glazed, { cumV: true, N: 720, cast: false }));
  }
}
