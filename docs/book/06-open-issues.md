# 06 — Open issues, unverified items, ideas

## Not verified (never checked in this project)
- Frame rate on any machine, especially with the foil roof (extra transparent layer), 50 cars, ~180 fans, 34 stewards, 12 photographers. The test browser was slow (about 43 ms per frame at idle), so only relative statements were possible.
- A real phone: only a narrowed desktop window was used (touch drag for the head turn, tap flow, safe areas, the view buttons at the top, frame rate).
- Close-up look of: photographers, TV tripods, electronic sub board, assistant referees, cars from ground level, stalls and flags close up, the pitch-side dugouts from every seat (stewards looked slightly floating over the dark pit in one view).
- Clicking an unavailable seat with a real mouse (the guard is in the pointer-up handler; `window.__stadium.selectSeat` bypasses it) and the "Not available" hover card by eye.
- The roof toggle (R) with the foil roof, and the 40% fade look on a real GPU.
- The match over a long run (score changes, figures stuck at the edges), and the entrance letter for every section.
- Keyboard focus order and screen-reader behaviour inside the checkout pop-up (now longer, with 13 extras).
- Browsers other than the one used by the test tool.
- Every one of the 28 sections of each tier by eye (aisles were verified by measurement).
- Removed feature: the AI photo render through fal never produced a verified, shippable result in the page (see entries 10-19). `proxy/` still holds a pasted fal key in `proxy/.env`: the user said they will rotate it; delete the folder if the feature is not coming back.

- Batch 26: the user's recording shows only the overview zoom; the 'trash' spots they meant beyond what I found in my own close-ups are unknown. Distant bay lines still shimmer (aliasing). Batch 25: first-render time on a real GPU (5.5 s in the slow test browser), whether the loading animation stalls during the first render, z-fighting from every angle, fold buttons on a real phone, the user's attached image for the fold request (not visible to me).

- Live site (batch 27): checked only in the test browser; no real phone, no real GPU, no cross-browser check.

## Not verified after the performance and refactor work (entries 31 to 35)
Measured numbers in those entries come from the agent's own Chrome on this machine and were not independently repeated.
- Loader (entry 31): the look at phone width; the bar fill mid-build (only `--p 0` was seen in a screenshot); the fade frame by frame.
- Boot time (entry 31): the `first frame` mark came 22 s after `scene built` in the agent's run and about 27 s after in a second run by the maintainer with about a dozen browser tabs open. Cause not established; CPU contention is possible. Not re-measured with a quiet machine. Whether this also happens on a real GPU is unknown.
- Renderer and loop (entry 32): GPU time (only CPU time around `render` was measured, no change); phone width; hover; checkout.
- Picking (entry 33): only the picked id was compared between old and new (2530 of 2530 rays), not hit distance or point; a side-by-side flow against the original page; phone width; head turn.
- Merges (entry 34): real pointer hover and picking on merged parts; phone width. The new `objs` and `stableSceneHash` for `tools/parity/README.md` are not recorded yet (placeholder in entry 34).
- Geometry hash difference: in the merge proof the path-ribbon bucket differed at 1e-3 rounding (float32 cap positions moved by up to 2e-5 m), which is explained. There was also a one-off `seatPos` hash difference that was NOT explained (no further detail is recorded here); treat it as open.
- Review (entry 35): the reviewer read and diffed code but did not run the page, so the fixes after it are not browser-tested.
- three.js guidance: the dispose guidance could not be confirmed (the manual page returned 404); the rendering-on-demand, responsive and optimize-lots-of-objects pages also returned 404, see chapter 05. The newest three.js release is unverified (r187 or r188). The project stays on r160 on purpose; no upgrade was tried.
- Module load: 53 module files and 9 stylesheets over a cold network were not measured; only the three.js files are `modulepreload`ed (review item L4, suspected, not measured).

## Open review items (independent review of 907d153, still not fixed)
Source: the reviewer's notes (scratchpad REVIEW-1.md, read in full). Fixed already: M1 (partly, see below), M2, M3, M4 and the stale comments of L3 in `parking.js` and `listeners.js` (entry 35).
- L1: over-exported names `SKY_DEPTH_FRONT`, `TIER_BASE`, `round5`, `easePremium` (harmless).
- L2: shared mutable state outside `state/state.js`: `COL` is created in `world/seats.js` and extended in `interaction/seat-paint.js` (the extra keys exist only after `createSeatPaint` runs); `rand` is reachable through `ctx.rand` and through an import from `core/rng.js`.
- L3 remainder: the "batch N" markers in comments (parking, roads, pitch, constants) refer to a numbering that only the book explains.
- L4: module-load waterfall (suspected, not measured, see above).
- L5: accessibility gaps that existed in the original: the checkout dialog has no focus trap and no focus restore to the Buy button, the cart step does not move focus; the tab list has no roving tabindex or arrow keys; `#tip` is `role=status` and is rewritten on every hover.
- L6: per-frame allocations that remain from the original: `match.score` returns a slice and `updateScore` builds a string each frame while the match runs (the `updateLook` and match closure allocations were changed in entry 32). Not re-checked against the code in this pass.
- L7: `lotOf` (`interaction/picking.js`) and `lotAt` (`world/parking.js`) are the same rule written twice.
- Not checkable by the reviewer: runtime look and behaviour, the Pages sub-path, touch input, the 390 px layout.

## Decisions that were mine (change them if you disagree)
- Demo checkout rules: promo code DEMO10 = 10% off, no booking fee, card checks are format-only, up to 4 seats (the next seats in the same row). Card brands are text, no logos.
- Plaza, parking ring (not selectable, now 4 lots with 50 cars) and shops were kept when the surroundings became a meadow; ask before removing them.
- Availability rule (entry 22): colour code 1 and 2 seats are unavailable. My reading of "the ones that have a different color".
- The view buttons stay (bottom centre) although the title card was removed: the camera is locked and needs them.
- Matchday extras prices, sponsor names, stall list and the extra pitch-side people are made up / from general knowledge.
- Plus Jakarta Sans comes from Google Fonts (offline it falls back to system-ui).
- Batch 25: the loader fade is the one transition in the UI (since entry 31 the loader is charcoal with a .4 s fade in `css/loader.css`; the earlier green and navy iframe loader is gone). Fold buttons on three cards instead of one. Yellow = park / hatch = no parking is my reading of the request. `proxy/` and `reference-3d-frame-aerial.png` are kept out of the public repo.
- Brand rule "no motion": the roof fade is instant, the scoreboard clock ticks (it is data, not decoration).

## Known gaps
- Seat orange still reads slightly muted from above; trees are low-poly; paving and meadow textures repeat (faint tile seams in the meadow).
- No true screen-space AO / global illumination; only baked contact shading and soft IBL.
- Availability is a made-up colour rule, not real inventory; there is no sold-out state or live data.
- Phone: the bottom bar still covers the lower fifth of the pitch view in the seat level.

## Behaviour to remember
- Small shops exist (houses were removed on request). The parking lots hold 50 cars (re-added on request) and are not selectable; the price panel no longer lists parking prices.
- Roads end in rounded caps; entrances are on the road angles, exits halfway between.
- The camera test tool can trigger stray clicks (a seat, a lot, the Buy button); reset with `window.__stadium.go('overview')` and check `nav.level`.

## Ideas
- Render on demand when nothing moves (the sky and match now animate, so only in the overview).
- Optional collapse handle for the phone bottom bar; seat-number labels; real crowd.
- Boot time: on the original and on the refactor, `first render call` comes 5.8 to 7.0 s after `scene built` (one load each, see entry 31). The cause was not investigated (possibly shader compilation and buffer upload on the first render). Not verified whether `renderer.compileAsync` or a warm-up would shorten it without changing the picture.
