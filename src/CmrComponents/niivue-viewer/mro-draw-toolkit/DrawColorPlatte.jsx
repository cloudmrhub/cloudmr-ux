/**
 * Color palette for pen/shape ROI tools. Freehand and polyline each use their own
 * toolbar button and pass `penToolKind` to show the matching options.
 */
import { Stack, IconButton, Tooltip, Typography, Box } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { BrushSizeSlider } from "./BrushSizeSlider";

const FILLED_COLORS = [
  { sx: { color: "red" }, glow: "rgba(255, 72, 72, 0.55)" },
  { sx: { color: "green" }, glow: "rgba(72, 200, 72, 0.55)" },
  { sx: { color: "blue" }, glow: "rgba(72, 140, 255, 0.55)" },
  { sx: { color: "yellow" }, glow: "rgba(255, 220, 72, 0.5)" },
  { sx: { color: "cyan" }, glow: "rgba(72, 220, 255, 0.55)" },
  { sx: { color: "#e81ce8" }, glow: "rgba(232, 28, 232, 0.5)" },
];

/** Soft halo that hugs the circular icon shape (drop-shadow, not box-shadow). */
function swatchGlowFilter(glow, { active = false, hover = false } = {}) {
  if (active) {
    return `drop-shadow(0 0 1px ${glow}) drop-shadow(0 0 4px ${glow}) drop-shadow(0 0 8px rgba(255, 255, 255, 0.12))`;
  }
  if (hover) {
    return `drop-shadow(0 0 2px rgba(255, 255, 255, 0.28))`;
  }
  return "none";
}

const ACTION_FONT_SIZE = "0.75rem";
const ACTION_ICON_SIZE = "0.875rem";

function DeleteDraftRow({ ariaLabel, draftKind, onClick }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      sx={{ px: 1, py: 0.5, borderTop: "1px solid #555", width: "100%" }}
    >
      <Tooltip title="Delete this ROI drawing">
        <Box
          component="button"
          type="button"
          aria-label={ariaLabel}
          data-testid={`roi-palette-delete-${draftKind}-draft`}
          onClick={onClick}
          sx={{
            color: "#f44336",
            fontSize: ACTION_FONT_SIZE,
            fontFamily: "inherit",
            fontWeight: 500,
            textTransform: "none",
            border: 0,
            background: "transparent",
            cursor: "pointer",
            m: 0,
            p: "2px 6px",
            minHeight: 0,
            borderRadius: "4px",
            display: "inline-flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            lineHeight: 1,
            verticalAlign: "middle",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.06)",
            },
            "& .MuiSvgIcon-root": {
              fontSize: ACTION_ICON_SIZE,
              width: "1em",
              height: "1em",
              display: "block",
              flexShrink: 0,
            },
          }}
        >
          <DeleteOutlineIcon />
          <Box
            component="span"
            sx={{
              display: "flex",
              alignItems: "center",
              lineHeight: 1,
              height: ACTION_ICON_SIZE,
            }}
          >
            Delete
          </Box>
        </Box>
      </Tooltip>
    </Stack>
  );
}

export default function DrawColorPlatte({
  expanded,
  updateDrawPen,
  setDrawingEnabled,
  /** @type {"freehand" | "polyline" | null} */
  penToolKind = null,
  /** Currently active pen value (1–6); used to highlight the selected swatch. */
  currentPenValue = 1,
  polylineVertexCount = 0,
  penDraftActive = false,
  penDraftKind,
  onDeletePenDraft,
  brushSize = 1,
  updateBrushSize,
  shapeDraftActive = false,
  onDeleteShapeDraft,
}) {
  const isFreehandTool = penToolKind === "freehand";
  const isPolylineTool = penToolKind === "polyline";

  return (
    <Stack
      aria-hidden={!expanded}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: expanded ? 1500 : 0,
        border: `${expanded ? "1px" : 0} solid #bbb`,
        maxWidth: expanded ? 320 : 0,
        minWidth: expanded ? 240 : 0,
        overflow: expanded ? "visible" : "hidden",
        pointerEvents: expanded ? "auto" : "none",
        visibility: expanded ? "visible" : "hidden",
        borderRadius: "16px",
        borderTopLeftRadius: "6pt",
        borderTopRightRadius: "6pt",
        background: "#333",
      }}
      direction="column"
      spacing={0.5}
      sx={{ py: expanded ? 0.5 : 0 }}
    >
      {!expanded ? null : (
      <>
      {(isFreehandTool || isPolylineTool) && updateBrushSize && (
        <BrushSizeSlider
          label="Line thickness"
          brushSize={brushSize}
          updateBrushSize={updateBrushSize}
        />
      )}

      <Stack direction="row" sx={{ px: 0.25 }}>
        {FILLED_COLORS.map((color, index) => {
          const penValue = index + 1;
          const isActive = penValue === (currentPenValue & 7);
          return (
            <IconButton
              key={index}
              aria-label={`Color ${penValue}`}
              aria-pressed={isActive}
              onClick={() => {
                updateDrawPen({ target: { value: penValue } });
                setDrawingEnabled(true);
              }}
              sx={{
                p: "6px",
                borderRadius: "50%",
                boxShadow: "none",
                transition: "background-color 0.15s ease",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                },
                "& .color-swatch": {
                  fontSize: "1.2rem",
                  display: "block",
                  transition: "filter 0.18s ease",
                  filter: swatchGlowFilter(color.glow, { active: isActive }),
                },
                "&:hover .color-swatch": {
                  filter: swatchGlowFilter(color.glow, {
                    active: isActive,
                    hover: !isActive,
                  }),
                },
              }}
            >
              <FiberManualRecordIcon className="color-swatch" sx={color.sx} />
            </IconButton>
          );
        })}
      </Stack>

      {isPolylineTool && (
        <Typography sx={{ px: 1, pb: 0.5, fontSize: "0.68rem", color: "#aaa", userSelect: "none" }}>
          {polylineVertexCount >= 3
            ? "Double-click to close & fill"
            : "Click to add vertices"}
        </Typography>
      )}

      {penDraftActive &&
        ((isFreehandTool && penDraftKind === "freehand") ||
          (isPolylineTool && penDraftKind === "polyline")) && (
        <DeleteDraftRow
          ariaLabel="delete pen draft"
          draftKind="pen"
          onClick={() => onDeletePenDraft?.()}
        />
      )}

      {shapeDraftActive && (
        <DeleteDraftRow
          ariaLabel="delete shape draft"
          draftKind="shape"
          onClick={() => onDeleteShapeDraft?.()}
        />
      )}
      </>
      )}
    </Stack>
  );
}
