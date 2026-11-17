/**
 * @fileoverview loader.js: controls the loading screen (#loading), styled by css/loader.css.
 * WHY: replaces the old iframe loader with a tiny CSS and SVG one. The markup sits in index.html so it paints from the first byte,
 *      before any module runs, and this module only reports progress and removes the element.
 * BUILDS: nothing itself; it drives markup that already exists in index.html (the SVG outline and the hairline bar).
 * DEPENDS ON: nothing.  USED BY: src/main.js (createLoader at boot, setProgress from the boot marks, hideLoader after the first drawn frame).
 * LIFECYCLE: createLoader() finds #loading and sets --p to 0; setProgress(f) and progressFromMark(name) move the hairline bar;
 *      hideLoader() adds class done, fades, then removes the element (at once under prefers-reduced-motion). Safe when #loading is missing.
 * NOT HERE: the markup (index.html) and the look (css/loader.css).
 */

/* the 9 boot marks of the scene build, in order; progress = marks done / 9 */
const MARKS = ['ground', 'terraces', 'seats', 'skyboxes', 'park', 'shops', 'trees', 'camera rig', 'bake done'];

const el = () => document.getElementById('loading');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* finds the element and starts the bar at zero; returns the element or null */
export function createLoader() {
  const e = el();
  if (e) e.style.setProperty('--p', '0');
  return e;
}

/* sets the bar, fraction 0..1 (clamped); the bar scales from the left via --p */
export function setProgress(fraction) {
  const e = el();
  if (e) e.style.setProperty('--p', String(Math.min(1, Math.max(0, +fraction || 0))));
}

/* maps a boot mark name to marks done / 9 (1-based position), 0 for an unknown name */
export function progressFromMark(name) {
  const i = MARKS.indexOf(name);
  return i < 0 ? 0 : (i + 1) / MARKS.length;
}

/* fades the screen out and removes it; instant under prefers-reduced-motion */
export function hideLoader() {
  const e = el();
  if (!e) return;
  setProgress(1);
  e.classList.add('done');
  if (reduced()) { e.remove(); return; }
  let gone = false;
  const rm = () => { if (!gone) { gone = true; e.remove(); } };
  e.addEventListener('transitionend', rm, { once: true });
  setTimeout(rm, 600);   /* fallback if transitionend never fires */
}
