import type { Data, Layout } from "plotly.js-dist-min";
import Plotly from "plotly.js-dist-min";
import { calculateMean, calculateStandardDeviation } from "./roiHistogramStats";

/** Maps Niivue label index (e.g. "1".."7") to a display name in the legend / ROI table. */
export type RoiLabelMapping = Record<string, string>;

export interface NiivueRoiHistogramRow {
  label: string;
  alias: string;
  visibility: boolean;
  color: string;
  mu: number;
  std: number;
  opacity: number;
  count: number;
  sample: number[];
}

const ROI_HISTOGRAM_COLORS = [
  "#bbb",
  "#f00",
  "#0f0",
  "#00f",
  "yellow",
  "cyan",
  "#e81ce8",
  "#e8dbc7",
];

/** Plotly layout matching MROptimum WebGUI ROI histogram defaults. */
export function getDefaultRoiHistogramLayout(): Partial<Layout> {
  return {
    barmode: "overlay",
    title: { text: "ROI Histogram" },
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 60,
      pad: 4,
    },
    xaxis: {
      title: { text: "Voxel value" },
      showgrid: true,
    },
    yaxis: {
      title: { text: "Bin frequency" },
      showgrid: true,
    },
  };
}

/**
 * Recomputes per-ROI voxel samples from the Niivue instance, updates the Plotly histogram
 * at `plotRoot`, and returns the row data for tables / export.
 *
 * @returns `null` if `plotRoot` is missing (caller should retain prior ROI state), otherwise
 *          the new ROI rows (empty when drawing was cleared).
 */
export function resampleNiivueRoiHistogram(options: {
  nv: any;
  labelMapping?: RoiLabelMapping;
  plotRoot: HTMLElement | null | undefined;
  layout?: Partial<Layout>;
}): NiivueRoiHistogramRow[] | null {
  const { nv, labelMapping = {}, plotRoot, layout: layoutOverrides } = options;

  if (typeof document === "undefined" || !plotRoot) {
    return null;
  }

  const image = nv.volumes?.[0];
  const layout: Partial<Layout> = {
    ...getDefaultRoiHistogramLayout(),
    ...layoutOverrides,
  };

  if (nv.drawBitmap == null) {
    Plotly.newPlot(plotRoot, [], layout, { responsive: true });
    return [];
  }

  if (!image) {
    return null;
  }

  const min = image.robust_min;
  const max = image.robust_max;

  const samples: Record<number, number[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
  };

  for (let i = 0; i < nv.drawBitmap.length; i++) {
    const k = nv.drawBitmap[i] as number;
    if (samples[k] === undefined) {
      samples[k] = [];
    }
    samples[k].push(image.img[i]);
  }

  if (nv.hiddenBitmap !== undefined) {
    for (let i = 0; i < nv.hiddenBitmap.length; i++) {
      const k = nv.hiddenBitmap[i] as number;
      if (samples[k] === undefined) {
        samples[k] = [];
      }
      samples[k].push(image.img[i]);
    }
  }

  const rois: NiivueRoiHistogramRow[] = [];
  for (const sk in samples) {
    const key = Number(sk);
    const sample = samples[key];
    if (sample.length > 0 && key > 0) {
      rois.push({
        label: String(key),
        alias: labelMapping[sk] ?? labelMapping[String(key)] ?? String(key),
        visibility: nv.getLabelVisibility(Number(key)),
        color: ROI_HISTOGRAM_COLORS[key] ?? ROI_HISTOGRAM_COLORS[0],
        mu: calculateMean(sample),
        std: calculateStandardDeviation(sample),
        opacity: nv.drawOpacity,
        count: sample.length,
        sample,
      });
    }
  }

  const traces: Data[] = [];
  for (const roi of rois) {
    traces.push({
      x: roi.sample,
      type: "histogram",
      name: roi.alias,
      opacity: roi.visibility ? 0.5 : 0.1,
      marker: {
        color: roi.color,
      },
      autobinx: false,
      xbins: {
        start: min,
        end: max,
        size: (max - min) / 100,
      },
    });
  }

  Plotly.newPlot(plotRoot, traces, layout, { responsive: true });
  return rois;
}
