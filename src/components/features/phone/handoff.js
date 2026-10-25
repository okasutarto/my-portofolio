// Hand-off between the Projects showcase and a project page. A colour band rises over the
// screen and the phone flies across it, so both pages feel like one surface. The band and
// the phone live on <body>, outside the router view, so they survive the route change.
import { drawScreen } from "./screens";

// Each project gets its own band colour (deliberately not the phone-screen colours)
export const BAND_COLORS = ["#ff9ec4", "#ffb35c", "#c4b5fd", "#bef264", "#f0abfc"];
export const bandColor = (index) => BAND_COLORS[index % BAND_COLORS.length];

// What is in flight between the pages
//   band, phone: the elements covering the screen
//   returnTo:    index of the project the showcase should land on when coming back
export const handoff = { band: null, phone: null, returnTo: null };

export function createBand(color) {
  const band = document.createElement("div");
  band.className = "handoff-band";
  band.style.backgroundColor = color;
  document.body.appendChild(band);
  return band;
}

// A copy of the phone, fixed at `rect`, showing the project's screen
export function createPhone(project, rect) {
  const phone = document.createElement("div");
  phone.className = "phone-frame handoff-phone";
  phone.innerHTML = '<div class="phone-screen"><span class="phone-island"></span><canvas width="600" height="1280"></canvas></div>';
  Object.assign(phone.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px` });
  drawScreen(phone.querySelector("canvas").getContext("2d"), project);
  document.body.appendChild(phone);
  return phone;
}

// Tween values that move (and resize) the flying phone from where it is now onto `rect`
export function flyTo(phone, rect) {
  const from = phone.getBoundingClientRect();
  return { x: `+=${rect.left - from.left}`, y: `+=${rect.top - from.top}`, width: rect.width };
}

export function clearHandoff() {
  if (handoff.band) handoff.band.remove();
  if (handoff.phone) handoff.phone.remove();
  handoff.band = handoff.phone = null;
  handoff.returnTo = null;
}
