import React from "react";
import { Box } from "@mui/material";
import { NI_PEN_TYPE } from "./niivuePenType";
import LocationTable from "../../core/common/components/NiivueTools/components/LocationTable";
import "./Toolbar.css";
import { NiivueSlicePosition } from "../niivue-slice-position/NiivueSlicePosition";
import { NiivueContrastAdjustments } from "../niivue-contrast-adjustments/NiivueContrastAdjustments";
import { NiivueRoiTable } from "../niivue-roi-table/NiivueRoiTable";
import type { DrawToolkitProps } from "../draw-toolkit/DrawToolkit";
import { MroDrawToolkit } from "./mro-draw-toolkit/MroDrawToolkit";
import { ShapeDraftOverlay } from "./ShapeDraftOverlay";
import { PenDraftOverlay } from "./PenDraftOverlay";

/** Props for {@link MroDrawToolkit} — extends draw toolkit with MRO pen/shape controls. */
export type CloudMrDrawToolkitProps = Omit<
  DrawToolkitProps,
  "rois" | "selectedROI" | "setSelectedROI" | "saveROI" | "labelsVisible" | "toggleLabelsVisible"
> & {
  penDrawMode?: "freehand" | "polyline";
  onPenDrawModeChange?: (mode: "freehand" | "polyline") => void;
  polylineVertexCount?: number;
  onCancelPolyline?: () => void;
  onApplyPenDraft?: () => void;
  onCancelPenDraft?: () => void;
  onFillPenDraft?: () => void;
  penDraftActive?: boolean;
  onActivateEraser?: () => void;
  onDeactivateDrawTools?: () => void;
  shapeDraftActive?: boolean;
  onApplyShapeDraft?: () => void;
  onCancelShapeDraft?: () => void;
};

export interface CloudMrNiivuePanelProps {
  nv: any;
  pipelineID: string;
  locationTableVisible: boolean;
  locationData: any[];
  decimalPrecision: number;
  drawToolkitProps: CloudMrDrawToolkitProps;
  drawShapeTool: "pen" | "rectangle" | "ellipse" | null;
  setDrawShapeTool: (t: "pen" | "rectangle" | "ellipse" | null) => void;
  resampleImage: () => void;
  layerList: React.ComponentProps<any>[];
  mins: number[];
  maxs: number[];
  mms: number[];
  rois: {}[];
  min: number;
  max: number;
  setMin: (min: number) => void;
  setMax: (max: number) => void;

  zipAndSendROI: (url: string, filename: string, blob: Blob) => Promise<void>;
  unzipAndRenderROI: (url: string) => Promise<void>;
  setLabelAlias: (label: string | number, alias: string) => void;
  onAfterRoiUpload?: () => void | Promise<void>;

  transformFactors: { a: number; b: number };
  rangeKey: number;

  gamma: number;
  gammaKey: number;
  setGamma: (val: number) => void;

  shapeDraft: import("./shapeDraftUtils").ShapeDraft | null;
  onShapeDraftChange: (draft: import("./shapeDraftUtils").ShapeDraft) => void;
  onApplyShapeDraft: () => void;
  onApplyShapeDraftKeepTool?: () => void;
  onCancelShapeDraft: () => void;
  penDraft: {
    kind: "polyline" | "freehand";
    baseBitmap: Uint8Array;
    axCorSag: number;
    penValue: number;
    vertices?: [number, number, number][];
    strokeVoxels?: [number, number, number][];
    filled?: boolean;
    bounds?: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      z1: number;
      z2: number;
    };
  } | null;
  onPenDraftChange: (draft: NonNullable<CloudMrNiivuePanelProps["penDraft"]>) => void;
  onApplyPenDraft: () => void;
  onApplyPenDraftKeepTool?: () => void;
  onCancelPenDraft: () => void;
}

export function CloudMrNiivuePanel(props: CloudMrNiivuePanelProps) {
  const canvas = React.useRef(null);
  const histogram = React.useRef<HTMLElement>(null);
  const { mins, maxs, mms } = props;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await props.nv.attachTo("niiCanvas");
        if (!cancelled) {
          props.nv.opts.dragMode = props.nv.dragModes.pan;
        }
      } catch (e) {
        console.error("Niivue attachTo failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canvas]);

  React.useEffect(() => {
    props.nv.resizeListener();
    props.nv.setMultiplanarLayout(2);
    props.nv.setMultiplanarPadPixels(10);
    props.resampleImage();
  }, [window.innerWidth, window.innerHeight]);

  React.useEffect(() => {
    setTimeout(() => {
      props.nv.resizeListener();
      props.nv.setMultiplanarLayout(2);
      props.nv.setMultiplanarPadPixels(10);
      props.resampleImage();
    }, 300);
  }, []);

  React.useEffect(() => {
    props.resampleImage();
  }, [histogram]);

  function applyDrawShapeTool(tool: "pen" | "rectangle" | "ellipse") {
    if (props.shapeDraft) {
      // Apply (commit) the current draft rather than discarding it
      props.onApplyShapeDraftKeepTool?.();
    }
    if (props.penDraft) {
      props.onApplyPenDraftKeepTool?.();
    }
    if (tool !== "pen") {
      props.drawToolkitProps.onPenDrawModeChange?.("freehand");
    }
    props.setDrawShapeTool(tool);
    const { nv } = props;
    nv.opts.deferShapeCommit = tool === "rectangle" || tool === "ellipse";
    nv.opts.deferFreehandCommit =
      tool === "pen" && props.drawToolkitProps.penDrawMode === "freehand";
    nv.opts.penType =
      tool === "rectangle"
        ? NI_PEN_TYPE.RECTANGLE
        : tool === "ellipse"
          ? NI_PEN_TYPE.ELLIPSE
          : NI_PEN_TYPE.PEN;
    nv.drawScene();
    if ((tool === "rectangle" || tool === "ellipse") && !props.drawToolkitProps.drawingEnabled) {
      props.drawToolkitProps.setDrawingEnabled(true);
    }
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: {
          xs: "column",
          md: "row",
        },
        flexWrap: "nowrap",
      }}
    >
      <Box
        sx={{
          width: {
            xs: "100%",
            md: "63%",
          },
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          alignItems: "stretch",
          justifyContent: "flex-start",
          mb: { xs: 2, md: 0 },
        }}
      >
        <MroDrawToolkit
          {...props.drawToolkitProps}
          drawShapeTool={props.drawShapeTool}
          onDrawShapeToolChange={applyDrawShapeTool}
          onExitDrawMode={() => {
            props.drawToolkitProps.onDeactivateDrawTools?.();
          }}
          shapeDraftActive={props.shapeDraft != null}
          penDraftActive={props.penDraft != null}
          onApplyShapeDraft={props.onApplyShapeDraft}
          onCancelShapeDraft={props.onCancelShapeDraft}
          style={{
            marginBottom: 0,
            width: "100%",
            flexShrink: 0,
          }}
        />

        <LocationTable
          tableData={props.locationData}
          isVisible={true}
          decimalPrecision={props.decimalPrecision}
          style={{
            width: "100%",
            height: "30pt",
            paddingTop: "10px",
            color: "white",
            background: "black",
            flexShrink: 0,
          }}
        />

        <Box
          sx={{
            position: "relative",
            width: "100%",
            flexShrink: 0,
            minHeight: {
              xs: 300,
              sm: 400,
              md: 1035,
            },
            height: {
              xs: 300,
              sm: 400,
              md: 1035,
            },
          }}
        >
          <canvas
            id={"niiCanvas"}
            ref={canvas}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
          {props.shapeDraft && (
            <ShapeDraftOverlay
              nv={props.nv}
              draft={props.shapeDraft}
              onDraftChange={props.onShapeDraftChange}
              overlayKey={props.mms}
            />
          )}
          {props.penDraft && (
            <PenDraftOverlay
              nv={props.nv}
              draft={props.penDraft}
              onDraftChange={props.onPenDraftChange}
              overlayKey={props.mms}
            />
          )}
        </Box>
      </Box>

      <Box
        sx={{
          width: {
            xs: "100%",
            md: "35%",
          },
          display: "flex",
          flexDirection: "column",
          ml: {
            xs: 0,
            md: 1,
          },
          minHeight: 0,
          height: "100%",
          overflow: "visible",
          position: "relative",
          zIndex: 1,
      }}
      >
        <NiivueSlicePosition
          nv={props.nv}
          mins={mins}
          maxs={maxs}
          mms={mms}
          style={{ minWidth: 245 }}
        />

        <NiivueContrastAdjustments
          nv={props.nv}
          min={props.min}
          max={props.max}
          setMin={props.setMin}
          setMax={props.setMax}
          transformFactors={props.transformFactors}
          gamma={props.gamma}
          gammaKey={props.gammaKey}
          setGamma={props.setGamma}
          layerList={props.layerList}
          style={{ minWidth: 245 }}
        />

        <Box sx={{ width: "100%", height: 600 }}>
          <Box
            ref={histogram}
            id={"histoplot"}
            sx={{
              width: "100%",
              height: 250,
              mb: 2,
            }}
          />

          <Box sx={{ width: "100%", height: 350 }}>
            <NiivueRoiTable
              pipelineID={props.pipelineID}
              rois={props.rois}
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
              nv={props.nv}
              resampleImage={props.resampleImage}
              unpackROI={props.unzipAndRenderROI}
              zipAndSendROI={props.zipAndSendROI}
              setLabelAlias={props.setLabelAlias}
              onAfterRoiUpload={props.onAfterRoiUpload}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
