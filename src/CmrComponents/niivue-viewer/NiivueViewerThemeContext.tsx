import React, { createContext, useContext, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import {
  buildNiivueViewerTheme,
  CLOUDMR_NIIVUE_DEFAULT_ACCENT,
  resolveViewerAccentColor,
  type NiivueViewerThemeTokens,
} from "./niivueViewerTheme";

const NiivueViewerThemeContext = createContext<NiivueViewerThemeTokens | null>(
  null,
);

export interface NiivueViewerThemeProviderProps {
  /**
   * Optional override for viewer accent (sliders, ROI table tints, draw-toolkit, etc.).
   * When omitted: uses host MUI `palette.primary.main` if customized, else package purple.
   */
  accentColor?: string;
  children: React.ReactNode;
}

export function NiivueViewerThemeProvider({
  accentColor,
  children,
}: NiivueViewerThemeProviderProps) {
  const muiTheme = useTheme();
  const resolvedAccent = resolveViewerAccentColor(
    accentColor,
    muiTheme.palette.primary.main,
  );

  const theme = useMemo(
    () => buildNiivueViewerTheme(resolvedAccent),
    [resolvedAccent],
  );

  return (
    <NiivueViewerThemeContext.Provider value={theme}>
      {children}
    </NiivueViewerThemeContext.Provider>
  );
}

/** Returns the viewer theme from context, or package defaults when outside a provider. */
export function useNiivueViewerTheme(): NiivueViewerThemeTokens {
  const ctx = useContext(NiivueViewerThemeContext);
  return ctx ?? buildNiivueViewerTheme(CLOUDMR_NIIVUE_DEFAULT_ACCENT);
}

export function resolveNiivueAccentColor(
  propAccent: string | undefined,
  theme: NiivueViewerThemeTokens,
): string {
  return propAccent ?? theme.accentColor;
}
