# Parity fingerprint

`fingerprint.js` is a function you run inside the loaded page. It hashes the built scene and the seat tables so a refactor can be compared against the original without comparing screenshots by eye.

## Expected values (original page at commit `1d40415`, three r160, Chrome, overview)

| Field | Value |
|---|---|
| seatCount | 78397 |
| parkedCars | 50 |
| objs (mesh / line / points) | 511 |
| tris | 221854 |
| animatedInstanced | [200, 200] (excluded from the hash) |
| stableSceneHash | [634357477, 1960531145] |
| seatTier | 4038060592 |
| seatRow | 1712187952 |
| seatNumber | 910748208 |
| seatSection | 1261627952 |
| seatPrice | 3276859952 |
| seatPosRawBits | 3553838947 |
| render.textures | 41 |

## Expected values after the mesh merges (merged `main`, commit 710dc2c and later, one load, overview)

`objs` 452, `stableSceneHash` [973551021, 581484809], `tris` 221854, `render.calls` 439, `render.geometries` 403, `render.textures` 41. The seat table values and `seatPosRawBits` stay as in the table above. Use these for any change after the merges; use the table above only to compare with the original.

`render.calls` and `render.geometries` depend on the moment of measurement (492 / 461 and 497 / 462 were both seen on the unchanged original), so compare them against the original loaded the same way, not against a fixed number.

## Known caveats
- An earlier variant that hashed `seatPos` with a stride and rounding gave one different value on one load of the original. The cause was not found. The raw-bits variant in this file was identical on every load tried.
- The hash catches geometry, colour, opacity and transform changes. It does not catch shader, light, shadow or CSS changes. Compare screenshots and run the interaction flow for those.
- A change that merges meshes changes `objs` and `stableSceneHash` on purpose. In that case prove the picture is unchanged another way and update this table with the reason.

## Manual checklist after a change
Load with the cache bypassed, check the console is empty, then: overview, Aerial, Descent, hover and click a section, hover and click an available seat, a skybox, the Roof button, the fold buttons, arrow keys at the seat level, the running match and scoreboard, the checkout pop-up, and a phone-width viewport.
