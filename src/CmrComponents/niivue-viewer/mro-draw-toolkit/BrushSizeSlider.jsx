import { Stack, Slider, Typography } from "@mui/material";

const SLIDER_SX = {
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
};

export function BrushSizeSlider({ label, brushSize, updateBrushSize }) {
  return (
    <Stack sx={{ mb: 0.5, px: 0.5 }} alignItems="center" width="100%">
      <Typography
        color="white"
        noWrap
        width="100%"
        marginLeft="6pt"
        fontSize="11pt"
        sx={{ userSelect: "none" }}
      >
        {label}: {brushSize}
      </Typography>
      <Slider
        value={brushSize}
        sx={SLIDER_SX}
        step={2}
        min={1}
        max={15}
        marks
        onChange={(_event, value) => updateBrushSize(value)}
      />
    </Stack>
  );
}
