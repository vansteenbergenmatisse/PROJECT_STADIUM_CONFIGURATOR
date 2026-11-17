/**
 * @fileoverview Scene fingerprint: proves that a code change did not alter the built picture.
 * WHY: the stadium is built from a seeded random sequence, so reordering or dropping one draw changes every tree and texture.
 *      A hash of the built scene catches that without comparing screenshots by eye.
 * HOW TO RUN: open the page, wait until the loading screen is gone, then paste the whole function below into the
 *      browser console (or pass it as the function of a devtools evaluate call). It waits for window.__stadium by itself.
 * WHAT IT HASHES: for every mesh / line / points object the world-space vertex positions, the first material colour and
 *      opacity, the world matrix and (for instanced meshes) the instance matrices and colours. The object hashes are
 *      combined with a commutative sum and xor, so the order of children does not matter, only the content.
 *      Instanced meshes whose matrices change within 1.5 s (the walking fans) are detected and left out of the hash.
 * EXPECTED VALUES: see tools/parity/README.md. A deliberate change (for example merged meshes) changes objs and
 *      stableSceneHash by design: then update the README with the reason.
 * NOT HERE: pixel comparison and interaction checks (see the README for the manual list).
 */
async () => {
  for (let i = 0; i < 200 && !window.__stadium; i++) await new Promise(r => setTimeout(r, 250));
  const S = window.__stadium;
  if (!S) return { error: 'no __stadium after 50 s' };
  const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
  const mix = (h, x) => { h ^= x >>> 0; h = Math.imul(h, 16777619) >>> 0; return h; };
  const hf = (h, v) => { f64[0] = Math.round(v * 1e3) / 1e3; h = mix(h, u32[0]); return mix(h, u32[1]); };
  const hArr = (a, stride = 1) => { let h = 2166136261; const n = a.length; for (let i = 0; i < n; i += stride) h = hf(h, a[i]); return mix(h, n); };
  const rawBits = (f32) => { const u = new Uint32Array(f32.buffer, f32.byteOffset, f32.length); let h = 2166136261; for (let i = 0; i < u.length; i++) h = mix(h, u[i]); return h; };
  const inst = []; S.scene.traverse(o => { if (o.isInstancedMesh) inst.push(o); });
  const snap = () => inst.map(o => hArr(o.instanceMatrix.array, 1));
  const a = snap(); await new Promise(r => setTimeout(r, 1500)); const b = snap();
  const animated = inst.map((o, i) => a[i] !== b[i] ? o.count : null).filter(Boolean);
  const objs = []; S.scene.traverse(o => { if (o.isMesh || o.isLine || o.isPoints) objs.push(o); });
  let sh = [0, 0], tris = 0;
  objs.forEach(o => {
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    let h = mix(2166136261, hArr(g.attributes.position.array));
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m) { h = mix(h, m.color ? m.color.getHex() : 0); h = hf(h, m.opacity ?? 1); }
    o.updateWorldMatrix(true, false); h = mix(h, hArr(o.matrixWorld.elements));
    if (o.isInstancedMesh) {
      const i = inst.indexOf(o);
      if (a[i] === b[i]) h = mix(h, a[i]);
      if (o.instanceColor) h = mix(h, hArr(o.instanceColor.array, 5));
    }
    sh = [(sh[0] + h) >>> 0, (sh[1] ^ h) >>> 0];
  });
  const t = S.tables, info = S.renderer.info;
  return {
    seatCount: S.seatCount, parkedCars: window.__parkedCars, objs: objs.length, tris, animatedInstanced: animated, stableSceneHash: sh,
    seatTier: hArr(t.seatTier), seatRow: hArr(t.seatRow), seatNumber: hArr(t.seatNumber), seatSection: hArr(t.seatSection),
    seatPosRawBits: rawBits(t.seatPos), seatPrice: hArr(S.seatPrice),
    render: { calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures },
  };
}
