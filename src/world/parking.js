// @ts-check
/**
 * @fileoverview world/parking: the fenced car park (not selectable).
 *
 * WHY: parking uses its own seeded generators so nothing else moves; parkingMesh is returned because the picking code still compares against it.
 * BUILDS: parking ring strip, 1 bay-line InstancedMesh, yellow lines, hatch strips, signs, fence + posts, 4 gate portals, 4 lot strips, 4 kerb islands, bushes, 4 lot signs, 50 cars (3 InstancedMeshes).
 * DEPENDS ON: three, config/constants.js, data/bowl-math.js, core/geometry.js, core/materials.js, core/rng.js.
 * USED BY: src/main.js.
 * LIFECYCLE: static. window.__parkedCars = 50 is set here for the test console.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin.
 * NOT HERE: parking prices (src/data/display-prices.js) and lot selection (src/interaction/selection.js).
 */
import * as THREE from 'three';
import { rng } from '../core/rng.js';
import { TAU, A0, B0, FACADE_D, PARK_IN, PARK_OUT, Y_LOT, Y_MARK, ACCESS_ANGLES } from '../config/constants.js';
import { shapePoint, arcTable, arcAt, sAtTheta, thetaAtS } from '../data/bowl-math.js';
import { ringStrip } from '../core/geometry.js';
import { std, dbl } from '../core/materials.js';
import { mergeStatic } from '../core/merge.js';

/**
 * Build the car park: asphalt ring, bay lines, markings, hatch strips, signs, fence, gate portals, 4 tinted lots, kerb islands, bushes, lot signs and the 50 parked cars.
 * Side effects: draws the asphalt canvas (own rng 777), uses rng 4242 for bushes / slots / cars, sets window.__parkedCars, adds many objects to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, canvasTex, MAX_ANISO.
 * @param {{curves: any, spurSamples: any, outsideStadium: any}} deps - values built earlier (see src/main.js for the order).
 * @returns {object} { parkingMesh }
 */
export function buildParking(ctx, { curves, spurSamples, outsideStadium }) {
  const { scene, canvasTex, MAX_ANISO } = ctx;
  const mergeList = [];                                                 // static, non-pickable strips that share a material: merged into one Mesh per material at the end of this function (core/merge.js, fewer draw calls, same picture)
  /* ---- parking ring around the arena: paved surface + painted bays (the tinted lots, islands, signs and the 50 cars are added by the PARKING LOTS block right after the bay lines) ---- */
  const ra = rng(777);                                                  // own rng: the shared one drives the trees, so using it here would move them
  const asphaltTex = canvasTex(512, 512, (g, w, h) => {                  // car-park asphalt: neutral mid-grey, fine grain and a few very faint wear patches (no cracks, no big dark blobs: they read as dirt from above)
    g.fillStyle = '#74777e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(40,42,48,${0.025 + ra() * 0.03})`; g.beginPath(); g.arc(ra() * w, ra() * h, 24 + ra() * 60, 0, TAU); g.fill(); }
    for (let i = 0; i < 14000; i++) { const v = 100 + ra() * 80; g.fillStyle = `rgba(${v},${v},${v + 4},.22)`; g.fillRect(ra() * w, ra() * h, 1 + ra() * 1.4, 1 + ra() * 1.4); }
  });
  const parkTex = asphaltTex; parkTex.repeat.set(70, 2);
  const parkMat = dbl(0xffffff, { map: parkTex, roughness: 0.93, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const parkingMesh = ringStrip([{ d: PARK_IN, y: Y_LOT }, { d: PARK_OUT, y: Y_LOT }], parkMat, { cast: false, cumV: true });
  scene.add(parkingMesh);

  /* Bay grid (batch 25 fix): the 4 rows used to compute their own bay count from their own length, so the lines of the back-to-back rows drifted against each other and the cars did not sit between lines.
     Now ONE list of bay edges (BAY_EDGES, in theta, evenly spaced by arc length on the middle of the lot) is shared by every row: side lines are straight radial lines through all rows, and cars use the same grid. */
  const BAY_ROWS = [30.2, 40.4, 45.0, 55.2].map(o => FACADE_D + o), BAY_W = 2.6, BAY_LEN = 5.0;
  const BAY_EDGES = (() => { const tab = arcTable(FACADE_D + 42.7), n = Math.floor(tab.L / BAY_W), e = []; for (let i = 0; i < n; i++) e.push(thetaAtS(tab, tab.L * i / n)); e.push(TAU); return e; })();
  const radialYaw = (th, d) => { const a = shapePoint(th, d, [0, 0]), b = shapePoint(th, d + 1, [0, 0]); return Math.atan2(b[0] - a[0], b[1] - a[1]); };
  {
    const lines = [], q = [0, 0];
    for (const dr of BAY_ROWS) for (let i = 0; i < BAY_EDGES.length - 1; i++) {
      shapePoint(BAY_EDGES[i], dr, q);
      if (spurSamples.some(p => Math.hypot(p.x - q[0], p.z - q[1]) < 9)) continue;        // access roads cut through the lot
      lines.push([q[0], q[1], radialYaw(BAY_EDGES[i], dr)]);
    }
    const dummy = new THREE.Object3D();
    const bay = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.02, BAY_LEN + 0.2), std(0xf2c230, { roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), lines.length);   // yellow = you may park between these lines
    lines.forEach(([x, z, yaw], i) => { dummy.position.set(x, Y_MARK, z); dummy.rotation.set(0, yaw, 0); dummy.updateMatrix(); bay.setMatrixAt(i, dummy.matrix); });
    bay.receiveShadow = true; scene.add(bay);
  }

  /* ---- PARKING MARKINGS + FENCE (batch 25). The ring reads as a real car park now:
     - YELLOW = where you may park: every bay is framed by yellow side lines (radial, 2.6 m apart) and yellow head lines (arcs at the bay ends); the aisles between the rows stay plain asphalt.
     - YELLOW HATCH = where you may NOT park: a keep-clear strip along both sides of every access road (diagonal stripes between two solid yellow bars, plus NO PARKING signs on posts), and a
       solid yellow kerb line along the plaza edge (fire lane). The bays and cars never enter a hatched strip (they keep >= 9 m from the road centre, the strip ends at 8.5 m).
     - FENCE: a chain-link fence (posts every 6 m, mesh panel, top rail) round the outer edge of the ring with a 18 m opening at each of the 4 access roads, where a gate portal with a sign spans the road.
     Everything here is static, not pickable and does not cast shadows (it only adds a few draw calls, the fence mesh is alpha-tested). Own rng is not needed: no random numbers are used. */
  {
    const YEL = 0xf2c230, Y_LINE = Y_MARK + 0.01;
    const yellow = std(YEL, { roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const FENCE_D = PARK_OUT + 1.6, GATE_HALF = 9, LINE_CUT = 9.6;                    // fence plan offset, half opening of a gate, half width of the gap the arc lines leave at a road
    // arcs between the 4 access roads: [t0, t1] in theta, leaving +-m metres (measured along the offset curve d) free at each road
    const thetaMoved = (tab, th, dm) => { const s = ((sAtTheta(tab, th % TAU) + dm) % tab.L + tab.L) % tab.L; return thetaAtS(tab, s); };
    const arcsBetweenRoads = (d, m) => { const tab = arcTable(d); return ACCESS_ANGLES.map((a, i) => { const t0 = thetaMoved(tab, a, m); let t1 = thetaMoved(tab, ACCESS_ANGLES[(i + 1) % 4], -m); while (t1 <= t0) t1 += TAU; return [t0, t1]; }); };
    // 1) yellow head lines of the bays and the solid kerb line on the plaza edge (thin ring strips cut at the roads)
    const LINES = [[PARK_IN + 0.2, 0.34], [FACADE_D + 27.6, 0.16], [FACADE_D + 32.9, 0.16], [FACADE_D + 37.8, 0.16], [FACADE_D + 47.6, 0.16], [FACADE_D + 52.5, 0.16], [FACADE_D + 57.9, 0.16]];
    for (const [d0, w] of LINES) for (const [t0, t1] of arcsBetweenRoads(d0, LINE_CUT)) { const ln = ringStrip([{ d: d0, y: Y_LINE }, { d: d0 + w, y: Y_LINE }], yellow, { cast: false, N: 120, t0, t1 }); scene.add(ln); mergeList.push(ln); }
    // 2) keep-clear hatch strips along the roads (only the part inside the ring)
    const hatchTex = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12);
      g.save(); g.beginPath(); g.rect(0, 12, w, h - 24); g.clip(); g.strokeStyle = '#f2c230'; g.lineWidth = 15;
      for (let k = -h; k < w + h; k += 42) { g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); }
      g.restore();
    });
    const hatch = std(0xffffff, { map: hatchTex, roughness: 0.7, side: THREE.DoubleSide, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const inRing = p => !outsideStadium(p.x, p.z, 0) && outsideStadium(p.x, p.z, -(PARK_OUT - PARK_IN));
    function offsetStrip(pts, o0, o1, mat) {                                          // strip between two lateral offsets of a polyline; u = metres / 3 along the road, v across
      const pos = [], uv = [], idx = []; let acc = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        if (i) acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
        pos.push(pts[i].x - tz * o0, Y_LINE, pts[i].z + tx * o0, pts[i].x - tz * o1, Y_LINE, pts[i].z + tx * o1); uv.push(acc / 3, 0, acc / 3, 1);
        if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
    }
    const noParkTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d'); g.fillStyle = '#f2c230'; g.fillRect(0, 0, 256, 192); g.strokeStyle = '#15171c'; g.lineWidth = 8; g.strokeRect(8, 8, 240, 176);
      g.fillStyle = '#15171c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 62px "Plus Jakarta Sans", system-ui, sans-serif'; g.fillText('NO', 128, 62); g.font = '800 46px "Plus Jakarta Sans", system-ui, sans-serif'; g.fillText('PARKING', 128, 124);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t; })();
    const noParkMat = new THREE.MeshBasicMaterial({ map: noParkTex, side: THREE.DoubleSide }), poleMat = std(0x3a3f4a, { roughness: 0.5, metalness: 0.4 });
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.07, 2.5, 6).translate(0, 1.25, 0), plateGeo = new THREE.PlaneGeometry(1.5, 1.125);
    for (const c of curves.slice(1)) {
      const pts = c.getSpacedPoints(400).filter(inRing);
      for (const side of [1, -1]) {
        const hs = offsetStrip(pts, side * 6.6, side * 8.5, hatch); scene.add(hs); mergeList.push(hs);          // the 8 hatch strips share one material
        for (const f of [0.12, 0.88]) {                                                // two NO PARKING signs per side, facing along the road
          const i = Math.floor(f * (pts.length - 1)), a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)]; let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
          const gx = a.x - tz * side * 9.2, gz = a.z + tx * side * 9.2, grp = new THREE.Group(); grp.position.set(gx, Y_LOT, gz); grp.rotation.y = Math.atan2(tx, tz);
          const pole = new THREE.Mesh(poleGeo, poleMat); pole.castShadow = true; grp.add(pole); const plate = new THREE.Mesh(plateGeo, noParkMat); plate.position.set(0, 2.15, 0); grp.add(plate); scene.add(grp);
        }
      }
    }
    // 3) chain-link fence: 4 arcs between the gates. Panel = alpha-tested diamond mesh (ringStrip, vertical), top rail = thin strip, posts = one InstancedMesh.
    const meshTex = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(200,205,212,1)'; g.lineWidth = 3; for (let k = -h; k < w + h; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k + h, 0); g.lineTo(k, h); g.stroke(); } }, { srgb: true });
    const FH = 2.4, tabF = arcTable(FENCE_D), postPts = [], railM = std(0x9aa0a8, { roughness: 0.4, metalness: 0.6 });
    for (const [t0, t1] of arcsBetweenRoads(FENCE_D, GATE_HALF)) {
      const s0 = sAtTheta(tabF, t0 % TAU); let s1 = sAtTheta(tabF, t1 % TAU); if (s1 <= s0) s1 += tabF.L;
      const len = s1 - s0, tex = meshTex.clone(); tex.needsUpdate = true; tex.repeat.set(len / 1.1, FH / 1.1);
      scene.add(ringStrip([{ d: FENCE_D, y: Y_LOT }, { d: FENCE_D, y: Y_LOT + FH }], new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }), { cast: false, receive: false, N: 140, t0, t1 }));
      const rail = ringStrip([{ d: FENCE_D - 0.04, y: Y_LOT + FH }, { d: FENCE_D + 0.04, y: Y_LOT + FH + 0.06 }], railM, { cast: false, receive: false, N: 140, t0, t1 }); scene.add(rail); mergeList.push(rail);   // the 4 top rails share railM
      const n = Math.max(1, Math.round(len / 6));
      for (let i = 0; i <= n; i++) { const a = arcAt(tabF, ((s0 + len * i / n) % tabF.L) / tabF.L); postPts.push([a.x, a.z]); }
    }
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, FH + 0.15, 0.14).translate(0, (FH + 0.15) / 2, 0), railM, postPts.length), pd = new THREE.Object3D();
    postPts.forEach(([x, z], i) => { pd.position.set(x, Y_LOT, z); pd.updateMatrix(); posts.setMatrixAt(i, pd.matrix); }); scene.add(posts);
    // 4) gate portals: two pillars and a sign beam across each access road, "PARKING" on both faces
    const gateTex = (() => { const c = document.createElement('canvas'); c.width = 768; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#1b2030'; g.fillRect(0, 0, 768, 128); g.fillStyle = '#f2c230'; g.fillRect(0, 0, 768, 10); g.fillRect(0, 118, 768, 10);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 62px "Plus Jakarta Sans", system-ui, sans-serif'; g.fillText('PARKING  ·  ENTRANCE', 384, 68);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t; })();
    const pillarM = std(0x2a2e39, { roughness: 0.6, metalness: 0.2 }), p0 = [0, 0], p1 = [0, 0];
    for (const a of ACCESS_ANGLES) {
      shapePoint(a, FENCE_D, p0); shapePoint(a, FENCE_D + 1, p1); let rx = p1[0] - p0[0], rz = p1[1] - p0[1]; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;    // radial direction; across = (-rz, rx)
      const grp = new THREE.Group(); grp.position.set(p0[0], Y_LOT, p0[1]); grp.rotation.y = Math.atan2(rx, rz);
      for (const sx of [-GATE_HALF, GATE_HALF]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5.6, 0.7), pillarM); pl.position.set(sx, 2.8, 0); pl.castShadow = true; grp.add(pl); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(GATE_HALF * 2 + 0.7, 1.3, 0.5), pillarM); beam.position.set(0, 6.1, 0); beam.castShadow = true; grp.add(beam);
      for (const side of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(GATE_HALF * 2 - 0.6, 1.05), new THREE.MeshBasicMaterial({ map: gateTex })); pl.position.set(0, 6.1, side * 0.27); pl.rotation.y = side > 0 ? 0 : Math.PI; grp.add(pl); }
      scene.add(grp);
    }
  }

  /* ---- PARKING LOTS (batch 24): the ring is split into the 4 lots that already carry prices (E, S, W, N = plan-angle quarters, boundaries on theta = pi/4 + k pi/2, see lotOf):
     each lot has its own pavement tint, green kerb islands with bushes mark the 4 boundaries, a signpost names each lot, and 50 cars are parked in the bays (13 / 13 / 12 / 12), more in the
     rows closest to the stadium. Cars are back in because the user asked for them (they had been removed earlier). Own rng so nothing else moves. Parking stays NOT selectable. */
  {
    const rr = rng(4242), Q = Math.PI / 4;
    const LOTS = { E: [-Q, Q, 0xd2d8e4], S: [Q, 3 * Q, 0xd4dfd0], W: [3 * Q, 5 * Q, 0xe2d6c9], N: [5 * Q, 7 * Q, 0xdad2e3] };   // faint tints on the asphalt: still tells the lots apart
    const lotTex = parkTex.clone(); lotTex.needsUpdate = true; lotTex.repeat.set(18, 2);
    for (const k in LOTS) { const [t0, t1, col] = LOTS[k]; scene.add(ringStrip([{ d: PARK_IN, y: Y_LOT + 0.005 }, { d: PARK_OUT, y: Y_LOT + 0.005 }], dbl(col, { map: lotTex, roughness: 0.93, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { cast: false, cumV: true, t0, t1, N: 240 })); }
    // kerb islands on the 4 boundaries (radial lines are straight) + bushes
    const grassM = std(0x4d7a38, { roughness: 1 }), kerbM = std(0xbdb8ae, { roughness: 0.9 }), q0 = [0, 0], q1 = [0, 0], bushes = [];
    for (let k = 0; k < 4; k++) {
      const th = Q + k * Math.PI / 2; shapePoint(th, PARK_IN - 1, q0); shapePoint(th, PARK_OUT + 1, q1);
      const nx = q1[0] - q0[0], nz = q1[1] - q0[1], len = Math.hypot(nx, nz), ux = nx / len, uz = nz / len, yaw = Math.atan2(ux, uz), cx = (q0[0] + q1[0]) / 2, cz = (q0[1] + q1[1]) / 2;
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.18, len), kerbM); kerb.position.set(cx, Y_LOT + 0.09, cz); kerb.rotation.y = yaw; kerb.receiveShadow = true; scene.add(kerb);
      const gr = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.2, len - 0.4), grassM); gr.position.set(cx, Y_LOT + 0.12, cz); gr.rotation.y = yaw; gr.receiveShadow = true; scene.add(gr);
      for (let b = 0; b < 7; b++) { const t = (b + 0.5) / 7; bushes.push([q0[0] + nx * t + (rr() - 0.5) * 1.6 * -uz, q0[1] + nz * t + (rr() - 0.5) * 1.6 * ux, 0.8 + rr() * 0.7]); }
    }
    const bushM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), std(0x3f6b2e, { roughness: 1 }), bushes.length), bd = new THREE.Object3D();
    bushes.forEach(([x, z, r], i) => { bd.position.set(x, Y_LOT + 0.2 + r * 0.55, z); bd.scale.set(r * 1.2, r * 0.9, r * 1.2); bd.updateMatrix(); bushM.setMatrixAt(i, bd.matrix); }); bushM.castShadow = true; scene.add(bushM);
    // lot signposts: pole + a two-sided board, one per lot, at the middle of each lot's plaza edge
    const signCanvas = (txt, bg) => { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 160); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 144);
      g.fillStyle = '#fff'; g.font = '800 70px "Plus Jakarta Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 84); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; return t; };
    const SIGN = { E: ['EAST LOT', '#2f6db5'], S: ['SOUTH LOT', '#2e8b57'], W: ['WEST LOT', '#d97706'], N: ['NORTH LOT', '#8a3b8f'] };
    const mid = { E: 0, S: Math.PI / 2, W: Math.PI, N: 1.5 * Math.PI };
    for (const k in SIGN) {
      shapePoint(mid[k], PARK_IN + 8, q0); shapePoint(mid[k], PARK_IN + 9, q1); let nx = q1[0] - q0[0], nz = q1[1] - q0[1]; const L = Math.hypot(nx, nz); nx /= L; nz /= L;
      const g = new THREE.Group(); g.position.set(q0[0], Y_LOT, q0[1]); g.rotation.y = Math.atan2(nx, nz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 7.5, 8), std(0x3a3f4a, { roughness: 0.5, metalness: 0.4 })); pole.position.y = 3.75; pole.castShadow = true; g.add(pole);
      const tex = signCanvas(SIGN[k][0], SIGN[k][1]);
      for (const side of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.9), new THREE.MeshBasicMaterial({ map: tex })); pl.position.set(0, 7.4, side * 0.12); pl.rotation.y = side > 0 ? 0 : Math.PI; g.add(pl); }
      scene.add(g);
    }
    // parked cars: slots = the same bays as the painted lines (radial, 2.6 m apart, rows as above), 50 picked at random
    const lotAt = (x, z, d) => { const ax = Math.abs(x) / (A0 + d), az = Math.abs(z) / (B0 + d); return az >= ax ? (z > 0 ? 'S' : 'N') : (x > 0 ? 'E' : 'W'); };   // same rule as lotOf (defined later in the file)
    const WROW = [3, 3, 2, 1], slots = [], qs = [0, 0];                    // same bay grid as the painted lines; WROW = how much more likely a row is to hold a car (rows near the stadium fill first)
    BAY_ROWS.forEach((dd, ri) => { for (let i = 0; i < BAY_EDGES.length - 1; i++) {
        const th = (BAY_EDGES[i] + BAY_EDGES[i + 1]) / 2; shapePoint(th, dd, qs); const x = qs[0], z = qs[1];
        if (spurSamples.some(p => Math.hypot(p.x - x, p.z - z) < 11)) continue;
        const off = Math.abs(((th - Q) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2)); if (Math.min(off, Math.PI / 2 - off) < 0.04) continue;   // keep clear of the kerb islands
        slots.push({ x, z, yaw: radialYaw(th, dd), lot: lotAt(x, z, dd), w: WROW[ri] * (0.3 + rr()) }); } });
    const want = { E: 13, S: 13, W: 12, N: 12 }, cars = [];
    for (const k of ['E', 'S', 'W', 'N']) cars.push(...slots.filter(sl => sl.lot === k).sort((a, b) => b.w - a.w).slice(0, want[k]));
    const NC = cars.length, pal = [0xf2f2f0, 0x1a1c20, 0xb9bec6, 0xc23b22, 0x2f6db5, 0x6b7280, 0x2e5d3a, 0xe0a321, 0x7a1f2b, 0xdfe3e8].map(h => new THREE.Color(h));
    const carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.62, 4.3).translate(0, 0.55, 0), std(0xffffff, { roughness: 0.32, metalness: 0.35 }), NC);
    const carCab = new THREE.InstancedMesh(new THREE.BoxGeometry(1.55, 0.55, 2.3).translate(0, 1.12, -0.15), std(0x151a21, { roughness: 0.15, metalness: 0.4 }), NC);
    const carWheel = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 12).rotateZ(Math.PI / 2), std(0x0c0c0e, { roughness: 0.9 }), NC * 4);
    const cd = new THREE.Object3D(), wm = new THREE.Matrix4();
    cars.forEach((c, i) => {
      cd.position.set(c.x, Y_LOT, c.z); cd.rotation.set(0, c.yaw + (rr() < 0.5 ? 0 : Math.PI) + (rr() - 0.5) * 0.05, 0); cd.updateMatrix();
      carBody.setMatrixAt(i, cd.matrix); carCab.setMatrixAt(i, cd.matrix); carBody.setColorAt(i, pal[(rr() * pal.length) | 0]);
      let w = 0; for (const ox of [-0.9, 0.9]) for (const oz of [-1.35, 1.35]) { wm.copy(cd.matrix).multiply(new THREE.Matrix4().makeTranslation(ox, 0.14, oz)); carWheel.setMatrixAt(i * 4 + w++, wm); }
    });
    for (const m of [carBody, carCab, carWheel]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
    carBody.instanceColor.needsUpdate = true;
    window.__parkedCars = NC;                                              // for the test console
  }
  mergeStatic(scene, mergeList);                                        // 28 yellow lines -> 1, 8 hatch strips -> 1, 4 fence rails -> 1 (all built in world coordinates, so the merge is bit-exact). Rotated props (sign poles, gate pillars, kerbs) stay separate: see core/merge.js
  return { parkingMesh };
}
