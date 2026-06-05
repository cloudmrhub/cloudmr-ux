/**
 * Shared ROI label color row (NiiVue pen indices 1–6). Used by pen, rectangle, and ellipse tools.
 * Rectangle/ellipse palettes may also show Apply/Cancel while a shape draft is being adjusted.
 */
import { Stack, IconButton, Tooltip, Typography } from "@mui/material";
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
          spacing={0.5}
          sx={{ px: 0.5, pb: 0.5, borderTop: "1px solid #555" }}
        >
          <Tooltip title="Apply shape (Enter)">
            <IconButton
              aria-label="apply shape"
              size="small"
              onClick={() => onApplyShapeDraft?.()}
              sx={{ color: "#c9a0e8" }}
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancel shape (Esc)">
            <IconButton
              aria-label="cancel shape"
              size="small"
              onClick={() => onCancelShapeDraft?.()}
              sx={{ color: "#ccc" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography component="span" sx={{ fontSize: "0.68rem", color: "#bbb", userSelect: "none" }}>
            Apply or cancel
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
