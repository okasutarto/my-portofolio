// Shared layout for the stacked (mobile) phone showcase, used by both the three.js
// scene (to size/place the phone) and the Vue component (to place the text under it).

export const STACKED_QUERY = "(max-width: 767px)";

// Space taken by the sticky navbar, plus a little breathing room
export function topInset() {
  const nav = document.querySelector("nav");
  return (nav ? nav.offsetHeight : 72) + 12;
}

// Phone height in px for a viewport of height h: big, but it always ends above ~54%
// of the screen so the text below has room even on short phones.
export function stackedPhoneHeight(h, inset = topInset()) {
  return Math.max(160, Math.min(h * 0.42, h * 0.54 - inset));
}
