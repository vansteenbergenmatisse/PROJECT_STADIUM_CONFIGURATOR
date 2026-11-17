// @ts-check
/**
 * @fileoverview state/state: the ONE shared mutable state object of the page (navigation, selection, hover, checkout, camera flight, head turn).
 *
 * WHY: these values used to be module-level `let`s of the single big script, read and written by the selection, UI, picking, head-turn, loop and keyboard code.
 * ES module imports are read-only bindings, so any value that more than one module reassigns has to live as a property of one shared object.
 * BUILDS: nothing in the scene; it only creates the plain object below (and the look.base Vector3).
 * DEPENDS ON: three (Vector3 only).
 * USED BY: src/interaction/*, src/ui/*, src/core/loop.js, src/world/markers.js.
 * LIFECYCLE: created once at import, never replaced. `nav` and `look` are objects that are mutated in place (modules alias them: const nav = state.nav), so window.__stadium.nav stays the same object forever.
 *            The other fields are reassigned (state.selKey = ...). Nothing here is persisted or sent anywhere.
 * UNITS / CONVENTIONS: seat ids are instance ids of the seat InstancedMesh (-1 = none); keys are "tier:section" strings (zero-based); suite index 0..55; lot is 'E' | 'S' | 'W' | 'N'.
 * NOT HERE: the typed seat tables (world/seats.js), the colours COL (world/seats.js, extended in interaction/seat-paint.js) and DOM references.
 */
import * as THREE from 'three';

export const state = {
  /** Navigation level: overview | section | seat | suite | lot (the object is mutated in place). */
  nav: { level: 'overview' },
  /** Demo checkout state (null = pop-up closed): {kind, ids, qty, step, extras, promo, name, email, card, exp, cvv, err, order, thumb, when, ...}. */
  buy: null,
  /** Hover: seat instance id (only an AVAILABLE seat inside the selected block), "tier:section" key of the hovered block, hovered suite index, hovered lot letter. */
  hoverId: -1, hoverKey: null, hoverSuite: -1, hoverLot: null,
  /** Selection: block key, seat id, suite index, lot letter. */
  selKey: null, selSeat: -1, selSuite: -1, selLot: null,
  /** dimOthers: a section is selected, so the other blocks are darkened; selTi / selSe = tier and section index of the selected block. */
  dimOthers: false, selTi: -1, selSe: -1,
  /** Camera flight in progress ({t0, ms, ease, p0, a0, p1, a1}) or null. Written by flyTo, advanced and cleared by the render loop. */
  tween: null,
  /** The loop copies the next finished frame into the cart picture while this is true. */
  thumbWanted: false,
  /** True while the roof is drawn at 40% opacity (a section is selected). */
  roofFaded: false,
  /** Head turn at the seat level: yaw / pitch offsets (radians), the base view direction, whether base was captured, the drag start [x, y]. Mutated in place. */
  look: { yaw: 0, pitch: 0, base: new THREE.Vector3(0, 0, -1), ready: false, drag: null },
};
