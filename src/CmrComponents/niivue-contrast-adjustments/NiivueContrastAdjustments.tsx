import React from "react";
import { Card, CardContent, Box } from "@mui/material";
import TKDualRange from "../tk-dualrange/TKDualRange";
import CmrLabel from "../label/Label";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NiivueContrastAdjustmentsProps {
  /** The Niivue instance. */
  nv: any;

  /**
   * Current window minimum in real space (mirrors `volumes[0].cal_min`).
   * Controlled by the parent — updated via `setMin`.
   */
  min: number;

  /**
   * Current window maximum in real space (mirrors `volumes[0].cal_max`).
   * Controlled by the parent — updated via `setMax`.
   */
  max: number;

  /** Called with the new real-space minimum when the user moves the low thumb. */
  setMin: (min: number) => void;

  /** Called with the new real-space maximum when the user moves the high thumb. */
  setMax: (max: number) => void;

  /**
   * Scaling factors used to convert between real space and the display (render)
   * space used for thumb positioning on the dual-range track (matches legacy
   * NiivuePanel / TestKarts-style masking).
   *
   * Transform: `renderValue = realValue / a + b`
   * Inverse:   `realValue  = a * renderValue - a * b`
   *
   * Pass `{ a: 1, b: 0 }` for a 1-to-1 mapping (no scientific-notation scaling).
   */
  transformFactors: { a: number; b: number };

  /** Current gamma value. Controlled by the parent — updated via `setGamma`. */
  gamma: number;

  /**
   * React key forwarded to the gamma slider to force a remount when gamma is
   * externally reset (e.g. from the Toolbar reset button).
   */
  gammaKey: number;

  /** Called with the new gamma value when the user moves the gamma slider. */
  setGamma: (val: number) => void;

  /**
   * Optional list of layer controls rendered below the gamma slider (e.g.
   * per-layer color-map pickers). Pass an empty array or omit to render nothing.
   */
  layerList?: React.ReactNode[];

  /**
   * Heading displayed above the card.
   * @default "Contrast Adjustments"
   */
  title?: string;

  /**
   * Accent color used on the dual-range slider and the gamma slider.
   * @default "#580f8b"
   */
  accentColor?: string;

  style?: React.CSSProperties;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * **NiivueContrastAdjustments**
 *
 * A reusable "Contrast Adjustments" control panel for a Niivue viewer. Renders:
 *
 * 1. A dark **title strip** (`.title` class, same visual style as Slice Position).
 * 2. An outlined **Card** + **CardContent** containing:
 *    - A `TKDualRange` for window min/max with optional real→render-space transform.
 *    - A gamma range slider.
 *    - An optional `layerList` slot for per-layer controls.
 *
 * ### Wiring
 *
 * ```tsx
 * <NiivueContrastAdjustments
 *   nv={nv}
 *   min={min}
 *   max={max}
 *   setMin={setMin}
 *   setMax={setMax}
 *   transformFactors={transformFactors}
 *   gamma={gamma}
 *   gammaKey={gammaKey}
 *   setGamma={setGamma}
 *   layerList={layerList}
 * />
 * ```
 *
 * Pass `title=""` to suppress the heading strip, or `title="Window / Level"` to
 * rename it for a different application.
 */
export function NiivueContrastAdjustments({
  nv,
  min,
  max,
  setMin,
  setMax,
  transformFactors,
  gamma,
  gammaKey,
  setGamma,
  layerList = [],
  title = "Contrast Adjustments",
  accentColor = "#580f8b",
  style,
  className,
}: NiivueContrastAdjustmentsProps) {
  const { a, b } = transformFactors;

  return (
    <div style={style} className={className}>
      {title !== "" && (
        <div className="title" style={{ width: "100%" }}>
          {title}
        </div>
      )}
      <Card variant="outlined" sx={{ mb: 2, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <CardContent sx={{ "&:last-child": { paddingBottom: 2 } }}>
          <Box style={{ display: "flex", flex: 1, minWidth: "245px", flexDirection: "column" }}>

            <TKDualRange
              name="Values:"
              minDomain={nv.volumes[0]?.robust_min ?? 0}
              maxDomain={nv.volumes[0]?.robust_max ?? 1}
              valueLow={min}
              valueHigh={max}
              onChangeLow={(newMin) => {
                const v = nv.volumes[0];
                if (!v) return;
                v.cal_min = newMin;
                nv.refreshLayers(v, 0);
                nv.drawScene();
                setMin(newMin);
              }}
              onChangeHigh={(newMax) => {
                const v = nv.volumes[0];
                if (!v) return;
                v.cal_max = newMax;
                nv.refreshLayers(v, 0);
                nv.drawScene();
                setMax(newMax);
              }}
              transform={(x) => x / a + b}
              inverse={(y) => a * y - a * b}
              step={0.001}
              precision={3}
              accentColor={accentColor}
            />

            {/* Gamma */}
            <div style={{ marginTop: 20, marginBottom: 15 }}>
              <CmrLabel style={{ display: "block", marginBottom: 6 }}>
                Gamma: {gamma.toFixed(2)}
              </CmrLabel>
              <input
                id="gamma"
                type="range"
                min={0.1}
                max={3.0}
                step={0.05}
                value={gamma}
                key={gammaKey}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setGamma(val);
                  nv.setGamma(val);
                }}
                style={{ width: "100%", accentColor }}
              />
            </div>

            {layerList.length > 0 && (
              <Box style={{ height: "100%" }}>
                {layerList}
              </Box>
            )}

          </Box>
        </CardContent>
      </Card>
    </div>
  );
}

export default NiivueContrastAdjustments;
