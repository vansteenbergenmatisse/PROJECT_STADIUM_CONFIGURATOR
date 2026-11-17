// @ts-check
/**
 * @fileoverview core/textures: makeCanvasTex: a factory for canvas-drawn repeating textures.
 *
 * WHY: every procedural texture (meadow, paving, mosaic, concrete, signs) is drawn on a 2D canvas the same way; the anisotropy limit comes from the renderer so it is passed in once.
 * BUILDS: nothing by itself; the returned function makes one CanvasTexture per call (owned by the caller).
 * DEPENDS ON: three.
 * USED BY: core/ctx.js (ctx.canvasTex).
 * LIFECYCLE: the draw callback runs immediately, so any rand() draws inside it happen at the call (this is what keeps the RNG order).
 * UNITS / CONVENTIONS: w, h in pixels; repeat = [u, v] tile counts.
 * NOT HERE: texture content (each builder).
 */
import * as THREE from 'three';

/**
 * @param {number} MAX_ANISO - anisotropy applied to every texture (from the renderer capabilities).
 * @returns {(w: number, h: number, draw: Function, opts?: object) => THREE.CanvasTexture} the canvasTex function.
 */
export const makeCanvasTex = MAX_ANISO => (w, h, draw, { repeat = [1, 1], srgb = true, nearest = false } = {}) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = MAX_ANISO;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (nearest) t.magFilter = THREE.NearestFilter; return t;
};
