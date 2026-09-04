/** Default number of drawing steps that can be undone. */
export const DEFAULT_MAX_DRAW_UNDOS = 10;
export const MIN_MAX_DRAW_UNDOS = 1;
/** Upper bound we expose in the UI (NiiVue has no hard cap). */
export const MAX_MAX_DRAW_UNDOS = 50;

export function clampMaxDrawUndoBitmaps(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_MAX_DRAW_UNDOS;
  return Math.max(MIN_MAX_DRAW_UNDOS, Math.min(MAX_MAX_DRAW_UNDOS, n));
}

/** Snapshots kept = undo steps + current state. */
export function maxDrawHistorySlots(maxUndos) {
  return clampMaxDrawUndoBitmaps(maxUndos) + 1;
}

export function canDrawUndo(nv) {
  return (nv?.currentDrawUndoBitmap ?? 0) > 0;
}

export function canDrawRedo(nv) {
  const n = nv?.drawUndoBitmaps?.length ?? 0;
  return n > 0 && (nv.currentDrawUndoBitmap ?? -1) < n - 1;
}

/**
 * Drop oldest snapshots so history fits `maxUndos` undo steps.
 * Does not wipe the current drawing.
 */
export function compactDrawUndoHistory(nv) {
  if (!nv) return;
  const maxSlots = maxDrawHistorySlots(nv.opts?.maxDrawUndoBitmaps);
  if (!Array.isArray(nv.drawUndoBitmaps)) {
    nv.drawUndoBitmaps = [];
    nv.currentDrawUndoBitmap = -1;
    return;
  }
  while (nv.drawUndoBitmaps.length > maxSlots) {
    nv.drawUndoBitmaps.shift();
    nv.currentDrawUndoBitmap = (nv.currentDrawUndoBitmap ?? 0) - 1;
  }
  if (nv.drawUndoBitmaps.length === 0) {
    nv.currentDrawUndoBitmap = -1;
  } else if (nv.currentDrawUndoBitmap < 0) {
    nv.currentDrawUndoBitmap = 0;
  } else if (nv.currentDrawUndoBitmap > nv.drawUndoBitmaps.length - 1) {
    nv.currentDrawUndoBitmap = nv.drawUndoBitmaps.length - 1;
  }
}

/**
 * Set the undo-step limit without clearing history (except trimming oldest).
 */
export function applyMaxDrawUndoBitmaps(nv, value) {
  const max = clampMaxDrawUndoBitmaps(value);
  if (!nv) return max;

  nv.opts.maxDrawUndoBitmaps = max;
  compactDrawUndoHistory(nv);

  if (
    (!nv.drawUndoBitmaps || nv.drawUndoBitmaps.length === 0) &&
    nv.drawBitmap &&
    nv.drawBitmap.length > 0 &&
    typeof nv.drawAddUndoBitmap === "function"
  ) {
    nv.drawAddUndoBitmap();
  }

  nv.onDrawHistoryChange?.();
  return max;
}
