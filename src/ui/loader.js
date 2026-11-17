/* loader.js - controls the loading screen (#loading), styled by css/loader.css.
   Builds: nothing itself; it drives markup that already sits in index.html (so it paints from the first byte, before any module runs).
   Why: replaces the old iframe loader with a tiny CSS-only one; the JS only reports progress and removes the element.
   Lifecycle: createLoader() finds #loading and sets --p to 0; setProgress(f) / progressFromMark(name) move the hairline bar; hideLoader() adds class done, fades, then removes the element
   (at once under prefers-reduced-motion). Safe to call when #loading is missing.

   MARKUP to paste into index.html in place of the old #loading iframe div (also add <link rel="stylesheet" href="css/loader.css"> after tokens.css):

<div id="loading" role="status"><svg viewBox="0 0 200 140" aria-hidden="true"><path pathLength="1" d="M192.0 70.0L191.4 82.9L189.6 91.9L186.6 99.6L182.4 106.4L177.0 112.3L170.5 117.5L162.8 121.9L154.0 125.5L143.9 128.3L132.5 130.4L119.2 131.6L100.0 132.0L80.8 131.6L67.5 130.4L56.1 128.3L46.0 125.5L37.2 121.9L29.5 117.5L23.0 112.3L17.6 106.4L13.4 99.6L10.4 91.9L8.6 82.9L8.0 70.0L8.6 57.1L10.4 48.1L13.4 40.4L17.6 33.6L23.0 27.7L29.5 22.5L37.2 18.1L46.0 14.5L56.1 11.7L67.5 9.6L80.8 8.4L100.0 8.0L119.2 8.4L132.5 9.6L143.9 11.7L154.0 14.5L162.8 18.1L170.5 22.5L177.0 27.7L182.4 33.6L186.6 40.4L189.6 48.1L191.4 57.1Z"/><path class="in" pathLength="1" d="M166.0 70.0L165.6 77.9L164.3 83.4L162.1 88.2L159.1 92.3L155.2 95.9L150.6 99.1L145.1 101.8L138.7 104.0L131.5 105.8L123.3 107.0L113.8 107.7L100.0 108.0L86.2 107.7L76.7 107.0L68.5 105.8L61.3 104.0L54.9 101.8L49.4 99.1L44.8 95.9L40.9 92.3L37.9 88.2L35.7 83.4L34.4 77.9L34.0 70.0L34.4 62.1L35.7 56.6L37.9 51.8L40.9 47.7L44.8 44.1L49.4 40.9L54.9 38.2L61.3 36.0L68.5 34.2L76.7 33.0L86.2 32.3L100.0 32.0L113.8 32.3L123.3 33.0L131.5 34.2L138.7 36.0L145.1 38.2L150.6 40.9L155.2 44.1L159.1 47.7L162.1 51.8L164.3 56.6L165.6 62.1Z"/><path class="pt" pathLength="1" d="M65 48H135V92H65ZM100 48V92"/></svg><div class="bar"><i></i></div><p class="txt" aria-hidden="true">Building the stadium</p><span class="sr-only">Building the stadium.</span></div>
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
