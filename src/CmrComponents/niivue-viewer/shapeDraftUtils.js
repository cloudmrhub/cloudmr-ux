import { NI_PEN_TYPE } from "./niivuePenType";

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
