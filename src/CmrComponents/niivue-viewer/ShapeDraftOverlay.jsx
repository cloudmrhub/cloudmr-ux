import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  boundsToCorners,
  canvasDeltaToVoxDelta,
  clientToCanvasPos,
  normalizeBounds,
  redrawDraftShape,
  resizeDraftCorner,
  translatePt,
  voxToOverlayPos,
  voxUnderClient,
} from "./shapeDraftUtils";
import { useNiivueViewerTheme } from "./NiivueViewerThemeContext";

const HANDLE_SIZE = 10;

function resizeCursorForCorner(pos, boxStyle) {
  const midX = boxStyle.left + boxStyle.width / 2;
  const midY = boxStyle.top + boxStyle.height / 2;
  const west = pos.x <= midX;
  const north = pos.y <= midY;
  return west === north ? "nwse-resize" : "nesw-resize";
}

/**
 * Overlay handles for adjusting a rectangle/ellipse draft before commit.
 * @param {{ nv: any, draft: import('./shapeDraftUtils').ShapeDraft, onDraftChange: (d: any) => void, onApplyDraft?: () => void, overlayKey?: unknown }} props
 */
export function ShapeDraftOverlay({ nv, draft, onDraftChange, onApplyDraft, overlayKey }) {
  const theme = useNiivueViewerTheme();
  const dragRef = useRef(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onPointerMoveRef = useRef(null);
  const finishDragRef = useRef(null);
  const onApplyDraftRef = useRef(onApplyDraft);
  onApplyDraftRef.current = onApplyDraft;
  const [, setTick] = useState(0);

  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const onMove = () => bump();
    window.addEventListener("resize", onMove);
    return () => window.removeEventListener("resize", onMove);
  }, [bump]);

  const dims = nv?.back?.dims;
  const bounds = useMemo(() => {
    if (!dims || !draft) return null;
    return normalizeBounds(draft.ptA, draft.ptB, dims);
  }, [dims, draft, overlayKey]);

  const corners = useMemo(() => {
    if (!bounds || draft == null) return [];
    return boundsToCorners(bounds, draft.axCorSag);
  }, [bounds, draft?.axCorSag, overlayKey]);

  const cornerCss = useMemo(
    () =>
      corners
        .map((vox) => voxToOverlayPos(nv, vox, draft.axCorSag))
        .filter(Boolean),
    [corners, draft?.axCorSag, nv, overlayKey],
  );

  const centerCss = useMemo(() => {
    if (!bounds || !draft) return null;
    const cx = (bounds.x1 + bounds.x2) / 2;
    const cy = (bounds.y1 + bounds.y2) / 2;
    const cz = (bounds.z1 + bounds.z2) / 2;
    return voxToOverlayPos(nv, [cx, cy, cz], draft.axCorSag);
  }, [bounds, draft?.axCorSag, nv, overlayKey]);

  const boxStyle = useMemo(() => {
    if (cornerCss.length < 4) return null;
    const xs = cornerCss.map((p) => p.x);
    const ys = cornerCss.map((p) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - left;
    const height = Math.max(...ys) - top;
    if (width < 2 || height < 2) return null;
    return { left, top, width, height };
  }, [cornerCss]);

  const resizeDisabled = (draft?.shapeVoxels?.length ?? 0) > 0;

  const applyDraft = useCallback(
    (nextDraft) => {
      redrawDraftShape(nv, nextDraft);
      onDraftChange(nextDraft);
    },
    [nv, onDraftChange],
  );

  finishDragRef.current = () => {
    const hadDrag = dragRef.current?.didMove;
    dragRef.current = null;
    if (onPointerMoveRef.current) {
      window.removeEventListener("pointermove", onPointerMoveRef.current);
    }
    if (finishDragRef.current) {
      window.removeEventListener("pointerup", finishDragRef.current);
    }
    if (hadDrag) {
      onApplyDraftRef.current?.();
    }
  };

  onPointerMoveRef.current = (event) => {
    const drag = dragRef.current;
    const currentDraft = draftRef.current;
    if (!drag || !currentDraft) return;
    drag.didMove = true;
    event.preventDefault();

    if (drag.mode === "move") {
      const canvas = nv.canvas || document.getElementById("niiCanvas");
      if (!canvas) return;
      const startCanvas = clientToCanvasPos(canvas, drag.startClientX, drag.startClientY);
      const endCanvas = clientToCanvasPos(canvas, event.clientX, event.clientY);
      const delta = canvasDeltaToVoxDelta(nv, startCanvas, endCanvas);
        const next = {
          ...currentDraft,
          ptA: translatePt(drag.startPtA, delta),
          ptB: translatePt(drag.startPtB, delta),
          shapeVoxels: drag.startShapeVoxels?.map(([x, y, z]) => translatePt([x, y, z], delta)),
        };
      applyDraft(next);
      return;
    }

    if (drag.mode === "corner") {
      const vox = voxUnderClient(nv, event.clientX, event.clientY);
      if (!vox) return;
        const next = resizeDraftCorner(nv, currentDraft, drag.cornerIndex, vox);
      applyDraft({ ...next, shapeVoxels: undefined });
    }
  };

  const startDrag = useCallback(
    (event, mode, cornerIndex = -1) => {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        mode,
        cornerIndex,
        didMove: false,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPtA: [...draft.ptA],
        startPtB: [...draft.ptB],
        startShapeVoxels: draft.shapeVoxels?.map(([x, y, z]) => [x, y, z]),
      };
      window.addEventListener("pointermove", onPointerMoveRef.current);
      window.addEventListener("pointerup", finishDragRef.current);
    },
    [applyDraft, draft],
  );

  useEffect(
    () => () => {
      if (finishDragRef.current) {
        finishDragRef.current();
      }
    },
    [],
  );

  if (!draft || !boxStyle) {
    return null;
  }

  const handleStyle = {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    marginLeft: -HANDLE_SIZE / 2,
    marginTop: -HANDLE_SIZE / 2,
    borderRadius: "50%",
    background: "#fff",
    border: `2px solid ${theme.accentColor}`,
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
      aria-label="Adjust ROI shape"
    >
      <div
        style={{
          position: "absolute",
          left: boxStyle.left,
          top: boxStyle.top,
          width: boxStyle.width,
          height: boxStyle.height,
          border: `2px dashed ${theme.accentColor}`,
          background: theme.accentMutedBgLight,
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
          title={resizeDisabled ? "Move shape (resize unavailable after erasing)" : "Move shape"}
        />
      )}
      {!resizeDisabled &&
        cornerCss.map((pos, i) => (
        <div
          key={`corner-${i}`}
          role="presentation"
          onPointerDown={(e) => startDrag(e, "corner", i)}
          style={{
            ...handleStyle,
            left: pos.x,
            top: pos.y,
            cursor: resizeCursorForCorner(pos, boxStyle),
          }}
          title="Resize shape"
        />
      ))}
    </div>
  );
}

export default ShapeDraftOverlay;
