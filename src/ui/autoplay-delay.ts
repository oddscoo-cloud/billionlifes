export const autoplayDelays = [1, 3, 5, 10, 15] as const;
export type AutoplayDelay = (typeof autoplayDelays)[number];

const preferenceKey = 'billionlifes.autoplayDelay';
const defaultDelay: AutoplayDelay = 5;

export function readAutoplayDelay(): AutoplayDelay {
  try {
    const saved = Number(window.localStorage.getItem(preferenceKey));
    return autoplayDelays.find((delay) => delay === saved) ?? defaultDelay;
  } catch {
    return defaultDelay;
  }
}

export function writeAutoplayDelay(delay: AutoplayDelay): void {
  try {
    window.localStorage.setItem(preferenceKey, String(delay));
  } catch {
    // The speed stays available for the current session.
  }
}
