// The woods the desk, its monitor riser, the window frame and the game shelf can be made of,
// and the grain each can be cut in. Kept free of three.js so the page's settings panel can
// list them without pulling the scene into its bundle.
//
// `tones` are the boards' base colours, `grain` the grain lines' darkest RGB, `dark`/`light`
// the growth bands, `vein` the gum streaks and `glue` the joints between boards. `tint` is
// the colour the wood's materials are toned by: oak keeps the warm tint the room was built
// with, the rest are painted as they read and left untinted.
export const WOODS = {
  oak: {
    name: "Oak",
    tones: ["#cf9459", "#c4864c", "#d69f65", "#c98d52", "#d29a5f"],
    grain: [90, 44, 14],
    dark: "120, 62, 22",
    light: "255, 220, 170",
    vein: "28, 16, 8",
    glue: "70, 36, 12",
    tint: "#f3d3b0",
    swatch: "#d9a878",
  },
  maple: {
    name: "Maple",
    tones: ["#ecd3ad", "#e6caa0", "#f0d9b6", "#e9cea6", "#eed5b0"],
    grain: [170, 120, 70],
    dark: "160, 110, 60",
    light: "255, 245, 225",
    vein: "120, 80, 40",
    glue: "150, 110, 70",
    tint: "#ffffff",
    swatch: "#ecd3ad",
  },
  ash: {
    name: "White ash",
    tones: ["#d8d2c8", "#cfc8bd", "#ddd7cd", "#d2cbc0", "#d9d3c9"],
    grain: [110, 100, 88],
    dark: "100, 90, 78",
    light: "255, 252, 245",
    vein: "70, 62, 54",
    glue: "120, 110, 98",
    tint: "#ffffff",
    swatch: "#d8d2c8",
  },
  cherry: {
    name: "Cherry",
    tones: ["#b9643f", "#ad5a37", "#c36e48", "#a8553a", "#b8623f"],
    grain: [80, 30, 14],
    dark: "90, 34, 14",
    light: "240, 170, 130",
    vein: "40, 14, 6",
    glue: "70, 26, 10",
    tint: "#ffffff",
    swatch: "#b9643f",
  },
  walnut: {
    name: "Walnut",
    tones: ["#6e4a32", "#634229", "#77513a", "#5d3d27", "#6a472f"],
    grain: [40, 24, 14],
    dark: "30, 18, 10",
    light: "170, 120, 80",
    vein: "20, 12, 6",
    glue: "25, 15, 8",
    tint: "#ffffff",
    swatch: "#6e4a32",
  },
  ebony: {
    name: "Ebony stain",
    tones: ["#3a2c26", "#33261f", "#41322b", "#2f231d", "#3c2e27"],
    grain: [15, 10, 8],
    dark: "10, 6, 4",
    light: "120, 95, 80",
    vein: "0, 0, 0",
    glue: "10, 6, 4",
    tint: "#ffffff",
    swatch: "#3a2c26",
  },
};

export const WOOD_PATTERNS = {
  planks: "Planks",
  cathedral: "Cathedral",
  knotty: "Knotty",
  butcher: "Butcher block",
};

export const SPEAKER_FINISHES = {
  // The Edifier R1280DBs's two models: wood-grain sides on a grey box, or all black (the sides'
  // grain stained dark). `shell` is the top and back, `baffle` the front.
  wood: { name: "Wood sides", color: null, shell: "#4a4c50", baffle: "#64676b" },
  black: { name: "Black", color: "#3a3532", shell: "#252527", baffle: "#3a3b3e" },
};

export const WOOD_TARGETS = {
  desk: "Desk",
  riser: "Monitor riser",
  speakers: "Speakers",
  window: "Window frame",
  shelf: "Game shelf",
};

// Each part's wood until the visitor picks another, and the one its grain is first drawn in
export const DEFAULT_WOODS = {
  desk: { wood: "cherry", pattern: "butcher" },
  riser: { wood: "cherry", pattern: "cathedral" },
  speakers: { wood: "cherry", pattern: "planks", finish: "wood" },
  window: { wood: "cherry", pattern: "planks" },
  shelf: { wood: "cherry", pattern: "planks" },
};
