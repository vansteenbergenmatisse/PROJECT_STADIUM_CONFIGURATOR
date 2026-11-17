// @ts-check
/**
 * @fileoverview world/roof: the roof group.
 *
 * WHY: the roof is one Group so it can be hidden (R key) and faded to 40% while a section is selected; the group is returned to src/main.js, which hands it to src/interaction/roof-control.js.
 * BUILDS: 1 Group: foil ring strip (960 segments), 104 ribs (InstancedMesh), inner rim, soffit lip, outer lip.
 * DEPENDS ON: three, config/constants.js, data/bowl-math.js, core/geometry.js, core/materials.js.
 * USED BY: src/interaction/roof-control.js (setRoofFade, toggleRoof).
 * LIFECYCLE: static geometry; setRoofFade stores userData.roofBase on its materials at runtime.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. one foil tile is about 11 m.
 * NOT HERE: the roof fade and toggle (src/interaction/roof-control.js).
 */
import * as THREE from 'three';
import { TAU, ROOF_OUT, ROOF_IN } from '../config/constants.js';
import { shapePoint, arcTable } from '../data/bowl-math.js';
import { ringStrip } from '../core/geometry.js';
import { std, dbl } from '../core/materials.js';

/**
 * Build the translucent ETFE foil roof ring, its 104 radial steel ribs and the rims.
 * Side effects: adds ONE Group (the roof) to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, MAX_ANISO.
 * @param {{white: any}} deps - values built earlier (see src/main.js for the order).
 * @returns {object} { roof }
 */
export function buildRoof(ctx, { white }) {
  const { scene, MAX_ANISO } = ctx;
  /* ------------------------------------------------------------------ roof: translucent ETFE-foil ring (diamond cushions in a steel lattice) around the open pitch.
     Modelled on what stadium roofs of this kind look like (Allianz Arena, U.S. Bank Stadium: inflated foil cushions in a steel frame, diamond panel layout): milky see-through cushions,
     thin grey steel lines, glossy sky reflections. The foil strip does NOT cast a shadow (light passes through); 104 radial steel ribs do, which gives a soft dappled pattern inside. */
  const roof = new THREE.Group();
  {
    const T = 256, tile = document.createElement('canvas'); tile.width = tile.height = T; const g = tile.getContext('2d');
    g.clearRect(0, 0, T, T);
    g.fillStyle = 'rgba(236,244,252,0.30)'; g.fillRect(0, 0, T, T);                                       // foil: pale, mostly clear
    for (const [cx, cy] of [[128, 0], [128, T], [0, 128], [T, 128]]) {                                     // each diamond puffs up: a lighter, denser centre
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, 118); rg.addColorStop(0, 'rgba(255,255,255,0.46)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, T, T);
    }
    g.strokeStyle = 'rgba(96,104,116,1)'; g.lineWidth = 7; g.lineCap = 'butt';                            // steel lattice (both diagonals = a diamond lattice when the tile repeats)
    g.beginPath(); g.moveTo(0, 0); g.lineTo(T, T); g.moveTo(0, T); g.lineTo(T, 0); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-2, 4); g.lineTo(T - 2, T + 4); g.moveTo(-2, T + 4); g.lineTo(T - 2, 4); g.stroke();   // thin highlight on the steel
    const foilTex = new THREE.CanvasTexture(tile); foilTex.colorSpace = THREE.SRGBColorSpace; foilTex.wrapS = foilTex.wrapT = THREE.RepeatWrapping; foilTex.anisotropy = MAX_ANISO;
    const dMid = (ROOF_OUT.d + ROOF_IN.d) / 2, Lm = arcTable(dMid).L, Wd = Math.hypot(ROOF_OUT.d - ROOF_IN.d, ROOF_OUT.y - ROOF_IN.y), CELL_M = 11;   // one tile = about 11 m
    foilTex.repeat.set(Math.round(Lm / CELL_M), Math.max(2, Math.round(Wd / CELL_M)));
    const foil = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: foilTex, transparent: true, opacity: 1, depthWrite: false, roughness: 0.12, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 1.1, side: THREE.DoubleSide });
    roof.add(ringStrip([ROOF_OUT, ROOF_IN], foil, { cumV: true, N: 960, cast: false }));
    // 104 radial steel ribs under the foil (one InstancedMesh): they carry the roof visually and cast the only roof shadow
    const RIBS = 104, rib = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.7, 1), std(0xbfc5ce, { roughness: 0.35, metalness: 0.55 }), RIBS), dm = new THREE.Object3D(), p0 = [0, 0], p1 = [0, 0];
    const slope = Math.atan2(ROOF_OUT.y - ROOF_IN.y, ROOF_OUT.d - ROOF_IN.d), len = Math.hypot(ROOF_OUT.d - ROOF_IN.d, ROOF_OUT.y - ROOF_IN.y);
    for (let k = 0; k < RIBS; k++) {
      const a = k / RIBS * TAU; shapePoint(a, ROOF_IN.d, p0); shapePoint(a, ROOF_OUT.d, p1);
      dm.position.set((p0[0] + p1[0]) / 2, (ROOF_IN.y + ROOF_OUT.y) / 2 - 0.45, (p0[1] + p1[1]) / 2);
      const dx = p1[0] - p0[0], dz = p1[1] - p0[1]; dm.rotation.set(0, 0, 0); dm.rotateY(Math.atan2(dx, dz)); dm.rotateX(-slope); dm.scale.set(1, 1, len); dm.updateMatrix(); rib.setMatrixAt(k, dm.matrix);
    }
    rib.castShadow = true; rib.receiveShadow = true; roof.add(rib);
    roof.add(ringStrip([{ d: ROOF_IN.d, y: ROOF_IN.y }, { d: ROOF_IN.d, y: ROOF_IN.y - 2.4 }], dbl(0xb9b5ab, { roughness: 0.5, metalness: 0.25 })));   // heavy grey inner rim
    roof.add(ringStrip([{ d: ROOF_IN.d - 0.01, y: ROOF_IN.y - 2.4 }, { d: ROOF_IN.d + 5, y: ROOF_IN.y - 2.0 }], dbl(0x7e7a72, { roughness: 0.7 }), { cast: false }));   // dark soffit lip
    roof.add(ringStrip([{ d: ROOF_OUT.d, y: ROOF_OUT.y }, { d: ROOF_OUT.d, y: ROOF_OUT.y - 1.4 }], white));
  }
  scene.add(roof);
  return { roof };
}
