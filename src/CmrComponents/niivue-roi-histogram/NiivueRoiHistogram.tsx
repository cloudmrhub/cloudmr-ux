import React from "react";

export interface NiivueRoiHistogramProps {
  /** DOM id used by `resampleNiivueRoiHistogram` / `document.getElementById`. Default: `histoplot`. */
  plotElementId?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Mount point for the Plotly ROI histogram. Default id `histoplot` matches MROptimum WebGUI.
 */
export function NiivueRoiHistogram(props: NiivueRoiHistogramProps) {
  const id = props.plotElementId ?? "histoplot";
  return (
    <div id={id} className={props.className} style={props.style} />
  );
}
