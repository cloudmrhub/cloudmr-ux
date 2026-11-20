/**
 * This file patches the original NiiVue library to produce customized behaviors and effects.
 */
import { Niivue, NVImage, NVImageFromUrlOptions } from "@niivue/niivue";
import {
  captureDeferredShapeDraft,
  captureShapeDraftFromClick,
  isDraftTooSmall,
  redrawDraftShape,
  shouldDeferShapeCommit,
} from "./shapeDraftUtils.js";
import { NI_PEN_TYPE } from "./niivuePenType.js";
import {
  addPolylineVertex,
  POLYLINE_CLOSE,
  axCorSagFromMouse,
  cancelPolyline,
  finishPolyline,
  isClickWithoutDrag,
  isPolylinePenActive,
  previewPolylineSegment,
  resetPolylineState,
  voxFromMouse,
} from "./polylinePenUtils.js";
import {
  captureFreehandDraft,
  capturePenDraftFromClick,
  capturePolylineDraftFromClick,
  isFreehandPenActive,
  isRegisteredPolylineClick,
  redrawFreehandDraft,
  redrawPolylineDraft,
  shouldDeferFreehandCommit,
} from "./penDraftUtils.js";
import {
  CLOUDMR_DEFAULT_VIEW_ZOOM,
  CLOUDMR_NIIVUE_FIT_ZOOM,
} from "./niivueViewDefaults.js";
import { clampMaxDrawUndoBitmaps, compactDrawUndoHistory } from "./drawUndoLimits.js";
import {
  MAX_ROI_LABEL,
  buildDrawLut,
  clearGroups,
  createRoiLabelState,
  expandToLabels,
  findLabelByColor,
  getBaseColor,
  getColorMap,
  getGroup,
  getPalette,
  groupItems,
  isGroupId,
  isRoiLabel,
  nextFreeLabel,
  normalizeHex,
  pruneLabelsFromGroups,
  registerLabel,
  relabelInGroups,
  removeLabelColor,
  resetPalette,
  resolveLabelColor,
  setLabelColor,
  ungroupItems,
} from "./roiLabelModel.js";

export {
  CLOUDMR_DEFAULT_VIEW_ZOOM,
  CLOUDMR_INSET_VIEW_ZOOM,
  CLOUDMR_NIIVUE_FIT_ZOOM,
  CLOUDMR_STANDARD_VIEW_ZOOM,
} from "./niivueViewDefaults.js";

/*
 * ROI labels, palette and groups (see roiLabelModel.js for the full description).
 *
 * - drawBitmap voxels always hold the real ROI label (1..255); 0 = erase.
 * - The palette (label -> colour) lives in `roiState.colors`; label 1 is the default colour.
 * - Groups are metadata only (`roiState.groups`, ids are negative: -1, -2, ...). Grouping does
 *   NOT touch voxels: member labels are merely drawn with the group colour by rewriting the
 *   Niivue draw LUT. Ungroup removes the remap and the original colours come back instantly.
 * - Groups/palette are in-browser state. Palette colours are persisted by the viewer in the
 *   saved ROI zip (info.json `labelColors`); groups are not persisted.
 */
const roiState = createRoiLabelState();

/** Every non-zero label currently in the drawing (visible + temporarily hidden voxels). */
function collectDrawnLabels(nv) {
    const found = new Set();
    const scan = (arr) => {
        if (!arr || !arr.length) {
            return;
        }
        for (let i = 0; i < arr.length; i++) {
            const v = arr[i];
            if (v !== 0) {
                found.add(v);
            }
        }
    };
    scan(nv.drawBitmap);
    scan(nv.hiddenBitmap);
    return found;
}

/** Colour table Niivue shipped with (ITK-SNAP). Captured once, before we first replace it. */
function getBaseDrawLut(nv) {
    if (!nv._roiBaseDrawLut) {
        nv._roiBaseDrawLut = Uint8ClampedArray.from(nv.drawLut.lut);
    }
    return nv._roiBaseDrawLut;
}

function notifyRoiPaletteChange(nv) {
    if (typeof nv.onRoiPaletteChange === "function") {
        nv.onRoiPaletteChange();
    }
}

/**
 * Rebuild the 256-entry draw LUT from palette + groups and push it to the GPU.
 * Display only: voxel data is never modified.
 */
function applyRoiDrawLut(nv, { notify = true } = {}) {
    const base = getBaseDrawLut(nv);
    nv.drawLut = {
        lut: buildDrawLut(roiState, base),
        labels: nv.drawLut.labels,
    };
    if (nv.gl && nv.volumes && nv.volumes.length > 0) {
        try {
            nv.refreshColormaps();
            nv.drawScene();
        } catch (err) {
            console.warn("applyRoiDrawLut: could not refresh colormap texture", err);
        }
    }
    if (notify) {
        notifyRoiPaletteChange(nv);
    }
}

/** Register any labels found in the drawing that have no palette entry yet. */
function registerDrawnLabels(nv) {
    const base = getBaseDrawLut(nv);
    let changed = false;
    // NOTE: ES5 build target (no downlevelIteration): never for..of / spread a Set or Map.
    Array.from(collectDrawnLabels(nv)).forEach((l) => {
        if (registerLabel(roiState, l, getBaseColor(roiState, l, base))) {
            changed = true;
        }
    });
    return changed;
}

/** Drop group metadata (e.g. new/cleared drawing) and restore plain label colours. */
function resetRoiGroups(nv) {
    if (roiState.groups.length === 0) {
        return;
    }
    for (const g of roiState.groups) {
        delete labelVisibility[g.id];
    }
    clearGroups(roiState);
    applyRoiDrawLut(nv);
}

/** Clone of the drawing limited to `labelSet` (voxels with other labels become 0). */
function maskDrawBitmapByLabels(live, labelSet) {
    const out = new Uint8Array(live.length);
    for (let i = 0; i < live.length; i++) {
        const v = live[i];
        if (v !== 0 && labelSet.has(v)) {
            out[i] = v;
        }
    }
    return out;
}

var NiivueObject3D = function (id, vertexBuffer, mode, indexCount, indexBuffer = null, vao = null) {
    this.BLEND = 1;
    this.CULL_FACE = 2;
    this.CULL_FRONT = 4;
    this.CULL_BACK = 8;
    this.ENABLE_DEPTH_TEST = 16;
    this.sphereIdx = [];
    this.sphereVtx = [];
    this.renderShaders = [];
    this.isVisible = true;
    this.isPickable = true;
    this.vertexBuffer = vertexBuffer;
    this.indexCount = indexCount;
    this.indexBuffer = indexBuffer;
    this.vao = vao;
    this.mode = mode;
    this.glFlags = 0;
    this.id = id;
    this.colorId = [
        ((id >> 0) & 255) / 255,
        ((id >> 8) & 255) / 255,
        ((id >> 16) & 255) / 255,
        ((id >> 24) & 255) / 255
    ];
    this.modelMatrix = create2();
    this.scale = [1, 1, 1];
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.rotationRadians = 0;
    this.extentsMin = [];
    this.extentsMax = [];
};


function create2() {
    var out = new Float32Array(16);
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
}

function typedArraysEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function decodeRLE(rle, decodedlen) {
    const r = new Uint8Array(rle.buffer)
    const rI = new Int8Array(r.buffer) // typecast as header can be negative
    let rp = 0 // input position in rle array
    // d: output uncompressed data array
    const d = new Uint8Array(decodedlen)
    let dp = 0 // output position in decoded array
    while (rp < r.length) {
        // read header
        const hdr = rI[rp]
        rp++
        if (hdr < 0) {
            // write run
            const v = rI[rp]
            rp++
            for (let i = 0; i < 1 - hdr; i++) {
                d[dp] = v
                dp++
            }
        } else {
            // write literal
            for (let i = 0; i < hdr + 1; i++) {
                d[dp] = rI[rp]
                rp++
                dp++
            }
        }
    }
    return d
}

/** PackBits RLE, same format as NiiVue encodeRLE. */
function encodeRLE(data) {
    const dl = data.length
    let dp = 0
    const r = new Uint8Array(dl + Math.ceil(0.01 * dl))
    const rI = new Int8Array(r.buffer)
    let rp = 0
    while (dp < dl) {
        let v = data[dp]
        dp++
        let rl = 1
        while (rl < 129 && dp < dl && data[dp] === v) {
            dp++
            rl++
        }
        if (rl > 1) {
            rI[rp] = -rl + 1
            rp++
            r[rp] = v
            rp++
            continue
        }
        while (dp < dl) {
            if (rl > 127) break
            if (dp + 2 < dl) {
                if (v !== data[dp] && data[dp + 2] === data[dp] && data[dp + 1] === data[dp]) {
                    break
                }
            }
            v = data[dp]
            dp++
            rl++
        }
        r[rp] = rl - 1
        rp++
        for (let i = 0; i < rl; i++) {
            r[rp] = data[dp - rl + i]
            rp++
        }
    }
    return r.slice(0, rp)
}

function restoreDrawHistorySlot(nv, slot) {
    nv.drawBitmap = decodeRLE(slot, nv.drawBitmap.length)
    nv.hiddenBitmap = new Uint8Array(nv.drawBitmap.length)
    for (let i = 0; i < nv.drawBitmap.length; i++) {
        const pen = nv.drawBitmap[i]
        if (typeof nv.getLabelVisibility === "function" && !nv.getLabelVisibility(pen)) {
            nv.hiddenBitmap[i] = nv.drawBitmap[i]
            nv.drawBitmap[i] = 0
        }
    }
    nv.refreshDrawing(true)
}

function intensityRaw2Scaled(hdr, raw) {
    if (hdr.scl_slope === 0) {
        hdr.scl_slope = 1.0
    }
    return raw * hdr.scl_slope + hdr.scl_inter
}

const SLICE_TYPE = Object.freeze({
    AXIAL: 0,
    CORONAL: 1,
    SAGITTAL: 2,
    MULTIPLANAR: 3,
    RENDER: 4,
});

const labelVisibility = {};
Niivue.prototype.getLabelVisibility = function (label) {
    if (labelVisibility[label] === undefined) {
        labelVisibility[label] = true;
        return true;
    }
    else {
        return labelVisibility[label];
    }
}

/**
 * Show/hide a label, or a whole group when `label` is a negative group id
 * (applies to every member label in one pass over the bitmap).
 */
Niivue.prototype.setLabelVisibility = function (label, visible) {
    let targets;
    if (isGroupId(label)) {
        const group = getGroup(roiState, label);
        if (!group) {
            return;
        }
        labelVisibility[label] = visible;
        targets = new Set(group.members);
    } else {
        targets = new Set([label]);
    }
    targets.forEach((t) => {
        labelVisibility[t] = visible;
    });
    if (!this.drawBitmap) {
        return;
    }
    if (this.hiddenBitmap === undefined || this.hiddenBitmap === null || this.hiddenBitmap.length === 0)
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    if (!visible) {
        for (let i = 0; i < this.drawBitmap.length; i++) {
            const v = this.drawBitmap[i];
            if (v !== 0 && targets.has(v)) {
                this.hiddenBitmap[i] = v;
                this.drawBitmap[i] = 0;
            }
        }
    } else {
        for (let i = 0; i < this.hiddenBitmap.length; i++) {
            const v = this.hiddenBitmap[i];
            if (v !== 0 && targets.has(v)) {
                this.hiddenBitmap[i] = 0;
                if (this.drawBitmap[i] === 0) {
                    this.drawBitmap[i] = v;
                }
            }
        }
    }
    this.refreshDrawing(false);
}

// whether the user drags, resets, or changes contrast programmatically, React will be notified
const _refreshLayers = Niivue.prototype.refreshLayers;
Niivue.prototype.refreshLayers = function (...args) {
    const r = _refreshLayers.apply(this, args);
    if (typeof this.onIntensityChange === "function") {
        this.onIntensityChange(this.volumes?.[0]);
    }
    return r;
};


// const drawAddUndoBitmap = Niivue.prototype.drawAddUndoBitmap;
// // This patching adds visibility filtering to drawings
// Niivue.prototype.drawAddUndoBitmap = async function(){
//     let resp = await drawAddUndoBitmap.call(this);
//     return resp;
// }

// This patch to closeDrawing clears invisible bitmapCache when applied
const closeDrawing = Niivue.prototype.closeDrawing;
/**
 * This patch to closeDrawing clears invisible bitmapCache when applied
 */
Niivue.prototype.closeDrawing = function () {
    resetRoiGroups(this);
    if (this.drawBitmap !== undefined && this.drawBitmap !== null)
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    else if (this.hiddenBitmap !== undefined)
        this.hiddenBitmap = [];
    closeDrawing.call(this);
}

const _loadDrawingFromUrl = Niivue.prototype.loadDrawingFromUrl;
Niivue.prototype.loadDrawingFromUrl = async function (fnm, isBinarize) {
    resetRoiGroups(this);
    return _loadDrawingFromUrl.call(this, fnm, isBinarize);
};

/**
 * The difference between clear drawing and close drawing is that
 * clear drawing retains itself in the undo stack.
 */
Niivue.prototype.clearDrawing = function () {
    resetRoiGroups(this);
    if (this.drawBitmap != undefined && this.drawBitmap != null) {
        this.drawBitmap = new Uint8Array(this.drawBitmap.length);
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    }
    this.drawAddUndoBitmap();
    this.refreshDrawing(true)
}

// not included in public docs
// set color of single voxel in drawing
// Include thickness in opts
/**
 * Pen bounds specify the padding added
 * around the drawing center
 * @param x
 * @param y
 * @param z
 * @param penValue
 */
Niivue.prototype.drawPt = function (x, y, z, penValue) {
    const penBounds = this.opts.penBounds ? this.opts.penBounds : 0;
    const dx = this.back.dims[1]
    const dy = this.back.dims[2]
    const dz = this.back.dims[3]
    //Sweep through cubic area, filter by radius
    for (let i = x - penBounds; i <= x + penBounds; i++) {
        for (let j = y - penBounds; j <= y + penBounds; j++) {
            for (let k = z - penBounds; k <= z + penBounds; k++) {
                // (penBounds+1)*(penBounds) as radius filter makes better circles in discrete case
                if ((i - x) * (i - x) + (j - y) * (j - y) + (k - z) * (k - z) <= (penBounds + 1) * (penBounds)) {
                    let xn = Math.min(Math.max(i, 0), dx - 1)
                    let yn = Math.min(Math.max(j, 0), dy - 1)
                    let zn = Math.min(Math.max(k, 0), dz - 1)
                    this.drawBitmap[xn + yn * dx + zn * dx * dy] = penValue;
                }
            }
        }
    }
}

// not included in public docs
// given series of line segments, connect first and last
// voxel and fill the interior of the line segments
// yuelong: fill volumetric interior of the paint space,
// if active draw pen set to invisible
Niivue.prototype.drawPenFilled = function () {
    const nPts = this.drawPenFillPts.length
    if (nPts < 2) {
        // can not fill single line
        this.drawPenFillPts = []
        return
    }
    // do fill in 2D, based on axial (0), coronal (1) or sagittal drawing (2
    const axCorSag = this.drawPenAxCorSag
    // axial is x(0)*y(1) horizontal*vertical
    let h = 0
    let v = 1
    if (axCorSag === 1) {
        v = 2
    } // coronal is x(0)*z(0)
    if (axCorSag === 2) {
        // sagittal is y(1)*z(2)
        h = 1
        v = 2
    }
    const penBounds = this.opts.penBounds ? this.opts.penBounds : 0;
    const w = penBounds * 2 + 1; // Yuelong: paint fill with thickness
    const dims3D = [this.back.dims[h + 1], this.back.dims[v + 1], w] // +1: dims indexed from 0!
    // create bitmap of horizontal*vertical voxels:
    const img3D = new Uint8Array(dims3D[0] * dims3D[1] * dims3D[2])
    let pen = 1 // do not use this.opts.penValue, as "erase" is zero
    function drawPt3D(x, y, penValue) {
        const dx = dims3D[0]
        const dy = dims3D[1]
        const dz = w
        const z = (w - 1) / 2;
        //Sweep through cubic area, filter by radius
        for (let i = x - penBounds; i <= x + penBounds; i++) {
            for (let j = y - penBounds; j <= y + penBounds; j++) {
                for (let k = z - penBounds; k <= z + penBounds; k++) {
                    // (penBounds+1)*(penBounds) as radius filter makes better circles in discrete case
                    if ((i - x) * (i - x) + (j - y) * (j - y) + (k - z) * (k - z) <= (penBounds + 1) * (penBounds)) {
                        let xn = Math.min(Math.max(i, 0), dx - 1)
                        let yn = Math.min(Math.max(j, 0), dy - 1)
                        let zn = Math.min(Math.max(k, 0), dz - 1)
                        img3D[xn + yn * dx + zn * dx * dy] = penValue;
                    }
                }
            }
        }
    }
    function drawLine2D(ptA, ptB /* penValue */) {
        const dx = Math.abs(ptA[0] - ptB[0])
        const dy = Math.abs(ptA[1] - ptB[1])
        // img2D[ptA[0] + ptA[1] * dims2D[0]] = pen
        // img2D[ptB[0] + ptB[1] * dims2D[0]] = pen
        drawPt3D(ptA[0], ptA[1], pen);
        drawPt3D(ptB[0], ptB[1], pen);
        let xs = -1
        let ys = -1
        if (ptB[0] > ptA[0]) {
            xs = 1
        }
        if (ptB[1] > ptA[1]) {
            ys = 1
        }
        let x1 = ptA[0]
        let y1 = ptA[1]
        const x2 = ptB[0]
        const y2 = ptB[1]
        if (dx >= dy) {
            // Driving axis is X-axis"
            let p1 = 2 * dy - dx
            while (x1 !== x2) {
                x1 += xs
                if (p1 >= 0) {
                    y1 += ys
                    p1 -= 2 * dx
                }
                p1 += 2 * dy
                drawPt3D(x1, y1, pen);
            }
        } else {
            // Driving axis is Y-axis"
            let p1 = 2 * dx - dy
            while (y1 !== y2) {
                y1 += ys
                if (p1 >= 0) {
                    x1 += xs
                    p1 -= 2 * dy
                }
                p1 += 2 * dx
                drawPt3D(x1, y1, pen);
            }
        }
    }
    const startPt = [this.drawPenFillPts[0][h], this.drawPenFillPts[0][v]]
    let prevPt = startPt
    for (let i = 1; i < nPts; i++) {
        const pt = [this.drawPenFillPts[i][h], this.drawPenFillPts[i][v]]
        drawLine2D(prevPt, pt)
        prevPt = pt
    }
    drawLine2D(startPt, prevPt) // close drawing
    // flood fill
    const seeds = []
    function setSeed(pt) { // pt 2D -> 3D
        if (pt[0] < 0 || pt[1] < 0 || pt[2] < 0 || pt[0] >= dims3D[0] || pt[1] >= dims3D[1] || pt[3] >= dims3D[2]) {
            return
        }
        const pxl = pt[0] + pt[1] * dims3D[0] + pt[2] * dims3D[0] * dims3D[1]
        if (img3D[pxl] !== 0) {
            return
        } // not blank
        seeds.push(pt)
        img3D[pxl] = 2
    }
    // https://en.wikipedia.org/wiki/Flood_fill
    // first seed all edges
    // // bottom row
    // for (let i = 0; i < dims2D[0]; i++) {
    //     setSeed([i, 0])
    // }
    // // top row
    // for (let i = 0; i < dims2D[0]; i++) {
    //     setSeed([i, dims2D[1] - 1])
    // }
    // // left column
    // for (let i = 0; i < dims2D[1]; i++) {
    //     setSeed([0, i])
    // }
    // // right columns
    // for (let i = 0; i < dims2D[1]; i++) {
    //     setSeed([dims2D[0] - 1, i])
    // }
    // Yuelong: Instead of seeding all edges, seed eight corners of the bounding box,
    setSeed([0, 0, 0]);
    setSeed([dims3D[0] - 1, 0, 0]);
    setSeed([0, dims3D[1] - 1, 0]);
    setSeed([dims3D[0] - 1, dims3D[1] - 1, 0]);
    setSeed([0, 0, dims3D[2] - 1]);
    setSeed([dims3D[0] - 1, 0, dims3D[2] - 1]);
    setSeed([0, dims3D[1] - 1, dims3D[2] - 1]);
    setSeed([dims3D[0] - 1, dims3D[1] - 1, dims3D[2] - 1]);
    // now retire first in first out
    while (seeds.length > 0) {
        // always remove one seed, plant 0..4 new ones
        const seed = seeds.shift()
        setSeed([seed[0] - 1, seed[1], seed[2]])
        setSeed([seed[0] + 1, seed[1], seed[2]])
        setSeed([seed[0], seed[1] - 1, seed[2]])
        setSeed([seed[0], seed[1] + 1, seed[2]])
        // Yuelong: flood fill z-axis as well
        setSeed([seed[0], seed[1], seed[2] + 1])
        setSeed([seed[0], seed[1], seed[2] - 1])
    }
    // all voxels with value of zero have no path to edges
    // insert surviving pixels from 2D bitmap into 3D bitmap
    pen = this.opts.penValue
    const slice = this.drawPenFillPts[0][3 - (h + v)]
    // if (axCorSag === 0) {
    //     // axial
    //     const offset = slice * dims2D[0] * dims2D[1]
    //     for (let i = 0; i < dims2D[0] * dims2D[1]; i++) {
    //         if (img2D[i] !== 2) {
    //             this.drawBitmap[i + offset] = pen
    //         }
    //     }
    // } else {
    //     let xStride = 1 // coronal: horizontal LR pixels contiguous
    //     const yStride = this.back.dims[1] * this.back.dims[2] // coronal: vertical is slice
    //     let zOffset = slice * this.back.dims[1] // coronal: slice is number of columns
    //     if (axCorSag === 2) {
    //         // sagittal
    //         xStride = this.back.dims[1]
    //         zOffset = slice
    //     }
    //     let i = 0
    //     for (let y = 0; y < dims2D[1]; y++) {
    //         for (let x = 0; x < dims2D[0]; x++) {
    //             if (img2D[i] !== 2) {
    //                 this.drawBitmap[x * xStride + y * yStride + zOffset] = pen
    //             }
    //             i++
    //         }
    //     }
    // }
    // Stride with permutation symmetry
    let strides = [1, this.back.dims[1], this.back.dims[1] * this.back.dims[2]];
    // xStride = s0 for axial and coronal, s1 for sagital
    let xStride = (axCorSag == 2) ? strides[1] : strides[0];
    // yStride = s1 for axial, s2 for coronal and sagital
    const yStride = (axCorSag == 0) ? strides[1] : strides[2];
    // zStride = s2 for axial, s1 for coronal, s0 for sagital
    const zStride = strides[2 - axCorSag];
    const zOffset = slice * zStride;
    let i = 0
    for (let z = -penBounds; z <= penBounds; z++) {
        for (let y = 0; y < dims3D[1]; y++) {
            for (let x = 0; x < dims3D[0]; x++) {
                if (img3D[i] !== 2) {
                    // Fill by 3D traversal
                    this.drawBitmap[x * xStride + y * yStride + zOffset + z * zStride] = pen
                }
                i++
            }
        }
    }
    // this.drawUndoBitmaps[this.currentDrawUndoBitmap]
    if (!this.drawFillOverwrites && this.drawUndoBitmaps[this.currentDrawUndoBitmap].length > 0) {
        const nv = this.drawBitmap.length
        const bmp = decodeRLE(this.drawUndoBitmaps[this.currentDrawUndoBitmap], nv)
        for (let i = 0; i < nv; i++) {
            if (bmp[i] === 0) {
                continue
            }
            this.drawBitmap[i] = bmp[i]
        }
    }
    this.drawPenFillPts = []
    // First imprint all hiddenBitmaps into the draw bitmap,
    // visible voxels take precedence
    if (this.hiddenBitmap)
        this.hiddenBitmap.map((value, index) => {
            if (value !== 0 && this.drawBitmap[index] === 0) {
                this.drawBitmap[index] = value;
            }
        })
    if (shouldDeferFreehandCommit(this) && this._cloudMrFreehandSessionStartBitmap) {
        this._cloudMrSkipNextUndoBitmap = true;
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
        for (let i = 0; i < this.drawBitmap.length; i++) {
            let pen = this.drawBitmap[i];
            if (!this.getLabelVisibility(pen)) {
                this.hiddenBitmap[i] = this.drawBitmap[i];
                this.drawBitmap[i] = 0;
            }
        }
        this.refreshDrawing(false);
        this.drawScene();
        const axCorSag =
            this.drawPenAxCorSag >= 0 ? this.drawPenAxCorSag : this._cloudMrFreehandAxCorSag;
        const draft = captureFreehandDraft(
            this,
            this._cloudMrFreehandSessionStartBitmap,
            axCorSag,
        );
        this._cloudMrFreehandSessionStartBitmap = null;
        if (draft && typeof this.onPenDraftReady === "function") {
            this.onPenDraftReady(draft);
        }
        return;
    }
    this.drawAddUndoBitmap()
    if (this._cloudMrFreehandSessionStartBitmap && isFreehandPenActive(this)) {
        const axCorSag =
            this.drawPenAxCorSag >= 0 ? this.drawPenAxCorSag : this._cloudMrFreehandAxCorSag;
        const draft = captureFreehandDraft(
            this,
            this._cloudMrFreehandSessionStartBitmap,
            axCorSag,
        );
        this._cloudMrFreehandSessionStartBitmap = null;
        if (draft && typeof this.onFreehandCommitted === "function") {
            this.onFreehandCommitted(draft);
        }
    }
    // Post-processing to hide hidden voxels
    this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    for (let i = 0; i < this.drawBitmap.length; i++) {
        let pen = this.drawBitmap[i];
        if (!this.getLabelVisibility(pen)) {
            this.hiddenBitmap[i] = this.drawBitmap[i];
            this.drawBitmap[i] = 0;
        }
    }
    this.refreshDrawing(false)
}

Niivue.prototype.fillRange = function (min, max, penValue, inverted = false,
    original = undefined, setOriginal = (original) => { }) {
    console.log(this.volumes);
    let volume = this.volumes[0];
    if (volume == undefined) {
        return;
    }
    if (!this.drawBitmap) {
        this.createEmptyDrawing();
    }
    // First load underlying imprinting
    if (original == undefined) {
        setOriginal([...this.drawBitmap]);
    } else {
        this.drawBitmap = new Uint8Array(original);
    }
    console.log(volume.img.length);
    console.log(this.drawBitmap.length);
    // Next write into the drawbitmap where voxel value are within range,
    // no need to write into hidden bitmap specifically due to the post-processing
    // step, where draw bitmap values will be hidden accordingly

    const dx = this.back.dims[1]
    const dy = this.back.dims[2]
    const dz = this.back.dims[3]
    for (let x = 0; x < dx; x++)
        for (let y = 0; y < dy; y++)
            for (let z = 0; z < dz; z++) {
                let i = x + y * dx + z * dx * dy;
                let val = volume.getValue(x, y, z);
                if ((!inverted && (min <= val && max >= val)) ||
                    //Note here that e-4 is not a trivial value,
                    // we can do this here because ranges beneath e-4 will be rescaled inside
                    // the checkRange function inside Niivue.jsx. It is still not entirely safe
                    // but a necessary step for inclusive range checking under float inprecisions
                    (inverted && (min >= val || max < val))) {
                    // console.log('filling');
                    this.drawBitmap[i] = penValue;
                }
            }
    // Next update drawUndoBitmaps pipeline
    // First imprint all hiddenBitmaps into the draw bitmap,
    // visible voxels take precedence
    if (this.hiddenBitmap)
        this.hiddenBitmap.map((value, index) => {
            if (value !== 0 && this.drawBitmap[index] === 0) {
                this.drawBitmap[index] = value;
            }
        })
    // Post-processing to hide invisible voxels
    this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    for (let i = 0; i < this.drawBitmap.length; i++) {
        let pen = this.drawBitmap[i];
        if (!this.getLabelVisibility(pen)) {
            this.hiddenBitmap[i] = this.drawBitmap[i];
            this.drawBitmap[i] = 0;
        }
    }
    this.refreshDrawing(true)
    // props.nv.drawScene()
}

Niivue.prototype.drawAddUndoBitmapWithHiddenVoxels = function () {
    // Next update drawUndoBitmaps pipeline
    // First imprint all hiddenBitmaps into the draw bitmap,
    // visible voxels take precedence
    if (this.hiddenBitmap)
        this.hiddenBitmap.map((value, index) => {
            if (value !== 0 && this.drawBitmap[index] === 0) {
                this.drawBitmap[index] = value;
            }
        })
    this.drawAddUndoBitmap()
    // Post-processing to hide invisible voxels
    this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    for (let i = 0; i < this.drawBitmap.length; i++) {
        let pen = this.drawBitmap[i];
        if (!this.getLabelVisibility(pen)) {
            this.hiddenBitmap[i] = this.drawBitmap[i];
            this.drawBitmap[i] = 0;
        }
    }
}

/**
 * Restore drawing to previous state
 * @example niivue.drawUndo();
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 * Yuelong: drawundo hides invisible rois in post processing
 */
Niivue.prototype.drawUndo = function () {
    if (!this.drawUndoBitmaps || this.drawUndoBitmaps.length < 1) {
        console.debug('undo bitmaps not loaded')
        return
    }
    if (this.currentDrawUndoBitmap <= 0) {
        return
    }
    this.currentDrawUndoBitmap--
    const slot = this.drawUndoBitmaps[this.currentDrawUndoBitmap]
    if (!slot || slot.length < 2) {
        this.currentDrawUndoBitmap++
        console.debug('drawUndo is misbehaving')
        return
    }
    restoreDrawHistorySlot(this, slot)
    this.onDrawHistoryChange?.()
}

Niivue.prototype.drawRedo = function () {
    if (!this.drawUndoBitmaps || this.drawUndoBitmaps.length < 1) {
        return
    }
    if (this.currentDrawUndoBitmap >= this.drawUndoBitmaps.length - 1) {
        return
    }
    this.currentDrawUndoBitmap++
    const slot = this.drawUndoBitmaps[this.currentDrawUndoBitmap]
    if (!slot || slot.length < 2) {
        this.currentDrawUndoBitmap--
        return
    }
    restoreDrawHistorySlot(this, slot)
    this.onDrawHistoryChange?.()
}

/**
 * save voxel-based image to disk
 * @param {string} fnm filename of NIfTI image to create
 * @param {boolean} [false] isSaveDrawing determines whether drawing or background image is saved
 * @param {number} [0] volumeByIndex determines layer to save (0 for background)
 * @param {number} [0] volumeByIndex determines layer to save (0 for background)
 * @example niivue.saveImage('test.nii', true);
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 */
Niivue.prototype.saveImageByLabels = async function (fnm, labels = [1]) {
    if (this.back.dims === undefined) {
        console.debug('No voxelwise image open')
        return false
    }
    if (!this.drawBitmap) {
        console.debug('No drawing open')
        return false
    }
    // `labels` may contain group ids (<0); export the member labels with their real ids.
    const live = maskDrawBitmapByLabels(this.drawBitmap, expandToLabels(roiState, labels))
    const perm = this.volumes[0].permRAS
    if (perm[0] === 1 && perm[1] === 2 && perm[2] === 3) {
        const outFlat = live
        await this.volumes[0].saveToDisk(fnm, outFlat)
        return true
    } else {
        const dims = this.volumes[0].hdr.dims // reverse to original
        // reverse RAS to native space, layout is mrtrix MIF format
        // for details see NVImage.readMIF()
        const layout = [0, 0, 0]
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (Math.abs(perm[i]) - 1 !== j) continue
                layout[j] = i * Math.sign(perm[i])
            }
        }
        let stride = 1
        const instride = [1, 1, 1]
        const inflip = [false, false, false]
        for (let i = 0; i < layout.length; i++) {
            for (let j = 0; j < layout.length; j++) {
                const a = Math.abs(layout[j])
                if (a !== i) continue
                instride[j] = stride
                // detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
                if (layout[j] < 0 || Object.is(layout[j], -0)) inflip[j] = true
                stride *= dims[j + 1]
            }
        }
        // lookup table for flips and stride offsets:
        const range = (start, stop, step) =>
            Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)
        let xlut = range(0, dims[1] - 1, 1)
        if (inflip[0]) xlut = range(dims[1] - 1, 0, -1)
        for (let i = 0; i < dims[1]; i++) xlut[i] *= instride[0]
        let ylut = range(0, dims[2] - 1, 1)
        if (inflip[1]) ylut = range(dims[2] - 1, 0, -1)
        for (let i = 0; i < dims[2]; i++) ylut[i] *= instride[1]
        let zlut = range(0, dims[3] - 1, 1)
        if (inflip[2]) zlut = range(dims[3] - 1, 0, -1)
        for (let i = 0; i < dims[3]; i++) zlut[i] *= instride[2]
        // convert data (already masked to the requested labels; voxels keep their real ids)

        const outVs = new Uint8Array(dims[1] * dims[2] * dims[3])
        let j = 0
        for (let z = 0; z < dims[3]; z++) {
            for (let y = 0; y < dims[2]; y++) {
                for (let x = 0; x < dims[1]; x++) {
                    const idx = xlut[x] + ylut[y] + zlut[z]
                    outVs[j] = live[idx]
                    j++
                }
            }
        }
        await this.volumes[0].saveToDisk(fnm, outVs)
        return true
    }
}

/**
 * Delete every voxel of the given labels. `labels` may contain group ids (<0), which delete all
 * member labels. Palette colours are kept (the colour stays available for new drawing).
 */
Niivue.prototype.deleteDrawingByLabel = function (labels = [0]) {
    const labelSet = expandToLabels(roiState, labels);
    if (labelSet.size === 0) {
        return;
    }
    for (let i = 0; i < this.drawBitmap.length; i++) {
        if (labelSet.has(this.drawBitmap[i])) {
            this.drawBitmap[i] = 0;
        }
    }
    // also drop voxels that are currently hidden, otherwise they would reappear on "show"
    if (this.hiddenBitmap && this.hiddenBitmap.length === this.drawBitmap.length) {
        for (let i = 0; i < this.hiddenBitmap.length; i++) {
            if (labelSet.has(this.hiddenBitmap[i])) {
                this.hiddenBitmap[i] = 0;
            }
        }
    }
    const affectedGroups = roiState.groups
        .filter((g) => g.members.some((m) => labelSet.has(m)))
        .map((g) => g.id);
    pruneLabelsFromGroups(roiState, labelSet);
    for (const id of affectedGroups) {
        if (!getGroup(roiState, id)) {
            delete labelVisibility[id];
        }
    }
    this.refreshDrawing(false);
    if (affectedGroups.length > 0) {
        applyRoiDrawLut(this);
    }
}

/**
 * Compatibility wrapper (old API merged voxels into label `targetLabel`, default 7).
 * Grouping is now display-only: voxels keep their labels and `targetLabel` is ignored.
 * @returns {number|null} the group id
 */
Niivue.prototype.groupLabelsInto = function (sourceLabels = [0], targetLabel = 7) {
    return this.groupLabelsFromSelection(sourceLabels);
}

/**
 * Dissolve groups. `groupIds` = negative ids to dissolve; omit to dissolve all groups.
 * Member labels return to their own palette colours; voxels are untouched.
 */
Niivue.prototype.ungroup = function (groupIds) {
    const ids = Array.isArray(groupIds) ? groupIds : null;
    const removed = ungroupItems(roiState, ids);
    if (removed.length === 0) {
        return [];
    }
    for (const g of removed) {
        delete labelVisibility[g.id];
    }
    applyRoiDrawLut(this);
    return removed.map((g) => g.id);
}

/**
 * Group from ROI-table selection. `ids` mixes labels (>0) and existing group ids (<0).
 * - Selection contains group(s): everything is merged into the oldest selected group.
 * - Otherwise a new group (-1, -2, ...) is created.
 * Display only: member voxels keep their label, they are drawn in the group colour.
 * @returns {number|null} the (new or extended) group id, or null if nothing was grouped
 */
Niivue.prototype.groupLabelsFromSelection = function (ids = []) {
    if (!this.drawBitmap || !Array.isArray(ids)) {
        return null;
    }
    const group = groupItems(roiState, ids);
    if (!group) {
        return null;
    }
    // Group visibility: visible unless every member was hidden. Apply it to all members so the
    // group row and its voxels always agree.
    const visible = group.members.some((m) => this.getLabelVisibility(m));
    applyRoiDrawLut(this);
    this.setLabelVisibility(group.id, visible);
    return group.id;
};

/** Group metadata: [{ id (<0), members: number[], color: "#rrggbb" }]. */
Niivue.prototype.getRoiGroups = function () {
    return roiState.groups.map((g) => ({ id: g.id, members: g.members.slice(), color: g.color }));
};

/** Palette: [{ label (1..255), color: "#rrggbb" }] sorted by label. */
Niivue.prototype.getRoiPalette = function () {
    return getPalette(roiState);
};

/** { label: "#rrggbb" } (for saving alongside a drawing). */
Niivue.prototype.getRoiLabelColorMap = function () {
    return getColorMap(roiState);
};

/**
 * Colour a label (>0) or group (<0) is currently drawn with (group colour if grouped).
 */
Niivue.prototype.getRoiLabelColor = function (label) {
    return resolveLabelColor(roiState, label, getBaseDrawLut(this));
};

/**
 * Add a user colour to the palette and return its new label (1..255).
 * If the colour already exists, the existing label is returned. Returns null when all 255
 * labels are in use.
 */
Niivue.prototype.addRoiColor = function (hex) {
    const color = normalizeHex(hex);
    if (!color) {
        return null;
    }
    registerDrawnLabels(this);
    const existing = findLabelByColor(roiState, color);
    if (existing !== null) {
        applyRoiDrawLut(this);
        return existing;
    }
    const label = nextFreeLabel(roiState, collectDrawnLabels(this));
    if (label === null) {
        console.warn(`addRoiColor: all ${MAX_ROI_LABEL} ROI labels are in use`);
        return null;
    }
    registerLabel(roiState, label, color);
    applyRoiDrawLut(this);
    return label;
};

/**
 * Remove a colour from the palette.
 * Not allowed for the default colour (label 1) or while any voxel (visible or hidden) still uses
 * the label; delete that ROI first.
 * @returns {{ ok: boolean, reason?: "default"|"missing"|"in-use", color?: string }}
 */
Niivue.prototype.removeRoiColor = function (label) {
    if (label === 1) {
        return { ok: false, reason: "default" };
    }
    if (!roiState.colors.has(label)) {
        return { ok: false, reason: "missing" };
    }
    if (this.drawBitmap && collectDrawnLabels(this).has(label)) {
        return { ok: false, reason: "in-use" };
    }
    const color = removeLabelColor(roiState, label);
    // drop stale group membership (e.g. voxels removed by undo)
    pruneLabelsFromGroups(roiState, new Set([label]));
    applyRoiDrawLut(this);
    return { ok: true, color };
};

/** Change the colour of an existing label. */
Niivue.prototype.setRoiLabelColor = function (label, hex) {
    registerDrawnLabels(this);
    if (!isRoiLabel(label) || !normalizeHex(hex)) {
        return false;
    }
    setLabelColor(roiState, label, hex);
    applyRoiDrawLut(this);
    return true;
};

/**
 * Apply a saved { label: "#rrggbb" } map (e.g. from a loaded ROI zip). Existing labels in the
 * map are overwritten; others are left alone.
 */
Niivue.prototype.applyRoiLabelColors = function (colorMap) {
    if (!colorMap || typeof colorMap !== "object") {
        return;
    }
    let changed = false;
    for (const key of Object.keys(colorMap)) {
        const label = Number(key);
        if (!isRoiLabel(label)) {
            continue;
        }
        const color = normalizeHex(colorMap[key]);
        if (!color) {
            continue;
        }
        if (!roiState.colors.has(label)) {
            roiState.colors.set(label, color);
            changed = true;
        } else if (setLabelColor(roiState, label, color)) {
            changed = true;
        }
    }
    if (changed) {
        applyRoiDrawLut(this);
    }
};

/**
 * Make sure every label present in the drawing has a palette entry (called after loads and
 * whenever the ROI table is rebuilt). Optionally pass extra labels to register.
 */
Niivue.prototype.ensureRoiLabelsRegistered = function (extraLabels) {
    let changed = this.drawBitmap ? registerDrawnLabels(this) : false;
    const base = getBaseDrawLut(this);
    for (const l of extraLabels || []) {
        if (registerLabel(roiState, l, getBaseColor(roiState, l, base))) {
            changed = true;
        }
    }
    if (changed) {
        applyRoiDrawLut(this);
    }
    return changed;
};

/**
 * Reset the palette to the single default colour (label 1), then re-register labels that are
 * already drawn. Used when a different user's saved colours are about to be restored.
 */
Niivue.prototype.resetRoiPalette = function () {
    resetPalette(roiState);
    if (this.drawBitmap) {
        registerDrawnLabels(this);
    }
    applyRoiDrawLut(this);
};

/** Push palette + groups to the GPU draw LUT again (e.g. after the viewer re-created textures). */
Niivue.prototype.rebuildRoiDrawLut = function () {
    applyRoiDrawLut(this);
};


Niivue.prototype.applyDefaultViewState = function () {
    const defaultZoom = this._cloudMrDefaultZoom ?? CLOUDMR_DEFAULT_VIEW_ZOOM;
    this.scene.crosshairPos = [0.5, 0.5, 0.5];
    this.scene.pan2Dxyzmm[0] = 0;
    this.scene.pan2Dxyzmm[1] = 0;
    this.scene.pan2Dxyzmm[2] = 0;
    this.scene.pan2Dxyzmm[3] = defaultZoom;
    // Niivue needs pan offset when zoom !== fit to keep the volume centered.
    const zoomChange = CLOUDMR_NIIVUE_FIT_ZOOM - defaultZoom;
    if (zoomChange !== 0) {
        const mm = this.frac2mm([0.5, 0.5, 0.5]);
        this.scene.pan2Dxyzmm[0] += zoomChange * mm[0];
        this.scene.pan2Dxyzmm[1] += zoomChange * mm[1];
        this.scene.pan2Dxyzmm[2] += zoomChange * mm[2];
    }
    this.drawScene();
};

Niivue.prototype.resetScene = function () {
    // Reset 3D camera to Niivue defaults (azimuth=110, elevation=10, scale=1)
    if (typeof this.setRenderAzimuthElevation === "function") {
        this.setRenderAzimuthElevation(110, 10);
    }
    if (typeof this.setScale === "function") {
        this.setScale(1.0);
    }
    this.applyDefaultViewState();
}

Niivue.prototype.recenter = function () {
    // this.scene.pan2Dxyzmm[0] = 0;
    // this.scene.pan2Dxyzmm[1] = 0;
    // this.scene.pan2Dxyzmm[2] = 0;

    const zoom = this.scene.pan2Dxyzmm[3];
    this.scene.pan2Dxyzmm = [0, 0, 0, 1];
    const zoomChange = this.scene.pan2Dxyzmm[3] - zoom
    this.scene.pan2Dxyzmm[3] = zoom;
    const mm = this.frac2mm([0.5, 0.5, 0.5])
    this.scene.pan2Dxyzmm[0] += zoomChange * mm[0]
    this.scene.pan2Dxyzmm[1] += zoomChange * mm[1]
    this.scene.pan2Dxyzmm[2] += zoomChange * mm[2]
    this.drawScene()
}


Niivue.prototype.resetZoom = function () {
    // Reset 2D zoom (pan stays, only zoom component adjusted)
    const zoom = this._cloudMrDefaultZoom ?? CLOUDMR_DEFAULT_VIEW_ZOOM;
    const zoomChange = this.scene.pan2Dxyzmm[3] - zoom;
    this.scene.pan2Dxyzmm[3] = zoom;
    const mm = this.frac2mm(this.scene.crosshairPos);
    this.scene.pan2Dxyzmm[0] += zoomChange * mm[0];
    this.scene.pan2Dxyzmm[1] += zoomChange * mm[1];
    this.scene.pan2Dxyzmm[2] += zoomChange * mm[2];
    // Reset 3D zoom to default scale
    if (typeof this.setScale === "function") {
        this.setScale(1.0);
    }
    this.drawScene();
}

Niivue.prototype.setCenteredZoom = function (zoom) {
    this.scene.pan2Dxyzmm[0] = 0;
    this.scene.pan2Dxyzmm[1] = 0;
    this.scene.pan2Dxyzmm[2] = 0;

    const zoomChange = this.scene.pan2Dxyzmm[3] - zoom
    this.scene.pan2Dxyzmm[3] = zoom;
    const mm = this.frac2mm(this.scene.crosshairPos)
    this.scene.pan2Dxyzmm[0] += zoomChange * mm[0]
    this.scene.pan2Dxyzmm[1] += zoomChange * mm[1]
    this.scene.pan2Dxyzmm[2] += zoomChange * mm[2]
    this.drawScene()
}

Niivue.prototype.resetContrast = function () {
    this.volumes[0].cal_min = this.volumes[0].robust_min;
    this.volumes[0].cal_max = this.volumes[0].robust_max;
    this.onIntensityChange(this.volumes[0]);
    this.refreshLayers(this.volumes[0], 0);
    this.drawScene();
    if (this.onResetContrast)
        this.onResetContrast();
}

Niivue.prototype.relabelROIs = function (source = 0, target = 0) {
    for (let i = 0; i < this.drawBitmap.length; i++) {
        if (this.drawBitmap[i] === source) {
            this.drawBitmap[i] = target;
        }
    }
    // keep group membership in sync (source label no longer exists)
    relabelInGroups(roiState, source, target);
    this.refreshDrawing(true);
    applyRoiDrawLut(this);
}

Niivue.prototype.loadDrawingFromBase64 = async function (fnm, base64) {
    if (this.drawBitmap) {
        console.debug('Overwriting open drawing!')
    }
    this.drawClearAllUndoBitmaps()
    resetRoiGroups(this)
    try {
        // const volume = await NVImage.loadFromUrl()
        if (base64) {
            let imageOptions = NVImageFromUrlOptions(fnm);
            // NVImage.loadFromBase64 is async in NiiVue >=0.68
            const drawingBitmap = await NVImage.loadFromBase64({ name: fnm, base64 })
            if (drawingBitmap) {
                this.loadDrawing(drawingBitmap)
            }
        }
    } catch (err) {
        console.error(err);
        console.error('loadDrawingFromBlob() failed to load ' + fnm)
        this.drawClearAllUndoBitmaps()
        resetRoiGroups(this)
    }
    return base64 !== undefined;
}

/**
 * Merge an uploaded/loaded drawing into the current drawBitmap instead of replacing it.
 * Non-zero import voxels overwrite the current bitmap (same as drawing a new ROI on top).
 * Import label IDs are reused when that ID is not already on the canvas (same color as when drawn);
 * otherwise they are remapped to the next free ID to avoid collisions.
 * @returns {{ ok: boolean, importLabelRemap: Record<number, number>|null }}
 *   importLabelRemap null means the full scene was loaded with loadDrawing (no prior drawing).
 */
Niivue.prototype.mergeDrawingFromBase64 = async function (fnm, base64) {
    const result = { ok: false, importLabelRemap: null };
    if (!base64) {
        return result;
    }
    try {
        if (!this.back) {
            throw new Error('back undefined');
        }
        // NVImage.loadFromBase64 is async in NiiVue >=0.68
        const drawingBitmap = await NVImage.loadFromBase64({ name: fnm, base64 });
        if (!drawingBitmap || !drawingBitmap.hdr || !drawingBitmap.hdr.dims) {
            return result;
        }
        const dims = drawingBitmap.hdr.dims;
        if (
            dims[1] !== this.back.hdr.dims[1] ||
            dims[2] !== this.back.hdr.dims[2] ||
            dims[3] !== this.back.hdr.dims[3]
        ) {
            console.warn('mergeDrawingFromBase64: drawing dimensions do not match background');
            return result;
        }
        const vx = dims[1] * dims[2] * dims[3];
        const perm = drawingBitmap.permRAS;
        const layout = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (Math.abs(perm[i]) - 1 !== j) {
                    continue;
                }
                layout[j] = i * Math.sign(perm[i]);
            }
        }
        let stride = 1;
        const instride = [1, 1, 1];
        const inflip = [false, false, false];
        for (let i = 0; i < layout.length; i++) {
            for (let j = 0; j < layout.length; j++) {
                const a = Math.abs(layout[j]);
                if (a !== i) {
                    continue;
                }
                instride[j] = stride;
                if (layout[j] < 0 || Object.is(layout[j], -0)) {
                    inflip[j] = true;
                }
                stride *= dims[j + 1];
            }
        }
        const nvRange = (start, end, step) => {
            const o = [];
            if (step > 0) {
                for (let i = start; i <= end; i += step) {
                    o.push(i);
                }
            } else {
                for (let i = start; i >= end; i += step) {
                    o.push(i);
                }
            }
            return o;
        };
        let xlut = nvRange(0, dims[1] - 1, 1);
        if (inflip[0]) {
            xlut = nvRange(dims[1] - 1, 0, -1);
        }
        for (let i = 0; i < dims[1]; i++) {
            xlut[i] *= instride[0];
        }
        let ylut = nvRange(0, dims[2] - 1, 1);
        if (inflip[1]) {
            ylut = nvRange(dims[2] - 1, 0, -1);
        }
        for (let i = 0; i < dims[2]; i++) {
            ylut[i] *= instride[1];
        }
        let zlut = nvRange(0, dims[3] - 1, 1);
        if (inflip[2]) {
            zlut = nvRange(dims[3] - 1, 0, -1);
        }
        for (let i = 0; i < dims[3]; i++) {
            zlut[i] *= instride[2];
        }

        const inVs = drawingBitmap.img;
        const importFlat = new Uint8Array(vx);
        let ji = 0;
        for (let z = 0; z < dims[3]; z++) {
            for (let y = 0; y < dims[2]; y++) {
                for (let x = 0; x < dims[1]; x++) {
                    importFlat[xlut[x] + ylut[y] + zlut[z]] = inVs[ji];
                    ji++;
                }
            }
        }

        const hasExistingDrawing =
            this.drawBitmap &&
            this.drawBitmap.length === vx &&
            this.drawBitmap.some((v) => v !== 0);

        if (this.drawBitmap && this.drawBitmap.length !== vx) {
            console.warn('mergeDrawingFromBase64: drawBitmap size mismatch; replacing drawing');
            resetRoiGroups(this);
            this.loadDrawing(drawingBitmap);
            result.ok = true;
            result.importLabelRemap = null;
            return result;
        }

        if (!hasExistingDrawing) {
            resetRoiGroups(this);
            this.loadDrawing(drawingBitmap);
            result.ok = true;
            result.importLabelRemap = null;
            return result;
        }

        // labels already on the canvas (including temporarily hidden ones)
        const usedOnCanvas = collectDrawnLabels(this);

        const seen = new Set();
        for (let i = 0; i < importFlat.length; i++) {
            const v = importFlat[i];
            if (v !== 0) {
                seen.add(v);
            }
        }
        const sorted = Array.from(seen).sort((a, b) => a - b);
        const importLabelRemap = {};
        // Colliding imports move to the lowest free label (1..255). Labels are one byte per
        // voxel, so if all 255 are taken the import label is reused (merges into that ROI).
        let nextSynthetic = 1;
        for (let s = 0; s < sorted.length; s++) {
            const oldL = sorted[s];
            if (!usedOnCanvas.has(oldL)) {
                importLabelRemap[oldL] = oldL;
                usedOnCanvas.add(oldL);
            } else {
                while (nextSynthetic <= MAX_ROI_LABEL && usedOnCanvas.has(nextSynthetic)) {
                    nextSynthetic++;
                }
                if (nextSynthetic > MAX_ROI_LABEL) {
                    console.warn('mergeDrawingFromBase64: no free ROI label left; merging label ' + oldL + ' into the existing one');
                    importLabelRemap[oldL] = oldL;
                } else {
                    importLabelRemap[oldL] = nextSynthetic;
                    usedOnCanvas.add(nextSynthetic);
                    nextSynthetic++;
                }
            }
        }

        for (let i = 0; i < vx; i++) {
            const v = importFlat[i];
            if (v === 0) {
                continue;
            }
            // Upload wins overlaps (matches pen drawing on top of another ROI)
            this.drawBitmap[i] = importLabelRemap[v];
        }

        this.drawAddUndoBitmap();
        this.refreshDrawing(false);
        // make sure imported labels (possibly remapped) have palette entries
        registerDrawnLabels(this);
        applyRoiDrawLut(this);
        this.drawScene();
        result.ok = true;
        result.importLabelRemap = importLabelRemap;
        return result;
    } catch (err) {
        console.error(err);
        console.error('mergeDrawingFromBase64() failed to load ' + fnm);
        return result;
    }
};

// not included in public docs
// show text labels for L/R, A/P, I/S dimensions
Niivue.prototype.drawSliceOrientationText = function (leftTopWidthHeight, axCorSag) {
    if (this.hideText) {
        return;
    }
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
    let topText = 'S'
    if (axCorSag === SLICE_TYPE.AXIAL) {
        topText = 'A'
    }
    let leftText = this.opts.isRadiologicalConvention ? 'R' : 'L'
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        leftText = this.opts.sagittalNoseLeft ? 'A' : 'P'
    }
    if (this.opts.isCornerOrientationText) {
        this.drawTextRightBelow([leftTopWidthHeight[0], leftTopWidthHeight[1]], leftText + topText)
        return
    }
    this.drawTextBelow([leftTopWidthHeight[0] + leftTopWidthHeight[2] * 0.5, leftTopWidthHeight[1]], topText)

    this.drawTextRight([leftTopWidthHeight[0], leftTopWidthHeight[1] + leftTopWidthHeight[3] * 0.5], leftText)
}

// not included in public docs
// draw line (can be diagonal)
// unless Alpha is > 0, default color is opts.crosshairColor
Niivue.prototype.drawLine = function (startXYendXY, thickness = 1, lineColor = [1, 0, 0, -1]) {
    console.log(startXYendXY);
    this.gl.bindVertexArray(this.genericVAO)
    if (!this.lineShader) {
        throw new Error('lineShader undefined')
    }
    this.lineShader.use(this.gl)
    if (lineColor[3] < 0) {
        lineColor = this.opts.crosshairColor
    }
    this.gl.uniform4fv(this.lineShader.uniforms.lineColor, lineColor)
    this.gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
    // draw Line
    this.gl.uniform1f(this.lineShader.uniforms.thickness, thickness)
    this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, startXYendXY)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(this.unusedVAO) // set vertex attributes
}

// not included in public docs
// note: no test yet
Niivue.prototype.calculateNewRange = function ({ volIdx = 0 } = {}) {
    if (this.opts.sliceType === SLICE_TYPE.RENDER && this.sliceMosaicString.length < 1) {
        return
    }
    if (this.uiData.dragStart[0] === this.uiData.dragEnd[0] && this.uiData.dragStart[1] === this.uiData.dragEnd[1]) {
        return
    }
    // calculate our box
    let frac = this.canvasPos2frac([this.uiData.dragStart[0], this.uiData.dragStart[1]])
    if (frac[0] < 0) {
        return
    }
    const startVox = this.frac2vox(frac, volIdx)
    frac = this.canvasPos2frac([this.uiData.dragEnd[0], this.uiData.dragEnd[1]])
    if (frac[0] < 0) {
        return
    }
    const endVox = this.frac2vox(frac, volIdx)

    let hi = -Number.MAX_VALUE
    let lo = Number.MAX_VALUE
    const xrange = this.calculateMinMaxVoxIdx([startVox[0], endVox[0]])
    const yrange = this.calculateMinMaxVoxIdx([startVox[1], endVox[1]])
    const zrange = this.calculateMinMaxVoxIdx([startVox[2], endVox[2]])

    // for our constant dimension we add one so that the for loop runs at least once
    if (startVox[0] - endVox[0] === 0) {
        xrange[1] = startVox[0] + 1
    } else if (startVox[1] - endVox[1] === 0) {
        yrange[1] = startVox[1] + 1
    } else if (startVox[2] - endVox[2] === 0) {
        zrange[1] = startVox[2] + 1
    }

    const hdr = this.volumes[volIdx].hdr
    const img = this.volumes[volIdx].img
    if (!hdr || !img) {
        return
    }

    const xdim = hdr.dims[1]
    const ydim = hdr.dims[2]
    for (let z = zrange[0]; z < zrange[1]; z++) {
        const zi = z * xdim * ydim
        for (let y = yrange[0]; y < yrange[1]; y++) {
            const yi = y * xdim
            for (let x = xrange[0]; x < xrange[1]; x++) {
                const index = zi + yi + x
                if (lo > img[index]) {
                    lo = img[index]
                }
                if (hi < img[index]) {
                    hi = img[index]
                }
            }
        }
    }
    if (lo >= hi) {
        return
    } // no variability or outside volume
    const mnScale = intensityRaw2Scaled(hdr, lo)
    const mxScale = intensityRaw2Scaled(hdr, hi)
    this.volumes[volIdx].cal_min = mnScale
    this.volumes[volIdx].cal_max = mxScale
    console.log(mnScale);
    console.log(mxScale);
    this.onIntensityChange(this.volumes[volIdx])
}

function create3() {
    var out = new Float32Array();
    // if (ARRAY_TYPE != Float32Array) {
    //     out[0] = 0;
    //     out[1] = 0;
    //     out[2] = 0;
    // }
    return out;
}

function swizzleVec3(vec, order = [0, 1, 2]) {
    const vout = create3();
    vout[0] = vec[order[0]];
    vout[1] = vec[order[1]];
    vout[2] = vec[order[2]];
    return vout;
}

Niivue.prototype.drawCrossLinesMM = function (sliceIndex, axCorSag, axiMM, corMM, sagMM) {
    console.log('method called');
    if (sliceIndex < 0 || this.screenSlices.length <= sliceIndex) {
        return;
    }
    const tile = this.screenSlices[sliceIndex];
    let sliceFrac = tile.sliceFrac;
    const isRender = sliceFrac === Infinity;
    if (isRender) {
        console.warn("Rendering approximate cross lines in world view mode");
    }
    if (sliceFrac === Infinity) {
        sliceFrac = 0.5;
    }
    let linesH = corMM.slice();
    let linesV = sagMM.slice();
    const thick = Math.max(1, this.opts.crosshairWidth);
    if (axCorSag === SLICE_TYPE.CORONAL) {
        linesH = axiMM.slice();
    }
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        linesH = axiMM.slice();
        linesV = corMM.slice();
    }
    function mm2screen(mm) {
        const screenXY = [0, 0];
        screenXY[0] = tile.leftTopWidthHeight[0] + (mm[0] - tile.leftTopMM[0]) / tile.fovMM[0] * tile.leftTopWidthHeight[2];
        screenXY[1] = tile.leftTopWidthHeight[1] + tile.leftTopWidthHeight[3] - (mm[1] - tile.leftTopMM[1]) / tile.fovMM[1] * tile.leftTopWidthHeight[3];
        return screenXY;
    }
    if (linesH.length > 0 && axCorSag === 0) {
        const fracZ = sliceFrac;
        const dimV = 1;
        for (let i2 = 0; i2 < linesH.length; i2++) {
            const mmV = this.frac2mm([0.5, 0.5, 0.5]);
            mmV[dimV] = linesH[i2];
            let fracY = this.mm2frac(mmV);
            fracY = fracY[dimV];
            let left = this.frac2mm([0, fracY, fracZ]);
            left = swizzleVec3(left, [0, 1, 2]);
            let right = this.frac2mm([1, fracY, fracZ]);
            right = swizzleVec3(right, [0, 1, 2]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesH.length > 0 && axCorSag === 1) {
        const fracH = sliceFrac;
        const dimV = 2;
        for (let i2 = 0; i2 < linesH.length; i2++) {
            const mmV = this.frac2mm([0.5, 0.5, 0.5]);
            mmV[dimV] = linesH[i2];
            let fracV = this.mm2frac(mmV);
            fracV = fracV[dimV];
            let left = this.frac2mm([0, fracH, fracV]);
            left = swizzleVec3(left, [0, 2, 1]);
            let right = this.frac2mm([1, fracH, fracV]);
            right = swizzleVec3(right, [0, 2, 1]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesH.length > 0 && axCorSag === 2) {
        const fracX = sliceFrac;
        const dimV = 2;
        for (let i2 = 0; i2 < linesH.length; i2++) {
            const mmV = this.frac2mm([0.5, 0.5, 0.5]);
            mmV[dimV] = linesH[i2];
            let fracZ = this.mm2frac(mmV);
            fracZ = fracZ[dimV];
            let left = this.frac2mm([fracX, 0, fracZ]);
            left = swizzleVec3(left, [1, 2, 0]);
            let right = this.frac2mm([fracX, 1, fracZ]);
            right = swizzleVec3(right, [1, 2, 0]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesV.length > 0 && axCorSag === 0) {
        const fracZ = sliceFrac;
        const dimH = 0;
        for (let i2 = 0; i2 < linesV.length; i2++) {
            const mm = this.frac2mm([0.5, 0.5, 0.5]);
            mm[dimH] = linesV[i2];
            let frac = this.mm2frac(mm);
            frac = frac[dimH];
            let left = this.frac2mm([frac, 0, fracZ]);
            left = swizzleVec3(left, [0, 1, 2]);
            let right = this.frac2mm([frac, 1, fracZ]);
            right = swizzleVec3(right, [0, 1, 2]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesV.length > 0 && axCorSag === 1) {
        const fracY = sliceFrac;
        const dimH = 0;
        for (let i2 = 0; i2 < linesV.length; i2++) {
            const mm = this.frac2mm([0.5, 0.5, 0.5]);
            mm[dimH] = linesV[i2];
            let frac = this.mm2frac(mm);
            frac = frac[dimH];
            let left = this.frac2mm([frac, fracY, 0]);
            left = swizzleVec3(left, [0, 2, 1]);
            let right = this.frac2mm([frac, fracY, 1]);
            right = swizzleVec3(right, [0, 2, 1]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesV.length > 0 && axCorSag === 2) {
        const fracX = sliceFrac;
        const dimH = 1;
        for (let i2 = 0; i2 < linesV.length; i2++) {
            const mm = this.frac2mm([0.5, 0.5, 0.5]);
            mm[dimH] = linesV[i2];
            let frac = this.mm2frac(mm);
            frac = frac[dimH];
            let left = this.frac2mm([fracX, frac, 0]);
            left = swizzleVec3(left, [1, 2, 0]);
            let right = this.frac2mm([fracX, frac, 1]);
            right = swizzleVec3(right, [1, 2, 0]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
}


// Stock drawCrosshairs3D overwrites color alpha with a hardcoded pass alpha (1.0 / 0.15)
// and disables blending on the solid pass — so opts.crosshairColor[3] has no visual effect.
// Scale the pass alpha by the user opacity and keep blending on when opacity < 1.
const _drawCrosshairs3D = Niivue.prototype.drawCrosshairs3D;
Niivue.prototype.drawCrosshairs3D = function cloudMrDrawCrosshairs3D(
  isDepthTest = true,
  alpha = 1.0,
  mvpMtx = null,
  is2DView = false,
  isSliceMM = true
) {
  const c = this.opts.crosshairColor;
  const userAlpha =
    Array.isArray(c) && c.length > 3 && Number.isFinite(c[3]) ? c[3] : 1;
  const scaledAlpha = alpha * userAlpha;

  const gl = this.gl;
  let restoreDisable = null;
  if (isDepthTest && scaledAlpha < 0.999) {
    const origDisable = gl.disable.bind(gl);
    gl.disable = (cap) => {
      if (cap === gl.BLEND) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        return;
      }
      return origDisable(cap);
    };
    restoreDisable = () => {
      gl.disable = origDisable;
    };
  }
  try {
    return _drawCrosshairs3D.call(
      this,
      isDepthTest,
      scaledAlpha,
      mvpMtx,
      is2DView,
      isSliceMM
    );
  } finally {
    if (restoreDisable) restoreDisable();
  }
};

Niivue.prototype.drawClearAllUndoBitmaps = function cloudMrDrawClearAllUndoBitmaps() {
  this.opts.maxDrawUndoBitmaps = clampMaxDrawUndoBitmaps(this.opts?.maxDrawUndoBitmaps);
  this.drawUndoBitmaps = [];
  this.currentDrawUndoBitmap = -1;
  this.onDrawHistoryChange?.();
};

Niivue.prototype.drawAddUndoBitmap = function cloudMrDrawAddUndoBitmap(drawFillOverwrites = true) {
  if (this._cloudMrSkipNextUndoBitmap) {
    this._cloudMrSkipNextUndoBitmap = false;
    return;
  }
  if (!this.drawBitmap || this.drawBitmap.length < 1) {
    return;
  }
  this.opts.maxDrawUndoBitmaps = clampMaxDrawUndoBitmaps(this.opts.maxDrawUndoBitmaps);
  if (!Array.isArray(this.drawUndoBitmaps)) {
    this.drawUndoBitmaps = [];
    this.currentDrawUndoBitmap = -1;
  }

  const idx = this.currentDrawUndoBitmap;
  let bitmap = this.drawBitmap;
  if (drawFillOverwrites === false && idx >= 0) {
    const prevRle = this.drawUndoBitmaps[idx];
    if (prevRle && prevRle.length >= 2) {
      const prev = decodeRLE(prevRle, bitmap.length);
      bitmap = new Uint8Array(bitmap);
      for (let i = 0; i < bitmap.length; i++) {
        if (prev[i] > 0) bitmap[i] = prev[i];
      }
      this.drawBitmap = bitmap;
      this.refreshDrawing(false);
    }
  }

  const rle = encodeRLE(bitmap);
  const cur = idx >= 0 ? this.drawUndoBitmaps[idx] : null;
  if (cur && typedArraysEqual(cur, rle)) {
    return;
  }

  if (idx >= 0 && idx < this.drawUndoBitmaps.length - 1) {
    this.drawUndoBitmaps = this.drawUndoBitmaps.slice(0, idx + 1);
  }
  this.drawUndoBitmaps.push(rle);
  this.currentDrawUndoBitmap = this.drawUndoBitmaps.length - 1;
  compactDrawUndoHistory(this);
  this.onDrawHistoryChange?.();
};

Niivue.prototype.cloudMrCancelPolyline = function cloudMrCancelPolyline() {
  cancelPolyline(this);
};

Niivue.prototype.cloudMrFinishPolyline = function cloudMrFinishPolyline(fillClosed = false) {
  return finishPolyline(this, { fillClosed });
};

Niivue.prototype.cloudMrResetPolyline = function cloudMrResetPolyline() {
  resetPolylineState(this);
};

const RIGHT_MOUSE_BUTTON = 2;

function cloudMrHasApplyableDraft(nv) {
  return !!(nv._cloudMrShapeDraftActive || nv._cloudMrPenDraftActive);
}

function cloudMrTryApplyDraftOnRightClick(nv, event) {
  if (!cloudMrHasApplyableDraft(nv)) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  if (typeof nv.onApplyActiveDraft === "function") {
    nv.onApplyActiveDraft();
  }
  return true;
}

/** Returns the tool-kind code stored for the voxel under the mouse (0=unknown,1=shape,2=pen freehand,3=pen polyline). */
function clickedVoxelToolKind(nv) {
  const bitmap = nv._cloudMrToolKindBitmap;
  if (!bitmap || !nv.back?.dims) return 0;
  const seedVox = voxFromMouse(nv);
  if (!seedVox) return 0;
  const dims = nv.back.dims;
  const dx = dims[1];
  const dy = dims[2];
  const idx = seedVox[0] + seedVox[1] * dx + seedVox[2] * dx * dy;
  return bitmap[idx] || 0;
}

/**
 * Re-open an applied ROI for editing based on stored (or inferred) tool kind.
 * Unmarked pen strokes (kind 0) must try pen reopen before shape inference —
 * otherwise freehand blobs get misclassified as ellipse/rectangle shapes.
 */
function cloudMrTryReopenDraftOnClick(nv) {
  if (nv._cloudMrShapeDraftActive || nv._cloudMrPenDraftActive) return;
  if (!isClickWithoutDrag(nv.uiData)) return;
  // Never reopen a draft when the eraser is the active tool — the user is
  // trying to erase, not re-select.  The eraser sets penValue to 0 with
  // drawing enabled; that combination uniquely identifies the eraser here.
  if (nv.opts.drawingEnabled && nv.opts.penValue === 0) return;

  const kind = clickedVoxelToolKind(nv);
  if (kind === 1) {
    cloudMrTryReopenShapeDraftOnClick(nv);
    return;
  }
  if (kind === 2 || kind === 3) {
    cloudMrTryReopenPenDraftOnClick(nv);
    return;
  }
  if (cloudMrTryReopenPenDraftOnClick(nv)) return;
  cloudMrTryReopenShapeDraftOnClick(nv);
}

/**
 * Re-enter rectangle/ellipse edit mode when clicking an existing applied shape ROI.
 * Skips voxels that were drawn with the pen tool (those are handled by pen reopen).
 */
function cloudMrTryReopenShapeDraftOnClick(nv) {
  if (nv._cloudMrShapeDraftActive || nv._cloudMrPenDraftActive) return false;
  if (!isClickWithoutDrag(nv.uiData)) return false;

  // If we know this voxel was drawn with the pen, skip shape reopen
  const kind = clickedVoxelToolKind(nv);
  if (kind === 2 || kind === 3) return false;
  if (isRegisteredPolylineClick(nv)) return false;

  const reopenDraft = captureShapeDraftFromClick(nv);
  if (!reopenDraft) return false;

  redrawDraftShape(nv, reopenDraft);
  if (typeof nv.onShapeDraftReady === "function") {
    nv.onShapeDraftReady(reopenDraft);
  }
  return true;
}

/**
 * Re-enter pen (freehand) edit mode when clicking an existing applied pen ROI.
 * Skips voxels that were drawn with a shape tool.
 */
function cloudMrTryReopenPenDraftOnClick(nv) {
  if (nv._cloudMrShapeDraftActive || nv._cloudMrPenDraftActive) return false;
  if (!isClickWithoutDrag(nv.uiData)) return false;

  // Only handle pen voxels — skip if this was drawn with a shape tool
  const kind = clickedVoxelToolKind(nv);
  if (kind === 1) return false;

  let draft = capturePolylineDraftFromClick(nv);
  let penKind = draft ? 3 : kind === 3 ? 3 : 2;

  if (!draft) {
    draft = capturePenDraftFromClick(nv);
    if (!draft) return false;
    if (kind !== 3) penKind = 2;
  }

  // capturePolylineDraftFromClick always returns a freehand draft now (exact stored
  // voxels, no vertex state, no re-flood-fill), so the redraw path is uniform.
  redrawFreehandDraft(nv, draft);
  if (typeof nv.onPenDraftReopenReady === "function") {
    nv.onPenDraftReopenReady(draft, penKind);
  }
  return true;
}

const _mouseDownListener = Niivue.prototype.mouseDownListener;
Niivue.prototype.mouseDownListener = function cloudMrMouseDownListener(e) {
  if (e.button === RIGHT_MOUSE_BUTTON && cloudMrTryApplyDraftOnRightClick(this, e)) {
    return;
  }
  if (isFreehandPenActive(this) && this.drawBitmap) {
    this._cloudMrFreehandSessionStartBitmap = this.drawBitmap.slice();
    this._cloudMrFreehandAxCorSag = -1;
    this._cloudMrFreehandDidDrag = false;
    this._cloudMrFreehandPointerDown = [e.offsetX, e.offsetY];
  }
  _mouseDownListener.call(this, e);
  if (isFreehandPenActive(this) && this._cloudMrFreehandSessionStartBitmap) {
    const axCorSag = axCorSagFromMouse(this);
    if (axCorSag >= 0) {
      this._cloudMrFreehandAxCorSag = axCorSag;
    }
  }
};

const _mouseContextMenuListener = Niivue.prototype.mouseContextMenuListener;
Niivue.prototype.mouseContextMenuListener = function cloudMrMouseContextMenuListener(e) {
  if (cloudMrHasApplyableDraft(this)) {
    e.preventDefault();
    return;
  }
  return _mouseContextMenuListener.call(this, e);
};

const _mouseClick = Niivue.prototype.mouseClick;
Niivue.prototype.mouseClick = function cloudMrMouseClick(...args) {
  if (isPolylinePenActive(this)) {
    if (this._cloudMrPolylineVertices?.length > 0) {
      previewPolylineSegment(this);
    }
    return false;
  }
  return _mouseClick.apply(this, args);
};

const _mouseMoveListener = Niivue.prototype.mouseMoveListener;
Niivue.prototype.mouseMoveListener = function cloudMrMouseMoveListener(event) {
  if (this._cloudMrFreehandPointerDown && isFreehandPenActive(this)) {
    const start = this._cloudMrFreehandPointerDown;
    const dx = start[0] - event.offsetX;
    const dy = start[1] - event.offsetY;
    if (dx * dx + dy * dy > 25) {
      this._cloudMrFreehandDidDrag = true;
    }
  }
  const result = _mouseMoveListener.call(this, event);
  if (isPolylinePenActive(this) && this._cloudMrPolylineVertices?.length > 0) {
    previewPolylineSegment(this);
  }
  return result;
};

const _mouseUpListener = Niivue.prototype.mouseUpListener;
Niivue.prototype.mouseUpListener = function cloudMrMouseUpListener() {
  let pendingDraft = null;
  let polylineClick = false;

  if (shouldDeferShapeCommit(this)) {
    pendingDraft = captureDeferredShapeDraft(this);
  }

  if (isPolylinePenActive(this) && isClickWithoutDrag(this.uiData)) {
    this.drawPenLocation = [NaN, NaN, NaN];
    this.drawPenFillPts = [];
    this._cloudMrSkipNextUndoBitmap = true;
    this._cloudMrSuppressDrawingChangedMouseUp = true;
    polylineClick = true;
  }

  // Do not use NiiVue uiData here: dragEnd is often still equal to dragStart
  // until native mouseUp, so a real stroke looks like a click and reopens as a draft.
  const finishingFreehandStroke =
    isFreehandPenActive(this) &&
    !!this._cloudMrFreehandSessionStartBitmap &&
    (!!this._cloudMrFreehandDidDrag ||
      (Array.isArray(this.drawPenFillPts) && this.drawPenFillPts.length > 1));

  const willCommitDeferredShape =
    pendingDraft?.baseBitmap &&
    !isDraftTooSmall(pendingDraft.ptA, pendingDraft.ptB);
  if (willCommitDeferredShape || finishingFreehandStroke) {
    // Set before native mouseUpListener so onMouseUp can skip resampleImage;
    // onShapeCommitted / onFreehandCommitted will resample once for this stroke.
    this._cloudMrSuppressDrawingChangedMouseUp = true;
  }

  _mouseUpListener.call(this);

  this._cloudMrFreehandDidDrag = false;
  this._cloudMrFreehandPointerDown = null;

  if (polylineClick) {
    const result = addPolylineVertex(this);
    if (result === POLYLINE_CLOSE && typeof this.onApplyActiveDraft === "function") {
      // Double-click detected — connect last vertex back to first, fill, and commit.
      this.onApplyActiveDraft();
    }
    return;
  }

  // Rectangle/ellipse apply on release via onShapeCommitted. Freehand should too:
  // commit the stroke and do not reopen it as an uncommitted draft.
  if (finishingFreehandStroke) {
    if (this._cloudMrPenDraftActive && typeof this.onApplyActiveDraft === "function") {
      this.onApplyActiveDraft();
    }
    return;
  }

  if (!pendingDraft?.baseBitmap) {
    // If a draft is open and the user clicked (not dragged) on the canvas,
    // treat it as an "apply" — same behaviour as right-click or the Apply button.
    if (
      (this._cloudMrShapeDraftActive || this._cloudMrPenDraftActive) &&
      isClickWithoutDrag(this.uiData) &&
      typeof this.onApplyActiveDraft === "function"
    ) {
      this.onApplyActiveDraft();
      return;
    }
    cloudMrTryReopenDraftOnClick(this);
    return;
  }
  if (isDraftTooSmall(pendingDraft.ptA, pendingDraft.ptB)) {
    this.drawBitmap.set(pendingDraft.baseBitmap);
    this.refreshDrawing(true, false);
    this.drawScene();
    cloudMrTryReopenDraftOnClick(this);
    return;
  }
  if (typeof this.onShapeCommitted === "function") {
    this.onShapeCommitted(pendingDraft);
  } else if (typeof this.onShapeDraftReady === "function") {
    this.onShapeDraftReady(pendingDraft);
  }
};

// Native image plane measures tiles in voxels, which shrinks the multi-view 3D cell.
// Lay that view out in world space (same as a normal 3D view) and keep 2D slices on the image plane.
;(function () {
  const _drawSceneCore = Niivue.prototype.drawSceneCore;
  Niivue.prototype.drawSceneCore = function () {
    const nativeMulti =
      !this.opts.isSliceMM &&
      this.opts.sliceType === this.sliceTypeMultiplanar &&
      (!this.sliceMosaicString || this.sliceMosaicString.length < 1);
    if (!nativeMulti) return _drawSceneCore.call(this);

    const _draw2D = this.draw2D;
    this.opts.isSliceMM = true;
    this.draw2D = function (ltwh, axCorSag, customMM) {
      this.opts.isSliceMM = false;
      try {
        let rect = ltwh;
        if (ltwh && ltwh[2] > 0 && ltwh[3] > 0 && !(ltwh[4] > 0)) {
          const screen = this.screenFieldOfViewExtendedVox(axCorSag);
          const fw = Math.abs(screen.fovMM[0]) || 1;
          const fh = Math.abs(screen.fovMM[1]) || 1;
          const tileAspect = ltwh[2] / ltwh[3];
          const imgAspect = fw / fh;
          if (Math.abs(tileAspect - imgAspect) / imgAspect > 0.02) {
            rect = ltwh.slice();
            if (imgAspect > tileAspect) {
              const h = ltwh[2] / imgAspect;
              rect[1] = ltwh[1] + (ltwh[3] - h) / 2;
              rect[3] = h;
            } else {
              const w = ltwh[3] * imgAspect;
              rect[0] = ltwh[0] + (ltwh[2] - w) / 2;
              rect[2] = w;
            }
          }
        }
        return _draw2D.call(this, rect, axCorSag, customMM);
      } finally {
        this.opts.isSliceMM = true;
      }
    };
    try {
      return _drawSceneCore.call(this);
    } finally {
      this.draw2D = _draw2D;
      this.opts.isSliceMM = false;
    }
  };
})();

export { Niivue };
