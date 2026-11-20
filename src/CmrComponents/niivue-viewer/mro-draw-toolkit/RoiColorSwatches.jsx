/**
 * ROI colour swatches: the user's palette (label 1 = default colour, everything else added with
 * the "+" custom colour picker) plus an inline picker (gradient + hue + hex/RGB inputs), in the
 * spirit of the "Custom" colour option in Google Docs.
 *
 * The palette itself lives in the Niivue patcher (`nv.getRoiPalette()`); this component only
 * renders it and asks `onAddColor(hex)` for a new label (1..255).
 */
import { useState } from "react";
import { Stack, IconButton, Tooltip, Typography, Box, Button } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import AddIcon from "@mui/icons-material/Add";
import { ChromePicker } from "react-color";
import { DEFAULT_ROI_COLOR, MAX_ROI_LABEL, hexToRgb } from "../roiLabelModel";

const DEFAULT_PALETTE = [{ label: 1, color: DEFAULT_ROI_COLOR }];
const INITIAL_CUSTOM_COLOR = "#3366cc";

/**
 * True while the user is dragging inside the colour picker. A drag that is released outside the
 * picker produces a `click` on a common ancestor, which MUI ClickAwayListener would treat as a
 * click-away (closing the palette and deactivating the tool). Toolkits consult this flag.
 */
export const roiColorPickerInteraction = { active: false };

function beginPickerInteraction() {
  roiColorPickerInteraction.active = true;
  const end = () => {
    window.removeEventListener("mouseup", end);
    window.removeEventListener("touchend", end);
    // the synthetic click fires right after mouseup; clear the flag after it has been handled
    setTimeout(() => {
      roiColorPickerInteraction.active = false;
    }, 100);
  };
  window.addEventListener("mouseup", end);
  window.addEventListener("touchend", end);
}

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

function glowFromHex(hex, alpha = 0.55) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function RoiColorSwatches({
  /** @type {{ label: number, color: string }[]} */
  palette = DEFAULT_PALETTE,
  /** Currently selected label (1..255). */
  currentLabel = 1,
  /** Called with the label when a swatch (or a freshly added colour) is chosen. */
  onSelect,
  /** (hex) => label | null. When omitted the "+" button is hidden. */
  onAddColor,
  /** (label) => boolean. When omitted, right-click removal is disabled. */
  onRemoveColor,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Swatch the user right-clicked, awaiting "Remove" confirmation. */
  const [removeTarget, setRemoveTarget] = useState(null);
  const [pending, setPending] = useState(INITIAL_CUSTOM_COLOR);
  const entries = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;
  const paletteFull = entries.length >= MAX_ROI_LABEL;

  // the confirmation only makes sense while that colour still exists
  const pendingRemoval = removeTarget
    ? entries.filter((e) => e.label === removeTarget)[0] || null
    : null;

  const handleRemove = () => {
    if (removeTarget !== null) {
      onRemoveColor?.(removeTarget);
    }
    // on success the swatch is gone; on refusal the viewer already explained why
    setRemoveTarget(null);
  };

  const handleAdd = () => {
    const label = onAddColor?.(pending);
    if (label !== null && label !== undefined) {
      onSelect?.(label);
      setPickerOpen(false);
    }
  };

  return (
    <>
      <Stack
        direction="row"
        data-testid="roi-color-swatches"
        sx={{
          px: 0.25,
          flexWrap: "wrap",
          maxHeight: 160,
          overflowY: "auto",
        }}
      >
        {entries.map((entry) => {
          const isActive = entry.label === currentLabel;
          const glow = glowFromHex(entry.color);
          return (
            <IconButton
              key={entry.label}
              aria-label={`Color ${entry.label}`}
              aria-pressed={isActive}
              title={entry.label === 1 ? "Default color" : entry.color}
              onClick={() => onSelect?.(entry.label)}
              onContextMenu={(event) => {
                // right-click (or long-press) a custom colour to remove it; default colour is fixed
                if (!onRemoveColor || entry.label === 1) {
                  return;
                }
                event.preventDefault();
                setRemoveTarget(entry.label);
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
                  filter: swatchGlowFilter(glow, { active: isActive }),
                },
                "&:hover .color-swatch": {
                  filter: swatchGlowFilter(glow, { active: isActive, hover: !isActive }),
                },
              }}
            >
              <FiberManualRecordIcon className="color-swatch" sx={{ color: entry.color }} />
            </IconButton>
          );
        })}
      </Stack>

      {onAddColor && (
        <Stack direction="row" alignItems="center" sx={{ px: 0.25 }}>
          <Tooltip title={paletteFull ? `All ${MAX_ROI_LABEL} colors are in use` : "Add custom color"}>
            <span>
              <IconButton
                aria-label="add custom color"
                aria-expanded={pickerOpen}
                disabled={paletteFull}
                onClick={() => setPickerOpen((open) => !open)}
                sx={{
                  p: "6px",
                  color: "#ddd",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.06)" },
                }}
              >
                <Box
                  sx={{
                    width: "1.2rem",
                    height: "1.2rem",
                    borderRadius: "50%",
                    border: "1px solid #bbb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pickerOpen ? "rgba(255, 255, 255, 0.12)" : "transparent",
                  }}
                >
                  <AddIcon sx={{ fontSize: "0.95rem" }} />
                </Box>
              </IconButton>
            </span>
          </Tooltip>
          <Typography sx={{ fontSize: "0.75rem", color: "#ccc", userSelect: "none" }}>
            Custom color
          </Typography>
        </Stack>
      )}

      {onAddColor && pickerOpen && (
        <Box
          data-testid="roi-custom-color-picker"
          onMouseDownCapture={beginPickerInteraction}
          onTouchStartCapture={beginPickerInteraction}
          sx={{ px: 1, pb: 0.5 }}
        >
          <ChromePicker
            color={pending}
            disableAlpha
            onChange={(c) => setPending(c.hex)}
            styles={{
              default: {
                picker: { width: "100%", boxShadow: "none", boxSizing: "border-box" },
              },
            }}
          />
          <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ pt: 0.75 }}>
            <Button
              size="small"
              onClick={() => setPickerOpen(false)}
              sx={{ color: "#ccc", textTransform: "none", minWidth: 0 }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleAdd}
              sx={{ textTransform: "none", minWidth: 0 }}
            >
              Add
            </Button>
          </Stack>
        </Box>
      )}

      {onRemoveColor && (entries.length > 1 || pendingRemoval) && (
        <Box
          data-testid={pendingRemoval ? "roi-color-remove-confirm" : "roi-color-remove-hint"}
          sx={{
            px: 1,
            py: 0.5,
            borderTop: "1px solid #555",
          }}
        >
          {pendingRemoval ? (
            <Stack spacing={0.25}>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <FiberManualRecordIcon sx={{ color: pendingRemoval.color, fontSize: "1rem" }} />
                <Typography sx={{ fontSize: "0.75rem", color: "#ddd", userSelect: "none" }}>
                  Remove this color?
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Button
                  size="small"
                  onClick={() => setRemoveTarget(null)}
                  sx={{ color: "#ccc", textTransform: "none", minWidth: 0 }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  onClick={handleRemove}
                  sx={{ color: "#f44336", textTransform: "none", minWidth: 0 }}
                >
                  Remove
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Typography sx={{ fontSize: "0.68rem", color: "#888", userSelect: "none" }}>
              Right-click a color to remove
            </Typography>
          )}
        </Box>
      )}
    </>
  );
}
