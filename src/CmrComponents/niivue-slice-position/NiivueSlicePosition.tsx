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
   * Current display orientation. Controls which voxel axis the slice slider
   * steps along and what dimension the range covers.
   * - `'axial'` (default) → Z axis (vox[2]), range = nz (or sliceCount)
   * - `'coronal'`         → Y axis (vox[1]), range = ny
   * - `'sagittal'`        → X axis (vox[0]), range = nx
   * - `'multi'` / `'multiplanar'` → three sliders, one per axis (X, Y, Z)
   * - other               → Z axis fallback
   */
  sliceType?: string;
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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * **NiivueSlicePosition**
 *
 * A reusable "Slice Position" control panel that drives a Niivue viewer.
 * Renders:
 *   - Axial: a Z slider.
 *   - Coronal: a Y slider.
 *   - Sagittal: an X slider.
 *   - Multiplanar: independent X, Y, and Z sliders.
 *   - An "Anatomical / Native plane" toggle that calls `onWorldSpaceChange`.
 *
 * Slice stepping uses `nv.moveCrosshairInVox` along the active axis (or axes
 * in multiplanar) so it operates in native voxel space.
 */
export function NiivueSlicePosition({
  nv,
  mins: _mins,
  maxs: _maxs,
  mms,
  vox,
  sliceCount,
  sliceType = 'axial',
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
  const nx = Math.max(1, meta?.nx ?? 1);
  const ny = Math.max(1, meta?.ny ?? 1);
  const nz = Math.max(1, meta?.nz ?? 1);

  const isMulti = sliceType === "multi" || sliceType === "multiplanar";

  // ── Orientation-aware axis selection (single-view modes) ─────────────────
  // sagittal → X (vox[0]), coronal → Y (vox[1]), axial/other → Z (vox[2])
  const axisIdx: 0 | 1 | 2 =
    sliceType === "sagittal" ? 0 : sliceType === "coronal" ? 1 : 2;

  // sliceCount from job settings only applies in single axial view — in multi
  // view all three axes must use the true volume dimensions so the slider range
  // is never incorrectly capped by the job's acquisition slice count.
  const jobTotal =
    !isMulti &&
    sliceCount != null && Number.isFinite(Number(sliceCount)) && Number(sliceCount) > 0
      ? Math.round(Number(sliceCount))
      : undefined;
  const xTotal = nx;
  const yTotal = ny;
  const zTotal = Math.max(1, jobTotal ?? nz);
  const totals: [number, number, number] = [xTotal, yTotal, zTotal];
  const volumeDims: [number, number, number] = [nx, ny, nz];

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

  const indexForAxis = (axis: 0 | 1 | 2): number => {
    const total = totals[axis];
    const maxIdx = Math.max(0, total - 1);
    if (vox != null && Number.isFinite(vox[axis])) {
      return clamp(Math.round(vox[axis]), 0, maxIdx);
    }
    const dim = volumeDims[axis];
    if (dim <= 1) return 0;
    try {
      const frac = nv.mm2frac([xVal, yVal, zVal])[axis];
      return clamp(Math.round(frac * dim - 0.5), 0, maxIdx);
    } catch {
      return 0;
    }
  };

  const xIdx = indexForAxis(0);
  const yIdx = indexForAxis(1);
  const zIdx = indexForAxis(2);
  const totalSlices = totals[axisIdx];

  // ── Local slider display state ────────────────────────────────────────────
  // These update immediately on drag so the slider thumb moves without waiting
  // for NiiVue's async onLocationChange to update `vox`.
  const [dispX, setDispX] = useState(xIdx);
  const [dispY, setDispY] = useState(yIdx);
  const [dispZ, setDispZ] = useState(zIdx);

  // Sync display state whenever NiiVue reports a new position externally
  // (scroll, keyboard, programmatic crosshair move, etc.)
  useEffect(() => { setDispX(xIdx); }, [xIdx]);
  useEffect(() => { setDispY(yIdx); }, [yIdx]);
  useEffect(() => { setDispZ(zIdx); }, [zIdx]);

  const dispForAxis = (axis: 0 | 1 | 2) =>
    axis === 0 ? dispX : axis === 1 ? dispY : dispZ;
  const setDispForAxis = (axis: 0 | 1 | 2, v: number) => {
    if (axis === 0) setDispX(v);
    else if (axis === 1) setDispY(v);
    else setDispZ(v);
  };
  const dispCurrent = axisIdx === 0 ? dispX : axisIdx === 1 ? dispY : dispZ;

  // Track last applied index per axis so rapid drags accumulate correctly.
  const lastAppliedRef = React.useRef<[number, number, number]>([xIdx, yIdx, zIdx]);
  useEffect(() => {
    lastAppliedRef.current = [xIdx, yIdx, zIdx];
  }, [xIdx, yIdx, zIdx]);

  /**
   * Move to 0-based slice index `target` along `axis` via `moveCrosshairInVox`.
   * Updates local display state immediately so the thumb doesn't snap back.
   */
  const applyAxisIndex = (axis: 0 | 1 | 2, target: number) => {
    const total = totals[axis];
    const maxIdx = Math.max(0, total - 1);
    const idx = clamp(Math.round(target), 0, maxIdx);
    setDispForAxis(axis, idx); // update thumb immediately
    const delta = idx - lastAppliedRef.current[axis];
    lastAppliedRef.current[axis] = idx;
    if (delta === 0) return;
    try {
      nv.moveCrosshairInVox(axis === 0 ? delta : 0, axis === 1 ? delta : 0, axis === 2 ? delta : 0);
    } catch {
      const pos = [...nv.scene.crosshairPos] as [number, number, number];
      const dim = volumeDims[axis];
      pos[axis] = dim > 1 ? (idx + 0.5) / dim : 0.5;
      nv.scene.crosshairPos = pos;
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

            {isMulti ? (
              ([
                { label: "X", axisKey: 0 as const },
                { label: "Y", axisKey: 1 as const },
                { label: "Z", axisKey: 2 as const },
              ].map(({ label, axisKey }) => {
                const total = totals[axisKey];
                const disp = dispForAxis(axisKey);
                return (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <div style={rowStyle}>
                      <CmrLabel>{label}:</CmrLabel>
                      <CmrLabel style={{ paddingRight: 0, color: "#000" }}>
                        {disp + 1}/{total}
                      </CmrLabel>
                    </div>
                    <input
                      id={`sliceIndex${label}`}
                      type="range"
                      min={1}
                      max={total}
                      step={1}
                      value={disp + 1}
                      style={sliderStyle}
                      onChange={(e) => applyAxisIndex(axisKey, Number(e.target.value) - 1)}
                    />
                  </div>
                );
              }))
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={rowStyle}>
                  <CmrLabel>
                    {sliceType === "sagittal" ? "X:" : sliceType === "coronal" ? "Y:" : "Z:"}
                  </CmrLabel>
                  <CmrLabel style={{ paddingRight: 0, color: "#000" }}>
                    {dispCurrent + 1}/{totalSlices}
                  </CmrLabel>
                </div>
                <input
                  id="sliceNumber"
                  type="range"
                  min={1}
                  max={totalSlices}
                  step={1}
                  value={dispCurrent + 1}
                  style={sliderStyle}
                  onChange={(e) => applyAxisIndex(axisIdx, Number(e.target.value) - 1)}
                />
              </div>
            )}

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NiivueSlicePosition;
