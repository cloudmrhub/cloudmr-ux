import React from "react";
import { Stack, IconButton, Slider, Typography } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FiberManualRecordOutlinedIcon from "@mui/icons-material/FiberManualRecordOutlined";

interface EraserPlatteProps {
  expandEraseOptions: boolean;
  updateDrawPen: (e: any) => void;
  setDrawingEnabled: (enabled: boolean) => void;
  brushSize: number;
  updateBrushSize: (size: number) => void;
}

const EraserPlatte: React.FC<EraserPlatteProps> = ({
  expandEraseOptions,
  updateDrawPen,
  setDrawingEnabled,
  brushSize,
  updateBrushSize,
}) => {
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
        zIndex: 10,
        border: `${expandEraseOptions ? "1px" : 0} solid #bbb`,
        maxWidth: expandEraseOptions ? 300 : 0,
        overflow: "hidden",
        borderRadius: "16px",
        borderTopLeftRadius: "6pt",
        borderTopRightRadius: "6pt",
        background: "#333",
        width: 150,
      }}
      direction="column"
    >
      <Stack sx={{ mb: 1 }} alignItems="center">
        <Typography
          color={"white"}
          noWrap
          gutterBottom
          width={"100%"}
          marginLeft={"10pt"}
          fontSize={"11pt"}
          alignItems={"start"}
        >{`Eraser Size: ${brushSize}`}</Typography>
        <Slider
          sx={{ width: "80%" }}
          value={brushSize}
          step={2}
          min={1}
          max={15}
          marks={true}
          onChange={(_event, value) => {
            updateBrushSize(value as number);
          }}
        />
      </Stack>
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
};

export default EraserPlatte;
