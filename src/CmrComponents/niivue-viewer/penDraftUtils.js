import {
  translatePt,
  floodFillClusterFromVox,
  eraseClusterFromBitmap,
  inferAxCorSagFromBounds,
} from "./shapeDraftUtils";
import { NI_PEN_TYPE } from "./niivuePenType";
import { voxFromMouse } from "./polylinePenUtils";

/** @typedef {'polyline' | 'freehand'} PenDraftKind */

/**
 * @typedef {Object} PenDraft
 * @property {PenDraftKind} kind
 * @property {Uint8Array} baseBitmap
 * @property {number} axCorSag
 * @property {number} penValue
 * @property {[number, number, number][]} [vertices]
 * @property {[number, number, number][]} [strokeVoxels]
 * @property {[number, number, number][]} [pathVertices]
 * @property {{ x1: number, y1: number, x2: number, y2: number, z1: number, z2: number }} [bounds]
 * @property {boolean} [filled]
 */

export function isEraserActive(nv) {
  return (
    nv.opts.drawingEnabled &&
    nv.opts.penType === NI_PEN_TYPE.PEN &&
    nv.opts.penValue === 0
  );
}

export function isFreehandPenActive(nv) {
  return (
    nv.opts.drawingEnabled &&
    nv.opts.penType === NI_PEN_TYPE.PEN &&
    !nv.opts.polylinePenMode &&
    nv.opts.penValue > 0
  );
}

export function shouldDeferFreehandCommit(nv) {
  return !!nv.opts.deferFreehandCommit && isFreehandPenActive(nv);
}

export function redrawPolylineDraft(nv, draft) {
  if (!draft?.vertices?.length || !draft.baseBitmap) return;
  nv.drawBitmap.set(draft.baseBitmap);
  nv.drawPenAxCorSag = draft.axCorSag;
  for (let i = 1; i < draft.vertices.length; i++) {
    nv.drawPenLine(draft.vertices[i], draft.vertices[i - 1], draft.penValue);
  }
  if (draft.filled && draft.vertices.length >= 3) {
    nv.drawPenAxCorSag = draft.axCorSag;
    nv.drawPenFillPts = draft.vertices.map((v) => [...v]);
    nv._cloudMrSkipNextUndoBitmap = true;
    nv.drawPenFilled();
  }
  nv.refreshDrawing(false, false);
  nv.drawScene();
}

export function translatePolylineVertices(vertices, delta) {
  return vertices.map((v) => translatePt(v, delta));
}

export function updatePolylineVertex(vertices, index, newVox) {
  const next = vertices.map((v) => [...v]);
  next[index] = [...newVox];
  return next;
}

export function syncPolylineDraftToNv(nv, draft) {
  nv._cloudMrPolylineVertices = draft.vertices.map((v) => [...v]);
  if (nv.drawBitmap) {
    nv._cloudMrPolylineBaseBitmap = nv.drawBitmap.slice();
  }
  nv._cloudMrPolylineAxCorSag = draft.axCorSag;
}

export function captureFreehandDraft(nv, sessionStartBitmap, axCorSag) {
  if (!nv.drawBitmap || !sessionStartBitmap) return null;
  const penValue = nv.opts.penValue;
  const dims = nv.back?.dims;
  if (!dims) return null;

  const strokeVoxels = [];
  for (let i = 0; i < nv.drawBitmap.length; i++) {
    if (nv.drawBitmap[i] === penValue && sessionStartBitmap[i] !== penValue) {
      const z = Math.floor(i / (dims[1] * dims[2]));
      const rem = i - z * dims[1] * dims[2];
      const y = Math.floor(rem / dims[1]);
      const x = rem % dims[1];
      strokeVoxels.push([x, y, z]);
    }
  }
  if (strokeVoxels.length === 0) return null;

  let x1 = Infinity;
  let y1 = Infinity;
  let z1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  let z2 = -Infinity;
  for (const [x, y, z] of strokeVoxels) {
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    z1 = Math.min(z1, z);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
    z2 = Math.max(z2, z);
  }

  const pathVertices = nv._cloudMrFreehandPath?.length
    ? nv._cloudMrFreehandPath.map((v) => [...v])
    : undefined;
  nv._cloudMrFreehandPath = [];

  return {
    kind: "freehand",
    baseBitmap: new Uint8Array(sessionStartBitmap),
    axCorSag,
    penValue,
    strokeVoxels,
    pathVertices,
    bounds: { x1, y1, z1, x2, y2, z2 },
  };
}

function collectStrokeVoxelsFromBitmap(nv, draft) {
  const dims = nv.back?.dims;
  if (!dims || !nv.drawBitmap || !draft?.baseBitmap) return draft.strokeVoxels || [];
  const strokeVoxels = [];
  for (let i = 0; i < nv.drawBitmap.length; i++) {
    if (nv.drawBitmap[i] === draft.penValue && draft.baseBitmap[i] !== draft.penValue) {
      const z = Math.floor(i / (dims[1] * dims[2]));
      const rem = i - z * dims[1] * dims[2];
      const y = Math.floor(rem / dims[1]);
      const x = rem % dims[1];
      strokeVoxels.push([x, y, z]);
    }
  }
  return strokeVoxels;
}

function boundsFromVoxels(voxels) {
  let x1 = Infinity;
  let y1 = Infinity;
  let z1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  let z2 = -Infinity;
  for (const [x, y, z] of voxels) {
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    z1 = Math.min(z1, z);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
    z2 = Math.max(z2, z);
  }
  return { x1, y1, z1, x2, y2, z2 };
}

export function redrawFreehandDraft(nv, draft) {
  if (!draft?.baseBitmap) return;
  nv.drawBitmap.set(draft.baseBitmap);
  nv.drawPenAxCorSag = draft.axCorSag;
  if (!draft.filled) {
    if (!draft.strokeVoxels?.length) return;
    for (const [x, y, z] of draft.strokeVoxels) {
      nv.drawPt(x, y, z, draft.penValue);
    }
  } else if (draft.pathVertices?.length >= 3) {
    for (const [x, y, z] of draft.strokeVoxels || []) {
      nv.drawPt(x, y, z, draft.penValue);
    }
    nv.drawPenFillPts = draft.pathVertices.map((v) => [...v]);
    nv._cloudMrSkipNextUndoBitmap = true;
    nv.drawPenFilled();
  } else if (draft.strokeVoxels?.length) {
    for (const [x, y, z] of draft.strokeVoxels) {
      nv.drawPt(x, y, z, draft.penValue);
    }
  } else {
    return;
  }
  nv.refreshDrawing(false, false);
  nv.drawScene();
}

export function translateFreehandDraft(draft, delta) {
  return {
    ...draft,
    strokeVoxels: draft.strokeVoxels.map((v) => translatePt(v, delta)),
    bounds: draft.bounds
      ? {
          x1: draft.bounds.x1 + delta[0],
          y1: draft.bounds.y1 + delta[1],
          z1: draft.bounds.z1 + delta[2],
          x2: draft.bounds.x2 + delta[0],
          y2: draft.bounds.y2 + delta[1],
          z2: draft.bounds.z2 + delta[2],
        }
      : draft.bounds,
  };
}

export function resizeFreehandDraft(draft, cornerIndex, newVox) {
  if (!draft.bounds) return draft;
  const { axCorSag } = draft;
  const b = { ...draft.bounds };
  const corners = boundsToFreehandCorners(b, axCorSag);
  corners[cornerIndex] = [...newVox];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const zs = corners.map((c) => c[2]);
  const nextBounds = {
    x1: Math.min(...xs),
    y1: Math.min(...ys),
    z1: Math.min(...zs),
    x2: Math.max(...xs),
    y2: Math.max(...ys),
    z2: Math.max(...zs),
  };

  const oldW = Math.max(1, b.x2 - b.x1);
  const oldH = Math.max(1, b.y2 - b.y1);
  const newW = Math.max(1, nextBounds.x2 - nextBounds.x1);
  const newH = Math.max(1, nextBounds.y2 - nextBounds.y1);

  const scaled = draft.strokeVoxels.map((v) => {
    const relH = (v[0] - b.x1) / oldW;
    const relV = (v[1] - b.y1) / oldH;
    if (axCorSag === 0) {
      return [
        Math.round(nextBounds.x1 + relH * newW),
        Math.round(nextBounds.y1 + relV * newH),
        v[2],
      ];
    }
    if (axCorSag === 1) {
      return [
        Math.round(nextBounds.x1 + relH * newW),
        v[1],
        Math.round(nextBounds.y1 + relV * newH),
      ];
    }
    return [
      v[0],
      Math.round(nextBounds.x1 + relH * newW),
      Math.round(nextBounds.y1 + relV * newH),
    ];
  });

  return { ...draft, strokeVoxels: scaled, bounds: nextBounds };
}

export function boundsToFreehandCorners(bounds, axCorSag) {
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

export function polylineDraftFromNv(nv, { filled = false } = {}) {
  const vertices = nv._cloudMrPolylineVertices;
  const baseBitmap = nv._cloudMrPolylineSessionStartBitmap;
  if (!vertices?.length || vertices.length < 2 || !baseBitmap) return null;
  return {
    kind: "polyline",
    vertices: vertices.map((v) => [...v]),
    baseBitmap: new Uint8Array(baseBitmap),
    axCorSag: nv._cloudMrPolylineAxCorSag,
    penValue: nv.opts.penValue,
    filled,
  };
}

/** Fill freehand interior from the traced stroke path (outline stays editable until Apply). */
export function fillFreehandDraft(nv, draft) {
  const path = draft.pathVertices;
  if (!path || path.length < 3) return draft;
  redrawFreehandDraft(nv, { ...draft, filled: false });
  nv.drawPenAxCorSag = draft.axCorSag;
  nv.drawPenFillPts = path.map((v) => [...v]);
  nv._cloudMrSkipNextUndoBitmap = true;
  nv.drawPenFilled();
  nv.refreshDrawing(false, false);
  nv.drawScene();
  const strokeVoxels = collectStrokeVoxelsFromBitmap(nv, draft);
  return {
    ...draft,
    filled: true,
    strokeVoxels,
    bounds: boundsFromVoxels(strokeVoxels),
  };
}

/** Fill polyline interior without closing the outline or committing the draft. */
export function fillPolylineDraft(nv, draft) {
  if (!draft?.vertices || draft.vertices.length < 3) return draft;
  redrawPolylineDraft(nv, { ...draft, filled: false });
  nv.drawPenAxCorSag = draft.axCorSag;
  nv.drawPenFillPts = draft.vertices.map((v) => [...v]);
  nv._cloudMrSkipNextUndoBitmap = true;
  nv.drawPenFilled();
  nv.refreshDrawing(false, false);
  nv.drawScene();
  const next = { ...draft, filled: true };
  syncPolylineDraftToNv(nv, next);
  return next;
}

export function applyPenDraft(nv, draft) {
  if (draft.kind === "polyline") {
    redrawPolylineDraft(nv, draft);
  } else {
    redrawFreehandDraft(nv, draft);
  }
  nv.drawAddUndoBitmap(nv.drawFillOverwrites);
  if (typeof nv.onDrawingChanged === "function") {
    nv.onDrawingChanged("draw");
  }
}

/**
 * Flood-fill from the clicked voxel to reconstruct a freehand PenDraft for re-editing.
 * Returns null if the click didn't land on a labeled voxel.
 */
export function capturePenDraftFromClick(nv) {
  const seedVox = voxFromMouse(nv);
  const cluster = floodFillClusterFromVox(nv, seedVox);
  if (!cluster) return null;

  const { label, visited, voxels, bounds } = cluster;
  const { x1, y1, z1, x2, y2, z2 } = bounds;
  const baseBitmap = eraseClusterFromBitmap(nv.drawBitmap, visited);
  const axCorSag = inferAxCorSagFromBounds(
    x1, y1, z1, x2, y2, z2,
    nv.drawPenAxCorSag >= 0 ? nv.drawPenAxCorSag : 0,
  );
  return {
    kind: "freehand",
    baseBitmap,
    axCorSag,
    penValue: label,
    strokeVoxels: voxels,
    bounds,
  };
}

export function cancelPenDraft(nv, draft) {
  if (draft?.baseBitmap) {
    nv.drawBitmap.set(draft.baseBitmap);
    nv.refreshDrawing(true, false);
    nv.drawScene();
  }
}
