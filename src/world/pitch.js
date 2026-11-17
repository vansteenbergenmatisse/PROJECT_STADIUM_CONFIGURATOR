// @ts-check
/**
 * @fileoverview world/pitch: the pitch with its markings, the goals and the pitch surround.
 *
 * WHY: everything inside the touchlines is static and not pickable; keeping it in one builder keeps the draw-order of the RNG (stripes first, then the bump map).
 * BUILDS: floor, pitch plane (24 px per metre canvas), 2 goals, LED board strip (+ dark back), 4 corner flags, 2 dugouts, technical-area lines, fourth official desk, 2 assistant referees, 34 stewards, 12 photographers, 4 TV tripods, 3 spare balls.
 * DEPENDS ON: three, BufferGeometryUtils, config/constants.js, data/bowl-math.js, core/geometry.js (paintGeo), core/materials.js.
 * USED BY: src/main.js.
 * LIFECYCLE: static; the pitch plane receives shadows, props cast them; frozen by prepareStaticScene in src/core/loop.js.
 * UNITS / CONVENTIONS: metres, y up, angles in radians; plan coordinates are (x, z) with the pitch centre at the origin. pitch 105 x 68 m, board rounded rectangle 56.5 x 37.5 m (corner radius 10 m).
 * NOT HERE: the match figures (src/sim/match.js).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, PITCH_L, PITCH_W } from '../config/constants.js';
import { shapePoint } from '../data/bowl-math.js';
import { paintGeo } from '../core/geometry.js';
import { std, dbl } from '../core/materials.js';

/**
 * Build the bowl floor, the striped pitch, the goals and the whole pitch surround (LED boards, flags, dugouts, officials, stewards, photographers, tripods, spare balls).
 * Side effects: consumes the shared rand (pitch stripes, blades, wear, bump texture) and adds many objects to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, rand, canvasTex, MAX_ANISO.
 * @returns {void} nothing; everything is added to ctx.scene.
 */
export function buildPitch(ctx) {
  const { scene, rand, canvasTex, MAX_ANISO } = ctx;
  // inner bowl floor + pitch
  {
    const pts = [], p = [0, 0];
    for (let j = 0; j < 360; j++) { shapePoint(j / 360 * TAU, 0, p); pts.push(new THREE.Vector2(p[0], p[1])); }
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), dbl(0x2d5a2a, { roughness: 0.95 }));
    floor.rotation.x = Math.PI / 2; floor.position.y = 0.1; floor.receiveShadow = true; scene.add(floor);

    const S = 24, W = PITCH_L * S, H = PITCH_W * S;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const stripes = 21;                                                     // mowing stripes, alternating light/dark with soft tonal drift
    for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? '#2c6a2a' : '#347631'; g.fillRect(i * W / stripes, 0, W / stripes + 1, H); }
    for (let i = 0; i < 90000; i++) { const dk = rand() < 0.5; g.fillStyle = dk ? `rgba(10,45,12,${0.10 + rand() * 0.10})` : `rgba(120,170,70,${0.06 + rand() * 0.08})`; g.fillRect(rand() * W, rand() * H, 1.5, 4 + rand() * 7); }   // blade-scale variation
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(20,60,20,${0.03 + rand() * 0.04})`; g.beginPath(); g.ellipse(rand() * W, rand() * H, 40 + rand() * 120, 20 + rand() * 60, rand() * 3, 0, TAU); g.fill(); }  // wear patches
    g.strokeStyle = 'rgba(244,244,238,.96)'; g.lineWidth = 4.2; g.fillStyle = 'rgba(244,244,238,.96)';
    const R = (x, y, w, h) => g.strokeRect(x * S, y * S, w * S, h * S);
    R(0.1, 0.1, PITCH_L - 0.2, PITCH_W - 0.2);
    g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
    g.beginPath(); g.arc(W / 2, H / 2, 9.15 * S, 0, TAU); g.stroke();
    g.beginPath(); g.arc(W / 2, H / 2, 0.3 * S, 0, TAU); g.fill();
    for (const side of [0, 1]) {
      const sx = side ? PITCH_L : 0, dir = side ? -1 : 1;
      R(side ? PITCH_L - 16.5 : 0, (PITCH_W - 40.32) / 2, 16.5, 40.32);
      R(side ? PITCH_L - 5.5 : 0, (PITCH_W - 18.32) / 2, 5.5, 18.32);
      g.beginPath(); g.arc((sx + dir * 11) * S, H / 2, 0.3 * S, 0, TAU); g.fill();
      g.beginPath(); g.arc((sx + dir * 11) * S, H / 2, 9.15 * S, side ? Math.PI - 0.93 : -0.93, side ? Math.PI + 0.93 : 0.93); g.stroke();
    }
    // corner arcs: quarter circles of r = 1 m at the four pitch corners
    for (const [cx, cy, a0] of [[0, 0, 0], [PITCH_L, 0, Math.PI / 2], [PITCH_L, PITCH_W, Math.PI], [0, PITCH_W, Math.PI * 1.5]]) { g.beginPath(); g.arc(cx * S, cy * S, 1 * S, a0, a0 + Math.PI / 2); g.stroke(); }
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = MAX_ANISO;
    const bump = canvasTex(256, 256, (gg, w, h) => { gg.fillStyle = '#808080'; gg.fillRect(0, 0, w, h); for (let i = 0; i < 20000; i++) { const v = 60 + rand() * 140; gg.fillStyle = `rgb(${v},${v},${v})`; gg.fillRect(rand() * w, rand() * h, 1, 2 + rand() * 2); } }, { repeat: [36, 24], srgb: false });
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PITCH_L, PITCH_W), new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.6, roughness: 0.88 }));
    pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.2; pitch.receiveShadow = true; scene.add(pitch);

    // goals: posts, bar, net (translucent back + sides)
    const gm = std(0xffffff, { roughness: 0.35 }), netM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    for (const sx of [-1, 1]) {
      const grp = new THREE.Group();
      const post = (x, z, h) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 8), gm); m.position.set(x, h / 2, z); grp.add(m); };
      post(0, -3.66, 2.44); post(0, 3.66, 2.44);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.32, 8), gm); bar.rotation.x = Math.PI / 2; bar.position.set(0, 2.44, 0); grp.add(bar);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(7.32, 2.44), netM); back.rotation.y = Math.PI / 2; back.position.set(sx * 2.0, 1.22, 0); grp.add(back);
      for (const z of [-3.66, 3.66]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.44), netM); side.position.set(sx * 1.0, 1.22, z); grp.add(side); }
      grp.position.set(sx * PITCH_L / 2, 0.2, 0); grp.traverse(o => { o.castShadow = o.material === gm; }); scene.add(grp);
    }

    /* ---- pitch surround: LED advertising boards, corner flags and two dugouts. All static (frozen like the rest of the scene), not pickable (not in PICK).
       Boards: ONE strip along a rounded rectangle (half extents BX x BZ, corner radius BR) so it stays inside the bowl at the corners. The sponsor names are
       made up on purpose (no real brands); the texture holds 6 panels of 6 m and repeats along the strip. Emissive map = they glow like LED boards. */
    {
      const BX = 56.5, BZ = 37.5, BR = 10, BY = 0.2, BH = 0.95, PANEL_M = 6, SPONSORS = [
        ['NORTHWIND', '#0b3d91', '#ffffff'], ['AURELIA AIR', '#f2c300', '#111111'], ['KITE BANK', '#0f7b4f', '#ffffff'],
        ['ZENITH', '#111111', '#ffd23f'], ['FORGE FORWARD', '#0E1220', '#ffffff'], ['VOLTA ENERGY', '#d93a31', '#ffffff']];
      const c = document.createElement('canvas'); c.width = 3072; c.height = 128; const g = c.getContext('2d'); const pw = c.width / SPONSORS.length;
      SPONSORS.forEach(([name, bg, fg], i) => {
        const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, bg); gr.addColorStop(1, '#000000'); g.fillStyle = gr; g.fillRect(i * pw, 0, pw, 128);
        g.fillStyle = bg; g.fillRect(i * pw, 0, pw, 112);
        g.fillStyle = fg; g.font = '800 64px "Plus Jakarta Sans", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, i * pw + pw / 2, 58);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(i * pw, 0, 3, 128);                                   // thin gap between two LED panels
      });
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = MAX_ANISO;
      const pos = [], uv = [], idx = [];
      const centres = [[BX - BR, BZ - BR], [-(BX - BR), BZ - BR], [-(BX - BR), -(BZ - BR)], [BX - BR, -(BZ - BR)]];
      const path = []; centres.forEach(([cx, cz], k) => { for (let s = 0; s <= 12; s++) { const a = (k + s / 12) * Math.PI / 2; path.push([cx + BR * Math.cos(a), cz + BR * Math.sin(a)]); } });
      path.push(path[0]);
      let dist = 0;
      path.forEach(([x, z], i) => {
        if (i) dist += Math.hypot(x - path[i - 1][0], z - path[i - 1][1]);
        pos.push(x, BY, z, x, BY + BH, z); const u = dist / (PANEL_M * SPONSORS.length); uv.push(u, 0, u, 1);
        if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      });
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bg.setIndex(idx); bg.computeVertexNormals();
      const boards = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.4, side: THREE.FrontSide }));
      boards.castShadow = true; scene.add(boards);
      const boardsBack = new THREE.Mesh(bg, std(0x1a1d24, { roughness: 0.7, side: THREE.BackSide })); scene.add(boardsBack);   // the side facing the stands is plain dark (text never mirrored)

      // corner flags: white pole, small yellow pennant pointing at the pitch centre
      const poleM = std(0xf4f4ee, { roughness: 0.5 }), flagM = dbl(0xf2c300, { roughness: 0.7 }), tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0.5, 0.12); tri.lineTo(0, 0.3);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.6, 6), poleM); pole.position.set(sx * PITCH_L / 2, 0.2 + 0.8, sz * PITCH_W / 2); pole.castShadow = true; scene.add(pole);
        const fl = new THREE.Mesh(new THREE.ShapeGeometry(tri), flagM); fl.position.set(sx * PITCH_L / 2, 0.2 + 1.3, sz * PITCH_W / 2); fl.rotation.y = Math.atan2(sz, -sx); fl.castShadow = true; scene.add(fl);
      }

      // dugouts: back wall, translucent sloped roof, team-coloured bench; open side faces the pitch (-z). One each side of the halfway line on the +z touchline, 0.9 m from the line (in front of the ad boards).
      const wallM = std(0x9aa3ad, { roughness: 0.55 }), roofM = new THREE.MeshStandardMaterial({ color: 0xbfd6e6, roughness: 0.15, transparent: true, opacity: 0.35 });
      const dugout = (x, col) => {
        const d = new THREE.Group(); const add = (geo, m, px, py, pz, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.x = rx; o.castShadow = true; d.add(o); return o; };
        add(new THREE.BoxGeometry(8, 1.1, 0.08), wallM, 0, 0.55, 0.75);                                // low on purpose: front-row seats behind it still see the pitch
        for (const sxx of [-4, 4]) add(new THREE.BoxGeometry(0.08, 1.1, 1.5), wallM, sxx, 0.55, 0);
        add(new THREE.BoxGeometry(8.4, 0.05, 1.9), roofM, 0, 1.2, 0.05, 0.1);
        add(new THREE.BoxGeometry(7, 0.1, 0.45), std(col, { roughness: 0.6 }), 0, 0.4, 0.45);
        add(new THREE.BoxGeometry(7, 0.4, 0.06), std(col, { roughness: 0.6 }), 0, 0.6, 0.66);
        d.position.set(x, 0.2, 35.9); scene.add(d);
      };
      dugout(-9, 0xa50044); dugout(9, 0xfde100);                                                        // garnet (Barcelona side), yellow (Dortmund side)

      /* ---- pitch life (batch 24). From a quick web search: the technical area is a marked zone beside the pitch (about 1 m either side of the bench and up to 1 m from the touchline) and the fourth
         official stands / sits between the two benches with a desk. The rest (assistant referees with flags, stewards facing the crowd, photographers behind the goals, TV tripods, spare balls)
         is common matchday practice, added from general knowledge, not from a source. All static (frozen). Not pickable. */
      const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
      const lineM = new THREE.MeshBasicMaterial({ color: 0xf4f4ee }), flat = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineM); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.215, z); scene.add(m); };
      for (const cx of [-9, 9]) { flat(cx, 34.45, 10.2, 0.12); flat(cx - 5.1, 35.5, 0.12, 2.1); flat(cx + 5.1, 35.5, 0.12, 2.1); }          // technical-area lines
      const skinM = std(0xe0b090, { roughness: 0.7 }), kit = new Map(), kitM = c => { if (!kit.has(c)) kit.set(c, std(c, { roughness: 0.8 })); return kit.get(c); };
      const bodyG = new THREE.CapsuleGeometry(0.26, 0.9, 3, 8).translate(0, 0.85, 0), headG = new THREE.SphereGeometry(0.16, 8, 6).translate(0, 1.72, 0);
      const person = (x, z, yaw, col, sc = 1) => { const g = new THREE.Group(); g.add(mk(bodyG, kitM(col), 0, 0, 0), mk(headG, skinM, 0, 0, 0)); g.position.set(x, 0.2, z); g.rotation.y = yaw; g.scale.setScalar(sc); scene.add(g); return g; };
      // fourth official: desk + chair-less standing official + electronic substitution board
      { const desk = mk(new THREE.BoxGeometry(2.4, 0.95, 0.7), std(0x2a2e39, { roughness: 0.5 }), 0, 0.675, 35.6); scene.add(desk);
        person(0, 36.3, Math.PI, 0x15181f);
        const bt = document.createElement('canvas'); bt.width = 128; bt.height = 192; const bg2 = bt.getContext('2d'); bg2.fillStyle = '#0a0a0a'; bg2.fillRect(0, 0, 128, 192); bg2.fillStyle = '#ffb000'; bg2.font = '800 54px "Plus Jakarta Sans", sans-serif'; bg2.textAlign = 'center'; bg2.fillText('7', 64, 70); bg2.fillStyle = '#7CFC00'; bg2.fillText('11', 64, 150);
        const bTex = new THREE.CanvasTexture(bt); bTex.colorSpace = THREE.SRGBColorSpace;
        const board = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshBasicMaterial({ map: bTex })); board.position.set(0, 1.9, 35.2); scene.add(board);
        scene.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), kitM(0x555a66), 0, 1.35, 35.2)); }
      // assistant referees on the touchline, flags up
      for (const [x, z, yaw] of [[-28, 34.6, Math.PI], [24, -34.6, 0]]) { person(x, z, yaw, 0x15181f); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.35), dbl(0xf2c300)); f.position.set(x + 0.45, 2.05, z); scene.add(f); scene.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 5), kitM(0xf4f4ee), x + 0.25, 1.65, z)); }
      // stewards in hi-vis behind the boards, facing the stands (instanced)
      { const n = 34, sb = new THREE.InstancedMesh(bodyG, std(0xd9e021, { roughness: 0.8 }), n), sh = new THREE.InstancedMesh(headG, skinM, n), d2 = new THREE.Object3D(); let tot = 0; const seg = []; for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push(l); tot += l; }
        for (let k = 0; k < n; k++) { let t = (k + 0.5) / n * tot, i = 0; while (i < seg.length - 1 && t > seg[i]) { t -= seg[i]; i++; } const f = t / seg[i], x = path[i][0] + (path[i + 1][0] - path[i][0]) * f, z = path[i][1] + (path[i + 1][1] - path[i][1]) * f, l = Math.hypot(x / BX, z / BZ) || 1, ox = x / BX / l, oz = z / BZ / l;
          d2.position.set(x + ox * 0.9, 0.2, z + oz * 0.9); d2.rotation.set(0, Math.atan2(ox, oz), 0); d2.updateMatrix(); sb.setMatrixAt(k, d2.matrix); sh.setMatrixAt(k, d2.matrix); }
        sb.castShadow = true; scene.add(sb, sh); }
      // photographers crouching behind each goal, long lenses pointing at the pitch (instanced bodies + heads + cameras)
      { const spots = []; for (const sx of [-1, 1]) for (const z of [-24, -18, -12, 12, 18, 24]) spots.push([sx * 55.7, z, sx]);
        const pb = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.26, 0.45, 3, 8).translate(0, 0.5, 0), std(0x2b3a55, { roughness: 0.8 }), spots.length), ph = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6).translate(0, 1.15, 0), skinM, spots.length),
          pc = new THREE.InstancedMesh(mergeGeometries([new THREE.BoxGeometry(0.5, 0.22, 0.28).translate(-0.3, 1.0, 0), new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8).rotateZ(Math.PI / 2).translate(-0.75, 1.0, 0)].map(g => paintGeo(g.toNonIndexed(), 0.1, 0.1, 0.12))), std(0xffffff, { vertexColors: true, roughness: 0.4 }), spots.length), d3 = new THREE.Object3D();
        spots.forEach(([x, z, sx], k) => { d3.position.set(x, 0.2, z); d3.rotation.set(0, sx > 0 ? 0 : Math.PI, 0); d3.updateMatrix(); pb.setMatrixAt(k, d3.matrix); ph.setMatrixAt(k, d3.matrix); pc.setMatrixAt(k, d3.matrix); });
        scene.add(pb, ph, pc); }
      // four TV camera tripods behind the goals (one merged geometry, instanced), aiming at the centre spot
      { const legs = [0, 1, 2].map(i => { const a = i / 3 * TAU; return new THREE.CylinderGeometry(0.03, 0.045, 1.7, 5).rotateZ(0.28).rotateY(a).translate(Math.cos(a) * 0.3, 0.85, Math.sin(a) * 0.3); });
        const parts = [...legs.map(g => paintGeo(g.toNonIndexed(), 0.25, 0.26, 0.3)), paintGeo(new THREE.BoxGeometry(0.4, 0.34, 0.7).translate(0, 1.9, 0).toNonIndexed(), 0.08, 0.08, 0.1), paintGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.55, 10).rotateX(Math.PI / 2).translate(0, 1.9, 0.6).toNonIndexed(), 0.05, 0.05, 0.06)];
        const tm = new THREE.InstancedMesh(mergeGeometries(parts), std(0xffffff, { vertexColors: true, roughness: 0.5, metalness: 0.2 }), 4), d4 = new THREE.Object3D();
        [[-63, -12], [-63, 12], [63, -12], [63, 12]].forEach(([x, z], k) => { d4.position.set(x, 0.2, z); d4.rotation.set(0, Math.atan2(-x, -z), 0); d4.updateMatrix(); tm.setMatrixAt(k, d4.matrix); }); tm.castShadow = true; scene.add(tm); }
      // spare balls on the grass beside the fourth official
      for (const [x, z] of [[2.2, 35.0], [-2.6, 34.8], [4.2, 34.7]]) scene.add(mk(new THREE.SphereGeometry(0.11, 10, 8), std(0xffffff, { roughness: 0.5 }), x, 0.31, z));
    }

    // corner arcs (white quarter circles, r = 1 m) are drawn into the pitch texture above, see "corner arcs" there
  }
}
