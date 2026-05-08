import React from "react";
import { Stack, IconButton, Slider, Typography } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FiberManualRecordOutlinedIcon from "@mui/icons-material/FiberManualRecordOutlined";

interface DrawPlatteProps {
  expandDrawOptions: boolean;
  updateDrawPen: (e: any) => void;
  setDrawingEnabled: (enabled: boolean) => void;
  brushSize: number;
  updateBrushSize: (size: number) => void;
}

const DrawPlatte: React.FC<DrawPlatteProps> = ({
  expandDrawOptions,
  updateDrawPen,
  setDrawingEnabled,
  brushSize,
  updateBrushSize,
}) => {
  const filledOptions = [
    <FiberManualRecordIcon key="f0" sx={{ color: "red" }} />,
    <FiberManualRecordIcon key="f1" sx={{ color: "green" }} />,
    <FiberManualRecordIcon key="f2" sx={{ color: "blue" }} />,
    <FiberManualRecordIcon key="f3" sx={{ color: "yellow" }} />,
    <FiberManualRecordIcon key="f4" sx={{ color: "cyan" }} />,
    <FiberManualRecordIcon key="f5" sx={{ color: "#e81ce8" }} />,
  ];

  return (
    <Stack
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 10,
        border: `${expandDrawOptions ? "1px" : 0} solid #bbb`,
        maxWidth: expandDrawOptions ? 300 : 0,
        overflow: "hidden",
        borderRadius: "16px",
        borderTopLeftRadius: "6pt",
        borderTopRightRadius: "6pt",
        background: "#333",
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
        >{`Brush Size: ${brushSize}`}</Typography>
        <Slider
          value={brushSize}
          sx={{
            width: "80%",
            color: "#fff",
            "& .MuiSlider-track": { backgroundColor: "#fff", border: "none" },
            "& .MuiSlider-rail": { backgroundColor: "rgba(255,255,255,0.3)" },
            "& .MuiSlider-thumb": {
              backgroundColor: "#fff",
              border: "2px solid #fff",
              "&:hover, &.Mui-focusVisible, &.Mui-active": {
                boxShadow: "0 0 0 8px rgba(255,255,255,0.16)",
              },
            },
            "& .MuiSlider-mark": { backgroundColor: "#fff" },
            "& .MuiSlider-markActive": { backgroundColor: "#fff" },
            "& .MuiSlider-valueLabel": {
              backgroundColor: "#fff",
              color: "#000",
            },
          }}
          step={2}
          min={1}
          max={15}
          marks={true}
          onChange={(_event, value) => {
            updateBrushSize(value as number);
          }}
        />
      </Stack>
      <Stack direction="row">
        {filledOptions.map((value, index) => (
          <IconButton
            key={index}
            onClick={() => {
              updateDrawPen({ target: { value: index + 1 } });
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

export default DrawPlatte;
