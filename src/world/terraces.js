// @ts-check
/**
 * @fileoverview world/terraces: the three concrete terraces (one ring strip per tier), the charcoal fascia and the skybox band shell.
 *
 * WHY: the terraces are what the picking ray hits, so they are returned; the shared materials (white, concrete ...) are returned for the skyboxes and the roof.
 * BUILDS: 3 terrace ring strips (returned as terraces[]), 5 fascia strips, 3 skybox shell strips.
 * DEPENDS ON: config/constants.js, core/geometry.js, core/materials.js.
 * USED BY: src/main.js, src/interaction/picking.js (PICK uses terraces[]; skyboxes and roof use white).
 * LIFECYCLE: static. NOTE: the shared white material is also faded by the roof toggle (setRoofFade in src/interaction/roof-control.js), as before.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin.
 * NOT HERE: seats (world/seats.js).
 */
import { tiers, RUN, T1_END_D, Y1, GLASS_D, BACK_D, T2_END_D, Y2, WALK2, T3_END_D, Y3, FACADE_D, FASCIA_TOP, BOX_TOP } from '../config/constants.js';
import { ringStrip } from '../core/geometry.js';
import { dbl } from '../core/materials.js';

/**
 * Build the concrete steps of the three tiers, the fascia rails and the under-skybox floor, ceiling and back wall.
 * Side effects: draws the concrete texture (consumes the shared rand) and adds 12 ring strips to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, rand, canvasTex.
 * @returns {object} { terraces, concrete, concreteDark, blueFascia, white }
 */
export function buildTerraces(ctx) {
  const { scene, rand, canvasTex } = ctx;
  /* ------------------------------------------------------------------ terraces (the concrete steps) */
  // step texture: v=0 is the lit nosing (tread front / riser top), v=1 the contact-shadowed inner corner (tread back / riser foot)
  const concreteTex = (() => {
    const t = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#bdbab2'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { const v = 150 + rand() * 80; g.fillStyle = `rgba(${v},${v - 3},${v - 10},.30)`; g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1); }
      const gr = g.createLinearGradient(0, 0, 0, h);                        // canvas top = v 1 (dark corner), bottom = v 0 (nosing)
      gr.addColorStop(0, 'rgba(30,26,22,.55)'); gr.addColorStop(0.16, 'rgba(30,26,22,.10)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(0.93, 'rgba(255,250,240,.20)'); gr.addColorStop(1, 'rgba(255,250,240,.38)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, { repeat: [260, 1] });
    return t;
  })();
  const concrete = dbl(0xe6e2da, { roughness: 0.94, map: concreteTex });
  const concreteDark = dbl(0x6b6f76, { roughness: 0.85 });
  const blueFascia = dbl(0x2a2d34, { roughness: 0.5, metalness: 0.2 });   // charcoal fascia (Soccer City tier fronts)
  const white = dbl(0xefede7, { roughness: 0.7 });

  function terraceProfile(t, lead) {
    const prof = lead.slice();
    for (let r = 0; r < t.rows; r++) {
      const dr = t.d0 + r * RUN, yr = t.y0 + r * t.rise;
      prof.push({ d: dr, y: yr }, { d: dr + RUN, y: yr });
    }
    return prof;
  }
  const terraces = [];
  {
    const lower = terraceProfile(tiers[0], [{ d: -0.3, y: 0 }, { d: -0.3, y: tiers[0].y0 }, { d: 0, y: tiers[0].y0 }]);
    lower.push({ d: T1_END_D, y: Y1 }, { d: GLASS_D, y: Y1 });
    terraces.push(ringStrip(lower, concrete));

    const middle = terraceProfile(tiers[1], [{ d: GLASS_D, y: FASCIA_TOP }, { d: BACK_D, y: FASCIA_TOP }]);
    middle.push({ d: T2_END_D, y: Y2 }, { d: T2_END_D + WALK2, y: Y2 }, { d: T2_END_D + WALK2, y: tiers[2].y0 });
    terraces.push(ringStrip(middle, concrete));

    const upper = terraceProfile(tiers[2], [{ d: tiers[2].d0, y: tiers[2].y0 }]);
    upper.push({ d: T3_END_D, y: Y3 }, { d: FACADE_D, y: Y3 });
    terraces.push(ringStrip(upper, concrete));
    terraces.forEach(t => scene.add(t));

    // charcoal fascia / rails
    scene.add(ringStrip([{ d: -0.3, y: 1.5 }, { d: -0.3, y: 2.6 }], blueFascia));
    scene.add(ringStrip([{ d: GLASS_D, y: BOX_TOP }, { d: GLASS_D, y: FASCIA_TOP + 1.0 }], blueFascia));
    scene.add(ringStrip([{ d: GLASS_D - 0.05, y: FASCIA_TOP + 1.0 }, { d: GLASS_D + 0.2, y: FASCIA_TOP + 1.0 }], white));
    scene.add(ringStrip([{ d: tiers[2].d0 - 0.1, y: Y2 }, { d: tiers[2].d0 - 0.1, y: Y2 + 1.2 }], blueFascia));
    scene.add(ringStrip([{ d: T3_END_D, y: Y3 }, { d: T3_END_D, y: Y3 + 1.1 }], blueFascia));
    // under-skybox floor, ceiling, back wall
    scene.add(ringStrip([{ d: GLASS_D, y: Y1 + 0.02 }, { d: BACK_D, y: Y1 + 0.02 }], dbl(0x55585f, { roughness: 0.55 }), { cast: false }));
    scene.add(ringStrip([{ d: GLASS_D, y: BOX_TOP }, { d: BACK_D, y: BOX_TOP }], concreteDark));
    scene.add(ringStrip([{ d: BACK_D, y: Y1 }, { d: BACK_D, y: FASCIA_TOP }], dbl(0x2a2118, { emissive: 0x3a2410, emissiveIntensity: 0.6, roughness: 0.8 })));
  }
  return { terraces, concrete, concreteDark, blueFascia, white };
}
