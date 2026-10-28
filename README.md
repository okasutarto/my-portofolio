<div align="center">

# 🖥️ THE DESK

**Oka Sutarto Putra's portfolio, as a 3D desk you can explore.**

Click anything. Just don't try to use the Infinity Gauntlet. 🫰

[**okasp.dev**](https://okasp.dev) · [2D version](https://okasp.dev/2d)

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vuedotjs&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r161-000000?style=flat-square&logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3-88ce02?style=flat-square&logo=greensock&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)
![Web Audio](https://img.shields.io/badge/Web_Audio-synthesized-ff90e8?style=flat-square)
![Vercel](https://img.shields.io/badge/Vercel-deployed-000000?style=flat-square&logo=vercel&logoColor=white)

<img src="public/readme-desk.jpg" alt="The Desk: a neo-brutalist 3D room with a desk, monitor, About board, bookshelf, katana and the Infinity Gauntlet" width="100%" />

</div>

---

## What is this?

Instead of scrolling through sections, you look around a room. Every part of the portfolio is a
prop on or around the desk: zoom into it, and it does its thing. The whole room is one
[Three.js](https://threejs.org) scene in a flat, neo-brutalist style: toon shading, thick black
outlines and hard shadows.

Prefer a classic page? The same content lives at [`/2d`](https://okasp.dev/2d).

## Things to click

| Prop | What it does |
| --- | --- |
| 🪪 **ID badge** | Flips to reveal the links. Drag its pin to re-pin it anywhere on the wall, or pull the lanyard and let it swing. |
| 📌 **About board** | Notes about me, pinned up. Drag them around and they pin back in place. |
| 🖥️ **Monitor** | A working terminal. Type `help`, `whoami`, `projects`, or `sudo hire oka`. |
| ⌨️ **Keyboard** | Every key on your keyboard presses the same key on the desk. Keys `1`–`5` jump between sections. |
| 🗂️ **Drawer** | Project files: flip through the tabs, pull one out and turn its pages. |
| 🎫 **Boarding passes** | My experience, one pass per job. Hold one up, flip it for the itinerary. |
| 📱 **Phone** | Chat with my AI twin (answers come from my CV, streamed). |
| ✉️ **Envelope** | A postcard to write and send. It really sends. |
| ☕ **Mug** | A sip and a quote. Finish the cup and the room switches to the night shift. |
| 💡 **Lamp** | Day and night, by hand. |
| 🔦 **Monitor lightbar** | Toggle the task light on or off during the night shift. |
| 🔊 **Speakers** | Sound on or off, with a little groove when it comes on. |
| 🪟 **Window & blind** | Morning, midday, sunset and moonlight scenery with birds, stars and rain. Pull the blind or its chain; three quick knocks toggle rain. The weather card shows live Pontianak weather when available. |
| 🪴 **Plant** | Each click blooms a flower. Three blooms call a butterfly. |
| 🖱️ **Mouse** | Grows ears and a tail, and scampers off for a lap. |
| 🪑 **Chair** | Spins and can be dragged, with a springy return. |
| 🖼️ **Painting** | A small gallery: it flips to the next picture. |
| 🕰️ **Clock** | Spins its hands round and chimes. |
| 🎸 **Guitar** | Strums the next chord; its strings react to hover and vibration, and respond to the room lighting. |
| 👒 **Straw hat** | Luffy has something to say. |
| ⚔️ **Sword rack** | Inspect three swords, draw one and strike, with technique cards, manga effects and falling sakura. Its close-up has an independent spotlight. |
| 🏋️ **Dumbbells & calendar** | Count reps (ten is a PR) and stamp today on the gym streak. |
| 🧤 **Infinity Gauntlet** | Please don't. |
| 🎮 **Game shelf & console** | Explore the collection, power the console and play its monitor app. Drag vertically to browse the shelf. |
| 🤖 **Robot** | A small animated companion on the shelf. |
| 🐈 **Oyen** | An animated desk cat that watches, settles and reacts to activity around the room. |
| 🗑️ **Wastebasket** | Crumple papers and throw them into the basket. |
| 🏆 **Secrets trophy** | Tracks 20 discoveries and celebrates when the collection is complete; click it to replay the celebration. |

## Light, weather and atmosphere

**Same desk. A different mood.** Sunlight moves across the room, rain rolls in, and the
night shift trades the daylight for cyan and pink neon.

<table>
  <tr>
    <td width="50%"><img src="public/readme-desk.jpg" alt="Day shift: sunlight through the window across the desk" width="100%" /></td>
    <td width="50%"><img src="public/readme-desk-night.jpg" alt="Night shift: cyan and pink LEDs behind the desk and monitor" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><strong>☀️ Day shift</strong><br />Warm wood, window light and crisp shadows.</td>
    <td align="center"><strong>🌙 Night shift</strong><br />Neon, a glowing screen and a quiet desk lamp.</td>
  </tr>
</table>

| ☀️ Morning | 🌤️ Midday | 🌇 Evening | 🌙 Night |
| --- | --- | --- | --- |
| Warm light across the monitor | Brighter room, steeper sunlight | Low amber light, muted violet shade | Moonlight, cyan/pink LEDs and a task light |

- **Watch the weather.** Rain fades in with its own ambience. Sunlight dims, its edges soften,
  and the view turns cloudy. Three quick knocks on the window toggle the rain.
- **Follow the light.** The sun and moon in the window guide the direct beam. Pull the blind
  and the light changes with it; the rear desk and monitor LEDs bring colour after dark.
- **Stay for the night shift.** The room changes phase every 20–30 seconds with a 2-second
  transition. Click the lamp or finish your coffee to switch the theme yourself.

<details>
<summary><strong>🔦 How the lighting works</strong></summary>

The painted sky and direct window light share celestial coordinates. A projected aperture,
glazing-bar occluders and the blind keep that beam inside the window opening. Rain attenuates
it more than the diffuse fill and softens its shadows.

Broad, overlapping light samples approximate the desk and monitor LED strips; the monitor
sources follow its movement. Shelf lighting is independent. A dim point light sits inside the
exposed bulb, while the monitor lightbar illuminates the work surface.

Full-resolution GTAO and contact shadows give objects depth in every phase. A broad shadowed
room fill complements the direct lights, and PCSS softens cast shadows with separation. This
is an artistic diorama setup, rather than a physical daylight or global-illumination simulation.

</details>

## Under the hood

**A little room, built out of code.** The printed details, moving props and small sounds are
part of the scene, not a video playing behind the page.

| | What makes it work |
| --- | --- |
| 🎨 **Drawn at runtime** | Canvas textures paint the notes, tickets, terminal, landscape and artwork. The portrait uses a supplied image. |
| 🎛️ **Sound without audio files** | Web Audio synthesizes guitar chords, paper riffles, coffee slurps and the lo-fi player. |
| ✒️ **Lines that stay sharp** | Screen-space outlines keep their weight as you zoom in. Rendering follows device density, up to 3×. |
| 🎬 **Every prop gets a close-up** | GSAP moves between framed camera shots; foreground props clip out of the way so they don't block the view or clicks. |
| 🧩 **Small things, shared draws** | Compatible toon meshes and simpler shadow proxies are batched. Original meshes still handle picking and animation. |
| 🚪 **The room starts before the scene** | An HTML boot loader appears before JavaScript, then fades into the desk. |

<details>
<summary><strong>⚙️ Rendering details and tradeoffs</strong></summary>

- **Stable sharpness.** Postprocessing follows the canvas resolution. Slow frames do not lower
  image density. Active camera moves and interactions follow browser frames.
- **Reuse work while idle.** AO and shadow maps are cached and refreshed on schedules, with
  more frequent updates while things move. Unsupported batching falls back to original meshes.
- **Keep material detail visible.** Shadow maps share GPU texture slots with printed surfaces,
  bump maps, toon ramps and the window projection. The budget prioritizes active key lights;
  some secondary lights can stay lit without their own shadow map when slots are scarce.
- **Quality has a cost.** Full-resolution AO, high pixel density and multiple shadows can be
  demanding. Use the profiling controls below to compare costs on the target browser and device.

</details>

## Tech stack

| Area | Tools |
| --- | --- |
| Front end | Vue 3, Vue Router, Tailwind CSS, VueUse |
| 3D & motion | Three.js, GSAP |
| Sound | Web Audio API (synthesized, no files) |
| Contact | EmailJS |
| AI chat | Node.js + Express API (`my-portfolio-api/`), OpenAI, server-sent events |
| Hosting | Vercel |

## Getting started

Needs a recent Node.js (it's developed on Node 22).

```bash
git clone https://github.com/okasutarto/the-desk.git
cd the-desk
npm install
npm run dev
```

The site runs at `http://localhost:8080`: the desk at `/`, the classic page at `/2d`.

### The AI chat (optional)

The phone and the 2D chatbot talk to a small API in `my-portfolio-api/`.

```bash
cd my-portfolio-api
npm install
echo "OPENAI_API_KEY=sk-..." > .env
node index.js            # listens on port 3000
```

Point the site at it with `VUE_APP_API_URL` in a `.env` at the project root (it defaults to
`http://localhost:3000`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | ESLint |
| `node scripts/check-desk-lighting.cjs` | Time cycle, sky/light alignment, rain, transitions, strip lighting and shadow sampler limits |
| `node scripts/check-desk-quality.cjs` | Resolution, frame scheduling and decorative shadow budgets |
| `node scripts/check-desk-toon-batch.cjs` | Batching, transforms, visibility, picking and material fallbacks |
| `node scripts/check-desk-lightbar.cjs` | Task-light geometry, direction, output and night fade |
| `node scripts/check-desk-guitar-sword-lighting.cjs` | Lit guitar strings and independent sword focus lighting |

Other `scripts/check-*.cjs` files exercise individual props, layout and audio. Run each with
Node; `node scripts/check-*.cjs` does not run every matched file as separate programs. To run
the complete set in a POSIX shell:

```bash
for check in scripts/check-*.cjs; do
  node "$check" || exit $?
done
```

### Development previews and profiling

These phase/weather controls are **development-only**; open them on the dev server:

| URL | Preview |
| --- | --- |
| `/?time=morning` | Hold the morning phase |
| `/?time=day` | Hold midday |
| `/?time=evening` | Hold sunset |
| `/?time=night` | Hold the night phase |
| `/?time=day&rain=1` | Seed a fully rainy midday view; `rain` accepts 0–1 |
| `/?preview=trophy` | Preview the final secret discovery and trophy celebration without changing saved progress |

Without a valid `time` preview, the normal time cycle continues. Live weather and window
interactions can still affect rain after the initial preview state.

Add `?perf` (or `&perf` to an existing query) for FPS, draw calls, triangles, CPU submission,
GPU timing when available, frame p95 and render density. For comparisons, reload with one
benchmark at a time: `?perf&bench=no-ao`, `no-shadows`, `no-pcss`, `no-batch` or `no-ao-cache`.
Benchmark toggles isolate rendering costs; they do not change saved settings. Use a production
build for representative performance comparisons; development compilation and startup can skew
measurements. The `time`/`rain` previews themselves do not override production behaviour.

## Project structure

```
the-desk/
├── public/
│   ├── index.html                # Meta tags and the boot loader
│   ├── og-image.png              # Link preview image
│   ├── readme-desk.jpg           # Daylight README screenshot
│   └── readme-desk-night.jpg     # Nighttime README screenshot
├── src/
│   ├── views/
│   │   ├── DeskPage.vue          # The 3D desk: HUD and hints around the scene
│   │   └── HomePage.vue          # The classic 2D page at /2d
│   ├── components/
│   │   ├── features/desk/
│   │   │   ├── deskScene.js      # Props, lighting, weather, interactions and camera shots
│   │   │   ├── textures.js       # Canvas surfaces and shared sky palettes
│   │   │   ├── toonBatch.js      # Toon batching, shadow proxies and picking fallback
│   │   │   └── desktop.js        # Interactive monitor desktop and apps
│   │   ├── sections/             # 2D page sections
│   │   └── features/             # Chatbot, file drawer, theme switch, …
│   ├── composables/useSfx.js     # The synthesized sound effects
│   ├── data/                     # About notes, experience, projects (shared by 2D and 3D)
│   └── router/
├── my-portfolio-api/             # Express API for the AI chat
└── scripts/                      # Logic checks for the desk
```

The content lives in `src/data/`, and both the 2D page and the desk read from it, so editing a
project or a job updates both.

## Fan touches

The straw hat, the Enma-style katana and the Infinity Gauntlet are fan tributes to *One Piece* and
Marvel. Those characters, names and designs belong to their owners.

## License

The original source code is available under the [MIT License](LICENSE). You can
reuse the room implementation, shaders, synthesized sounds and code structure.

Personal content is excluded: my name, portrait, CV, biography and portfolio
text, all contents of `src/data/`, and portfolio screenshots and preview images
remain reserved. Replace those with your own content when reusing the code.
Third-party assets and the fan tributes above remain subject to their owners'
rights. See [content exclusions](CONTENT_LICENSE.md) for the full scope.

## Contact

**Oka Sutarto Putra** · Full stack developer, Pontianak 🇮🇩

[okasp.dev](https://okasp.dev) · [LinkedIn](https://linkedin.com/in/okasutarto) ·
[GitHub](https://github.com/okasutarto) · okasputra@gmail.com
