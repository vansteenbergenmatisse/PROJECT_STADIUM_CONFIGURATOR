// @ts-check
/**
 * @fileoverview ui/view-buttons: createViewButtons: the view bar (#views): the Overview / Aerial / Descent tabs and the Roof toggle button.
 *
 * WHY: the camera is locked, so these buttons are the only way back to Overview / Aerial / Descent. The module only builds and styles the buttons; WHAT they do is bound by main.js
 *      (addTab / bindRoof) after the selection and roof modules exist, which keeps the UI free of imports from interaction and so avoids an import cycle.
 * BUILDS: DOM only: a .tabs div (role tablist) with .tab buttons inside #views, and one .btn "Roof" button (aria-pressed).
 * DEPENDS ON: nothing (uses the #views element of index.html).
 * USED BY: src/main.js (creates and binds it), src/interaction/camera-rig.js and selection.js (setView), src/interaction/roof-control.js (setRoofPressed).
 * LIFECYCLE: created once at boot; buttons use `onclick` properties, never removed. The active tab (aria-selected) is the view the user last asked for; any other flight clears it (flyTo calls setView(null)).
 * UNITS / CONVENTIONS: a tab is identified by its label text; aria-selected is "true" on the active one only.
 * NOT HERE: what a tab does (interaction/selection.js: goOverview, goAerial, descent), the roof (interaction/roof-control.js), the fold button of the bar (ui/fold-buttons.js).
 */

/**
 * Create the tab group and the Roof button inside #views.
 * Side effects: appends two children to #views (the tab group, then the Roof button).
 * @returns {{setView: (name: string|null) => void, addTab: (label: string, fn: () => void) => HTMLButtonElement, setRoofPressed: (pressed: boolean) => void, bindRoof: (fn: () => void) => void}} the control functions.
 */
export function createViewButtons() {
  const viewBar = document.getElementById('views');
  const tabGroup = document.createElement('div'); tabGroup.className = 'tabs'; tabGroup.setAttribute('role', 'tablist'); viewBar.appendChild(tabGroup);
  /** Add one tab button that runs `fn` on click. */
  const addTab = (label, fn) => { const b = document.createElement('button'); b.className = 'tab'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false'); b.textContent = label; b.onclick = fn; tabGroup.appendChild(b); return b; };
  // the active tab is the camera view the user last asked for; any other flight (a click on a section, seat, skybox, lot) clears it
  const setView = name => { for (const t of tabGroup.children) t.setAttribute('aria-selected', String(t.textContent === name)); };
  const roofBtn = document.createElement('button'); roofBtn.className = 'btn'; roofBtn.textContent = 'Roof'; roofBtn.setAttribute('aria-pressed', 'true'); viewBar.appendChild(roofBtn);
  /** Show the Roof button as pressed (roof visible) or not. */
  const setRoofPressed = pressed => roofBtn.setAttribute('aria-pressed', String(pressed));
  /** Make the Roof button run `fn` on click. */
  const bindRoof = fn => { roofBtn.onclick = () => fn(); };
  return { setView, addTab, setRoofPressed, bindRoof };
}
