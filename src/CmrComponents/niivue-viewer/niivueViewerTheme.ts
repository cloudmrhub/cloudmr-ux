import type { CSSProperties } from "react";
import { createTheme } from "@mui/material/styles";

/** Default MROptimum / package purple accent for the Niivue viewer. */
export const CLOUDMR_NIIVUE_DEFAULT_ACCENT = "#580f8b";

/** MUI stock `palette.primary.main` when the host does not customize primary. */
let muiDefaultPrimaryMain: string | undefined;

function getMuiDefaultPrimaryMain(): string {
  if (!muiDefaultPrimaryMain) {
    muiDefaultPrimaryMain = createTheme().palette.primary.main;
  }
  return muiDefaultPrimaryMain;
}

function normalizeHex(color: string): string {
  return color.trim().toLowerCase();
}

/**
 * Resolve Niivue viewer accent color:
 * 1. Explicit `accentColor` prop on {@link CloudMrNiivueViewer}
 * 2. Host MUI `palette.primary.main` when it differs from stock MUI primary
 *    (e.g. CAMRIE `#1578A1`, MROptimum `#580f8b`)
 * 3. Package default purple {@link CLOUDMR_NIIVUE_DEFAULT_ACCENT}
 */
export function resolveViewerAccentColor(
  accentColorProp?: string,
  muiPrimaryMain?: string,
): string {
  if (accentColorProp) {
    return accentColorProp;
  }
  const primary = muiPrimaryMain?.trim();
  if (
    primary &&
    normalizeHex(primary) !== normalizeHex(getMuiDefaultPrimaryMain())
  ) {
    return primary;
  }
  return CLOUDMR_NIIVUE_DEFAULT_ACCENT;
}

export interface NiivueViewerThemeTokens {
  accentColor: string;
  accentMutedBg: string;
  accentMutedBgLight: string;
  headerBgColor: string;
  headerIconColor: string;
  checkboxCheckedColor: string;
  checkboxUncheckedColor: string;
  selectedToolSx: { backgroundColor: string; color: string };
  muiSwitchSx: Record<string, unknown>;
  muiSliderSx: Record<string, unknown>;
  cssVars: CSSProperties;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full =
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) {
    return hexToRgb(CLOUDMR_NIIVUE_DEFAULT_ACCENT);
  }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Light header background tinted from accent (~8% accent, 92% white). */
function accentToHeaderBg(r: number, g: number, b: number): string {
  const mix = (c: number) =>
    Math.round(c * 0.08 + 255 * 0.92)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

export function buildNiivueViewerTheme(
  accentColor: string,
): NiivueViewerThemeTokens {
  const { r, g, b } = hexToRgb(accentColor);
  const accentMutedBg = `rgba(${r}, ${g}, ${b}, 0.12)`;
  const accentMutedBgLight = `rgba(${r}, ${g}, ${b}, 0.08)`;
  const checkboxUncheckedColor = `rgba(${r}, ${g}, ${b}, 0.54)`;

  return {
    accentColor,
    accentMutedBg,
    accentMutedBgLight,
    headerBgColor: accentToHeaderBg(r, g, b),
    headerIconColor: accentColor,
    checkboxCheckedColor: accentColor,
    checkboxUncheckedColor,
    selectedToolSx: { backgroundColor: accentMutedBg, color: accentColor },
    muiSwitchSx: {
      "& .MuiSwitch-switchBase.Mui-checked": {
        color: accentColor,
        "&:hover": { backgroundColor: accentMutedBgLight },
        "& + .MuiSwitch-track": { backgroundColor: accentColor, opacity: 1 },
      },
      "& .MuiSwitch-switchBase.Mui-checked.Mui-disabled": {
        color: checkboxUncheckedColor,
        "& + .MuiSwitch-track": {
          backgroundColor: checkboxUncheckedColor,
          opacity: 0.5,
        },
      },
    },
    muiSliderSx: {
      color: accentColor,
      "& .MuiSlider-thumb": { backgroundColor: accentColor },
      "& .MuiSlider-track": { backgroundColor: accentColor },
    },
    cssVars: {
      ["--tkdr-accent" as string]: accentColor,
      ["--cmr-niivue-accent" as string]: accentColor,
    },
  };
}
