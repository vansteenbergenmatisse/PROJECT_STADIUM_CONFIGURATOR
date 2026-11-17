# 04 — Camera and interaction

## Rule
The camera cannot be orbited, panned or zoomed by the user. It only moves via `flyTo(pos, target, ms, easing)` (linear path). One exception, asked for by the user: **head turn** at the seat level (below).
- **Selection flights** (block, seat, suite, Overview, Aerial, view-from-suite): `ms` is omitted, so the duration is
  `clamp(2600 + 9 x distance_m, 2800, 5200)` ms, with `easePremium` (quintic in-out: slow start, long glide, soft landing).
  Before 2026-11-16 (entry 9) these were fixed 1.5-1.8 s cubic.
- **Descent** passes `10000` and the original cubic `ease` explicitly, so it is unchanged.

## Fixed poses
- `OVERVIEW` = pos `[0, 432, 0.5]`, target `[0,0,0]` — true top-down, long axis horizontal. First frame of the page.
  (432 m: the user's reference frame looked like ~370 m and they asked for ~200 ft = ~61 m higher.)
- `AERIAL` = pos `[0, 340, 300]`, target `[0, 6, 0]` — oblique angle like the Soccer City photo.
- `LONG_STAND` = pos `[0, 62, 28]`, target `[0, 14, -70]` — end of the descent.
- **Descent** (button / D / `#descent` in the URL): jumps to `OVERVIEW`, then one straight line to `LONG_STAND` over 10 s. The camera stays in the x=0
  plane, so there is no yaw/orbit; only the pitch changes.
  Verified live (history entry 8): x stayed 0, pitch went -89.9° -> -26.1°, ended exactly at `LONG_STAND`, console empty.

## Click states (`nav.level`)
overview -> click seat block -> **section** (camera in front of the block, price range) -> click a seat in it -> **seat** (eye view of that seat, exact price)
overview -> click a skybox -> **suite** (button "View from this suite"). Parking is not selectable (entry 14).
**Section first:** in the overview, or inside a different block, hovering a seat shows the BLOCK card (price range, "N seats available") and highlights the whole block; a click selects the block. Only inside the selected block can one AVAILABLE seat be hovered or clicked (`inSectionView()`, `isAvail`; an unavailable seat shows a "Not available" card and ignores clicks); `selectSeat()` redirects to `selectSection()` otherwise.
`Esc` / Back: seat -> section, anything else -> overview. Clicking a seat of a different block always selects that block first.

## Picking
`pick()` raycasts `terraces[0..2] + glassMesh` (parking removed from `PICK`; not the 78k seats, that would be slow). Terrace hit -> nearest seat through the spatial grid
(cell 3 m, 3D distance < ~1.1 m). A hit on the middle-tier platform inside the skybox depth band counts as a suite.
Hover is throttled to one pick per animation frame. A click = pointerdown/up within 6 px.

## Highlights
Hovered block (overview): brighter orange (`COL.hotRed/hotBlue`). Selected block: natural colours, all other blocks darkened x0.45 (`dimOthers`). Seat under the mouse inside the selected block: vivid magenta (`COL.seat`); a click does not recolour it.
Suites: orange translucent boxes (`hoverMarker`, `selMarker`).

## Removed: photoreal render hook
Entries 10-19 had an optional `window.STADIUM_RENDER` hook, a Photo button and an auto render through a local proxy. All of it was removed from `index.html` in entry 20 (the `<img id="shot">` overlay, `captureShot`, `clearShot`, the chip). `proxy/` remains in the folder, unused.

## Head turn (seat level only)
After the flight to a seat ends, `look.base` = the view direction. Drag the mouse / finger, or press the arrow keys, to turn: yaw +-0.62 pi (+-112 deg), pitch -0.6..+0.4 rad. The target is `camera.position + dir * 100` every frame (`updateLook`); the position never changes. Any new flight resets it.

## Roof fade
`setRoofFade(on)`: at the SECTION level (only) every roof material is made transparent at 40% of its opacity (`depthWrite` off), so upper-tier seats stay visible; with a single seat selected, or on any other level, the roof is drawn normally (entry 22). The foil material is already translucent (base opacity 1 with an alpha texture). Instant, no animation.

## Pop-ups and keys
The checkout is a modal (`#modal`): Esc or a click on the backdrop closes it; while it is open the shortcuts D / R and the arrow keys are off. In input fields D / R / arrows do not trigger shortcuts.
Test-tool note: screenshots can fire stray clicks (a seat, the Buy button) - call `window.__stadium.go('overview')` and check `nav.level` before judging a frame.

## Buttons and panel (entries 22-23)
The camera is locked, so the four view buttons are the way back to Overview / Aerial / Descent (and Roof toggles the roof). They are bottom centre on desktop, top on phones. The price panel (`#panel`) is `display:none` unless `nav.level` is not overview. Keys: D descent, R roof, Esc back, arrows = head turn at a seat.
