# Desk scene

`../deskScene.js` assembles one scene instance. Each factory in this folder owns
its prop's construction, animation state and interaction handlers. Renderer and
shared mesh helpers are initialized in `core.js`; `camera.js`, `pointer.js`,
`touch.js`, `theme.js` and `animation.js` coordinate the props.

Factories receive the same scene-local `runtime` object. Access another part
through its namespace, for example `runtime.keyboard.pressKey(code)`. Return only
state or functions needed by other parts. A getter exposes a changing local
binding; add a setter only if another part must assign it. Avoid destructuring
these live bindings into a stale local snapshot.

The assembly order in `deskScene.js` follows the original construction order.
Callbacks may use parts initialized later, but construction code must only read
parts already initialized. `animation.start()` runs after the animation API has
been published, so the first resize can read the camera and render state.

Track disposable Three.js resources through `runtime.core.track`. Keep teardown
in `lifecycle.js` synchronized with added listeners, timers, tweens and resources.
Remove listeners with the original function reference.

Run `npm run check:desk` for the geometry, interaction, rendering and wiring
checks, then `npm run build`. Older VM checks read an assembled source view from
`scripts/helpers/desk-source.cjs`; it is generated from these factories at test
time. `check-desk-scene-wiring.cjs` checks the module APIs and exercises the actual
input factory separately from that source view.
