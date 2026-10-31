import { BODY } from "../textures/base";

// ---------- VS Kode: an editor that writes code by itself ----------
const MONO = "ui-monospace, Menlo, monospace";
const CODE_FILES = [
  {
    name: "hireOka.ts",
    lang: "TypeScript",
    text: `// hireOka.ts: the one function every team needs
import { coffee, ship } from "./life";

type Offer = { role: string; remote: boolean };

export async function hireOka(offer: Offer) {
  const dev = await coffee("double shot");
  if (!offer.remote) dev.pack("laptop");
  return ship({
    who: "Oka Sutarto Putra",
    stack: ["Vue", "React", "Flutter", "Node"],
    vibe: "neo-brutal",
    bugs: 0, // most days
  });
}`,
  },
  {
    name: "Desk.vue",
    lang: "Vue",
    text: `<template>
  <div class="desk" @click="explore">
    <Cat name="Oyen" :asleep="!night" />
    <Monitor app="Spotifree" lofi />
  </div>
</template>

<script setup>
import { ref } from "vue";
const night = ref(new Date().getHours() > 18);
const explore = () => console.log("almost everything clicks");
</script>`,
  },
  {
    name: "coffee.js",
    lang: "JavaScript",
    text: `// coffee.js: the real build step
const cups = [];

export function brew(strength = 2) {
  for (let i = 0; i < strength; i++) {
    cups.push({ hot: true, at: Date.now() });
  }
  return cups.length > 3 ? "ship it" : "one more";
}`,
  },
];
const KEYWORDS = new Set(["const", "let", "function", "return", "if", "else", "for", "export", "default", "import", "from", "await", "async", "new", "true", "false", "null", "type", "class"]);
const SYNTAX = { keyword: "#ff90e8", string: "#8fd694", comment: "#7a7f99", number: "#ffb35c", call: "#7fb2ff", tag: "#ffdd00", plain: "#e8e6f0" };
// Splits a line into coloured runs
function tokenize(line) {
  const out = [];
  const re = /(\/\/.*$)|("[^"]*"?|'[^']*'?|`[^`]*`?)|(<\/?[A-Za-z]+)|(\b\d+\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line))) {
    const [text, comment, str, tag, num, call, word] = m;
    const kind = comment ? "comment" : str ? "string" : tag ? "tag" : num ? "number" : call ? (KEYWORDS.has(call) ? "keyword" : "call") : word && KEYWORDS.has(word) ? "keyword" : "plain";
    out.push([text, SYNTAX[kind]]);
  }
  return out;
}
// The keystrokes for a file: every character, with the odd typo typed and rubbed out
function keystrokes(text) {
  const ops = [];
  for (const ch of text) {
    if (/[a-z]/.test(ch) && Math.random() < 0.025) ops.push(String.fromCharCode(97 + Math.floor(Math.random() * 26)), "\b");
    ops.push(ch);
  }
  return ops;
}
function createTypist() {
  const state = { file: 0, ops: keystrokes(CODE_FILES[0].text), at: 0, text: "", next: 0, doneAt: null, fastUntil: 0 };
  // Catch up to time t: a human-ish rhythm, a beat after every line, now and then a long think
  state.step = (t) => {
    if (t - state.next > 1) state.next = t;
    for (let n = 0; n < 12 && t >= state.next; n++) {
      if (state.at >= state.ops.length) {
        if (state.doneAt === null) state.doneAt = t;
        if (t - state.doneAt < 3) return;
        state.file = (state.file + 1) % CODE_FILES.length;
        Object.assign(state, { ops: keystrokes(CODE_FILES[state.file].text), at: 0, text: "", doneAt: null });
      }
      const op = state.ops[state.at++];
      state.text = op === "\b" ? state.text.slice(0, -1) : state.text + op;
      let wait = op === "\n" ? 0.28 : op === "\b" ? 0.12 : 0.035 + Math.random() * 0.07;
      if (op === " " && Math.random() < 0.04) wait += 0.7;
      if (t < state.fastUntil) wait /= 3;
      state.next = Math.max(state.next, t - 0.05) + wait;
    }
  };
  return state;
}
function drawCode(c, w, h, typist, t) {
  const file = CODE_FILES[typist.file];
  const ACT = 24;
  const SIDE = 92;
  const TABS = 18;
  const STATUS = 14;
  c.fillStyle = "#1a1b26";
  c.fillRect(0, 0, w, h);
  // activity bar and explorer
  c.fillStyle = "#13141c";
  c.fillRect(0, 0, ACT, h);
  ["#e8e6f0", "#5b5f7a", "#5b5f7a", "#5b5f7a"].forEach((color, i) => {
    c.strokeStyle = color;
    c.lineWidth = 1.4;
    c.strokeRect(7, 9 + i * 22, 10, 10);
  });
  c.fillStyle = "#20212d";
  c.fillRect(ACT, 0, SIDE, h);
  c.textBaseline = "top";
  c.font = `700 7px ${BODY}`;
  c.fillStyle = "#8a8fab";
  c.fillText("EXPLORER", ACT + 8, 7);
  c.fillText("▾ PORTFOLIO", ACT + 8, 20);
  CODE_FILES.forEach((f, i) => {
    const y = 32 + i * 13;
    if (i === typist.file) {
      c.fillStyle = "#2f3145";
      c.fillRect(ACT, y - 2, SIDE, 13);
    }
    c.font = `500 8px ${BODY}`;
    c.fillStyle = i === typist.file ? "#fff" : "#a9adc6";
    c.fillText(f.name, ACT + 16, y);
  });
  const ex = ACT + SIDE;
  // tab
  c.fillStyle = "#13141c";
  c.fillRect(ex, 0, w - ex, TABS);
  c.fillStyle = "#1a1b26";
  c.fillRect(ex, 0, 84, TABS);
  c.fillStyle = "#ffdd00";
  c.fillRect(ex, 0, 84, 2);
  c.fillStyle = "#e8e6f0";
  c.font = `500 8px ${BODY}`;
  c.fillText(file.name, ex + 9, 5);
  c.fillText(typist.at < typist.ops.length ? "●" : "×", ex + 72, 5);
  // code
  const LINE = 11;
  const lines = typist.text.split("\n");
  const rows = Math.floor((h - TABS - STATUS - 6) / LINE);
  const first = Math.max(0, lines.length - rows);
  c.font = `500 8.5px ${MONO}`;
  for (let i = first; i < lines.length; i++) {
    const y = TABS + 4 + (i - first) * LINE;
    c.fillStyle = i === lines.length - 1 ? "#e8e6f0" : "#4b4f68";
    c.textAlign = "right";
    c.fillText(String(i + 1), ex + 20, y);
    c.textAlign = "left";
    let x = ex + 28;
    tokenize(lines[i]).forEach(([text, color]) => {
      c.fillStyle = color;
      c.fillText(text, x, y);
      x += c.measureText(text).width;
    });
    if (i === lines.length - 1 && Math.floor(t * 2) % 2 === 0) {
      c.fillStyle = "#ffdd00";
      c.fillRect(x + 1, y - 1, 1.5, 10);
    }
  }
  // status bar
  const last = lines[lines.length - 1];
  c.fillStyle = "#4f7cff";
  c.fillRect(0, h - STATUS, w, STATUS);
  c.fillStyle = "#fff";
  c.font = `600 7.5px ${BODY}`;
  c.textBaseline = "middle";
  c.fillText("⎇ main   ✓ 0 problems", 8, h - STATUS / 2);
  c.textAlign = "right";
  c.fillText(`Ln ${lines.length}, Col ${last.length + 1}   ${file.lang}`, w - 8, h - STATUS / 2);
  c.textAlign = "left";
}

export { createTypist, drawCode };
