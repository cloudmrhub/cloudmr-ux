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
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 1500,
        border: `${expandEraseOptions ? "1px" : 0} solid #bbb`,
        maxWidth: expandEraseOptions ? 300 : 0,
        overflow: expandEraseOptions ? "visible" : "hidden",
        borderRadius: "16px",
        borderTopLeftRadius: "6pt",
        borderTopRightRadius: "6pt",
        background: "#333",
        width: 150,
      }}
      direction="column"
    >
      {updateEraserSize && (
        <BrushSizeSlider
          label="Eraser size"
          brushSize={eraserSize}
          updateBrushSize={updateEraserSize}
        />
      )}
    </Stack>
  );
}
