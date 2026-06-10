import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  boundsToFreehandCorners,
  redrawFreehandDraft,
  redrawPolylineDraft,
  syncPolylineDraftToNv,
  translateFreehandDraft,
  translatePolylineVertices,
  updatePolylineVertex,
} from "./penDraftUtils";
import {
  canvasDeltaToVoxDelta,
  clientToCanvasPos,
  voxToOverlayPos,
  voxUnderClient,
} from "./shapeDraftUtils";

const HANDLE_SIZE = 10;
const ACCENT = "#580f8b";

function cloneFreehandDraft(draft) {
  return {
    ...draft,
    strokeVoxels: draft.strokeVoxels.map((v) => [...v]),
    bounds: draft.bounds ? { ...draft.bounds } : draft.bounds,
  };
}

/**
 * Adjust handles for polyline (vertex drag) or freehand (move only) drafts.
 * @param {{ nv: any, draft: any, onDraftChange: (d: any) => void, overlayKey?: unknown }} props
 */
export function PenDraftOverlay({ nv, draft, onDraftChange, overlayKey }) {
  const dragRef = useRef(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onPointerMoveRef = useRef(null);
  const finishDragRef = useRef(null);
  const [, setTick] = useState(0);

  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const onMove = () => bump();
    window.addEventListener("resize", onMove);
    return () => window.removeEventListener("resize", onMove);
  }, [bump]);

  const isPolyline = draft?.kind === "polyline";

  const vertexCss = useMemo(() => {
    if (!isPolyline || !draft?.vertices) return [];
    return draft.vertices
      .map((vox) => voxToOverlayPos(nv, vox, draft.axCorSag))
      .filter(Boolean);
  }, [draft, isPolyline, nv, overlayKey]);

  const freehandCorners = useMemo(() => {
    if (isPolyline || !draft?.bounds) return [];
    return boundsToFreehandCorners(draft.bounds, draft.axCorSag);
  }, [draft, isPolyline, overlayKey]);

  const cornerCss = useMemo(() => {
    if (!isPolyline) return [];
    return vertexCss;
  }, [isPolyline, vertexCss]);

  const centerCss = useMemo(() => {
    if (!draft) return null;
    if (isPolyline && draft.vertices?.length) {
      const xs = draft.vertices.map((v) => v[0]);
      const ys = draft.vertices.map((v) => v[1]);
      const zs = draft.vertices.map((v) => v[2]);
      return voxToOverlayPos(
        nv,
        [
          (Math.min(...xs) + Math.max(...xs)) / 2,
          (Math.min(...ys) + Math.max(...ys)) / 2,
          (Math.min(...zs) + Math.max(...zs)) / 2,
        ],
        draft.axCorSag,
      );
    }
    if (draft.bounds) {
      const b = draft.bounds;
      return voxToOverlayPos(
        nv,
        [(b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, (b.z1 + b.z2) / 2],
        draft.axCorSag,
      );
    }
    return null;
  }, [draft, isPolyline, nv, overlayKey]);

  const boxStyle = useMemo(() => {
    const points = isPolyline ? cornerCss : freehandCorners
      .map((vox) => voxToOverlayPos(nv, vox, draft?.axCorSag))
      .filter(Boolean);
    if (points.length < 2) return null;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - left;
    const height = Math.max(...ys) - top;
    if (width < 2 && height < 2) return null;
    return { left, top, width: Math.max(width, 2), height: Math.max(height, 2) };
  }, [cornerCss, draft?.axCorSag, freehandCorners, isPolyline, nv, overlayKey]);

  const applyDraft = useCallback(
    (nextDraft) => {
      if (nextDraft.kind === "polyline") {
        redrawPolylineDraft(nv, nextDraft);
        syncPolylineDraftToNv(nv, nextDraft);
      } else {
        redrawFreehandDraft(nv, nextDraft);
      }
      onDraftChange(nextDraft);
    },
    [nv, onDraftChange],
  );

  finishDragRef.current = () => {
    dragRef.current = null;
    if (onPointerMoveRef.current) {
      window.removeEventListener("pointermove", onPointerMoveRef.current);
    }
    if (finishDragRef.current) {
      window.removeEventListener("pointerup", finishDragRef.current);
    }
  };

  onPointerMoveRef.current = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.preventDefault();

    const canvas = nv.canvas || document.getElementById("niiCanvas");
    if (!canvas) return;
    const startCanvas = clientToCanvasPos(canvas, drag.startClientX, drag.startClientY);
    const endCanvas = clientToCanvasPos(canvas, event.clientX, event.clientY);
    const delta = canvasDeltaToVoxDelta(nv, startCanvas, endCanvas);

    if (drag.mode === "move") {
      if (drag.kind === "polyline") {
        applyDraft({
          ...drag.startDraft,
          vertices: translatePolylineVertices(drag.startVertices, delta),
        });
      } else {
        applyDraft(translateFreehandDraft(drag.startFreehandDraft, delta));
      }
      return;
    }

    const vox = voxUnderClient(nv, event.clientX, event.clientY);
    if (!vox) return;

    applyDraft({
      ...drag.startDraft,
      vertices: updatePolylineVertex(drag.startVertices, drag.cornerIndex, vox),
    });
  };

  const startDrag = useCallback(
    (event, mode, cornerIndex = -1) => {
      event.preventDefault();
      event.stopPropagation();
      const current = draftRef.current;
      if (!current) return;

      dragRef.current = {
        mode,
        cornerIndex,
        kind: current.kind,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startDraft: current,
        startVertices: current.vertices?.map((v) => [...v]) ?? [],
        startFreehandDraft:
          current.kind === "freehand" ? cloneFreehandDraft(current) : null,
      };
      window.addEventListener("pointermove", onPointerMoveRef.current);
      window.addEventListener("pointerup", finishDragRef.current);
    },
    [],
  );

  useEffect(
    () => () => {
      finishDragRef.current?.();
    },
    [],
  );

  if (!draft || !boxStyle) return null;

  const handleStyle = {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    marginLeft: -HANDLE_SIZE / 2,
    marginTop: -HANDLE_SIZE / 2,
    borderRadius: "50%",
    background: "#fff",
    border: `2px solid ${ACCENT}`,
    boxSizing: "border-box",
    cursor: "pointer",
    zIndex: 3,
    touchAction: "none",
    pointerEvents: "auto",
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
        overflow: "hidden",
      }}
      aria-label="Adjust pen ROI"
    >
      <div
        style={{
          position: "absolute",
          left: boxStyle.left,
          top: boxStyle.top,
          width: boxStyle.width,
          height: boxStyle.height,
          border: `2px dashed ${ACCENT}`,
          background: "rgba(88, 15, 139, 0.08)",
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      />
      {centerCss && (
        <div
          role="presentation"
          onPointerDown={(e) => startDrag(e, "move")}
          style={{
            ...handleStyle,
            left: centerCss.x,
            top: centerCss.y,
            cursor: "move",
            borderRadius: 2,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
          }}
          title="Move shape"
        />
      )}
      {isPolyline &&
        cornerCss.map((pos, i) => (
          <div
            key={`handle-${i}`}
            role="presentation"
            onPointerDown={(e) => startDrag(e, "corner", i)}
            style={{
              ...handleStyle,
              left: pos.x,
              top: pos.y,
              cursor: "grab",
            }}
            title="Move vertex"
          />
        ))}
    </div>
  );
}

export default PenDraftOverlay;
