import { Stack } from "@mui/material";
import { BrushSizeSlider } from "./BrushSizeSlider";

/** Eraser palette — size control only (stroke eraser is always used). */
export default function EraserPlatte({
  expandEraseOptions,
  eraserSize = 1,
  updateEraserSize,
}) {
  return (
    <Stack
      aria-hidden={!expandEraseOptions}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: expandEraseOptions ? 1500 : 0,
        border: `${expandEraseOptions ? "1px" : 0} solid #bbb`,
        maxWidth: expandEraseOptions ? 300 : 0,
        overflow: expandEraseOptions ? "visible" : "hidden",
        pointerEvents: expandEraseOptions ? "auto" : "none",
        visibility: expandEraseOptions ? "visible" : "hidden",
        borderRadius: "16px",
        borderTopLeftRadius: "6pt",
        borderTopRightRadius: "6pt",
        background: "#333",
        width: expandEraseOptions ? 150 : 0,
      }}
      direction="column"
    >
      {expandEraseOptions && updateEraserSize && (
        <BrushSizeSlider
          label="Eraser size"
          brushSize={eraserSize}
          updateBrushSize={updateEraserSize}
        />
      )}
    </Stack>
  );
}
