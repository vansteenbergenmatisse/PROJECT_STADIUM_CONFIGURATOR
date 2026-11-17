// @ts-check
/**
 * @fileoverview world/sky: the visible sky: Sky-like gradient dome, procedural cloud dome and sun glow sprite.
 *
 * WHY: the sky follows the camera every frame and is the only animated scenery besides fans and the match, so it has its own update function.
 * BUILDS: 1 Group (skyDome, cloudDome, sunGlow). They are userData.dynamic so the freeze pass in src/core/loop.js skips them.
 * DEPENDS ON: three, core/lighting.js (SUN_POS).
 * USED BY: src/main.js (calls updateSky(tSec) in the loop).
 * LIFECYCLE: built once; updateSky(tSec) re-centres the group on the camera and advances the cloud time.
 * UNITS / CONVENTIONS: dome radius 2950 m, cloud dome 2900 m (both below the camera far plane of 3200 m).
 * NOT HERE: the baked reflection sky (core/scene.js).
 */
import * as THREE from 'three';
import { SUN_POS } from '../core/lighting.js';

/**
 * Build the visible sky: gradient dome with sun disc, drifting clouds, sun glow sprite.
 * Side effects: adds 1 Group (3 children, all userData.dynamic) to ctx.scene.
 * @param {object} ctx - shared context (core/ctx.js): scene, camera.
 * @returns {object} { updateSky }
 */
export function buildSky(ctx) {
  const { scene, camera } = ctx;
  /* ---- visible sky: Sky shader dome + drifting procedural clouds + sun glow. All three are re-centred on the camera every frame (userData.dynamic), radius < camera far (3200). */
  const skyGroup = new THREE.Group(); skyGroup.userData.dynamic = true;
  // visible sky: clear blue gradient (deep blue overhead, pale blue at the horizon) with a sun disc and glow. Own shader because the stock Sky shader washes out under ACES.
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(2950, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN_POS.clone().normalize() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 uSun;
    void main(){
      vec3 d = normalize(vDir); float h = clamp(d.y, 0.0, 1.0);
      vec3 col = mix(vec3(0.50, 0.70, 0.92), vec3(0.035, 0.22, 0.78), pow(h, 0.5));
      float s = max(dot(d, normalize(uSun)), 0.0);
      col += vec3(1.0, 0.82, 0.55) * (pow(s, 6.0) * 0.07 + pow(s, 64.0) * 0.22);                 // warm glow round the sun
      col = mix(col, vec3(6.0, 5.6, 4.8), smoothstep(0.99975, 0.99992, s));                      // the sun disc
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  skyDome.renderOrder = -3; skyDome.frustumCulled = false; skyDome.userData.dynamic = true;
  const cloudMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: SUN_POS.clone().normalize() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform float uTime; uniform vec3 uSun;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.7); a *= 0.5; } return v; }
    void main(){
      vec3 d = normalize(vDir); float h = d.y; if (h < 0.015) discard;
      vec2 uv = d.xz / (h + 0.18) * 1.1 + vec2(uTime * 0.012, uTime * 0.004);
      float n = fbm(uv), c = smoothstep(0.42, 0.62, n), fade = smoothstep(0.015, 0.2, h);
      float lit = clamp(dot(d, normalize(uSun)) * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(vec3(0.82, 0.88, 0.98), vec3(1.6, 1.58, 1.5), smoothstep(0.48, 0.82, n));
      col = mix(col, vec3(1.8, 1.65, 1.35), pow(lit, 3.0) * 0.5);
      gl_FragColor = vec4(col, c * fade * 0.95);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const cloudDome = new THREE.Mesh(new THREE.SphereGeometry(2900, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), cloudMat);
  cloudDome.renderOrder = -2; cloudDome.frustumCulled = false; cloudDome.userData.dynamic = true;
  const sunGlow = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.12, 'rgba(255,244,214,0.75)'); gr.addColorStop(0.4, 'rgba(255,224,170,0.22)'); gr.addColorStop(1, 'rgba(255,224,170,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    sp.material.opacity = 0.5; sp.scale.setScalar(380); sp.userData.dynamic = true; sp.renderOrder = -1; return sp;
  })();
  skyGroup.add(skyDome, cloudDome, sunGlow); scene.add(skyGroup);
  const SUN_DIR = SUN_POS.clone().normalize();
  function updateSky(tSec) { skyGroup.position.copy(camera.position); sunGlow.position.copy(SUN_DIR).multiplyScalar(2700); cloudMat.uniforms.uTime.value = tSec; }
  return { updateSky };
}
