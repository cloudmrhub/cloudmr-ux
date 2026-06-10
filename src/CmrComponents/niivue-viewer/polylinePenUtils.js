import { NI_PEN_TYPE } from "./niivuePenType";

const CLICK_DRAG_PX = 5;

export function isPolylinePenActive(nv) {
  return (
    nv.opts.polylinePenMode &&
    nv.opts.drawingEnabled &&
    nv.opts.penType === NI_PEN_TYPE.PEN &&
    nv.opts.penValue > 0
  );
}

export function isClickWithoutDrag(uiData, thresholdPx = CLICK_DRAG_PX) {
  const dx = uiData.dragStart[0] - uiData.dragEnd[0];
  const dy = uiData.dragStart[1] - uiData.dragEnd[1];
  return dx * dx + dy * dy <= thresholdPx * thresholdPx;
}

export function axCorSagFromMouse(nv) {
  const tile = nv.tileIndex(nv.mousePos[0], nv.mousePos[1]);
  if (tile >= 0 && nv.screenSlices?.[tile]) {
    return nv.screenSlices[tile].axCorSag;
  }
  return nv.drawPenAxCorSag >= 0 ? nv.drawPenAxCorSag : 0;
}

export function voxFromMouse(nv) {
  const frac = nv.canvasPos2frac(nv.mousePos);
  if (!frac || frac[0] < 0) return null;
  const vox = nv.frac2vox(frac);
  return [vox[0], vox[1], vox[2]];
}

export function notifyPolylineChange(nv, count) {
  if (typeof nv.onPolylineChange === "function") {
    nv.onPolylineChange(count);
  }
}

export function resetPolylineState(nv) {
  nv._cloudMrPolylineVertices = [];
  nv._cloudMrPolylineBaseBitmap = null;
  nv._cloudMrPolylineSessionStartBitmap = null;
  nv._cloudMrPolylineAxCorSag = -1;
  notifyPolylineChange(nv, 0);
}

export function cancelPolyline(nv) {
  if (nv._cloudMrPolylineSessionStartBitmap) {
    nv.drawBitmap.set(nv._cloudMrPolylineSessionStartBitmap);
    nv.refreshDrawing(true, false);
    nv.drawScene();
  }
  resetPolylineState(nv);
}

export function previewPolylineSegment(nv) {
  const verts = nv._cloudMrPolylineVertices;
  if (!verts?.length || !nv._cloudMrPolylineBaseBitmap) return;
  const cursor = voxFromMouse(nv);
  if (!cursor) return;
  nv.drawBitmap.set(nv._cloudMrPolylineBaseBitmap);
  nv.drawPenAxCorSag = nv._cloudMrPolylineAxCorSag;
  nv.drawPenLine(cursor, verts[verts.length - 1], nv.opts.penValue);
  nv.refreshDrawing(false, false);
  nv.drawScene();
}

export function addPolylineVertex(nv) {
  const pt = voxFromMouse(nv);
  if (!pt) return false;

  const penValue = nv.opts.penValue;
  const verts = nv._cloudMrPolylineVertices || (nv._cloudMrPolylineVertices = []);

  if (verts.length === 0) {
    nv._cloudMrPolylineSessionStartBitmap = nv.drawBitmap.slice();
    nv._cloudMrPolylineBaseBitmap = nv._cloudMrPolylineSessionStartBitmap.slice();
    nv._cloudMrPolylineAxCorSag = axCorSagFromMouse(nv);
    nv.drawPenAxCorSag = nv._cloudMrPolylineAxCorSag;
    verts.push(pt);
    nv.drawPt(pt[0], pt[1], pt[2], penValue);
    nv.refreshDrawing(false, false);
  } else {
    const prev = verts[verts.length - 1];
    if (prev[0] === pt[0] && prev[1] === pt[1] && prev[2] === pt[2]) {
      return false;
    }
    nv.drawPenAxCorSag = nv._cloudMrPolylineAxCorSag;
    nv.drawPenLine(pt, prev, penValue);
    verts.push(pt);
    nv._cloudMrPolylineBaseBitmap = nv.drawBitmap.slice();
    nv.refreshDrawing(false, false);
  }

  nv.drawScene();
  notifyPolylineChange(nv, verts.length);
  return true;
}

export function finishPolyline(nv, { fillClosed = false } = {}) {
  const verts = nv._cloudMrPolylineVertices;
  if (!verts || verts.length < 2) {
    resetPolylineState(nv);
    return false;
  }

  if (fillClosed && verts.length >= 3) {
    const first = verts[0];
    const last = verts[verts.length - 1];
    nv.drawPenAxCorSag = nv._cloudMrPolylineAxCorSag;
    nv.drawPenLine(first, last, nv.opts.penValue);
    nv.drawPenFillPts = verts.map((v) => [...v]);
    nv.drawPenFilled();
  }

  nv.drawAddUndoBitmap(nv.drawFillOverwrites);
  if (typeof nv.onDrawingChanged === "function") {
    nv.onDrawingChanged("draw");
  }
  resetPolylineState(nv);
  nv.drawScene();
  return true;
}
