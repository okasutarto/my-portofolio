# Project architecture

[← Back to README](../README.md)

## Project structure

The frontend is one Vue application with two feature folders. The desk is served at `/`;
the classic portfolio and its shell are loaded on demand at `/2d`.

```text
the-desk/
├── index.html                         # Page metadata and the initial desk boot loader
├── vite.config.js                     # Vite, @ alias, environment values and dev port 8080
├── playwright.config.cjs              # Production browser test matrix and preview server
├── public/                            # Static images, README screenshots and sound samples
├── src/
│   ├── App.vue                       # Route transitions, shared theme init and Vercel analytics
│   ├── main.js                       # Vue application entry and global styles
│   ├── router/index.js               # Routes, compatibility redirects and scroll restoration
│   ├── data/                         # Shared about, experience, skills and project content
│   ├── features/
│   │   ├── portfolio2d/
│   │   │   ├── PortfolioLayout.vue   # Lazy navbar, footer, chatbot and dot-grid background
│   │   │   ├── HomePage.vue          # Composes the classic portfolio sections
│   │   │   ├── components/
│   │   │   │   ├── layout/           # MainLayout, TheNavbar and TheFooter
│   │   │   │   ├── sections/         # Hero, About, Experience, Projects and Contact
│   │   │   │   ├── files/            # FileCover, FileSheet and ClipSheet
│   │   │   │   ├── hero/heroScene.js # The classic page's own 3D hero illustration
│   │   │   │   ├── ui/NeoMarquee.vue
│   │   │   │   ├── ChatBot.vue
│   │   │   │   ├── BotFace.vue
│   │   │   │   ├── FileDrawer.vue
│   │   │   │   ├── SoundToggle.vue
│   │   │   │   └── ThemeSwitcher.vue
│   │   │   ├── composables/          # useSpotlight and usePostHog, owned by 2D
│   │   │   ├── directives/titleReveal.js
│   │   │   └── utils/formatChatMessage.js
│   │   └── desk3d/
│   │       ├── DeskPage.vue          # Room lifecycle, HUD, hints and settings panel
│   │       ├── composables/useDeskSettings.js # Preference parsing, storage and scene updates
│   │       ├── deskScene.js          # Assembles the scene-local runtime and factories
│   │       ├── scene/                # Props, rendering, input, camera, theme and cleanup
│   │       ├── desktop.js            # Coordinates the monitor's windows, dock and interactions
│   │       ├── desktop/
│   │       │   ├── config.js         # Screen dimensions, apps, dock order and helpers
│   │       │   ├── canvas.js         # Canvas surfaces, grain, halftone and drawing primitives
│   │       │   ├── appearance.js     # Desktop themes, wallpaper rendering and icons
│   │       │   ├── spotifree.js      # Music player drawing
│   │       │   ├── code.js           # Animated code editor
│   │       │   └── snake.js          # Snake state, input and drawing
│   │       ├── textures.js          # Texture module exports
│   │       ├── textures/            # Canvas textures grouped by surface or prop
│   │       ├── sceneConfig.js       # Palette, quality selection and benchmark flags
│   │       ├── sceneMeshes.js       # Shared mesh construction and resource tracking
│   │       ├── sceneShaders.js      # Toon shading and shadow shader patches
│   │       ├── toonBatch.js         # Compatible toon mesh and shadow batching
│   │       ├── paperFlex.js         # Bendable papers, covers and boarding passes
│   │       ├── woods.js             # Furniture finishes, floor layouts and defaults
│   │       ├── daylight.js          # Time-of-day and weather settings
│   │       ├── wallpapers.js        # Wallpaper choices and landscape painting
│   │       ├── lofi.js              # Synthesized music and playback
│   │       └── strawHatStrike.js    # Console game
│   └── shared/
│       ├── components/NotFound.vue  # Application 404 page, rendered inside the classic shell
│       ├── composables/useTheme.js # Theme state shared by both experiences
│       ├── composables/useSfx.js   # Shared audio state, synthesis and hover cues
│       ├── services/chatApi.js     # Streaming chat client used by the chatbot and 3D phone
│       ├── config/emailjs.js       # Contact configuration used by both postcards
│       ├── utils/bootLoader.js     # Boot progress, enter gate and loader cleanup
│       └── assets/styles/index.css # Global fonts, Tailwind, theme tokens and shared utilities
├── my-portfolio-api/
│   ├── index.js                    # Express middleware, CORS and server entry
│   ├── assets/OkaSutartoCV.txt      # Assistant context
│   └── src/
│       ├── routes/                 # Chat streaming endpoints
│       ├── controllers/            # Request validation and streaming responses
│       ├── services/               # OpenAI integration
│       ├── config/                 # Assistant prompts
│       └── utils/                  # Guardrails and context file loading
├── scripts/
│   ├── check-app.cjs               # Chat formatting, theme storage, CORS and SSE checks
│   ├── check-desk.cjs              # Runs the desk's focused checks
│   ├── check-bundles.cjs           # Checks source imports and the emitted build manifest
│   └── helpers/                    # Assembled source views for the legacy VM checks
└── tests/browser/portfolio.spec.cjs # Chromium/WebKit desktop and mobile smoke tests
```

### Code ownership and startup

| Area | Flow and responsibility |
| --- | --- |
| Application entry | `main.js` mounts `App.vue` and the router. `App.vue` initializes the shared theme and analytics; it does not import the classic UI. |
| Desk `/` | The router loads `DeskPage.vue` with the app entry, so its backdrop can paint immediately. The page dynamically imports `deskScene.js`, which assembles `scene/` factories using one scene-local `runtime`. |
| Classic `/2d` | The router dynamically imports `PortfolioLayout.vue` and `HomePage.vue`. The layout owns navigation, chat, the background spotlight and icon font loading; the page composes its sections. |
| Unknown URLs | The lazy classic layout wraps `shared/components/NotFound.vue`. The 404 text and actions have explicit light/dark contrast. |
| Monitor apps | `desktop.js` coordinates windows and input; its `desktop/` modules own canvas primitives, appearance, the player, editor and Snake. |
| Room settings | `useDeskSettings.js` validates saved preferences, supplies reactive labels, persists changes and forwards them to the active scene. |
| Scene resources | `scene/core.js` owns renderer and resource helpers. `scene/lifecycle.js` removes listeners, timers, tweens and GPU resources when the desk is unmounted. See the [scene module guide](../src/features/desk3d/scene/README.md). |
| Shared content | Both experiences read `src/data/`. Updating a project or job updates both presentations; neither feature needs to import the other. |

Keep feature-specific code in its feature folder. Shared helpers and data must not import
features. The 404 page is an application fallback; its visual shell belongs to `portfolio2d`.
Title reveal directives are imported locally by the classic sections. PostHog is owned by
2D, and icon fonts load independently after its layout mounts, so a blocked font CDN cannot
reject the route's lazy CSS. A desk-only visit does not fetch these classic UI dependencies.
`check:bundles` verifies the eager source dependencies and emitted bundle graph.

The Express backend remains an independent package under `my-portfolio-api/`; moving frontend
features does not change its endpoints or deployment configuration. See [Scripts](development.md#scripts)
for local checks and the browser test command.
