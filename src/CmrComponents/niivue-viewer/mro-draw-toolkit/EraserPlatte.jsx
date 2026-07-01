import { Stack, IconButton } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FiberManualRecordOutlinedIcon from "@mui/icons-material/FiberManualRecordOutlined";
import { BrushSizeSlider } from "./BrushSizeSlider";

export default function EraserPlatte({
  expandEraseOptions,
  updateDrawPen,
  setDrawingEnabled,
  eraserSize = 1,
  updateEraserSize,
}) {
  const eraseOptions = [
    <FiberManualRecordIcon key="e0" style={{ color: "white" }} />,
    <FiberManualRecordOutlinedIcon key="e1" style={{ color: "white" }} />,
  ];

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
      <Stack direction="row" style={{ justifyContent: "center" }}>
        {eraseOptions.map((value, index) => (
          <IconButton
            key={index}
            onClick={() => {
              updateDrawPen({ target: { value: index === 0 ? 8 : 0 } });
              setDrawingEnabled(true);
            }}
          >
            {value}
          </IconButton>
        ))}
      </Stack>
    </Stack>
  );
}
