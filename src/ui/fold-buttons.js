// @ts-check
/**
 * @fileoverview ui/fold-buttons: wireFoldButtons: the Hide / "+" buttons that put a floating card away (price panel, scoreboard, view buttons) and the H key.
 *
 * WHY: on phones and small windows the cards cover the 3D view. Folded = the card is hidden completely and only a 28 px "+" dot remains. The state lives in the DOM only
 *      (class is-folded on the card, aria-expanded on the button) and survives new selections. The H key folds every card, or brings them all back when all are folded.
 * BUILDS: nothing (uses the existing .fold buttons in index.html).
 * DEPENDS ON: src/state/state.js (H is ignored while the checkout is open).
 * USED BY: src/main.js.
 * LIFECYCLE: registers one keydown listener on window and one click listener per .fold button through the shared listener group (src/core/listeners.js).
 * UNITS / CONVENTIONS: each .fold button has data-hide / data-show label texts and an aria-label "Hide <what>" / "Show <what>"; its parent element is the card that gets the is-folded class.
 * NOT HERE: the fold CSS (css/overlays.css), the other shortcuts (src/interaction/input.js).
 */
import { state } from '../state/state.js';

/**
 * Wire the fold buttons and the H key.
 * Side effects: registers listeners through `listeners`.
 * @param {{on: Function}} listeners - listener group (core/listeners.js).
 */
export function wireFoldButtons(listeners) {
  listeners.on(window, 'keydown', e => {
    if ((e.key !== 'h' && e.key !== 'H') || e.metaKey || e.ctrlKey || e.altKey || state.buy || (e.target.matches && e.target.matches('input,textarea,select'))) return;
    const btns = [...document.querySelectorAll('.fold')], allFolded = btns.every(b => b.parentElement.classList.contains('is-folded'));
    for (const b of btns) if (b.parentElement.classList.contains('is-folded') === allFolded) b.click();   // all folded -> open the folded ones; otherwise fold the open ones
  });
  for (const btn of document.querySelectorAll('.fold')) listeners.on(btn, 'click', e => {
    e.stopPropagation();
    const box = btn.parentElement, folded = box.classList.toggle('is-folded'), what = btn.dataset.hide === 'Hide' ? btn.getAttribute('aria-label').replace(/^(Hide|Show) /, '') : '';
    btn.textContent = folded ? btn.dataset.show : btn.dataset.hide; btn.setAttribute('aria-expanded', String(!folded)); btn.setAttribute('aria-label', `${folded ? 'Show' : 'Hide'} ${what}`);
  });
}
