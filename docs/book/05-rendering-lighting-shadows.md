# 05 — Rendering, lighting, shadows

## Current settings (as in the code)
- Renderer: antialias, `powerPreference: 'high-performance'`, pixel ratio `min(dpr, 2)` (1.5 on screens < 760 px), ACES filmic tone mapping, exposure 0.9, sRGB output.
- Sun: `DirectionalLight` colour `0xffd29c`, intensity 3.2, direction `SUN_POS = (-260,190,170)` (~32° elevation), placed 600 m out, target at the origin.
  Hemisphere light `0xa9c6e6 / 0x7a6644`, intensity 0.62 (batch 18; was 0.45). A cool fill `DirectionalLight` `0x8fb4ff`, intensity 0.4, from the side opposite the sun, no shadow (batch 19).
- Sky: procedural `Sky` (turbidity 6, rayleigh 2, mie 0.005) baked once into a PMREM texture `envTex` with the same sun direction. `envTex` is used
  explicitly by seats (intensity 0.4), glass (0.8), facade glazing (0.9). `scene.environment = envTex` with `envMapIntensity = 0.2` (was 0.13) on matte standard
  materials (r160 has no `scene.environmentIntensity`, so the per-material value is the only dimmer).
- Fog: `FogExp2(0xd3e5f6, 0.00042)` (light blue haze). Camera near 1, far 3200, vertical fov 45 (up to 75 on tall screens, `fitFov`).
- Shadows: one 4096 map, `PCFSoftShadowMap`, ortho box ±340 m, near 280 / far 920, `bias −0.0002`, `normalBias 0.15`. The map is **frozen**
  (`autoUpdate = false`, `needsUpdate = true` once, re-armed by the Roof toggle). Seats and glass do not cast. Ring strips use DoubleSide.
- Static transforms are baked (`matrixAutoUpdate = false`) except objects flagged `userData.dynamic` (suite / lot markers).
- Anisotropy capped at 16.
- Seats: `instanceMatrix.setUsage(THREE.StaticDrawUsage)`; `instanceColor` stays dynamic because seats are repainted (entry 32).
- three.js is the minified `three.module.min.js` 0.160.0 (670,681 B instead of 1,272,972 B), same version, so no rendering change is expected; the fingerprint equalled the baseline (entry 31).

## Detail work (Soccer City pass)
Seats: 5 boxes, light baked into the vertex colours by face direction (top 1.0, sides ~0.74-0.9, underside 0.5), three paint tones incl. a pale-gold lattice. Steps: texture with lit nosing (v=0) and dark inner corner (v=1); risers flip v. Pitch: stripes, blade-scale
noise, wear patches, bump map, goal nets. Facade: pixel mosaic, `NearestFilter`. Roof: translucent ETFE-foil ring (see the roof section below).

## Research results (three agents, r160 sources)
Adopted: see 01-history entry 4. Facts worth remembering:
- `PCFSoftShadowMap` ignores `shadow.radius` in r160 (only `PCFShadowMap` uses it).
- `scene.environmentIntensity` and `NeutralToneMapping` do not exist in r160 (added later).
- Shadow `normalBias` is in world metres; large values lift shadows off small risers.
- `DoubleSide` materials render both faces into the shadow map (acne risk on open sheets).
- `InstancedMesh` is culled as a whole (one bounding sphere); no per-instance culling in r160.
- `BatchedMesh` exists in r160 but CPU-side culling makes it a poor fit for 79k identical seats.
Rejected / deferred: chunked seat meshes (violates "one InstancedMesh"), AgX (looked desaturated here), bloom, screen-space AO.
**Idea to revisit:** (the 50 parked cars are static; the match, clouds and fans animate) render-on-demand (render only while the camera tweens or on hover/selection changes)
becomes possible and would cut idle GPU use. Not implemented yet.

## Measured once (not a benchmark)
At the top-down start frame: ~72 draw calls, ~5.1 M triangles (renderer.info). No frame-time measurements were taken. This line is old and the numbers differ from the later census; later figures are below and in entries 29 to 34.

## Draw calls and merges (entry 34)
Draw calls went from 498 to 439 at the same frame (907d153 against the new page) by merging static same-material strips with `src/core/merge.js` (28 parking lines, 8 hatch strips, 4 fence rails, road and path ribbons plus caps, 4 gate wall arcs, 4 fascia strips, 3 skybox frame rails). Rules: opaque, static, not `userData.dynamic`, same material instance, `castShadow`, `receiveShadow`, `renderOrder`, `frustumCulled`; by default only identity or translation matrices.
Rejected: merging rotated or scaled parts (498 to 235 calls) flipped 4 pixels in two views; merging the pitch flag poles and dugouts differed by 1 pixel in one channel in the seat view. Never merged: pickable terraces, the roof, anything touched by `setRoofFade`, dynamic objects.
Proof: 0 differing pixels in 5 views at 960x540 with dynamic objects hidden in both pages (agent's own Chrome, not independently repeated). A merged mesh has one bounding sphere, so culling is coarser; the effect on frame time was not measured.

## Renderer and loop measurements (entry 32)
CPU time around `renderer.render` over 120 frames at DPR 2: mean 2.19 to 2.25 ms, p95 2.70 to 2.80 ms after the `StaticDrawUsage` and allocation changes, which is no measurable change. GPU time was not measured. Skipped because the code already did it: pixel ratio cap (1.5 under 760 px, otherwise 2), delta clamp (0.1 loop, 0.05 match); hidden-tab pause skipped because the browser already stops rAF.

## three.js research for performance (scratchpad RESEARCH-threejs.md, r160)
Source status: fetched with WebFetch and WebSearch in one session. The manual pages for rendering-on-demand, responsive, how-to-dispose and optimize-lots-of-objects returned 404, so those items rest on search snippets or general knowledge. No benefit below was measured by the source; numbers in entries 32 to 34 are ours.
Adopted:
- Static instance matrices (`StaticDrawUsage`), per-frame scratch objects instead of allocations (entry 32).
- Merge static same-material meshes, measured with `renderer.info.render.calls` before and after (entry 34).
- Faster picking: the source suggested an analytic seat lookup; the seats already used a grid, so the box hierarchy over the terrace and glass triangles was done instead (entry 33). That is our reading of where the cost was.
- Minified three file and `modulepreload` (entry 31; the modulepreload advice is general web knowledge, unverified against a source).
Already in place before the research: `matrixAutoUpdate = false` for static objects, frozen shadow map, pixel ratio cap, `renderer.info` use, frustum culling left on.
Not adopted, or deferred:
- Render on demand with a dirty flag: the match, fans and tweens animate, so it may rarely idle. Not implemented.
- Dispose of geometries and textures: the page never unmounts and nothing is created and removed at runtime; no benefit expected. The dispose guidance could not be confirmed because the manual page returned 404.
- A `ResizeObserver` and debounce for resize: standard practice, unverified against the manual, not done.
- Splitting seats into several InstancedMeshes for culling: would break the ONE InstancedMesh rule; not done without asking.
- A three.js upgrade: not tried. Migration notes list risks for this scene (r181 lighting change, r182 `PCFSoftShadowMap` deprecated in WebGL, r183 shadow bias); the tail of the migration guide was unread. The newest release is unverified (r187 or r188, the two sources disagreed). The project stays on r160 on purpose.

## Visible sky (history entry 13)
Gradient dome (deep blue overhead, pale blue at the horizon) with a sun disc and glow, a cloud dome (fbm noise in a shader, drifting) and a sun-glow sprite, all moved to the camera every frame (radius < far plane).
The stock `Sky` shader is NOT used for the visible sky (washed out under ACES); it stays only for the baked PMREM reflection map with the original parameters (turbidity 6, rayleigh 2).
Roof: faded to 40% opacity at SECTION level only (`setRoofFade`; full opacity at seat level). Match figures do not cast shadows (the shadow map is frozen); they get a blob shadow each.
Batch 19: cool fill light (0.4, no shadow), vignette overlay; sharper-shadow focus and seat shadows tried and rejected (flight stalls, see 01-history 19).
Batch 18: hemisphere light 0.62 (was 0.45), IBL 0.2 on matte materials (was 0.13), seat vertex shading baked by face direction. Not measured for frame rate.

## Roof (entry 21)
Translucent ETFE-foil look, modelled on stadiums with foil-cushion roofs in a diamond layout (a web search named the Allianz Arena and U.S. Bank Stadium; this is an interpretation, not a measured copy). `MeshPhysicalMaterial` (clearcoat 0.5, roughness 0.12, envMapIntensity 1.1, transparent, `depthWrite` false, DoubleSide) with a 256 px canvas tile (steel diagonals + lighter puffed centres, alpha), tile about 11 m. The foil strip does not cast shadows; 104 steel ribs (one InstancedMesh) cast the dappled roof shadow. Cost of the extra transparent layer is not measured.

## Scene census (entry 19, desktop test browser, not a benchmark)
357 meshes, 341 draw calls, 5.39 M triangles (seats 4.70 M = 87%); lights: hemisphere + sun + fill (+ IBL); 264 shadow casters, 261 receivers; ACES 0.9, PCFSoft, ONE frozen 4096 map. The test browser ran about 43 ms per frame at idle, so its timings are not a real-GPU guide.

## Tried and rejected (measured in the same test browser)
- Seats casting into the frozen shadow map: the first frame of a flight stalled about 1.4 s (4.7 M triangles re-baked).
- Re-fitting the shadow frustum to +-170 m inside the bowl (2x sharper): still a 741 ms stall at flight start.
- A CSS vignette (`#vignette`) is the only added screen-space effect.

## Removed
The photoreal render hook (`window.STADIUM_RENDER`, AI re-render through fal) was removed in entry 20; WebGL here is a stylised 3D render.
