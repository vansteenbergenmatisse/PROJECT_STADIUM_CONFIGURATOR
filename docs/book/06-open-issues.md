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

## Decisions that were mine (change them if you disagree)
- Demo checkout rules: promo code DEMO10 = 10% off, no booking fee, card checks are format-only, up to 4 seats (the next seats in the same row). Card brands are text, no logos.
- Plaza, parking ring (not selectable, now 4 lots with 50 cars) and shops were kept when the surroundings became a meadow; ask before removing them.
- Availability rule (entry 22): colour code 1 and 2 seats are unavailable. My reading of "the ones that have a different color".
- The view buttons stay (bottom centre) although the title card was removed: the camera is locked and needs them.
- Matchday extras prices, sponsor names, stall list and the extra pitch-side people are made up / from general knowledge.
- Plus Jakarta Sans comes from Google Fonts (offline it falls back to system-ui).
- Batch 25: the user's loading screen keeps its own colours (green grass, navy); the loader fades out in 200 ms (the one transition in the UI). Fold buttons on three cards instead of one. Yellow = park / hatch = no parking is my reading of the request. `proxy/` and `reference-3d-frame-aerial.png` are kept out of the public repo.
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
