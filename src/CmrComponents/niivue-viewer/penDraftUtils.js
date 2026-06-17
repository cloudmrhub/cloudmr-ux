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
 * @property {{ x1: number, y1: number, x2: number, y2: number, z1: number, z2: number }} [bounds]
 * @property {boolean} [filled]
 * @property {number} [_registryId]
 */

function voxelIndexFromVox(vox, dx, dy) {
  return vox[0] + vox[1] * dx + vox[2] * dx * dy;
}

/** Voxel indices added by a pen draft relative to its base bitmap. */
export function collectPenDraftVoxelIndices(nv, draft) {
  const indices = new Set();
  if (!nv.drawBitmap || !draft?.baseBitmap) return indices;
  const penValue = draft.penValue;
  for (let i = 0; i < nv.drawBitmap.length; i++) {
    if (nv.drawBitmap[i] === penValue && draft.baseBitmap[i] !== penValue) {
      indices.add(i);
    }
  }
  return indices;
}

/** Collect applied polyline voxels using session baseline and vertex redraw fallbacks. */
export function collectPolylineAppliedVoxelIndices(nv, draft) {
  let indices = collectPenDraftVoxelIndices(nv, draft);
  if (indices.size) return indices;

  const session = nv._cloudMrPolylineSessionStartBitmap;
  if (session && nv.drawBitmap && draft?.penValue != null) {
    indices = new Set();
    const penValue = draft.penValue;
    for (let i = 0; i < nv.drawBitmap.length; i++) {
      if (nv.drawBitmap[i] === penValue && session[i] !== penValue) {
        indices.add(i);
      }
    }
    if (indices.size) return indices;
  }

  if (draft?.vertices?.length >= 2 && session) {
    const baseBitmap = new Uint8Array(session);
    redrawPolylineDraft(nv, {
      ...draft,
      baseBitmap,
      filled: !!draft.filled,
    });
    indices = collectPenDraftVoxelIndices(nv, { ...draft, baseBitmap });
  }
  return indices;
}

export function isRegisteredPolylineClick(nv, seedVox = voxFromMouse(nv)) {
  return !!findPolylineRegistryEntry(nv, seedVox);
}

function findPolylineRegistryEntryById(nv, registryId) {
  return nv._cloudMrPolylineRegistry?.find((entry) => entry.id === registryId) ?? null;
}

function findPolylineRegistryEntry(nv, seedVox) {
  const registry = nv._cloudMrPolylineRegistry;
  if (!registry?.length || !seedVox || !nv.back?.dims) return null;

  const dx = nv.back.dims[1];
  const dy = nv.back.dims[2];
  const seedIdx = voxelIndexFromVox(seedVox, dx, dy);

  const direct = registry.find((entry) => entry.voxelIndices.has(seedIdx));
  if (direct) return direct;

  const cluster = floodFillClusterFromVox(nv, seedVox, { connectivity: 26 });
  if (!cluster) return null;

  let best = null;
  let bestOverlap = 0;
  for (const entry of registry) {
    let overlap = 0;
    for (const idx of cluster.visited) {
      if (entry.voxelIndices.has(idx)) overlap++;
    }
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = entry;
    }
  }
  return bestOverlap > 0 ? best : null;
}

/** Persist applied polyline vertices so reopen can restore the full line. */
export function registerAppliedPolyline(nv, draft, existingId) {
  const voxelIndices = collectPolylineAppliedVoxelIndices(nv, draft);
  if (!voxelIndices.size || !draft.vertices?.length) return null;

  nv._cloudMrPolylineRegistry = nv._cloudMrPolylineRegistry || [];
  const nextId =
    existingId ??
    ((nv._cloudMrPolylineNextId = (nv._cloudMrPolylineNextId || 0) + 1));

  const entry = {
    id: nextId,
    vertices: draft.vertices.map((v) => [...v]),
    axCorSag: draft.axCorSag,
    penValue: draft.penValue,
    filled: !!draft.filled,
    voxelIndices,
  };

  const existingIndex = nv._cloudMrPolylineRegistry.findIndex((e) => e.id === nextId);
  if (existingIndex >= 0) {
    nv._cloudMrPolylineRegistry[existingIndex] = entry;
  } else {
    nv._cloudMrPolylineRegistry.push(entry);
  }
  return nextId;
}

export function restoreCommittedPolyline(nv, registryId) {
  const entry = findPolylineRegistryEntryById(nv, registryId);
  if (!entry || !nv.drawBitmap) return;
  const draft = {
    kind: "polyline",
    vertices: entry.vertices.map((v) => [...v]),
    baseBitmap: nv.drawBitmap.slice(),
    axCorSag: entry.axCorSag,
    penValue: entry.penValue,
    filled: entry.filled,
  };
  redrawPolylineDraft(nv, draft);
}

export function isEraserActive(nv) {
  return (
    nv.opts.drawingEnabled &&
    nv.opts.penType === NI_PEN_TYPE.PEN &&
    nv.opts.penValue === 0
  );
}

export function isFreehandPenActive(nv) {
  return (
    nv.opts.isFilledPen &&
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

  return {
    kind: "freehand",
    baseBitmap: new Uint8Array(sessionStartBitmap),
    axCorSag,
    penValue,
    strokeVoxels,
    bounds: { x1, y1, z1, x2, y2, z2 },
  };
}

export function redrawFreehandDraft(nv, draft) {
  if (!draft?.strokeVoxels?.length || !draft.baseBitmap) return;
  nv.drawBitmap.set(draft.baseBitmap);
  // strokeVoxels already contains every expanded/thickened voxel of the original
  // stroke. Replaying them with penBounds=0 stamps each voxel directly without
  // re-expanding, preventing thickness from accumulating across edits.
  const savedPenBounds = nv.opts.penBounds;
  nv.opts.penBounds = 0;
  for (const [x, y, z] of draft.strokeVoxels) {
    nv.drawPt(x, y, z, draft.penValue);
  }
  nv.opts.penBounds = savedPenBounds;
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

/** Undo a previous fill — revert to outline-only without committing the draft. */
export function unfillPolylineDraft(nv, draft) {
  if (!draft?.vertices) return draft;
  const next = { ...draft, filled: false };
  redrawPolylineDraft(nv, next);
  nv.refreshDrawing(false, false);
  nv.drawScene();
  syncPolylineDraftToNv(nv, next);
  return next;
}

export function applyPenDraft(nv, draft) {
  if (draft.kind === "polyline") {
    // Prefer live vertex state; draft snapshots can lag behind the canvas.
    if (nv._cloudMrPolylineVertices?.length >= 2) {
      const fresh = polylineDraftFromNv(nv, { filled: !!draft.filled });
      if (fresh) draft = fresh;
    }
    // Commit the incrementally drawn bitmap (drops rubber-band preview to cursor).
    if (nv._cloudMrPolylineBaseBitmap) {
      nv.drawBitmap.set(nv._cloudMrPolylineBaseBitmap);
      nv.refreshDrawing(false, false);
      nv.drawScene();
    } else {
      redrawPolylineDraft(nv, draft);
    }
  } else {
    redrawFreehandDraft(nv, draft);
  }
  nv.drawAddUndoBitmap(nv.drawFillOverwrites);
  if (typeof nv.onDrawingChanged === "function") {
    nv.onDrawingChanged("draw");
  }
  return draft;
}

/**
 * Reconstruct a polyline PenDraft from stored vertices (not flood-fill).
 * Returns null if the click didn't land on a registered polyline.
 */
export function capturePolylineDraftFromClick(nv) {
  const seedVox = voxFromMouse(nv);
  const entry = findPolylineRegistryEntry(nv, seedVox);
  if (!entry) return null;

  const baseBitmap = eraseClusterFromBitmap(nv.drawBitmap, entry.voxelIndices);
  return {
    kind: "polyline",
    baseBitmap,
    axCorSag: entry.axCorSag,
    penValue: entry.penValue,
    vertices: entry.vertices.map((v) => [...v]),
    filled: entry.filled,
    _registryId: entry.id,
  };
}

/**
 * Flood-fill from the clicked voxel to reconstruct a freehand PenDraft for re-editing.
 * Returns null if the click didn't land on a labeled voxel.
 */
export function capturePenDraftFromClick(nv) {
  const seedVox = voxFromMouse(nv);
  const cluster = floodFillClusterFromVox(nv, seedVox, { connectivity: 26 });
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
