import React from "react";
import CmrLabel from "../label/Label";

// ─── Props ───────────────────────────────────────────────────────────────────

/**
 * Everything the component needs to drive the three slice sliders.
 *
 * The parent should get `mins`, `maxs`, and `mms` from Niivue's
 * `onLocationChange` callback so the sliders stay in sync with scroll/click.
 *
 * The `nv` instance is typed `any` so `cloudmr-ux` doesn't need to take a
 * hard dependency on `@niivue/niivue` — any version of the Niivue object works
 * as long as it exposes `scene.crosshairPos`, `mm2frac`, `frac2mm`,
 * `volumes[0].getImageMetadata()`, and `drawScene()`.
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
   * Heading displayed above the sliders.
   * @default "Slice Position"
   */
  title?: string;
  /**
   * CSS accent color for all three range inputs.
   * @default "#580f8b"
   */
  accentColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

// ─── Helpers (pure, no React) ─────────────────────────────────────────────────

const safeSpan = (min: number, max: number) => Math.max(1e-9, max - min);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * **NiivueSlicePosition**
 *
 * A reusable "Slice Position" control panel that drives a Niivue viewer.
 * Renders three labeled sliders — X, Y, and Z — each paired with an editable
 * number field. All sliders snap to exact voxel centres so they stay in sync
 * with Niivue's own scroll behaviour.
 *
 * ### Wiring it up
 *
 * ```tsx
 * // In the parent that owns the Niivue instance:
 * const [mms, setMms] = useState([0, 0, 0]);
 * const [mins, setMins] = useState([0, 0, 0]);
 * const [maxs, setMaxs] = useState([1, 1, 1]);
 *
 * // Give these to Niivue so it calls back on every crosshair move:
 * nv.opts.onLocationChange = (data) => {
 *   setMms([data.mm[0], data.mm[1], data.mm[2]]);
 *   setMins([data.vox[0]?.min ?? 0, data.vox[1]?.min ?? 0, data.vox[2]?.min ?? 0]);
 *   setMaxs([data.vox[0]?.max ?? 1, data.vox[1]?.max ?? 1, data.vox[2]?.max ?? 1]);
 * };
 *
 * // Then render:
 * <NiivueSlicePosition nv={nv} mins={mins} maxs={maxs} mms={mms} />
 * ```
 */
export function NiivueSlicePosition({
  nv,
  mins,
  maxs,
  mms,
  title = "Slice Position",
  accentColor = "#580f8b",
  style,
  className,
}: NiivueSlicePositionProps) {
  // ── Derive voxel grid from the loaded volume ─────────────────────────────
  const vol = nv?.volumes?.[0];
  const meta = vol?.getImageMetadata?.();
  const nx = Math.max(1, meta?.nx ?? 1);
  const ny = Math.max(1, meta?.ny ?? 1);
  const nz = Math.max(1, meta?.nz ?? 1);

  // ── Slider bounds for X and Y ────────────────────────────────────────────
  const spanX = safeSpan(mins[0], maxs[0]);
  const spanY = safeSpan(mins[1], maxs[1]);
  const stepX = nx > 1 ? spanX / nx : spanX * 0.01;
  const stepY = ny > 1 ? spanY / ny : spanY * 0.01;
  const sliderMinX = nx > 1 ? mins[0] + 0.5 * stepX : mins[0];
  const sliderMaxX = nx > 1 ? maxs[0] - 0.5 * stepX : maxs[0];
  const sliderMinY = ny > 1 ? mins[1] + 0.5 * stepY : mins[1];
  const sliderMaxY = ny > 1 ? maxs[1] - 0.5 * stepY : maxs[1];

  // ── Slider bounds for Z (uses actual Niivue slice centres) ───────────────
  let zAtStart: number;
  let zAtEnd: number;
  if (nz <= 1) {
    zAtStart = mins[2];
    zAtEnd = maxs[2];
  } else {
    try {
      const cx = nv.scene.crosshairPos[0];
      const cy = nv.scene.crosshairPos[1];
      zAtStart = nv.frac2mm([cx, cy, 0.5 / nz])[2];
      zAtEnd = nv.frac2mm([cx, cy, (nz - 0.5) / nz])[2];
    } catch {
      const s = safeSpan(mins[2], maxs[2]) / nz;
      zAtStart = mins[2] + 0.5 * s;
      zAtEnd = maxs[2] - 0.5 * s;
    }
  }
  const sliderMinZ = Math.min(zAtStart, zAtEnd);
  const sliderMaxZ = Math.max(zAtStart, zAtEnd);
  const stepZ = nz > 1
    ? Math.abs(zAtEnd - zAtStart) / (nz - 1)
    : Math.max(1e-9, Math.abs(sliderMaxZ - sliderMinZ) * 0.01);

  // ── Fractional helpers ───────────────────────────────────────────────────
  const ratioAxis = (val: number, axis: 0 | 1 | 2) =>
    (val - mins[axis]) / safeSpan(mins[axis], maxs[axis]);

  const mmToFrac = (x: number, y: number, z: number): [number, number, number] => {
    try {
      return nv.mm2frac([x, y, z]);
    } catch {
      return [ratioAxis(x, 0), ratioAxis(y, 1), ratioAxis(z, 2)];
    }
  };

  /** Snap a mm value to the nearest voxel centre on the given axis. */
  const snapToVoxel = (mm: number, axis: 0 | 1 | 2): number => {
    const n = axis === 0 ? nx : axis === 1 ? ny : nz;
    const mm3 = [mmsRef.current[0], mmsRef.current[1], mmsRef.current[2]];
    mm3[axis] = mm;
    let frac: number[];
    try {
      frac = nv.mm2frac(mm3);
    } catch {
      frac = [
        ratioAxis(mmsRef.current[0], 0),
        ratioAxis(mmsRef.current[1], 1),
        ratioAxis(mmsRef.current[2], 2),
      ];
      frac[axis] = ratioAxis(mm, axis);
    }
    const idx = Math.round(frac[axis] * n - 0.5);
    const fracSnapped = n > 1 ? (clamp(idx, 0, n - 1) + 0.5) / n : 0.5;
    frac[axis] = fracSnapped;
    try {
      return nv.frac2mm(frac)[axis];
    } catch {
      return mins[axis] + fracSnapped * safeSpan(mins[axis], maxs[axis]);
    }
  };

  // ── Local slider state (mirrors mms; synced by useEffect) ────────────────
  const [xVal, setXVal] = React.useState(round3(mms[0]));
  const [yVal, setYVal] = React.useState(round3(mms[1]));
  const [zVal, setZVal] = React.useState(round3(mms[2]));

  // Keep a ref so snapToVoxel can read the *latest* values without stale closure
  const mmsRef = React.useRef([xVal, yVal, zVal]);
  React.useEffect(() => {
    mmsRef.current = [xVal, yVal, zVal];
  }, [xVal, yVal, zVal]);

  // Sync from Niivue (e.g. mouse scroll, click)
  React.useEffect(() => {
    const fmt = (v: number) => (Number.isFinite(v) ? round3(v) : 0);
    setXVal(fmt(mms[0]));
    setYVal(fmt(mms[1]));
    setZVal(fmt(mms[2]));
  }, [mms]);

  // ── Apply handlers ────────────────────────────────────────────────────────
  const applyX = (val: number) => {
    const v = clamp(snapToVoxel(val, 0), sliderMinX, sliderMaxX);
    setXVal(v);
    nv.scene.crosshairPos = mmToFrac(v, mmsRef.current[1], mmsRef.current[2]);
    nv.drawScene();
  };

  const applyY = (val: number) => {
    const v = clamp(snapToVoxel(val, 1), sliderMinY, sliderMaxY);
    setYVal(v);
    nv.scene.crosshairPos = mmToFrac(mmsRef.current[0], v, mmsRef.current[2]);
    nv.drawScene();
  };

  const applyZBySliceIndex = (kRaw: number) => {
    if (nz <= 1) {
      const cx = nv.scene.crosshairPos[0];
      const cy = nv.scene.crosshairPos[1];
      nv.scene.crosshairPos = [cx, cy, 0.5];
      nv.drawScene();
      try { setZVal(round3(nv.frac2mm([cx, cy, 0.5])[2])); } catch { /* ignore */ }
      return;
    }
    const k = clamp(Math.round(kRaw), 0, nz - 1);
    const cx = nv.scene.crosshairPos[0];
    const cy = nv.scene.crosshairPos[1];
    const fz = (k + 0.5) / nz;
    nv.scene.crosshairPos = [cx, cy, fz];
    nv.drawScene();
    try {
      setZVal(round3(nv.frac2mm([cx, cy, fz])[2]));
    } catch {
      const spanLen = zAtEnd - zAtStart;
      setZVal(round3(zAtStart + (k * spanLen) / Math.max(1, nz - 1)));
    }
  };

  const applyZ = (val: number) => {
    if (!Number.isFinite(val)) return;
    if (nz <= 1) {
      const v = clamp(snapToVoxel(val, 2), sliderMinZ, sliderMaxZ);
      setZVal(round3(v));
      nv.scene.crosshairPos = mmToFrac(mmsRef.current[0], mmsRef.current[1], v);
      nv.drawScene();
      return;
    }
    let fracZ: number;
    try {
      fracZ = nv.mm2frac([mmsRef.current[0], mmsRef.current[1], val])[2];
    } catch {
      fracZ = ratioAxis(val, 2);
    }
    applyZBySliceIndex(Math.round(fracZ * nz - 0.5));
  };

  // Current Z as a discrete slice index (for the integer-step Z range input)
  let zSliceIndex = 0;
  if (nz > 1) {
    let fracZ: number;
    try {
      fracZ = nv.mm2frac([xVal, yVal, zVal])[2];
    } catch {
      fracZ = ratioAxis(zVal, 2);
    }
    zSliceIndex = clamp(Math.round(fracZ * nz - 0.5), 0, nz - 1);
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: 100,
    padding: "4px 6px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: "0.9rem",
  };

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
    <div style={{ display: "flex", flexDirection: "column", ...style }} className={className}>
      {title !== "" && (
        <div className="title" style={{ width: "100%", marginBottom: 8 }}>
          {title}
        </div>
      )}

      {/* X */}
      <div style={{ marginBottom: 20 }}>
        <div style={rowStyle}>
          <CmrLabel>X:</CmrLabel>
          <input
            type="number"
            value={xVal.toFixed(3)}
            min={sliderMinX}
            max={sliderMaxX}
            step={stepX}
            style={inputStyle}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) applyX(next);
            }}
            onBlur={(e) => {
              applyX(clamp(Number(e.target.value), sliderMinX, sliderMaxX));
            }}
          />
        </div>
        <input
          id="xSlice"
          type="range"
          min={sliderMinX}
          max={sliderMaxX}
          step={stepX}
          value={clamp(xVal, sliderMinX, sliderMaxX)}
          style={sliderStyle}
          onChange={(e) => applyX(Number(e.target.value))}
        />
      </div>

      {/* Y */}
      <div style={{ marginBottom: 20 }}>
        <div style={rowStyle}>
          <CmrLabel>Y:</CmrLabel>
          <input
            type="number"
            value={yVal.toFixed(3)}
            min={sliderMinY}
            max={sliderMaxY}
            step={stepY}
            style={inputStyle}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) applyY(next);
            }}
            onBlur={(e) => {
              applyY(clamp(Number(e.target.value), sliderMinY, sliderMaxY));
            }}
          />
        </div>
        <input
          id="ySlice"
          type="range"
          min={sliderMinY}
          max={sliderMaxY}
          step={stepY}
          value={clamp(yVal, sliderMinY, sliderMaxY)}
          style={sliderStyle}
          onChange={(e) => applyY(Number(e.target.value))}
        />
      </div>

      {/* Z */}
      <div>
        <div style={rowStyle}>
          <CmrLabel>Z:</CmrLabel>
          <input
            type="number"
            value={zVal.toFixed(3)}
            min={sliderMinZ}
            max={sliderMaxZ}
            step={stepZ}
            style={inputStyle}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) applyZ(next);
            }}
            onBlur={(e) => {
              applyZ(clamp(Number(e.target.value), sliderMinZ, sliderMaxZ));
            }}
          />
        </div>
        <input
          id="zSlice"
          type="range"
          min={0}
          max={Math.max(0, nz - 1)}
          step={1}
          value={zSliceIndex}
          style={sliderStyle}
          onChange={(e) => applyZBySliceIndex(Number(e.target.value))}
        />
      </div>

    </div>
  );
}

export default NiivueSlicePosition;
