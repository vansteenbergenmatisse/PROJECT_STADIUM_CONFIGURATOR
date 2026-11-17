// @ts-check
/**
 * @fileoverview core/listeners: createListenerGroup: one AbortController-based registration helper for every window / canvas / panel listener.
 *
 * WHY: the old inline script registered 14 listeners with bare addEventListener and never removed any. Registering them through one group means ONE call (`abort()`) can remove all of
 *      them, and the list of what the page listens to is visible in one place (the callers). Behaviour is unchanged: the page never unmounts, so abort() is never called at runtime.
 * BUILDS: nothing in the scene; it only creates an AbortController.
 * DEPENDS ON: nothing.
 * USED BY: src/main.js (creates the group), src/core/loop.js (resize), src/interaction/input.js (keyboard, pointer), src/ui/fold-buttons.js; the checkout listeners are registered from src/interaction/input.js.
 * LIFECYCLE: created once at boot; `abort()` would detach every listener registered through `on` (not called by the page).
 * UNITS / CONVENTIONS: `options` is the normal addEventListener options object; `signal` is added to it, so a caller must not pass its own signal.
 * NOT HERE: listeners that are assigned as properties (button.onclick = ...), because those are replaced, not stacked, and are not part of the original addEventListener set.
 */

/**
 * Create a listener group.
 * @returns {{on: (target: EventTarget, type: string, handler: (e: any) => void, options?: AddEventListenerOptions) => void, abort: () => void}} on = register, abort = remove all.
 */
export function createListenerGroup() {
  const controller = new AbortController();
  return {
    /** Register `handler` on `target` for `type`; it is removed when the group is aborted. */
    on(target, type, handler, options = {}) { target.addEventListener(type, handler, { ...options, signal: controller.signal }); },
    /** Remove every listener registered through this group. */
    abort() { controller.abort(); },
  };
}
