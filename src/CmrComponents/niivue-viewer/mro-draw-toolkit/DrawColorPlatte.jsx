/**
 * Color palette for pen/shape ROI tools. Freehand and polyline each use their own
 * toolbar button and pass `penToolKind` to show the matching options.
 */
import { Stack, IconButton, Button, Tooltip, Typography } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import CheckIcon from "@mui/icons-material/Check";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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

export default function DrawColorPlatte({
  expanded,
  updateDrawPen,
  setDrawingEnabled,
  /** @type {"freehand" | "polyline" | null} */
  penToolKind = null,
  polylineVertexCount = 0,
  penDraftActive = false,
  penDraftKind,
  penDraftFilled = false,
  onApplyPenDraft,
  onDeletePenDraft,
  onFillPenDraft,
  brushSize = 1,
  updateBrushSize,
  shapeDraftActive = false,
  onApplyShapeDraft,
  onDeleteShapeDraft,
}) {
  const isFreehandTool = penToolKind === "freehand";
  const isPolylineTool = penToolKind === "polyline";

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
      {(isFreehandTool || isPolylineTool) && expanded && updateBrushSize && (
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

      {isPolylineTool && expanded && polylineVertexCount === 0 && (
        <Typography sx={{ px: 1, pb: 0.5, fontSize: "0.68rem", color: "#aaa", userSelect: "none" }}>
          Click each vertex to draw connected line segments
        </Typography>
      )}

      {penDraftActive &&
        expanded &&
        ((isFreehandTool && penDraftKind === "freehand") ||
          (isPolylineTool && penDraftKind === "polyline")) && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 1, py: 0.5, borderTop: "1px solid #555", width: "100%" }}
        >
          <Tooltip title="Delete this ROI drawing">
            <Button
              size="small"
              aria-label="delete pen draft"
              onClick={() => onDeletePenDraft?.()}
              startIcon={<DeleteOutlineIcon sx={{ fontSize: ACTION_ICON_SIZE }} />}
              sx={{
                color: "#f44336",
                fontSize: ACTION_FONT_SIZE,
                textTransform: "none",
                minWidth: 0,
                py: 0.25,
                px: 0.75,
                "& .MuiButton-startIcon": { mr: 0.5, ml: 0 },
              }}
            >
              Delete
            </Button>
          </Tooltip>

          {isPolylineTool && (
            <Stack direction="row" spacing={1} alignItems="center">
              {polylineVertexCount >= 3 && (
                <Tooltip
                  title={
                    penDraftFilled
                      ? "Remove fill (keeps outline editable)"
                      : "Fill interior (keeps outline editable until Apply)"
                  }
                >
                  <Button
                    size="small"
                    aria-label={penDraftFilled ? "undo fill polyline" : "fill polyline"}
                    onClick={() => onFillPenDraft?.()}
                    sx={{
                      color: penDraftFilled ? "#ffb74d" : "#c9a0e8",
                      fontSize: ACTION_FONT_SIZE,
                      textTransform: "none",
                      minWidth: 0,
                      py: 0.25,
                      px: 0.75,
                    }}
                  >
                    {penDraftFilled ? "Undo Fill" : "Fill"}
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="Apply polyline (Enter or right-click)">
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
          )}
        </Stack>
      )}

      {shapeDraftActive && expanded && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-start"
          sx={{ px: 1, py: 0.5, borderTop: "1px solid #555", width: "100%" }}
        >
          <Tooltip title="Delete this ROI drawing">
            <Button
              size="small"
              aria-label="delete shape draft"
              onClick={() => onDeleteShapeDraft?.()}
              startIcon={<DeleteOutlineIcon sx={{ fontSize: ACTION_ICON_SIZE }} />}
              sx={{
                color: "#f44336",
                fontSize: ACTION_FONT_SIZE,
                textTransform: "none",
                minWidth: 0,
                py: 0.25,
                px: 0.75,
                "& .MuiButton-startIcon": { mr: 0.5, ml: 0 },
              }}
            >
              Delete
            </Button>
          </Tooltip>
        </Stack>
      )}
    </Stack>
  );
}
