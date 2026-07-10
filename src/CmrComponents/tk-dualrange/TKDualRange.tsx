import React, { useEffect, useState } from "react";
import "./tk-dual-range.css";

type Props = {
  name?: string;

  // Domain in REAL space (e.g., Niivue robust_min / robust_max)
  minDomain: number;
  maxDomain: number;

  // Current window in REAL space (e.g., cal_min / cal_max mirrored in React)
  valueLow: number;
  valueHigh: number;

  // Callbacks must accept REAL values
  onChangeLow: (v: number) => void;
  onChangeHigh: (v: number) => void;

  // Optional: render-space masking
  transform?: (x: number) => number; // real -> render
  inverse?: (y: number) => number;   // render -> real
  step?: number;                     // step in RENDER space
  precision?: number;                // input boxes precision (render-space)
  accentColor?: string;              // slider color
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Display REAL-space values; use scientific notation for small non-zero values
// so they don't display as "0.000". Use type="text" because type="number" can
// show "0" for very small values instead of scientific notation.
function fmt(v: number, precision: number) {
  if (!Number.isFinite(v)) return "";
  return v !== 0 && Math.abs(v) < 0.01
    ? Number(v).toExponential(precision)
    : v.toFixed(precision);
}

function parse(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * A text input that holds a local string draft while the user is typing,
 * committing only on blur or Enter. This lets the user type multi-digit and
 * decimal values without mid-entry validation snapping the field.
 * Shows a small red "Out of range" message when the committed value falls
 * outside [lo, hi].
 */
function DeferredInput({
  committed,
  onCommit,
  lo,
  hi,
  className,
}: {
  committed: string;
  onCommit: (raw: string) => void;
  lo: number;
  hi: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(committed);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync external changes into the field only when the user is not typing.
  useEffect(() => {
    if (!focused) setDraft(committed);
  }, [committed, focused]);

  const commit = (value: string) => {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      setError(`"${value}" is not a valid number`);
    } else if (n < lo || n > hi) {
      setError(`${value.trim()} is out of range`);
    } else {
      setError(null);
    }
    onCommit(value);
    // After commit the parent re-formats, so sync back to avoid a stale draft.
    setDraft(committed);
  };

  return (
    <div className="tkdr__input-wrap">
      <input
        className={`${className ?? ""}${error ? " tkdr__num--error" : ""}`}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => {
          setFocused(true);
          setError(null);
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {error && <span className="tkdr__error">{error}</span>}
    </div>
  );
}

export default function TKDualRange({
  name = "Values",
  minDomain,
  maxDomain,
  valueLow,
  valueHigh,
  onChangeLow,
  onChangeHigh,
  transform = (x) => x,
  inverse = (y) => y,
  step,
  precision = 3,
  accentColor = "#580f8b",
}: Props) {
  // Map domain & current values into RENDER space
  const tMin = transform(minDomain);
  const tMax = transform(maxDomain);
  const tLow = transform(valueLow);
  const tHigh = transform(valueHigh);

  const span = Math.max(1e-12, tMax - tMin);
  const pct = (t: number) => ((t - tMin) / span) * 100;
  const s = step ?? Math.max(span * 0.001, Number.EPSILON);

  // Whether either value is currently outside the domain (from manual text input).
  const isOutOfBounds =
    valueLow < minDomain || valueLow > maxDomain ||
    valueHigh < minDomain || valueHigh > maxDomain;

  // Clamped render-space values used only for the fill bar and slider thumbs,
  // so they don't go offscreen when the real value is outside the domain.
  const tLowDisplay = clamp(tLow, tMin, tMax);
  const tHighDisplay = clamp(tHigh, tMin, tMax);

  // Keep ends from crossing; clamp in REAL space against the other end.
  const handleLowRender = (nextRender: number) => {
    const nextReal = clamp(inverse(nextRender), minDomain, valueHigh);
    onChangeLow(nextReal);
  };
  const handleHighRender = (nextRender: number) => {
    const nextReal = clamp(inverse(nextRender), valueLow, maxDomain);
    onChangeHigh(nextReal);
  };

  return (
    <div className="tkdr">
      {/* Header row: two inputs at the ends with Min / Max labels */}
      <div className="tkdr__row tkdr__row--ends">
        <div className="tkdr__group">
          <span className="tkdr__hint">Min</span>
          <DeferredInput
            className="tkdr__num"
            committed={fmt(valueLow, precision)}
            lo={minDomain}
            hi={maxDomain}
            onCommit={(raw) => {
              const n = parse(raw);
              if (!Number.isFinite(n)) return;
              onChangeLow(n);
            }}
          />
        </div>

        <div className="tkdr__group">
          <span className="tkdr__hint">Max</span>
          <DeferredInput
            className="tkdr__num"
            committed={fmt(valueHigh, precision)}
            lo={minDomain}
            hi={maxDomain}
            onCommit={(raw) => {
              const n = parse(raw);
              if (!Number.isFinite(n)) return;
              onChangeHigh(n);
            }}
          />
        </div>
      </div>

      {/* Track with two native range inputs stacked */}
      <div
        className="tkdr__track"
        style={{
          ["--tkdr-accent" as any]: accentColor,
          ...(isOutOfBounds && {
            opacity: 0.35,
            filter: "grayscale(1)",
            transition: "opacity 0.15s, filter 0.15s",
          }),
        }}
      >
        <div
          className="tkdr__range-fill"
          style={{
            left: `${pct(Math.min(tLowDisplay, tHighDisplay))}%`,
            width: `${Math.abs(pct(tHighDisplay) - pct(tLowDisplay))}%`,
          }}
          aria-hidden
        />
        <input
          className="tkdr__range"
          type="range"
          min={tMin}
          max={tMax}
          step={s}
          value={tLowDisplay}
          onChange={(e) => handleLowRender(Number(e.target.value))}
        />
        <input
          className="tkdr__range tkdr__range--top"
          type="range"
          min={tMin}
          max={tMax}
          step={s}
          value={tHighDisplay}
          onChange={(e) => handleHighRender(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
