// @ts-check
/**
 * @fileoverview sim/match: createMatch: the 11 v 11 demo match (22 figures and a ball) that runs while a single seat is selected.
 *
 * WHY: a self-contained visual simulation (no DOM, no state import) so it can be built, stepped and switched on or off through one small object (active, update, score, clock).
 *      It is a demo, not real match data: Barcelona (garnet shirt, blue shorts, attacks +x) v Dortmund (yellow shirt, black shorts, attacks -x), 4-4-2 each, plain rules.
 * BUILDS: 1 Group (userData.dynamic, hidden until active) holding 4 InstancedMeshes (22 bodies, 22 heads, 44 legs, 22 blob shadows) and 1 ball Mesh. Figures are drawn 1.25x life size so they read from the stands.
 * DEPENDS ON: three, config/constants.js (pitch size).
 * USED BY: src/main.js (builds it), src/ui/price-panel.js (switches `active` with the nav level), src/core/loop.js (update(dt)), src/ui/scoreboard-view.js (score, clock, active).
 * LIFECYCLE: built once at boot after the markers (scene order matters for the parity fingerprint); `active = true` starts a new match (score reset, random kick-off, clock restarts),
 *            `active = false` hides the group. update(dt) does nothing while inactive. Never disposed (the page never unmounts).
 * UNITS / CONVENTIONS: metres, y up, x along the pitch length, z across it; angles in radians; the clock is wall-clock seconds since `active` became true; dt is seconds (clamped to 0.05 per step).
 *                      Math.random() is used on purpose (player phase, decisions, kick-off side, goals), exactly as before: the match is NOT deterministic and is excluded from the scene hash.
 * NOT HERE: the scoreboard markup (src/ui/scoreboard-view.js) and its text formats (src/sim/scoreboard-model.js); the pitch, goals and surround (src/world/pitch.js).
 */
import * as THREE from 'three';
import { PITCH_L, PITCH_W } from '../config/constants.js';

/**
 * Build the match figures, ball and the small control object.
 * Side effects: adds one Group (hidden) to ctx.scene; draws from Math.random().
 * @param {{scene: any}} ctx - shared context (core/ctx.js); only the scene is used.
 * @returns {{active: boolean, update: (dt: number) => void, score: number[], clock: number, P: any[], ball: any}} the match handle (active is a getter / setter, score and clock are getters).
 */
export function createMatch({ scene }) {
  /* ---- 22 simple figures (instanced capsule body + head + two swinging legs + a blob shadow each) and a ball, 4-4-2 vs 4-4-2, plain rules:
     the carrier dribbles, then passes or shoots; the others hold shape and drift toward the ball; a goal restarts from the centre. */
  const HX = PITCH_L / 2, HZ = PITCH_W / 2, Y0 = 0.2, SC = 1.25;
  const group = new THREE.Group(); group.visible = false; group.userData.dynamic = true;
  const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.userData.dynamic = true; m.castShadow = false; m.receiveShadow = false; group.add(m); return m; };
  const bodies = mk(new THREE.CapsuleGeometry(0.27, 0.62, 4, 10).translate(0, 1.0, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 22);
  const heads = mk(new THREE.SphereGeometry(0.16, 12, 10).translate(0, 1.66, 0), new THREE.MeshStandardMaterial({ color: 0xe0b08c, roughness: 0.7 }), 22);
  const legGeo = new THREE.BoxGeometry(0.13, 0.7, 0.15).translate(0, -0.35, 0);
  const legs = mk(legGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), 44);
  const blobs = mk(new THREE.CircleGeometry(0.55, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }), 22);
  const ballM = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })); ballM.userData.dynamic = true; ballM.frustumCulled = false; group.add(ballM);
  scene.add(group);
  const TEAM_COL = [new THREE.Color(0xa50044), new THREE.Color(0xfde100)];            // team 0 = Barcelona (garnet shirt, blue shorts) attacks +x; team 1 = Dortmund (yellow shirt, black shorts) attacks -x. Colours only, no crests or names on the figures.
  const SHORT_COL = [new THREE.Color(0x004d98), new THREE.Color(0x111111)];
  const FORM = [[0.03, 0], [0.22, -0.72], [0.22, -0.25], [0.22, 0.25], [0.22, 0.72], [0.42, -0.75], [0.42, -0.25], [0.42, 0.25], [0.42, 0.75], [0.64, -0.25], [0.64, 0.25]];
  const P = [];                                                                      // players: {team, role, hx, hz, x, z, vx, vz, yaw, ph}
  for (let t = 0; t < 2; t++) FORM.forEach(([d, l], r) => {
    const dir = t === 0 ? 1 : -1, hx = -dir * HX + dir * d * 2 * HX * 0.5 * 1.0, hz = l * HZ * 0.82;
    P.push({ team: t, role: r, hx: -dir * HX + dir * d * HX * 1.9, hz, x: 0, z: 0, vx: 0, vz: 0, yaw: dir > 0 ? Math.PI / 2 : -Math.PI / 2, ph: Math.random() * 6 });
  });
  P.forEach((p, i) => { bodies.setColorAt(i, TEAM_COL[p.team]); legs.setColorAt(i * 2, SHORT_COL[p.team]); legs.setColorAt(i * 2 + 1, SHORT_COL[p.team]); });
  const ball = { x: 0, z: 0, y: 0.3, owner: 0, fx: 0, fz: 0, tx: 0, tz: 0, t: 0, dur: 0, kind: 'carry', target: -1, hold: 1 };
  const score = [0, 0]; let active = false, tNow = 0, t0 = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function kickoff(team) {
    P.forEach(p => { p.x = p.hx * 0.9; p.z = p.hz; p.vx = p.vz = 0; });
    ball.owner = P.findIndex(p => p.team === team && p.role === 9); ball.kind = 'carry'; ball.hold = rnd(0.6, 1.2);
    const o = P[ball.owner]; o.x = 0; o.z = 0.6; ball.x = 0; ball.z = 0;
  }
  function fly(kind, tx, tz, speed, target) {
    ball.kind = kind; ball.fx = ball.x; ball.fz = ball.z; ball.tx = tx; ball.tz = tz; ball.t = 0; ball.target = target;
    ball.dur = Math.max(0.35, Math.hypot(tx - ball.x, tz - ball.z) / speed); ball.owner = -1;
  }
  function decide() {
    const o = P[ball.owner], dir = o.team === 0 ? 1 : -1, toGoal = HX - dir * o.x;
    if (toGoal < 26 && Math.random() < 0.55) { fly('shot', dir * HX, rnd(-3.2, 3.2), 26, -1); return; }
    const mates = P.map((p, i) => ({ p, i })).filter(m => m.p.team === o.team && m.i !== ball.owner && m.p.role !== 0);
    mates.sort((a, b) => (dir * (b.p.x - a.p.x)) * (Math.random() < 0.7 ? 1 : -1) + (Math.random() - 0.5) * 14);
    const m = mates[0]; fly('pass', m.p.x + dir * 4, m.p.z, 19, m.i);
  }
  function step(dt) {
    tNow += dt;
    // ball
    if (ball.kind === 'carry') {
      const o = P[ball.owner], dir = o.team === 0 ? 1 : -1;
      ball.x = o.x + Math.sin(o.yaw) * 0.7; ball.z = o.z + Math.cos(o.yaw) * 0.7; ball.y = 0.3;
      ball.hold -= dt; if (ball.hold <= 0) { decide(); }
      void dir;
    } else {
      ball.t += dt; const k = Math.min(1, ball.t / ball.dur);
      ball.x = ball.fx + (ball.tx - ball.fx) * k; ball.z = ball.fz + (ball.tz - ball.fz) * k;
      ball.y = 0.3 + (ball.kind === 'shot' ? 1.2 : 2.2) * 4 * k * (1 - k) * (ball.kind === 'shot' ? 0.8 : 0.5);
      if (k >= 1) {
        if (ball.kind === 'pass') { ball.owner = ball.target; ball.kind = 'carry'; ball.hold = rnd(0.7, 1.7); }
        else {                                                    // shot: goal if it ends between the posts, else the keeper picks it up
          const side = ball.tx > 0 ? 0 : 1;
          if (Math.abs(ball.tz) < 2.6 && Math.random() < 0.45) { score[side]++; kickoff(1 - side); }
          else { ball.owner = P.findIndex(p => p.team === 1 - side && p.role === 0); ball.kind = 'carry'; ball.hold = rnd(0.8, 1.4); }
        }
      }
    }
    // players
    const carrier = ball.kind === 'carry' ? ball.owner : -1;
    const bx = ball.x, bz = ball.z;
    let chaser0 = -1, chaser1 = -1, d0 = 1e9, d1 = 1e9;
    for (let i = 0; i < P.length; i++) { const p = P[i]; if (p.role === 0) continue; const d = Math.hypot(p.x - bx, p.z - bz); if (p.team === 0 && d < d0) { d0 = d; chaser0 = i; } if (p.team === 1 && d < d1) { d1 = d; chaser1 = i; } }
    for (let i = 0; i < P.length; i++) {       // plain loops instead of forEach: no closure allocated per frame
      const p = P[i];
      const dir = p.team === 0 ? 1 : -1, pull = p.role === 0 ? 0.04 : p.role < 5 ? 0.28 : p.role < 9 ? 0.45 : 0.6;
      let tx = p.hx + (bx - p.hx) * pull, tz = p.hz + (bz - p.hz) * pull * 0.8, sp = 5.2;
      if (i === carrier) { tx = HX * dir * 1.2; tz = p.z * 0.9; sp = 5.8; }                                   // dribble toward the opponent goal
      else if (ball.kind === 'pass' && i === ball.target) { tx = ball.tx; tz = ball.tz; sp = 7; }             // run onto the pass
      else if ((p.team === 0 ? chaser0 : chaser1) === i && carrier >= 0 && P[carrier].team !== p.team) { tx = bx; tz = bz; sp = 6.4; }   // nearest defender closes down
      if (p.role === 0) { tx = Math.max(-HX + 1.5, Math.min(HX - 1.5, tx)); tx = -dir * (HX - 2.5) * -1 * -1; tz = Math.max(-6, Math.min(6, bz * 0.18)); }   // keeper stays on the line
      const dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz) || 1, v = Math.min(sp, dist * 2.2);
      p.vx += (dx / dist * v - p.vx) * Math.min(1, dt * 6); p.vz += (dz / dist * v - p.vz) * Math.min(1, dt * 6);
      p.x = Math.max(-HX + 0.5, Math.min(HX - 0.5, p.x + p.vx * dt)); p.z = Math.max(-HZ + 0.5, Math.min(HZ - 0.5, p.z + p.vz * dt));
      const sp2 = Math.hypot(p.vx, p.vz); if (sp2 > 0.4) { const ty = Math.atan2(p.vx, p.vz); let dy = ty - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.yaw += dy * Math.min(1, dt * 8); }
      p.ph += dt * (2 + sp2 * 1.6);
    }
  }
  const o3 = new THREE.Object3D(), lg = new THREE.Object3D(), M = new THREE.Matrix4();
  const DYN = [bodies, heads, legs, blobs];                          // hoisted: the instanced meshes flagged after each write
  function writeMatrices() {
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const sp2 = Math.hypot(p.vx, p.vz), bob = Math.abs(Math.sin(p.ph)) * 0.05 * Math.min(1, sp2 / 4);
      o3.position.set(p.x, Y0 + bob, p.z); o3.rotation.set(Math.min(0.25, sp2 * 0.04), p.yaw, 0, 'YXZ'); o3.scale.setScalar(SC); o3.updateMatrix();
      bodies.setMatrixAt(i, o3.matrix); heads.setMatrixAt(i, o3.matrix);
      for (let s = 0; s < 2; s++) {                                // legs swing in opposite phase around the hip (y = 0.72 in figure space)
        lg.position.set(s ? 0.1 : -0.1, 0.72, 0); lg.rotation.set(Math.sin(p.ph + s * Math.PI) * Math.min(0.9, sp2 * 0.14), 0, 0); lg.updateMatrix();
        M.multiplyMatrices(o3.matrix, lg.matrix); legs.setMatrixAt(i * 2 + s, M);
      }
      o3.position.set(p.x, Y0 + 0.03, p.z); o3.rotation.set(0, 0, 0); o3.scale.setScalar(1); o3.updateMatrix(); blobs.setMatrixAt(i, o3.matrix);
    }
    for (let k = 0; k < 4; k++) DYN[k].instanceMatrix.needsUpdate = true;
    ballM.position.set(ball.x, Y0 + ball.y, ball.z);
  }
  kickoff(0); writeMatrices(); bodies.instanceColor.needsUpdate = true; legs.instanceColor.needsUpdate = true;
  return {
    set active(v) { v = !!v; if (v === active) return; active = v; group.visible = v; if (v) { t0 = performance.now(); score[0] = score[1] = 0; kickoff(Math.random() < 0.5 ? 0 : 1); } },
    get active() { return active; },
    update(dt) { if (!active) return; step(Math.min(dt, 0.05)); writeMatrices(); },
    get score() { return score.slice(); },
    get clock() { return active ? (performance.now() - t0) / 1000 : 0; },
    P, ball,
  };
}
