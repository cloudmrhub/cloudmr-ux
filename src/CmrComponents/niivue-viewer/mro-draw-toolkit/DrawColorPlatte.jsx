/**
 * Pen palette adds freehand vs polyline mode; pen/shape drafts show Apply/Cancel while adjusting.
 */
import { Stack, IconButton, Button, Tooltip, Typography } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { BrushSizeSlider } from "./BrushSizeSlider";

const FILLED_COLORS = [
  { sx: { color: "red" } },
  { sx: { color: "green" } },
  { sx: { color: "blue" } },
  { sx: { color: "yellow" } },
  { sx: { color: "cyan" } },
  { sx: { color: "#e81ce8" } },
];

const ACTION_FONT_SIZE = "0.75rem";
const ACTION_ICON_SIZE = "0.875rem";

const modeBtnSx = (active) => ({
  color: active ? "#c9a0e8" : "#bbb",
  fontSize: ACTION_FONT_SIZE,
  textTransform: "none",
  minWidth: 0,
  py: 0.25,
  px: 0.75,
});

export default function DrawColorPlatte({
  expanded,
  updateDrawPen,
  setDrawingEnabled,
  showPenModes = false,
  penDrawMode = "freehand",
  onPenDrawModeChange,
  polylineVertexCount = 0,
  penDraftActive = false,
  onApplyPenDraft,
  onCancelPenDraft,
  onCloseFillPenDraft,
  brushSize = 1,
  updateBrushSize,
  shapeDraftActive = false,
  onApplyShapeDraft,
  onCancelShapeDraft,
}) {
  return (
    <Stack
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 1500,
        border: `${expanded ? "1px" : 0} solid #bbb`,
        maxWidth: expanded ? 320 : 0,
        minWidth: expanded ? 240 : 0,
        overflow: expanded ? "visible" : "hidden",
        borderRadius: "16px",
        borderTopLeftRadius: "6pt",
        borderTopRightRadius: "6pt",
        background: "#333",
      }}
      direction="column"
      spacing={0.5}
      sx={{ py: expanded ? 0.5 : 0 }}
    >
      {showPenModes && expanded && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ px: 0.75, pt: 0.25 }}
        >
          <Button
            size="small"
            onClick={() => onPenDrawModeChange?.("freehand")}
            sx={modeBtnSx(penDrawMode === "freehand")}
          >
            Freehand
          </Button>
          <Button
            size="small"
            onClick={() => onPenDrawModeChange?.("polyline")}
            sx={modeBtnSx(penDrawMode === "polyline")}
          >
            Polyline
          </Button>
        </Stack>
      )}

      {showPenModes && expanded && updateBrushSize && (
        <BrushSizeSlider
          label="Line thickness"
          brushSize={brushSize}
          updateBrushSize={updateBrushSize}
        />
      )}

      <Stack direction="row">
        {FILLED_COLORS.map((color, index) => (
          <IconButton
            key={index}
            onClick={() => {
              updateDrawPen({ target: { value: index + 1 } });
              setDrawingEnabled(true);
            }}
          >
            <FiberManualRecordIcon sx={color.sx} />
          </IconButton>
        ))}
      </Stack>

      {showPenModes && penDrawMode === "polyline" && expanded && polylineVertexCount === 0 && (
        <Typography sx={{ px: 1, pb: 0.5, fontSize: "0.68rem", color: "#aaa", userSelect: "none" }}>
          Click each vertex to draw connected line segments
        </Typography>
      )}

      {showPenModes && penDraftActive && expanded && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 1, py: 0.5, borderTop: "1px solid #555", width: "100%" }}
        >
          <Tooltip title="Cancel (Esc)">
            <Button
              size="small"
              aria-label="cancel pen draft"
              onClick={() => onCancelPenDraft?.()}
              startIcon={<CloseIcon sx={{ fontSize: ACTION_ICON_SIZE }} />}
              sx={{
                color: "#ccc",
                fontSize: ACTION_FONT_SIZE,
                textTransform: "none",
                minWidth: 0,
                py: 0.25,
                px: 0.75,
                "& .MuiButton-startIcon": { mr: 0.5, ml: 0 },
              }}
            >
              Cancel
            </Button>
          </Tooltip>
          <Stack direction="row" alignItems="center" spacing={1}>
            {penDrawMode === "polyline" && polylineVertexCount >= 3 && (
              <Tooltip title="Connect last point to first and fill">
                <Button
                  size="small"
                  aria-label="close and fill polyline"
                  onClick={() => onCloseFillPenDraft?.()}
                  sx={{
                    color: "#c9a0e8",
                    fontSize: ACTION_FONT_SIZE,
                    textTransform: "none",
                    minWidth: 0,
                    py: 0.25,
                    px: 0.75,
                  }}
                >
                  Close &amp; fill
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Apply (Enter)">
              <Button
                size="small"
                aria-label="apply pen draft"
                onClick={() => onApplyPenDraft?.()}
                startIcon={<CheckIcon sx={{ fontSize: ACTION_ICON_SIZE }} />}
                sx={{
                  color: "#c9a0e8",
                  fontSize: ACTION_FONT_SIZE,
                  textTransform: "none",
                  minWidth: 0,
                  py: 0.25,
                  px: 0.75,
                  "& .MuiButton-startIcon": { mr: 0.5, ml: 0 },
                }}
              >
                Apply
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
      )}

      {shapeDraftActive && expanded && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 1, py: 0.5, borderTop: "1px solid #555", width: "100%" }}
        >
          <Tooltip title="Cancel shape (Esc)">
            <Button
              size="small"
              aria-label="cancel shape"
              onClick={() => onCancelShapeDraft?.()}
              startIcon={<CloseIcon sx={{ fontSize: ACTION_ICON_SIZE }} />}
              sx={{
                color: "#ccc",
                fontSize: ACTION_FONT_SIZE,
                textTransform: "none",
                minWidth: 0,
                py: 0.25,
                px: 0.75,
                "& .MuiButton-startIcon": { mr: 0.5, ml: 0 },
              }}
            >
              Cancel
            </Button>
          </Tooltip>
          <Tooltip title="Apply shape (Enter)">
            <Button
              size="small"
              aria-label="apply shape"
              onClick={() => onApplyShapeDraft?.()}
              startIcon={<CheckIcon sx={{ fontSize: ACTION_ICON_SIZE }} />}
              sx={{
                color: "#c9a0e8",
                fontSize: ACTION_FONT_SIZE,
                textTransform: "none",
                minWidth: 0,
                py: 0.25,
                px: 0.75,
                "& .MuiButton-startIcon": { mr: 0.5, ml: 0 },
              }}
            >
              Apply
            </Button>
          </Tooltip>
        </Stack>
      )}
    </Stack>
  );
}
