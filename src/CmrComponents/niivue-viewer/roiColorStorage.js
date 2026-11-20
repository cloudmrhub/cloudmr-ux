/**
 * Remembers the custom ROI colours a user adds with the "+" picker, in the browser's
 * localStorage, keyed per user. Survives logout/login and browser restarts on the same browser;
 * it is not shared across browsers/devices (no backend involved).
 *
 * Only colours the user added themselves are stored (a plain list of "#rrggbb"). Colours that
 * arrive with a loaded ROI are NOT stored here: they belong to that ROI (saved in its zip).
 */
import { MAX_ROI_LABEL, normalizeHex } from "./roiLabelModel";

const STORAGE_PREFIX = "cloudmr:roiCustomColors:";
/** Label 1 is the default colour, so at most 254 custom colours fit. */
const MAX_CUSTOM_COLORS = MAX_ROI_LABEL - 1;

function storageKey(userKey) {
  return STORAGE_PREFIX + String(userKey).trim().toLowerCase();
}

function getStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch (e) {
    // access can throw (e.g. blocked storage / privacy mode)
    return null;
  }
}

/** @returns {string[]} normalised "#rrggbb" colours, oldest first. */
export function loadCustomRoiColors(userKey) {
  const storage = getStorage();
  if (!storage || !userKey) {
    return [];
  }
  try {
    const parsed = JSON.parse(storage.getItem(storageKey(userKey)) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out = [];
    parsed.forEach((c) => {
      const n = normalizeHex(c);
      if (n && out.indexOf(n) < 0 && out.length < MAX_CUSTOM_COLORS) {
        out.push(n);
      }
    });
    return out;
  } catch (e) {
    return [];
  }
}

/** Remove one colour from the user's saved list (no-op if it isn't there). */
export function forgetCustomRoiColor(userKey, hex) {
  const storage = getStorage();
  const n = normalizeHex(hex);
  if (!storage || !userKey || !n) {
    return;
  }
  const colors = loadCustomRoiColors(userKey);
  const next = colors.filter((c) => c !== n);
  if (next.length === colors.length) {
    return;
  }
  try {
    storage.setItem(storageKey(userKey), JSON.stringify(next));
  } catch (e) {
    // blocked storage: nothing else to do
  }
}

/** Add one colour to the user's saved list (no-op for duplicates / missing user). */
export function rememberCustomRoiColor(userKey, hex) {
  const storage = getStorage();
  const n = normalizeHex(hex);
  if (!storage || !userKey || !n) {
    return;
  }
  const colors = loadCustomRoiColors(userKey);
  if (colors.indexOf(n) >= 0 || colors.length >= MAX_CUSTOM_COLORS) {
    return;
  }
  colors.push(n);
  try {
    storage.setItem(storageKey(userKey), JSON.stringify(colors));
  } catch (e) {
    // quota exceeded / blocked: colours just stay session-only
  }
}
