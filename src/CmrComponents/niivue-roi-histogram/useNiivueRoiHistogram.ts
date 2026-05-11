import { useCallback, useState } from "react";
import type { Layout } from "plotly.js-dist-min";
import {
  resampleNiivueRoiHistogram,
  type NiivueRoiHistogramRow,
  type RoiLabelMapping,
} from "./resampleNiivueRoiHistogram";

export function useNiivueRoiHistogram(
  nv: any,
  options?: {
    plotElementId?: string;
    /** Optional Plotly layout overrides passed through to each resample. */
    layout?: Partial<Layout>;
  },
) {
  const plotElementId = options?.plotElementId ?? "histoplot";
  const layout = options?.layout;

  const [labelMapping, setLabelMapping] = useState<RoiLabelMapping>({});
  const [rois, setRois] = useState<NiivueRoiHistogramRow[]>([]);

  const resample = useCallback(
    (mapping: RoiLabelMapping = labelMapping) => {
      const el =
        typeof document !== "undefined"
          ? document.getElementById(plotElementId)
          : null;
      const next = resampleNiivueRoiHistogram({
        nv,
        labelMapping: mapping,
        plotRoot: el,
        layout,
      });
      if (next !== null) {
        setRois(next);
      }
    },
    [nv, labelMapping, plotElementId, layout],
  );

  return {
    rois,
    setRois,
    labelMapping,
    setLabelMapping,
    resample,
  };
}
