import { NI_PEN_TYPE } from "./niivuePenType";
import { voxFromMouse } from "./polylinePenUtils";

/** @typedef {'rectangle' | 'ellipse'} ShapeDraftKind */

/**
 * @typedef {Object} ShapeDraft
 * @property {[number, number, number]} ptA
 * @property {[number, number, number]} ptB
 * @property {number} penValue
 * @property {number} axCorSag
 * @property {number} penType
 * @property {Uint8Array} baseBitmap
 */

export function penTypeToKind(penType) {
  return penType === NI_PEN_TYPE.ELLIPSE ? "ellipse" : "rectangle";
}

export function normalizeBounds(ptA, ptB, dims) {
  const dx = dims[1];
  const dy = dims[2];
  const dz = dims[3];
  return {
    x1: Math.min(Math.max(Math.min(ptA[0], ptB[0]), 0), dx - 1),
    y1: Math.min(Math.max(Math.min(ptA[1], ptB[1]), 0), dy - 1),
    z1: Math.min(Math.max(Math.min(ptA[2], ptB[2]), 0), dz - 1),
    x2: Math.min(Math.max(Math.max(ptA[0], ptB[0]), 0), dx - 1),
    y2: Math.min(Math.max(Math.max(ptA[1], ptB[1]), 0), dy - 1),
    z2: Math.min(Math.max(Math.max(ptA[2], ptB[2]), 0), dz - 1),
  };
}

/** @returns {[number, number, number][]} four corners on the draft slice plane */
export function boundsToCorners(bounds, axCorSag) {
  const { x1, y1, z1, x2, y2, z2 } = bounds;
  if (axCorSag === 0) {
    const z = Math.round((z1 + z2) / 2);
    return [
      [x1, y1, z],
      [x2, y1, z],
      [x1, y2, z],
      [x2, y2, z],
    ];
  }
  if (axCorSag === 1) {
    const y = Math.round((y1 + y2) / 2);
    return [
      [x1, y, z1],
      [x2, y, z1],
      [x1, y, z2],
      [x2, y, z2],
    ];
  }
  const x = Math.round((x1 + x2) / 2);
  return [
    [x, y1, z1],
    [x, y2, z1],
    [x, y1, z2],
    [x, y2, z2],
  ];
}

export function cornersToPtAB(corners) {
  return {
    ptA: [...corners[0]],
    ptB: [...corners[3]],
  };
}

export function isDraftTooSmall(ptA, ptB) {
  return (
    Math.abs(ptA[0] - ptB[0]) < 1 &&
    Math.abs(ptA[1] - ptB[1]) < 1 &&
    Math.abs(ptA[2] - ptB[2]) < 1
  );
}

/** @param {ShapeDraft} draft */
export function redrawDraftShape(nv, draft) {
  if (!nv?.drawBitmap || !draft?.baseBitmap) return;
  nv.drawBitmap.set(draft.baseBitmap);
  nv.drawPenAxCorSag = draft.axCorSag;
  if (draft.penType === NI_PEN_TYPE.RECTANGLE) {
    nv.drawRectangleMask(draft.ptA, draft.ptB, draft.penValue);
  } else {
    nv.drawEllipseMask(draft.ptA, draft.ptB, draft.penValue);
  }
  nv.refreshDrawing(false, false);
  nv.drawScene();
}

export function clientToCanvasPos(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
}

export function canvasDeltaToVoxDelta(nv, startCanvas, endCanvas) {
  const f0 = nv.canvasPos2frac(startCanvas);
  const f1 = nv.canvasPos2frac(endCanvas);
  if (!f0 || !f1 || f0[0] < 0 || f1[0] < 0) {
    return [0, 0, 0];
  }
  const v0 = nv.frac2vox(f0);
  const v1 = nv.frac2vox(f1);
  return [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
}

export function translatePt(pt, delta) {
  return [pt[0] + delta[0], pt[1] + delta[1], pt[2] + delta[2]];
}

export function voxUnderClient(nv, clientX, clientY) {
  const canvas = nv.canvas || document.getElementById("niiCanvas");
  if (!canvas) return null;
  const canvasPos = clientToCanvasPos(canvas, clientX, clientY);
  const frac = nv.canvasPos2frac(canvasPos);
  if (!frac || frac[0] < 0) return null;
  const vox = nv.frac2vox(frac);
  return [vox[0], vox[1], vox[2]];
}

/** @returns {{ x: number, y: number } | null} CSS pixels relative to canvas element */
export function voxToOverlayPos(nv, vox, axCorSag) {
  const canvas = nv.canvas || document.getElementById("niiCanvas");
  if (!canvas) return null;
  const frac = nv.vox2frac(vox);
  const hit = nv.frac2canvasPosWithTile(frac, axCorSag);
  if (!hit) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    x: (hit.pos[0] / canvas.width) * rect.width,
    y: (hit.pos[1] / canvas.height) * rect.height,
  };
}

/**
 * Move one corner while keeping the opposite corner fixed.
 * @param {number} cornerIndex 0..3 matching boundsToCorners order
 */
export function resizeDraftCorner(nv, draft, cornerIndex, newVox) {
  const dims = nv.back?.dims;
  if (!dims) return draft;
  const bounds = normalizeBounds(draft.ptA, draft.ptB, dims);
  const corners = boundsToCorners(bounds, draft.axCorSag);
  corners[cornerIndex] = [...newVox];
  const next = cornersToPtAB(corners);
  return { ...draft, ptA: next.ptA, ptB: next.ptB };
}

export function captureDeferredShapeDraft(nv) {
  const frac = nv.canvasPos2frac(nv.mousePos);
  let ptB = [...nv.drawShapeStartLocation];
  if (frac && frac[0] >= 0) {
    const vox = nv.frac2vox(frac);
    ptB = [vox[0], vox[1], vox[2]];
  }
  return {
    ptA: [...nv.drawShapeStartLocation],
    ptB,
    penValue: nv.opts.penValue,
    axCorSag: nv.drawPenAxCorSag,
    penType: nv.opts.penType,
    baseBitmap: nv.drawShapePreviewBitmap
      ? new Uint8Array(nv.drawShapePreviewBitmap)
      : null,
  };
}

export function shouldDeferShapeCommit(nv) {
  const penType = nv.opts.penType;
  return (
    nv.opts.deferShapeCommit &&
    nv.opts.drawingEnabled &&
    !Number.isNaN(nv.drawShapeStartLocation[0]) &&
    (penType === NI_PEN_TYPE.RECTANGLE || penType === NI_PEN_TYPE.ELLIPSE) &&
    nv.drawShapePreviewBitmap
  );
}

function voxelIndex(x, y, z, dx, dy) {
  return x + y * dx + z * dx * dy;
}

function decodeVoxelIndex(idx, dx, dy) {
  const z = Math.floor(idx / (dx * dy));
  const rem = idx - z * dx * dy;
  const y = Math.floor(rem / dx);
  const x = rem % dx;
  return [x, y, z];
}

function inferAxCorSagFromBounds(x1, y1, z1, x2, y2, z2, fallback = 0) {
  const spanX = x2 - x1;
  const spanY = y2 - y1;
  const spanZ = z2 - z1;
  if (spanZ <= spanX && spanZ <= spanY) return 0;
  if (spanY <= spanX && spanY <= spanZ) return 1;
  if (spanX <= spanY && spanX <= spanZ) return 2;
  return fallback;
}

/**
 * Flood-fill a connected voxel cluster from a seed.
 * @returns {{ label: number, visited: Set<number>, voxels: [number,number,number][], bounds: object } | null}
 */
export function floodFillClusterFromVox(nv, seedVox) {
  const dims = nv.back?.dims;
  if (!dims || !nv.drawBitmap || !seedVox) return null;

  const dx = dims[1];
  const dy = dims[2];
  const dz = dims[3];
  const seedIdx = voxelIndex(seedVox[0], seedVox[1], seedVox[2], dx, dy);
  const label = nv.drawBitmap[seedIdx];
  if (!label) return null;

  const visited = new Set();
  const queue = [seedIdx];
  visited.add(seedIdx);
  const voxels = [];
  let x1 = Infinity;
  let y1 = Infinity;
  let z1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  let z2 = -Infinity;

  while (queue.length > 0) {
    const idx = queue.shift();
    const [x, y, z] = decodeVoxelIndex(idx, dx, dy);
    voxels.push([x, y, z]);
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    z1 = Math.min(z1, z);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
    z2 = Math.max(z2, z);

    const neighbors = [
      [x + 1, y, z],
      [x - 1, y, z],
      [x, y + 1, z],
      [x, y - 1, z],
      [x, y, z + 1],
      [x, y, z - 1],
    ];
    for (const [nx, ny, nz] of neighbors) {
      if (nx < 0 || ny < 0 || nz < 0 || nx >= dx || ny >= dy || nz >= dz) continue;
      const nIdx = voxelIndex(nx, ny, nz, dx, dy);
      if (visited.has(nIdx) || nv.drawBitmap[nIdx] !== label) continue;
      visited.add(nIdx);
      queue.push(nIdx);
    }
  }

  if (!Number.isFinite(x1)) return null;

  return {
    label,
    visited,
    voxels,
    bounds: { x1, y1, z1, x2, y2, z2 },
  };
}

/** True when a voxel belongs to the live draft overlay (drawn on top of baseBitmap). */
export function isVoxelPartOfDraft(nv, draft, seedVox) {
  if (!draft?.baseBitmap || !nv?.drawBitmap || !seedVox) return false;
  const dims = nv.back?.dims;
  if (!dims) return false;
  const dx = dims[1];
  const dy = dims[2];
  const idx = voxelIndex(seedVox[0], seedVox[1], seedVox[2], dx, dy);
  return (
    nv.drawBitmap[idx] === draft.penValue &&
    draft.baseBitmap[idx] !== draft.penValue
  );
}

export function eraseClusterFromBitmap(bitmap, visited) {
  const next = new Uint8Array(bitmap);
  visited.forEach((idx) => {
    next[idx] = 0;
  });
  return next;
}

/**
 * When the user clicks on an existing filled ROI while the rectangle/ellipse tool
 * is active (but no draft is currently open), flood-fill the clicked cluster to
 * reconstruct a ShapeDraft so the bounding-box overlay reappears for re-editing.
 *
 * Returns null if the click didn't land on a labeled voxel.
 */
export function captureShapeDraftFromClick(nv) {
  const seedVox = voxFromMouse(nv);
  const cluster = floodFillClusterFromVox(nv, seedVox);
  if (!cluster) return null;

  const { label, visited, bounds } = cluster;
  const { x1, y1, z1, x2, y2, z2 } = bounds;
  const baseBitmap = eraseClusterFromBitmap(nv.drawBitmap, visited);
  const axCorSag = inferAxCorSagFromBounds(
    x1,
    y1,
    z1,
    x2,
    y2,
    z2,
    nv.drawPenAxCorSag >= 0 ? nv.drawPenAxCorSag : 0,
  );

  return {
    ptA: [x1, y1, z1],
    ptB: [x2, y2, z2],
    penValue: label,
    axCorSag,
    penType: nv.opts.penType,
    baseBitmap,
  };
}
