/**
 * Shared ROI label color row (NiiVue pen indices 1–6). Used by pen, rectangle, and ellipse tools.
 * Rectangle/ellipse palettes may also show Apply/Cancel while a shape draft is being adjusted.
 */
import { Stack, IconButton, Button, Tooltip } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

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
        maxWidth: expanded ? 300 : 0,
        overflow: expanded ? "visible" : "hidden",
        borderRadius: "16px",
        borderTopLeftRadius: "6pt",
        borderTopRightRadius: "6pt",
        background: "#333",
      }}
      direction="column"
      spacing={0.5}
      sx={{ py: shapeDraftActive && expanded ? 0.5 : 0 }}
    >
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
      {shapeDraftActive && expanded && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={1.5}
          sx={{ px: 1, py: 0.5, borderTop: "1px solid #555" }}
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
