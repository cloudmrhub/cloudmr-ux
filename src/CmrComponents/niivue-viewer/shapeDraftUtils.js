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
 * @property {[number, number, number][]} [shapeVoxels] exact voxels when reopening a modified shape
 * @property {number} [_registryId] links to _cloudMrShapeRegistry for erosion tracking
 */

export function collectShapeVoxelIndices(nv, draft) {
  const indices = new Set();
  if (!nv?.drawBitmap) return indices;
  const dims = nv.back?.dims;
  if (draft.shapeVoxels?.length && dims) {
    const dx = dims[1];
    const dy = dims[2];
    for (const [x, y, z] of draft.shapeVoxels) {
      indices.add(x + y * dx + z * dx * dy);
    }
    return indices;
  }
  if (!draft.baseBitmap) return indices;
  for (let i = 0; i < nv.drawBitmap.length; i++) {
    if (nv.drawBitmap[i] === draft.penValue && draft.baseBitmap[i] !== draft.penValue) {
      indices.add(i);
    }
  }
  return indices;
}

export function findShapeRegistryEntryById(nv, registryId) {
  return nv._cloudMrShapeRegistry?.find((entry) => entry.id === registryId) ?? null;
}

/**
 * Match a flood-filled cluster to a registered shape using an IoU-style score:
 *   overlap / max(clusterSize, entrySize)
 * This prevents a large eroded rectangle from matching a smaller new shape drawn
 * inside its original footprint, while still correctly identifying the same shape
 * being re-opened (where both sizes are nearly equal and overlap is near 1.0).
 */
export function findShapeRegistryEntry(nv, cluster) {
  const registry = nv._cloudMrShapeRegistry;
  if (!registry?.length || !cluster?.visited) return null;
  const clusterSize = cluster.visited.size;
  if (clusterSize === 0) return null;

  const MATCH_THRESHOLD = 0.5;
  let best = null;
  let bestScore = 0;
  for (const entry of registry) {
    let overlap = 0;
    for (const idx of cluster.visited) {
      if (entry.voxelIndices.has(idx)) overlap++;
    }
    const score = overlap / Math.max(clusterSize, entry.voxelIndices.size);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}

/** Persist applied rectangle/ellipse voxels so eraser hits can be tracked per shape. */
export function registerAppliedShape(nv, draft, { existingId, eroded = false } = {}) {
  const voxelIndices = collectShapeVoxelIndices(nv, draft);
  if (!voxelIndices.size) return null;

  nv._cloudMrShapeRegistry = nv._cloudMrShapeRegistry || [];
  const nextId =
    existingId ??
    (nv._cloudMrShapeNextId = (nv._cloudMrShapeNextId || 0) + 1);

  const entry = {
    id: nextId,
    ptA: [...draft.ptA],
    ptB: [...draft.ptB],
    penType: draft.penType,
    penValue: draft.penValue,
    axCorSag: draft.axCorSag,
    voxelIndices,
    eroded: eroded || (draft.shapeVoxels?.length ?? 0) > 0,
  };

  const existingIndex = nv._cloudMrShapeRegistry.findIndex((e) => e.id === nextId);
  if (existingIndex >= 0) {
    nv._cloudMrShapeRegistry[existingIndex] = entry;
  } else {
    nv._cloudMrShapeRegistry.push(entry);
  }
  return nextId;
}

/** Mark shapes whose stored voxels were cleared by the eraser. */
export function updateShapeRegistryErosionState(nv) {
  const registry = nv._cloudMrShapeRegistry;
  if (!registry?.length || !nv.drawBitmap) return;
  for (const entry of registry) {
    if (entry.eroded) continue;
    for (const idx of entry.voxelIndices) {
      if (nv.drawBitmap[idx] === 0) {
        entry.eroded = true;
        break;
      }
    }
  }
}

export function removeShapeRegistryEntry(nv, registryId) {
  if (registryId == null || !nv._cloudMrShapeRegistry) return;
  nv._cloudMrShapeRegistry = nv._cloudMrShapeRegistry.filter((e) => e.id !== registryId);
}

export function clearShapeRegistry(nv) {
  nv._cloudMrShapeRegistry = [];
}

export function paintShapeVoxels(nv, voxels, penValue) {
  const dims = nv.back?.dims;
  if (!dims || !voxels?.length) return;
  const dx = dims[1];
  const dy = dims[2];
  for (const [x, y, z] of voxels) {
    nv.drawBitmap[x + y * dx + z * dx * dy] = penValue;
  }
}

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
  // Shapes are filled regions — penSize/penBounds must not expand voxels (e.g. after eraser).
  const savedPenBounds = nv.opts.penBounds;
  const savedPenSize = nv.opts.penSize;
  nv.opts.penBounds = 0;
  nv.opts.penSize = 1;
  nv.drawBitmap.set(draft.baseBitmap);
  nv.drawPenAxCorSag = draft.axCorSag;
  if (draft.shapeVoxels?.length) {
    paintShapeVoxels(nv, draft.shapeVoxels, draft.penValue);
  } else if (draft.penType === NI_PEN_TYPE.RECTANGLE) {
    nv.drawRectangleMask(draft.ptA, draft.ptB, draft.penValue);
  } else {
    nv.drawEllipseMask(draft.ptA, draft.ptB, draft.penValue);
  }
  nv.opts.penBounds = savedPenBounds;
  nv.opts.penSize = savedPenSize;
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

export function inferAxCorSagFromBounds(x1, y1, z1, x2, y2, z2, fallback = 0) {
  const spanX = x2 - x1;
  const spanY = y2 - y1;
  const spanZ = z2 - z1;
  if (spanZ <= spanX && spanZ <= spanY) return 0;
  if (spanY <= spanX && spanY <= spanZ) return 1;
  if (spanX <= spanY && spanX <= spanZ) return 2;
  return fallback;
}

function sliceKey(axCorSag, x, y, z) {
  if (axCorSag === 0) return `${x},${y}`;
  if (axCorSag === 1) return `${x},${z}`;
  return `${y},${z}`;
}

const NEIGHBORS_6 = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

const NEIGHBORS_26 = (() => {
  const out = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        out.push([dx, dy, dz]);
      }
    }
  }
  return out;
})();

/**
 * Flood-fill a connected voxel cluster from a seed.
 * @param {{ connectivity?: 6 | 26 }} [options]
 * @returns {{ label: number, visited: Set<number>, voxels: [number,number,number][], bounds: object } | null}
 */
export function floodFillClusterFromVox(nv, seedVox, { connectivity = 6 } = {}) {
  const dims = nv.back?.dims;
  if (!dims || !nv.drawBitmap || !seedVox) return null;

  const dx = dims[1];
  const dy = dims[2];
  const dz = dims[3];
  const seedIdx = voxelIndex(seedVox[0], seedVox[1], seedVox[2], dx, dy);
  const label = nv.drawBitmap[seedIdx];
  if (!label) return null;

  const neighborOffsets = connectivity === 26 ? NEIGHBORS_26 : NEIGHBORS_6;
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

    for (const [ox, oy, oz] of neighborOffsets) {
      const nx = x + ox;
      const ny = y + oy;
      const nz = z + oz;
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

export function eraseClusterFromBitmap(bitmap, visited) {
  const next = new Uint8Array(bitmap);
  visited.forEach((idx) => {
    next[idx] = 0;
  });
  return next;
}

/** Guess rectangle vs ellipse from the filled voxel pattern, not the active tool. */
function inferShapePenTypeFromCluster(cluster, axCorSag) {
  const { bounds, voxels } = cluster;
  const { x1, y1, z1, x2, y2, z2 } = bounds;

  const filled = new Set();
  for (const [x, y, z] of voxels) {
    filled.add(sliceKey(axCorSag, x, y, z));
  }

  let uMin;
  let uMax;
  let vMin;
  let vMax;
  if (axCorSag === 0) {
    uMin = x1;
    uMax = x2;
    vMin = y1;
    vMax = y2;
  } else if (axCorSag === 1) {
    uMin = x1;
    uMax = x2;
    vMin = z1;
    vMax = z2;
  } else {
    uMin = y1;
    uMax = y2;
    vMin = z1;
    vMax = z2;
  }

  if (uMax <= uMin || vMax <= vMin) {
    return NI_PEN_TYPE.RECTANGLE;
  }

  const cu = (uMin + uMax) / 2;
  const cv = (vMin + vMax) / 2;
  const ru = Math.max(0.5, (uMax - uMin) / 2);
  const rv = Math.max(0.5, (vMax - vMin) / 2);

  let rectScore = 0;
  let ellipseScore = 0;

  for (let u = uMin; u <= uMax; u++) {
    for (let v = vMin; v <= vMax; v++) {
      const has = filled.has(`${u},${v}`);
      const inEllipse = ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 <= 1.05;
      if (has) rectScore++;
      if (has === inEllipse) ellipseScore++;
    }
  }

  return ellipseScore > rectScore ? NI_PEN_TYPE.ELLIPSE : NI_PEN_TYPE.RECTANGLE;
}

/**
 * Geometric completeness check: true when the cluster still fills its bounding
 * shape with no significant gaps (i.e. the eraser has not meaningfully touched it).
 * Used as a fallback when the shape is not in the registry.
 *
 * For rectangles:   all bounding-box voxels must be present.
 * For ellipses:     we use niivue's actual threshold (≤ 1.0) so boundary pixels
 *                   that niivue doesn't draw never trigger a false "eroded" result.
 *                   Additionally we allow up to 5% of interior voxels to be absent
 *                   to tolerate rendering rounding without masking real erasure.
 */
function isClusterCompleteShape(cluster, penType) {
  const { bounds, voxels } = cluster;
  const { x1, y1, z1, x2, y2, z2 } = bounds;
  const filled = new Set(voxels.map(([x, y, z]) => `${x},${y},${z}`));

  if (penType === NI_PEN_TYPE.RECTANGLE) {
    for (let z = z1; z <= z2; z++) {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          if (!filled.has(`${x},${y},${z}`)) return false;
        }
      }
    }
    return true;
  }

  // Ellipse / ellipsoid: match niivue's exact threshold (≤ 1.0).
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const cz = (z1 + z2) / 2;
  const ru = Math.max(0.5, (x2 - x1) / 2);
  const rv = Math.max(0.5, (y2 - y1) / 2);
  const rw = Math.max(0.5, (z2 - z1) / 2);
  let expected = 0;
  let missing = 0;
  for (let z = z1; z <= z2; z++) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const inEllipse =
          ((x - cx) / ru) ** 2 + ((y - cy) / rv) ** 2 + ((z - cz) / rw) ** 2 <= 1.0;
        if (inEllipse) {
          expected++;
          if (!filled.has(`${x},${y},${z}`)) missing++;
        }
      }
    }
  }
  // Allow up to 5% missing to handle minor rendering rounding at the boundary.
  return expected === 0 || missing / expected <= 0.05;
}

/**
 * When the user clicks on an existing filled ROI while the rectangle/ellipse tool
 * is active (but no draft is currently open), flood-fill the clicked cluster to
 * reconstruct a ShapeDraft so the bounding-box overlay reappears for re-editing.
 */
export function captureShapeDraftFromClick(nv) {
  const seedVox = voxFromMouse(nv);
  const cluster = floodFillClusterFromVox(nv, seedVox);
  if (!cluster) return null;

  const { label, visited, voxels, bounds } = cluster;
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
  const penType = inferShapePenTypeFromCluster(cluster, axCorSag);
  const registryEntry = findShapeRegistryEntry(nv, cluster);

  // A shape is considered modified (partially erased) if:
  //   - the registry knows it was eroded, OR
  //   - (no registry entry) the geometry check finds gaps
  const isModified =
    registryEntry?.eroded === true ||
    (!registryEntry && !isClusterCompleteShape(cluster, penType));

  return {
    ptA: [x1, y1, z1],
    ptB: [x2, y2, z2],
    penValue: label,
    axCorSag,
    penType,
    baseBitmap,
    ...(registryEntry ? { _registryId: registryEntry.id } : {}),
    ...(isModified
      ? { shapeVoxels: voxels.map(([x, y, z]) => [x, y, z]) }
      : {}),
  };
}
