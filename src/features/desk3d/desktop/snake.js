import { DISPLAY, BODY } from "../textures/base";
import { roundRect } from "./canvas";

// ---------- Snake ----------
const SNAKE_COLS = 16;
const SNAKE_ROWS = 12;
const CELL = 12;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEY_DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
const readBest = () => {
  try {
    return Number(localStorage.getItem("snake-best")) || 0;
  } catch {
    return 0;
  }
};
function createSnake(sound) {
  const game = { state: "ready", body: [], dir: "right", queue: [], food: null, score: 0, best: readBest(), stepAt: 0 };
  const placeFood = () => {
    const free = [];
    for (let x = 0; x < SNAKE_COLS; x++) for (let y = 0; y < SNAKE_ROWS; y++) if (!game.body.some((p) => p.x === x && p.y === y)) free.push({ x, y });
    game.food = free[Math.floor(Math.random() * free.length)];
  };
  game.reset = (dir = "right") => {
    Object.assign(game, { state: "play", body: [{ x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }], dir: "right", queue: [dir], score: 0, stepAt: 0 });
    placeFood();
  };
  // A turn (or a start): turns are queued so two quick ones both land, and never straight back
  game.steer = (dir) => {
    if (game.state !== "play") return game.reset(dir === "left" ? "right" : dir);
    const last = game.queue[game.queue.length - 1] || game.dir;
    const [dx, dy] = DIRS[dir];
    const [lx, ly] = DIRS[last];
    if (dx === -lx && dy === -ly) return;
    if (game.queue.length < 3) game.queue.push(dir);
  };
  game.step = (t) => {
    if (game.state !== "play") return;
    if (!game.stepAt) game.stepAt = t;
    const every = Math.max(0.07, 0.14 - game.score * 0.004);
    if (t - game.stepAt > 1) game.stepAt = t;
    while (t - game.stepAt >= every && game.state === "play") {
      game.stepAt += every;
      if (game.queue.length) game.dir = game.queue.shift();
      const [dx, dy] = DIRS[game.dir];
      const head = { x: game.body[0].x + dx, y: game.body[0].y + dy };
      const hit = head.x < 0 || head.y < 0 || head.x >= SNAKE_COLS || head.y >= SNAKE_ROWS || game.body.slice(0, -1).some((p) => p.x === head.x && p.y === head.y);
      if (hit) {
        game.state = "over";
        if (game.score > game.best) {
          game.best = game.score;
          try {
            localStorage.setItem("snake-best", String(game.best));
          } catch {
            // The best score just isn't kept between visits
          }
        }
        sound("buzz");
        return;
      }
      game.body.unshift(head);
      if (head.x === game.food.x && head.y === game.food.y) {
        game.score++;
        sound("pop");
        placeFood();
      } else game.body.pop();
    }
  };
  return game;
}
function drawSnake(c, w, h, game, hotspots) {
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#1a1714";
  c.textBaseline = "middle";
  c.font = `800 8px ${DISPLAY}`;
  c.fillText(`SCORE ${game.score}`, 10, 10);
  c.textAlign = "right";
  c.fillText(`BEST ${Math.max(game.best, game.score)}`, w - 10, 10);
  c.textAlign = "left";
  const bx = (w - SNAKE_COLS * CELL) / 2;
  const by = 20;
  c.fillStyle = "#1a1714";
  c.fillRect(bx - 2, by - 2, SNAKE_COLS * CELL + 4, SNAKE_ROWS * CELL + 4);
  for (let x = 0; x < SNAKE_COLS; x++) for (let y = 0; y < SNAKE_ROWS; y++) {
    c.fillStyle = (x + y) % 2 ? "#2a2724" : "#24211f";
    c.fillRect(bx + x * CELL, by + y * CELL, CELL, CELL);
  }
  // a coffee bean to eat
  if (game.food) {
    const fx = bx + game.food.x * CELL + CELL / 2;
    const fy = by + game.food.y * CELL + CELL / 2;
    c.fillStyle = "#a0622d";
    c.beginPath();
    c.ellipse(fx, fy, 4.2, 3.2, 0.6, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#3b2312";
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(fx - 2.4, fy - 1.6);
    c.quadraticCurveTo(fx, fy + 0.8, fx + 2.4, fy + 1.6);
    c.stroke();
  }
  game.body.forEach((p, i) => {
    c.fillStyle = i === 0 ? "#22c55e" : "#8fd694";
    c.fillRect(bx + p.x * CELL + 1, by + p.y * CELL + 1, CELL - 2, CELL - 2);
    if (i === 0) {
      // Two eyes either side of the way it's heading
      c.fillStyle = "#1a1714";
      const [dx, dy] = DIRS[game.dir];
      const cx = bx + p.x * CELL + CELL / 2 + dx * 2;
      const cy = by + p.y * CELL + CELL / 2 + dy * 2;
      [-1, 1].forEach((side) => c.fillRect(cx - dy * 2.6 * side - 1, cy + dx * 2.6 * side - 1, 2, 2));
    }
  });
  if (game.state !== "play") {
    c.fillStyle = "rgba(26,23,20,.75)";
    c.fillRect(bx, by, SNAKE_COLS * CELL, SNAKE_ROWS * CELL);
    c.fillStyle = "#ffdd00";
    c.textAlign = "center";
    c.font = `800 10px ${DISPLAY}`;
    c.fillText(game.state === "over" ? "GAME OVER" : "SNAKE", w / 2, by + SNAKE_ROWS * CELL / 2 - 8);
    c.fillStyle = "#fffdf5";
    c.font = `600 8px ${BODY}`;
    c.fillText(game.state === "over" ? "an arrow or a tap to play again" : "press an arrow (or WASD) to start", w / 2, by + SNAKE_ROWS * CELL / 2 + 8);
    c.textAlign = "left";
  }
  hotspots.push({ id: "snakeStart", x: bx, y: by, w: SNAKE_COLS * CELL, h: SNAKE_ROWS * CELL });
  // On-screen arrows, for touch screens
  const py = by + SNAKE_ROWS * CELL + 8;
  [["left", "◀"], ["up", "▲"], ["down", "▼"], ["right", "▶"]].forEach(([dir, glyph], i) => {
    const x = w / 2 - 66 + i * 34;
    c.fillStyle = "#1a1714";
    roundRect(c, x + 2, py + 2, 30, 18, 4);
    c.fill();
    c.fillStyle = "#ffdd00";
    roundRect(c, x, py, 30, 18, 4);
    c.fill();
    c.lineWidth = 1.5;
    c.strokeStyle = "#1a1714";
    c.stroke();
    c.fillStyle = "#1a1714";
    c.textAlign = "center";
    c.font = `800 9px ${BODY}`;
    c.fillText(glyph, x + 15, py + 9.5);
    c.textAlign = "left";
    hotspots.push({ id: "snakeDir", dir, x, y: py, w: 30, h: 18 });
  });
}

export { KEY_DIRS, createSnake, drawSnake };
