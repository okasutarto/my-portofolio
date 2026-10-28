// The parts of the day the room can show, and the weather outside its window, as the
// settings panel offers them. Kept free of three.js so the page can list them without pulling
// the scene into its bundle.
//
// "auto" follows the visitor: their own clock for the time of day, and the weather where they
// are (roughly, from their time zone) for the rain.
export const DAY_PARTS = { morning: "Morning", day: "Midday", evening: "Evening", night: "Night" };
export const TIME_MODES = { auto: "Auto", ...DAY_PARTS };
export const RAIN_MODES = { auto: "Auto", clear: "Clear", rain: "Rain" };
export const DEFAULT_TIME = "auto";
export const DEFAULT_RAIN = "auto";

// The visitor's local hour as a part of the day: morning from five, midday from ten, evening
// from four in the afternoon and night from seven
export function partOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "evening";
  return "night";
}

// The part of the day a time mode shows right now
export const partFor = (mode, date) => (DAY_PARTS[mode] ? mode : partOfDay(date));
