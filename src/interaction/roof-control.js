// @ts-check
/**
 * @fileoverview interaction/roof-control: createRoofControl: the roof fade (40% while a section is selected) and the roof toggle (Roof button, R key).
 *
 * WHY: the roof ring would hide upper-tier and far-side seats, so while a SECTION is selected (not a single seat) it is drawn at 40% opacity (instant switch, brand: no fades).
 *      The original material settings are stored once per material (userData.roofBase) so the fade can be undone exactly. The shared `white` terrace material is part of the roof group, as before.
 * BUILDS: nothing; it edits the materials of the roof group and its visibility.
 * DEPENDS ON: src/state/state.js (roofFaded).
 * USED BY: src/main.js (creates it), src/ui/price-panel.js (setRoofFade on every selection render), src/interaction/input.js (R key), the Roof button (bound in main.js).
 * LIFECYCLE: created once after the roof. toggleRoof re-arms the baked shadow map (renderer.shadowMap.needsUpdate) because the roof ribs are shadow casters.
 * UNITS / CONVENTIONS: opacity factor 0.4 while faded; depthWrite is switched off while faded so seats behind the foil are not culled by it.
 * NOT HERE: the roof geometry (world/roof.js), the button element (ui/view-buttons.js, injected as setRoofPressed).
 */
import { state } from '../state/state.js';

/**
 * Create the roof controls.
 * @param {{roof: any, renderer: any}} src - the roof Group (world/roof.js) and the renderer (shadow map flag).
 * @param {{setRoofPressed: (pressed: boolean) => void}} ui - updates the Roof button state (ui/view-buttons.js).
 * @returns {{setRoofFade: (on: boolean) => void, toggleRoof: () => void}} the two controls.
 */
export function createRoofControl({ roof, renderer }, { setRoofPressed }) {
  /** Fade the roof to 40% opacity (on) or restore its original materials (off). No-op when the state does not change. */
  function setRoofFade(on) {
    if (on === state.roofFaded) return; state.roofFaded = on;
    roof.traverse(o => {
      if (!o.material) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (!m.userData.roofBase) m.userData.roofBase = { t: m.transparent, o: m.opacity, d: m.depthWrite };
        const b = m.userData.roofBase; m.transparent = on ? true : b.t; m.opacity = on ? b.o * 0.4 : b.o; m.depthWrite = on ? false : b.d; m.needsUpdate = true;
      }
    });
  }
  /** Show or hide the whole roof and refresh the baked shadow map (the ribs cast the roof shadow). */
  function toggleRoof() { roof.visible = !roof.visible; renderer.shadowMap.needsUpdate = true; setRoofPressed(roof.visible); }
  return { setRoofFade, toggleRoof };
}
