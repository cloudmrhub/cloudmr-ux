import type { Data, Layout } from "plotly.js-dist-min";
import Plotly from "plotly.js-dist-min";
import { calculateMean, calculateStandardDeviation } from "./roiHistogramStats";

/**
 * Maps a Niivue label index (e.g. "1".."255") or group id (e.g. "-1") to a display name in the
 * legend / ROI table.
 */
export type RoiLabelMapping = Record<string, string>;

export interface NiivueRoiHistogramRow {
  /** Label index ("1".."255") or group id ("-1", "-2", ...; negative = group, metadata only). */
  label: string;
  alias: string;
  visibility: boolean;
  color: string;
  mu: number;
  std: number;
  opacity: number;
  count: number;
  sample: number[];
  /** True for group rows (negative id). */
  isGroup?: boolean;
  /** Member labels (>0) of a group row. */
  members?: number[];
}

/** Used only when the Niivue instance has no ROI palette (older patcher). */
const FALLBACK_ROI_COLORS = [
  "#bbb",
  "#f00",
  "#0f0",
  "#00f",
  "yellow",
  "cyan",
  "#e81ce8",
  "#e8dbc7",
];

function roiColorFor(nv: any, label: number): string {
  if (typeof nv.getRoiLabelColor === "function") {
    return nv.getRoiLabelColor(label);
  }
  return FALLBACK_ROI_COLORS[label] ?? FALLBACK_ROI_COLORS[0];
}

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
 * Voxels always carry their real label (1..255). Groups (negative ids, display-only) add one
 * extra row each that aggregates the samples of its member labels; grouped member labels are
 * not listed individually while the group exists.
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

  const samples: Record<number, number[]> = {};

  for (let i = 0; i < nv.drawBitmap.length; i++) {
    const k = nv.drawBitmap[i] as number;
    if (k === 0) {
      continue;
    }
    if (samples[k] === undefined) {
      samples[k] = [];
    }
    samples[k].push(image.img[i]);
  }

  if (nv.hiddenBitmap !== undefined) {
    for (let i = 0; i < nv.hiddenBitmap.length; i++) {
      const k = nv.hiddenBitmap[i] as number;
      if (k === 0) {
        continue;
      }
      if (samples[k] === undefined) {
        samples[k] = [];
      }
      samples[k].push(image.img[i]);
    }
  }

  // Every label that exists in the drawing gets a palette entry (keeps palette + LUT in sync
  // for drawings loaded from disk).
  if (typeof nv.ensureRoiLabelsRegistered === "function") {
    nv.ensureRoiLabelsRegistered(
      Object.keys(samples)
        .map(Number)
        .filter((k) => k > 0)
    );
  }

  const groups: { id: number; members: number[]; color: string }[] =
    typeof nv.getRoiGroups === "function" ? nv.getRoiGroups() : [];
  const groupedLabels = new Set<number>();
  for (const g of groups) {
    for (const m of g.members) {
      groupedLabels.add(m);
    }
  }

  const rois: NiivueRoiHistogramRow[] = [];

  // Individual (ungrouped) labels, ascending
  const labelKeys = Object.keys(samples)
    .map(Number)
    .filter((k) => k > 0 && !groupedLabels.has(k))
    .sort((a, b) => a - b);
  for (const key of labelKeys) {
    const sample = samples[key];
    if (sample.length === 0) {
      continue;
    }
    rois.push({
      label: String(key),
      alias: labelMapping[String(key)] ?? String(key),
      visibility: nv.getLabelVisibility(key),
      color: roiColorFor(nv, key),
      mu: calculateMean(sample),
      std: calculateStandardDeviation(sample),
      opacity: nv.drawOpacity,
      count: sample.length,
      sample,
    });
  }

  // Groups: one aggregated row per group (negative id)
  for (const group of [...groups].sort((a, b) => Math.abs(a.id) - Math.abs(b.id))) {
    let sample: number[] = [];
    for (const m of group.members) {
      if (samples[m] && samples[m].length > 0) {
        sample = sample.concat(samples[m]);
      }
    }
    if (sample.length === 0) {
      continue;
    }
    rois.push({
      label: String(group.id),
      alias: labelMapping[String(group.id)] ?? `Group ${Math.abs(group.id)}`,
      visibility: nv.getLabelVisibility(group.id),
      color: group.color,
      mu: calculateMean(sample),
      std: calculateStandardDeviation(sample),
      opacity: nv.drawOpacity,
      count: sample.length,
      sample,
      isGroup: true,
      members: group.members.slice(),
    });
  }

  const traces: Data[] = [];
  for (const roi of rois) {
    traces.push({
      x: roi.sample,
      type: "histogram",
      name: roi.alias,
      opacity: roi.visibility ? 0.5 : 0,
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
