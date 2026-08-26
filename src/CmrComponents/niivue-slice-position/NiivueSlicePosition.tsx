import React, { useEffect, useState } from "react";
import { Card, CardContent, FormControlLabel, Switch } from "@mui/material";
import CmrLabel from "../label/Label";
import {
  resolveNiivueAccentColor,
  useNiivueViewerTheme,
} from "../niivue-viewer/NiivueViewerThemeContext";

// ─── Props ───────────────────────────────────────────────────────────────────

/**
 * Everything the component needs to drive the slice slider and mm readout.
 *
 * The parent should get `mins`, `maxs`, `mms`, and `vox` from Niivue's
 * `onLocationChange` callback so the slider stays in sync with scroll/click.
 *
 * The `nv` instance is typed `any` so `cloudmr-ux` doesn't need to take a
 * hard dependency on `@niivue/niivue` — any version of the Niivue object works
 * as long as it exposes `scene.crosshairPos`, `mm2frac`, `frac2mm`,
 * `volumes[0].getImageMetadata()`, `moveCrosshairInVox`, and `drawScene()`.
 */
export interface NiivueSlicePositionProps {
  /** The Niivue instance. */
  nv: any;
  /**
   * World-space bounding-box minimums [xMin, yMin, zMin] in mm.
   * Comes from Niivue's `onLocationChange` data.
   */
  mins: number[];
  /**
   * World-space bounding-box maximums [xMax, yMax, zMax] in mm.
   * Comes from Niivue's `onLocationChange` data.
   */
  maxs: number[];
  /**
   * Current crosshair position [x, y, z] in mm.
   * Comes from Niivue's `onLocationChange` data.
   */
  mms: number[];
  /**
   * Current crosshair position [i, j, k] in voxel indices (integers).
   * Comes from Niivue's `onLocationChange` data.values[0].vox.
   * Used to drive the Slice # slider precisely.
   */
  vox?: number[];
  /**
   * Number of acquired slices from the job settings.
   * When provided this overrides the volume's nz for the Slice # slider range.
   */
  sliceCount?: number;
  /**
   * Whether the viewer is in world-space (anatomical) mode, i.e. sliceMM=true.
   * Controlled externally; toggling calls `onWorldSpaceChange`.
   */
  worldSpace?: boolean;
  /**
   * Called when the user flips the Anatomical / Native plane toggle.
   * The parent is responsible for calling `nv.setSliceMM(v)`.
   */
  onWorldSpaceChange?: (v: boolean) => void;
  /**
   * Heading displayed above the sliders.
   * @default "Slice Position"
   */
  title?: string;
  /**
   * CSS accent color for the slice range input.
   * @default "#580f8b"
   */
  accentColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

// ─── Helpers (pure, no React) ─────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;
const fmtMm = (v: number) => (Number.isFinite(v) ? round3(v).toFixed(3) : "0.000");

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * **NiivueSlicePosition**
 *
 * A reusable "Slice Position" control panel that drives a Niivue viewer.
 * Renders:
 *   - A "Slice Number" slider that pages through acquired slices along the
 *     voxel k-direction.
 *   - Read-only X, Y, Z millimetre text that follows the slider / viewer.
 *   - An "Anatomical / Native plane" toggle that calls `onWorldSpaceChange`.
 *
 * Slice stepping uses `nv.moveCrosshairInVox(0, 0, Δk)` so it operates in
 * native voxel space regardless of the current display orientation.
 */
export function NiivueSlicePosition({
  nv,
  mins: _mins,
  maxs: _maxs,
  mms,
  vox,
  sliceCount,
  worldSpace = false,
  onWorldSpaceChange,
  title = "Slice Position",
  accentColor: accentColorProp,
  style,
  className,
}: NiivueSlicePositionProps) {
  const theme = useNiivueViewerTheme();
  const accentColor = resolveNiivueAccentColor(accentColorProp, theme);

  // ── Derive voxel grid from the loaded volume ──────────────────────────────
  const vol = nv?.volumes?.[0];
  const meta = vol?.getImageMetadata?.();
  const nz = Math.max(1, meta?.nz ?? 1);

  // ── Slice Number range ────────────────────────────────────────────────────
  // If sliceCount is supplied from job settings, honour it; otherwise fall back
  // to the volume's nz.
  const jobTotal =
    sliceCount != null && Number.isFinite(Number(sliceCount)) && Number(sliceCount) > 0
      ? Math.round(Number(sliceCount))
      : undefined;
  const totalSlices = Math.max(1, jobTotal ?? nz);
  const maxSliceIdx = Math.max(0, totalSlices - 1);

  // ── Local mm readout (mirrors mms; synced by useEffect) ───────────────────
  const [xVal, setXVal] = useState(round3(mms[0]));
  const [yVal, setYVal] = useState(round3(mms[1]));
  const [zVal, setZVal] = useState(round3(mms[2]));

  const syncMmFromViewer = () => {
    try {
      const mm = nv.frac2mm(nv.scene.crosshairPos);
      setXVal(round3(mm[0]));
      setYVal(round3(mm[1]));
      setZVal(round3(mm[2]));
    } catch {
      /* leave as-is; onLocationChange will update */
    }
  };

  // Sync from Niivue (e.g. mouse scroll, click, or slice slider)
  useEffect(() => {
    setXVal(Number.isFinite(mms[0]) ? round3(mms[0]) : 0);
    setYVal(Number.isFinite(mms[1]) ? round3(mms[1]) : 0);
    setZVal(Number.isFinite(mms[2]) ? round3(mms[2]) : 0);
  }, [mms]);

  // ── Current slice index ────────────────────────────────────────────────────
  // Prefer `vox[2]` (integer k-index from onLocationChange) over derived value.
  const currentSliceIdx: number = (() => {
    if (vox != null && Number.isFinite(vox[2])) {
      return clamp(Math.round(vox[2]), 0, maxSliceIdx);
    }
    if (nz <= 1) return 0;
    try {
      const fracZ = nv.mm2frac([xVal, yVal, zVal])[2];
      return clamp(Math.round(fracZ * nz - 0.5), 0, maxSliceIdx);
    } catch {
      return 0;
    }
  })();

  // Ref tracking the last k-index we issued to moveCrosshairInVox.
  // Updated synchronously on every slider event so rapid drags accumulate
  // deltas correctly without waiting for a React re-render to update
  // currentSliceIdx.
  const lastAppliedKRef = React.useRef<number>(currentSliceIdx);

  // Keep the ref in sync whenever NiiVue reports a new position externally
  // (canvas scroll, keyboard, etc.)
  useEffect(() => {
    lastAppliedKRef.current = currentSliceIdx;
  }, [currentSliceIdx]);

  /**
   * Move to slice index `targetK` (0-based) by calling `moveCrosshairInVox`
   * so NiiVue keeps all its internal state in sync.
   *
   * Computes the delta against `lastAppliedKRef` (not the React-state-derived
   * `currentSliceIdx`) so that rapid successive drag events accumulate
   * correctly even before a re-render updates the state.
   */
  const applySliceIndex = (targetK: number) => {
    const k = clamp(Math.round(targetK), 0, maxSliceIdx);
    const delta = k - lastAppliedKRef.current;
    lastAppliedKRef.current = k; // commit synchronously before re-render
    if (delta === 0) return;
    try {
      nv.moveCrosshairInVox(0, 0, delta);
    } catch {
      // Fallback: set crosshair fractional position directly
      const cx = nv.scene.crosshairPos[0];
      const cy = nv.scene.crosshairPos[1];
      const fz = nz > 1 ? (k + 0.5) / nz : 0.5;
      nv.scene.crosshairPos = [cx, cy, fz];
    }
    nv.drawScene?.();
    syncMmFromViewer();
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  };

  const sliderStyle: React.CSSProperties = {
    width: "100%",
    accentColor,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={style} className={className}>
      {title !== "" && (
        <div className="title" style={{ width: "100%" }}>
          {title}
        </div>
      )}
      <Card variant="outlined" sx={{ mb: 2, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <CardContent sx={{ "&:last-child": { paddingBottom: 2 } }}>
          <div style={{ display: "flex", flexDirection: "column" }}>

            {/* Slice orientation toggle */}
            {onWorldSpaceChange != null && (
              <div style={{ marginBottom: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={worldSpace}
                      onChange={(e) => onWorldSpaceChange(e.target.checked)}
                    />
                  }
                  label={
                    <span style={{ fontSize: "16px" }}>
                      {worldSpace ? "Anatomical (World Space)" : "Native Image Plane"}
                    </span>
                  }
                />
              </div>
            )}

            {/* Slice Number — 1-based display, 0-based internally */}
            <div style={{ marginBottom: 16 }}>
              <div style={rowStyle}>
                <CmrLabel>Slice Number:</CmrLabel>
                <CmrLabel style={{ paddingRight: 0, color: "#000" }}>
                  {currentSliceIdx + 1}
                </CmrLabel>
              </div>
              <input
                id="sliceNumber"
                type="range"
                min={1}
                max={totalSlices}
                step={1}
                value={currentSliceIdx + 1}
                style={sliderStyle}
                onChange={(e) => applySliceIndex(Number(e.target.value) - 1)}
              />
            </div>

            {/* X / Y / Z millimetre readout — same solid color as labels (not MUI 0.87 text) */}
            {(["X", "Y", "Z"] as const).map((axis, i) => {
              const value = i === 0 ? xVal : i === 1 ? yVal : zVal;
              return (
                <div key={axis} style={{ ...rowStyle, marginBottom: i < 2 ? 4 : 0 }}>
                  <CmrLabel style={{ minWidth: 20, color: "#000" }}>{axis}:</CmrLabel>
                  <CmrLabel style={{ paddingRight: 0, color: "#000" }}>
                    {fmtMm(value)} mm
                  </CmrLabel>
                </div>
              );
            })}

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NiivueSlicePosition;
