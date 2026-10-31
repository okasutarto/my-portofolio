import { BODY, DISPLAY, brutalBox, wrap } from "./base";

// ---------- phone: a chat with the desk's AI assistant ----------
// `chat` is the scene's live state ({ messages, input, active, waiting, scroll }); the
// renderer writes chat.maxScroll back so the wheel can clamp.
export const CHAT_QUESTIONS = [
  { label: "Experience", color: "#ffdd00", text: "What is Oka's work experience?" },
  { label: "Tech stack", color: "#00e0c6", text: "What is Oka's tech stack?" },
  { label: "Projects", color: "#ff6b6b", text: "What projects has Oka built?" },
  { label: "Hire Oka", color: "#3b82f6", text: "How can I contact Oka to hire him?" },
];
// Markdown down to plain text. A reply still streaming in can hold an unclosed "**": drop it too.
const plain = (text) => text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

// The assistant's robot, drawn as in the 2D chat (BotFace.vue): its 40×40 box placed at (x, y),
// `size` wide; mouth open while it's replying
function drawBotFace(c, x, y, size, talking) {
  c.save();
  c.translate(x, y);
  c.scale(size / 40, size / 40);
  c.strokeStyle = "#000";
  c.lineCap = "round";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(20, 3);
  c.lineTo(20, 9);
  c.stroke();
  c.beginPath();
  c.arc(20, 4, 3, 0, Math.PI * 2);
  c.fillStyle = "#ff5c8a";
  c.fill();
  c.lineWidth = 2;
  c.stroke();
  c.beginPath();
  c.roundRect(5, 9, 30, 25, 5);
  c.fillStyle = "#fff";
  c.fill();
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = "#000";
  for (const eyeX of [12, 23]) {
    c.beginPath();
    c.roundRect(eyeX, 16, 5, 7, 1.5);
    c.fill();
  }
  c.beginPath();
  if (talking) {
    c.ellipse(20, 28.5, 4, 2.6, 0, 0, Math.PI * 2);
    c.fill();
  } else {
    c.moveTo(15, 28);
    c.quadraticCurveTo(20, 31, 25, 28);
    c.lineWidth = 2.5;
    c.stroke();
  }
  c.restore();
}

export function drawChatScreen(c, w, h, chat, { unread = false, caret = false, now = new Date() } = {}) {
  const hotspots = [];
  c.fillStyle = "#fffdf5";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,.08)";
  for (let y = 12; y < h; y += 30) for (let x = 12; x < w; x += 30) c.fillRect(x, y, 4, 4);

  // messages between the header and the input bar: from the top while they fit, then laid out
  // bottom-up from the newest (scrolling back through the older ones)
  const top = 180;
  // Laid out clear of the input panel (h - 182), with room for the bubbles' outline and shadow
  const bottom = h - 202;
  const maxW = w * 0.78;
  c.font = `500 25px ${BODY}`;
  const laid = chat.messages.map((m) => {
    // A reply that hasn't started yet shows as a "typing" bubble of three bouncing dots
    if (m.pending && !m.text) return { m, typing: true, lines: [], height: 63 };
    const text = plain(m.text);
    const lines = text.split("\n").flatMap((para) => wrap(c, para, maxW - 40, 40));
    return { m, lines, height: lines.length * 33 + 30 };
  });
  const total = laid.reduce((sum, l) => sum + l.height + 18, 0);
  chat.maxScroll = Math.max(0, total - (bottom - top));
  chat.scroll = Math.min(chat.scroll || 0, chat.maxScroll);
  c.save();
  c.beginPath();
  c.rect(0, top, w, h - 182 - top);
  c.clip();
  let y = bottom + chat.scroll - Math.max(0, bottom - top - total);
  for (let i = laid.length - 1; i >= 0; i--) {
    const { m, lines, height, typing } = laid[i];
    y -= height;
    if (y > bottom || y + height < top) {
      y -= 18;
      continue;
    }
    const mine = m.sender === "user";
    if (typing) {
      brutalBox(c, 26, y, 120, height, "#fff", { shadow: 6, line: 4, radius: [30, 30, 30, 8] });
      const t = Date.now() / 1000;
      c.fillStyle = "#000";
      for (let k = 0; k < 3; k++) {
        const lift = Math.max(0, Math.sin(t * 7 - k * 0.9)) * 9;
        c.beginPath();
        c.arc(56 + k * 30, y + height / 2 + 2 - lift, 7, 0, Math.PI * 2);
        c.fill();
      }
      y -= 18;
      continue;
    }
    const bw = Math.min(maxW, Math.max(...lines.map((l) => c.measureText(l).width)) + 40);
    const x = mine ? w - bw - 26 : 26;
    brutalBox(c, x, y, bw, height, mine ? "#00e0c6" : "#fff", { shadow: 6, line: 4, radius: mine ? [30, 30, 8, 30] : [30, 30, 30, 8] });
    c.fillStyle = "#000";
    c.textBaseline = "top";
    lines.forEach((line, j) => c.fillText(line, x + 22, y + 16 + j * 33));
    y -= 18;
  }
  // empty chat: a hello and quick questions
  if (!chat.messages.length) {
    brutalBox(c, 26, top + 20, w - 120, 100, "#fff", { shadow: 6, line: 4, radius: [30, 30, 30, 8] });
    c.fillStyle = "#000";
    c.textBaseline = "top";
    c.font = `500 25px ${BODY}`;
    c.fillText("hey there! i'm oka's robot", 48, top + 40);
    c.fillText("sidekick. ask me anything :)", 48, top + 74);
    c.font = `700 22px ${BODY}`;
    c.fillText("or try one of these", 30, top + 160);
    CHAT_QUESTIONS.forEach((q, i) => {
      const box = { x: 26 + (i % 2) * ((w - 70) / 2 + 18), y: top + 200 + Math.floor(i / 2) * 100, w: (w - 70) / 2, h: 76 };
      brutalBox(c, box.x, box.y, box.w, box.h, q.color, { shadow: 6, line: 4, radius: box.h / 2 });
      c.fillStyle = q.color === "#3b82f6" ? "#fff" : "#000";
      c.font = `800 22px ${DISPLAY}`;
      c.textBaseline = "middle";
      c.textAlign = "center";
      c.fillText(q.label, box.x + box.w / 2, box.y + box.h / 2 + 2);
      c.textAlign = "left";
      hotspots.push({ ...box, id: "ask", text: q.text });
    });
  }
  c.restore();

  // header
  c.fillStyle = "#ffdd00";
  c.fillRect(0, 0, w, 160);
  c.fillStyle = "#000";
  c.fillRect(0, 157, w, 4);
  c.textBaseline = "middle";
  c.font = `700 24px ${BODY}`;
  c.fillText(now.toTimeString().slice(0, 5), 44, 36);
  // Signal bars, wi-fi and battery on the right of the status bar
  c.fillStyle = "#000";
  [8, 12, 16, 20].forEach((bh, i) => c.fillRect(w - 182 + i * 9, 46 - bh, 6, bh));
  c.beginPath();
  c.moveTo(w - 128, 34);
  c.arc(w - 128, 46, 14, -Math.PI * 0.75, -Math.PI * 0.25);
  c.closePath();
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = "#000";
  c.beginPath();
  c.roundRect(w - 100, 25, 46, 22, 6);
  c.stroke();
  c.fillRect(w - 96, 29, 32, 14);
  c.fillRect(w - 52, 32, 4, 8);
  // Dynamic Island
  c.fillStyle = "#000";
  c.beginPath();
  c.roundRect(w / 2 - 75, 16, 150, 40, 20);
  c.fill();
  // The assistant's robot on a white tile, tilted like the 2D chat's header
  c.save();
  c.translate(64, 104);
  c.rotate(-0.1);
  c.translate(-64, -104);
  brutalBox(c, 28, 68, 72, 72, "#fff", { shadow: 5, line: 4, radius: 20 });
  drawBotFace(c, 36, 74, 56, chat.waiting);
  c.restore();
  c.fillStyle = "#000";
  c.font = `800 28px ${DISPLAY}`;
  c.fillText("Desk AI", 122, 92);
  c.font = `700 20px ${BODY}`;
  c.fillStyle = chat.waiting ? "#b45309" : "#166534";
  c.fillText(chat.waiting ? "● typing…" : "● online · replies fast", 122, 124);
  if (unread) {
    c.fillStyle = "#ff5c8a";
    c.beginPath();
    c.arc(w - 60, 92, 34, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = "#000";
    c.stroke();
    c.fillStyle = "#000";
    c.font = `800 30px ${DISPLAY}`;
    c.textAlign = "center";
    c.fillText("1", w - 60, 95);
    c.textAlign = "left";
  }

  // input bar + send
  const bar = { x: 26, y: h - 160, w: w - 150, h: 96 };
  c.fillStyle = "#fffdf5";
  c.fillRect(0, h - 182, w, 182);
  c.fillStyle = "#000";
  c.fillRect(0, h - 182, w, 4);
  brutalBox(c, bar.x, bar.y, bar.w, bar.h, chat.active ? "#fff" : "#f4f1ea", { shadow: 5, line: chat.active ? 6 : 4, radius: bar.h / 2 });
  c.font = `500 25px ${BODY}`;
  c.textBaseline = "middle";
  // Show the end of a long draft
  let shown = chat.input;
  while (shown && c.measureText(shown).width > bar.w - 70) shown = shown.slice(1);
  c.fillStyle = chat.input ? "#000" : "rgba(0,0,0,.4)";
  c.fillText(chat.input ? shown : "Type a message…", bar.x + 32, bar.y + bar.h / 2);
  if (caret) c.fillRect(bar.x + 34 + (chat.input ? c.measureText(shown).width : 0), bar.y + 26, 4, 44);
  hotspots.push({ ...bar, id: "input" });
  const send = { x: w - 110, y: h - 160, w: 84, h: 96 };
  brutalBox(c, send.x, send.y, send.w, send.h, chat.input.trim() && !chat.waiting ? "#ffdd00" : "#ddd", { shadow: 5, line: 4, radius: 42 });
  c.fillStyle = "#000";
  c.font = `800 38px ${BODY}`;
  c.textAlign = "center";
  c.fillText("➤", send.x + send.w / 2, send.y + send.h / 2 + 2);
  c.textAlign = "left";
  hotspots.push({ ...send, id: "send" });
  c.textBaseline = "alphabetic";
  return hotspots;
}

