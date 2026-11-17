// @ts-check
/**
 * @fileoverview interaction/camera-rig: createCameraRig: the locked camera: the preset views, flyTo(), and the head turn at the seat level.
 *
 * WHY: CLAUDE.md hard requirement: the camera has NO orbit / pan / zoom. It moves only through flyTo() (a click on a block, seat, skybox or one of the view buttons) and, at the seat level,
 *      the user may turn the head (drag / arrow keys): the position never changes then, only the look direction. flyTo only stores a tween in state.tween; the render loop advances it.
 * BUILDS: nothing in the scene.
 * DEPENDS ON: three, src/state/state.js.
 * USED BY: src/main.js (creates it), src/interaction/selection.js (flyTo, presets), src/interaction/input.js (turnHead), src/core/loop.js (updateLook, start view).
 * LIFECYCLE: created once after the camera exists. `setView` (the active view button) is injected by main so this module does not import the UI; flyTo clears it because any flight other than a view button
 *            is not "a view the user asked for". No listeners here (input.js registers the pointer / key handlers that call turnHead).
 * UNITS / CONVENTIONS: metres, y up; positions are [x, y, z] arrays; durations in milliseconds; head angles in radians (yaw about +y, pitch about the camera's right axis).
 * NOT HERE: which flight a click starts (selection.js), the loop that advances the tween (core/loop.js), the buttons (ui/view-buttons.js).
 */
import * as THREE from 'three';
import { state } from '../state/state.js';

/** Start frame: a true top-down view. */
export const OVERVIEW = { pos: [0, 432, 0.5], tgt: [0, 0, 0] };
/** End of the descent (the long stand). */
export const LONG_STAND = { pos: [0, 62, 28], tgt: [0, 14, -70] };
/** Oblique drone angle like the Soccer City photo. */
export const AERIAL = { pos: [0, 340, 300], tgt: [0, 6, 0] };
/** Cubic in-out: used by the 10 s descent only. */
export const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** Quintic in-out: slow start, long glide, soft landing (selection flights). */
export const easePremium = t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

const YAW_MAX = Math.PI * 0.62, PITCH_MIN = -0.6, PITCH_MAX = 0.4, UP = new THREE.Vector3(0, 1, 0),
      _v = new THREE.Vector3(), _right = new THREE.Vector3();   // module-level scratch vectors for updateLook (no allocation per frame)

/**
 * Create the camera rig.
 * @param {{camera: any, controls: any}} ctx - shared context (core/ctx.js): the camera and its look-at holder.
 * @param {{setView: (name: string|null) => void}} deps - marks a view button active (null = none); provided by ui/view-buttons.js.
 * @returns {{flyTo: (pos: number[], tgt: number[], ms?: number|null, easing?: (t: number) => number) => void, updateLook: () => void, turnHead: (dyaw: number, dpitch: number) => void}} rig functions.
 */
export function createCameraRig({ camera, controls }, { setView }) {
  /* ---- flyTo: selection flights ("premium" feel): duration grows with the distance travelled (2.8 s .. 5.2 s) unless a fixed ms is passed (the descent passes 10000). ---- */
  function flyTo(pos, tgt, ms, easing = easePremium) {
    setView(null); state.look.ready = false;
    const p1 = new THREE.Vector3(...pos);
    if (ms == null) ms = Math.min(5200, Math.max(2800, 2600 + camera.position.distanceTo(p1) * 9));
    state.tween = { t0: performance.now(), ms, ease: easing, p0: camera.position.clone(), a0: controls.target.clone(), p1, a1: new THREE.Vector3(...tgt) };
  }
  /* ---- head turn: while a seat is selected you can look left and right (drag, or the arrow keys) to follow the whole pitch. The camera does not move, only where it looks. ---- */
  const look = state.look;
  /** Per-frame: while a seat is selected and no flight runs, aim the controls target from the base direction plus the yaw / pitch offsets. */
  function updateLook() {
    const nav = state.nav;
    if (nav.level !== 'seat') { look.ready = false; return; }
    if (state.tween) return;
    if (!look.ready) { look.base.copy(controls.target).sub(camera.position).normalize(); look.yaw = 0; look.pitch = 0; look.ready = true; }
    const v = _v.copy(look.base).applyAxisAngle(UP, look.yaw), right = _right.crossVectors(v, UP).normalize();
    v.applyAxisAngle(right, look.pitch); controls.target.copy(camera.position).addScaledVector(v, 100);
  }
  /** Add yaw / pitch offsets (radians) to the head, clamped to +-0.62 pi yaw and -0.6 .. 0.4 rad pitch. */
  function turnHead(dyaw, dpitch) { look.yaw = Math.max(-YAW_MAX, Math.min(YAW_MAX, look.yaw + dyaw)); look.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, look.pitch + dpitch)); }
  return { flyTo, updateLook, turnHead };
}
