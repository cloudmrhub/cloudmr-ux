import React, { ChangeEvent, Fragment, useState } from 'react'
import { Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Menu, Stack, SvgIconProps, Switch, TextField, Tooltip, Typography } from "@mui/material"
import { IconButton, FormControl, Select, MenuItem, InputLabel } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import { ROI } from "../../core/features/rois/roiTypes";
import HomeIcon from '@mui/icons-material/Home';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import ZoomInMapIcon from '@mui/icons-material/ZoomInMap';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import DeleteIcon from "@mui/icons-material/Delete";
import CmrConfirmation from "../dialogue/Confirmation";
import CmrLabel from "../label/Label";
import axios from "axios";
import { resolveNiivueAccentColor, useNiivueViewerTheme } from "./NiivueViewerThemeContext";

interface ToolbarProps {
  nv: any;
  nvUpdateSliceType: any;
  sliceType: string;
  /** When true, only axial orientation is valid (e.g. noise covariance / coefficients). */
  axialOnlyView?: boolean;
  /** When true, only absolute display mode is valid (e.g. SNR, g-factor maps). */
  absoluteOnlyView?: boolean;
  toggleLayers: React.MouseEventHandler<HTMLButtonElement> | undefined;
  toggleSettings: React.MouseEventHandler<HTMLButtonElement> | undefined;
  volumes: { url: string, name: string, alias: string }[];
  selectedVolume: number;
  setSelectedVolume: (index: number) => void;
  showColorBar: boolean;
  toggleColorBar: () => void;
  rois: ROI[];
  selectedROI: number;
  setSelectedROI: (selected: number) => void;
  refreshROI: () => void;
  showCrosshair: boolean;
  toggleShowCrosshair: () => void;
  dragMode: string,
  setDragMode: (dragMode: string) => void;
  radiological: boolean;
  toggleRadiological: () => void;
  saveROI: (callback: () => void, preSaving: () => void) => void;
  complexMode: string;
  setComplexMode: (complexMode: string) => void;
  complexOptions: string[];

  labelsVisible: boolean;
  toggleLabelsVisible: () => void;

  saving: boolean;
  setSaving: (saving: boolean) => void;

  drawingChanged: boolean;

  resampleImage?: () => void;

  /** Bearer token for authenticated ROI delete */
  accessToken: string | undefined;
  /** Current pipeline id (for ROI refresh after delete/save) */
  pipelineId: string | undefined;
  /** Full URL for ROI DELETE API */
  roiDeleteUrl: string;
  /** Refetch ROI list after server mutation */
  refreshPipelineRois: () => Promise<void>;

  /** Crosshair color as RGBA 0–1 array, e.g. [1, 1, 0, 1]. */
  crosshairColor?: number[];
  /** Crosshair opacity 0–1. */
  crosshairOpacity?: number;
  /** Crosshair width in pixels. */
  crosshairSize?: number;
  onCrosshairColorChange?: (rgb01: number[], opacity: number) => void;
  onCrosshairOpacityChange?: (opacity: number) => void;
  onCrosshairSizeChange?: (size: number) => void;

  /** Background color as RGBA 0–1 array. */
  backgroundColor?: number[];
  onBackgroundColorChange?: (rgb01: number[]) => void;

  /** Orientation / slice label (font) color as RGBA 0–1 array. */
  labelColor?: number[];
  onLabelColorChange?: (rgb01: number[]) => void;
}

export default function Toolbar(props: ToolbarProps) {
  const { saving, setSaving } = props;
  const viewerTheme = useNiivueViewerTheme();
  const accentColor = resolveNiivueAccentColor(undefined, viewerTheme);
  function handleSliceTypeChange(e: { target: { value: any } }) {
    const newSliceType = e.target.value;
    if (props.axialOnlyView && newSliceType !== "axial") return;
    props.nvUpdateSliceType(newSliceType);
  }

  // let dragModes = ["Pan","Measurement","Contrast",'None'];
  let dragModes = [
    { value: "pan", label: "Zoom and Pan" },
    { value: "measurement", label: "Slice and Measurement" },
    { value: "contrast", label: "Slice and Contrast" },
    { value: "none", label: "Slice and None" }
  ];
  const displayModes = ["absolute", "real", "imaginary", "phase"];

  const [zoomText, setZoomText] = useState('');
  const zoomEditingRef = React.useRef(false);

  /** Compute the base pixels-per-mm at zoom=1.0, reading live canvas + volume state. */
  const getBasePxPerMm = (): number | null => {
    const nv = props.nv;
    const canvas = nv?.gl?.canvas as HTMLCanvasElement | undefined;
    const back = nv?.back;
    if (!canvas || !back?.dims || !back?.pixDims) return null;
    const imgWmm = back.dims[1] * Math.abs(back.pixDims[1]);
    const imgHmm = back.dims[2] * Math.abs(back.pixDims[2]);
    if (imgWmm <= 0 || imgHmm <= 0) return null;
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    return Math.min(w / imgWmm, h / imgHmm);
  };

  /** Returns the display value (number only, no unit suffix). */
  const formatPxPerMm = (): string => {
    const zoom = props.nv?.scene?.pan2Dxyzmm?.[3];
    if (zoom == null) return '';
    const base = getBasePxPerMm();
    if (base != null && base > 0) return (base * zoom).toFixed(2);
    return (zoom * 100).toFixed(0);
  };

  React.useEffect(() => {
    let rafId: number;
    const sync = () => {
      if (!zoomEditingRef.current) setZoomText(formatPxPerMm());
      rafId = requestAnimationFrame(sync);
    };
    rafId = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(rafId);
  }, [props.nv]);

  const applyZoom = (text: string) => {
    const num = parseFloat(text.trim());
    if (isNaN(num) || num <= 0) return;
    const base = getBasePxPerMm();
    const targetZoom = (base != null && base > 0) ? num / base : num / 100;
    const scene = props.nv.scene;
    const current = scene.pan2Dxyzmm[3];
    const next = Math.max(0.01, targetZoom);
    const delta = current - next;
    scene.pan2Dxyzmm[3] = next;
    const mm = props.nv.frac2mm(scene.crosshairPos);
    scene.pan2Dxyzmm[0] += delta * mm[0];
    scene.pan2Dxyzmm[1] += delta * mm[1];
    scene.pan2Dxyzmm[2] += delta * mm[2];
    props.nv.drawScene();
  };

  const [roiDeleteOpen, setRoiDeleteOpen] = useState(false);
  const [roiDeleteMsg, setRoiDeleteMsg] = useState<string | undefined>(undefined);
  const [roiDeleteConfirm, setRoiDeleteConfirm] = useState<() => void>(() => () => { });

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftColorHex, setDraftColorHex] = useState('#ffff00');
  const [draftOpacity, setDraftOpacity] = useState(1);
  const [draftSize, setDraftSize] = useState(1);
  const [draftBackColorHex, setDraftBackColorHex] = useState('#000000');
  const [draftLabelColorHex, setDraftLabelColorHex] = useState('#00ef5e');

  function rgb01ToHex(rgba: number[]): string {
    const r = Math.round((rgba[0] ?? 1) * 255);
    const g = Math.round((rgba[1] ?? 1) * 255);
    const b = Math.round((rgba[2] ?? 1) * 255);
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  }

  function hexToRgb01(hex: string): number[] {
    return [
      parseInt(hex.substring(1, 3), 16) / 255,
      parseInt(hex.substring(3, 5), 16) / 255,
      parseInt(hex.substring(5, 7), 16) / 255,
    ];
  }

  function openSettingsDialog() {
    const color = props.crosshairColor ?? [1, 1, 0, 1];
    setDraftColorHex(rgb01ToHex(color));
    // Prefer alpha from the color array so it stays in sync after a color+opacity save
    setDraftOpacity(color[3] ?? props.crosshairOpacity ?? 1);
    setDraftSize(props.crosshairSize ?? 1);
    setDraftBackColorHex(rgb01ToHex(props.backgroundColor ?? [0, 0, 0, 1]));
    setDraftLabelColorHex(rgb01ToHex(props.labelColor ?? [0, 0.94, 0.37, 1]));
    setSettingsOpen(true);
  }

  function handleSettingsSave() {
    // Apply color + opacity in one call. Calling opacity separately would
    // overwrite with a stale crosshairColor from the React closure.
    const rgb = hexToRgb01(draftColorHex);
    props.onCrosshairColorChange?.(rgb, draftOpacity);
    props.onCrosshairSizeChange?.(draftSize);
    props.onBackgroundColorChange?.(hexToRgb01(draftBackColorHex));
    props.onLabelColorChange?.(hexToRgb01(draftLabelColorHex));
    setSettingsOpen(false);
  }


  // const deleteROI= createAsyncThunk('DeleteROI', async (arg: { accessToken: string, jobId: string }) => {
  //     // const data = { jobId: arg.jobId }; // No need to stringify, axios will handle it
  //     const config = {
  //         headers: {
  //             'Content-Type': 'application/json',
  //             'Authorization': `Bearer ${arg.accessToken}`
  //         },
  //         params: {
  //             id: arg.jobId // Send jobId as a query parameter
  //         }
  //     };
  //     const response = await axios.delete(`${JOBS_DELETE_API}`, config);
  //     console.log(response);
  //     if (response.status == 200)
  //         getUpstreamJobs(arg.accessToken);
  // });


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {props.volumes[props.selectedVolume] != undefined && <Fragment>
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            flexDirection: 'row',
            justifyItems: 'left',
            alignItems: 'center',
            backgroundColor: 'white',
            flexWrap: 'wrap',
          }}
        >

          {/* Temporarily hide hamburger side menu */}
          {/* <IconButton
                        size={'small'}
                        onClick={props.toggleLayers}
                    >
                        <MenuIcon/>
                    </IconButton> */}

          <FormControl
            size='small'
            sx={{
              m: 2,
              minWidth: 120
            }}>
            <InputLabel id="slice-type-label">Opened Volume</InputLabel>
            <Select
              labelId="slice-type-label"
              id="slice-type"
              value={props.selectedVolume}
              label="Opened Volume"
              onChange={(e) => props.setSelectedVolume(Number(e.target.value))}
            >
              {props.volumes.map((value, index) => {
                return <MenuItem value={index}>{value.alias}</MenuItem>;
              })}
            </Select>
          </FormControl>
          <FormControl
            size='small'
            sx={{
              m: 2,
              minWidth: 120
            }}>
            <InputLabel id="slice-type-label">Orientation</InputLabel>
            <Select
              labelId="slice-type-label"
              id="slice-type"
              value={props.sliceType}
              label="Orientation"
              onChange={handleSliceTypeChange}
            >
              <MenuItem value={'axial'}>Axial</MenuItem>
              <MenuItem value={'coronal'} disabled={props.axialOnlyView}>Coronal</MenuItem>
              <MenuItem value={'sagittal'} disabled={props.axialOnlyView}>Sagittal</MenuItem>
              <MenuItem value={'multi'} disabled={props.axialOnlyView}>Multi</MenuItem>
              <MenuItem value={'3d'} disabled={props.axialOnlyView}>3D</MenuItem>
            </Select>
          </FormControl>

          <FormControl
            size='small'
            sx={{
              m: 2,
              minWidth: 180
            }}>
            <InputLabel id="drag-mode-label">Scroll and Right Click Drag</InputLabel>
            <Select
              labelId="drag-mode-label"
              id="drag-mode"
              value={props.dragMode}
              label="Scroll and Right Click Drag"
              onChange={e => {
                console.log(e.target.value);
                props.setDragMode(e.target.value);
              }}
            >
              {dragModes.map((mode, index) => (
                <MenuItem key={index} value={mode.value}>
                  {mode.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            size='small'
            sx={{
              m: 2,
              minWidth: 120
            }}>
            <InputLabel id="slice-type-label">Display Mode</InputLabel>
            <Select
              labelId="slice-type-label"
              id="slice-type"
              value={props.complexMode}
              label="Display Mode"
              onChange={(e) => {
                const next = e.target.value;
                if (props.absoluteOnlyView && next !== "absolute") return;
                if (!props.complexOptions.includes(next)) return;
                props.setComplexMode(next);
              }}
            >
              {displayModes.map(value => {
                const unavailable = !props.complexOptions.includes(value);
                const absoluteOnlyLocked = props.absoluteOnlyView && value !== "absolute";
                return (
                  <MenuItem
                    key={value}
                    value={value}
                    disabled={unavailable || absoluteOnlyLocked}
                  >
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>


          <FormControl size="small" sx={{ m: 2, minWidth: 160 }}>
            <InputLabel id="roi-layer-label">ROI Layer</InputLabel>
            <Select
              labelId="roi-layer-label"
              id="roi-layer"
              value={props.selectedROI}
              label="Opened ROIs"
              // Only text in the closed preview (no icon)
              renderValue={(selected) => {
                // handle no selection or invalid index
                if (selected === undefined || selected === null || isNaN(Number(selected))) {
                  return '';
                }
                const idx = Number(selected);
                return props.rois?.[idx]?.filename ?? '';
              }}
              MenuProps={{
                // optional: nicer menu width to fit long names + icon
                PaperProps: { sx: { minWidth: 280 } },
              }}
            >
              {props.rois.map((value, index) => (
                <MenuItem
                  key={index}
                  value={index}
                  onClick={() => props.setSelectedROI(Number(index))}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {value.filename}
                  </Box>

                  {/* Icon appears only inside the dropdown menu */}
                  <IconButton
                    size="small"
                    // prevent selecting/closing when clicking the icon
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoiDeleteMsg(`You are about to delete “${value.filename}”`);
                      setRoiDeleteConfirm(() => {
                        return async () => {
                          try {
                            // Make delete call to the endpoint
                            await axios.delete(props.roiDeleteUrl, {
                              headers: {
                                Authorization: `Bearer ${props.accessToken}`,
                              },
                              data: {
                                roi_id: value.id,
                              },
                            });

                            if (props.pipelineId) {
                              await props.refreshPipelineRois();
                            }

                            // Clear client drawing if we just deleted the applied ROI
                            if (props.selectedROI === index) {
                              props.nv.closeDrawing();
                              props.nv.drawScene?.();
                            }

                            // Always refresh the histogram + ROI table after any deletion
                            props.resampleImage?.();

                            console.log(`Deleted ROI: ${value.filename}`);
                          } catch (error) {
                            console.error("Failed to delete ROI:", error);
                          }
                        };
                      });
                      setRoiDeleteOpen(true);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>

                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <CmrConfirmation
            name="Delete ROI Layer"
            message={roiDeleteMsg}
            open={roiDeleteOpen}
            setOpen={setRoiDeleteOpen}
            cancellable={true}
            cancelText="Cancel"
            confirmText="Delete"
            color="error"
            confirmCallback={() => {
              roiDeleteConfirm();
            }}
          />

          <Button variant={'contained'}
            disabled={!props.drawingChanged}
            endIcon={saving && <CircularProgress sx={{ color: 'white' }} size={20} />}
            onClick={() => {
              if (saving)
                return;
              props.saveROI(async () => {
                if (props.pipelineId)
                  await props.refreshPipelineRois();
                setSaving(false);
              }, () => {
                setSaving(true);
              });
            }}>
            Save Drawing Layer
          </Button>
          {/* Temporarily hide Niivue side-menu gear (opens SettingsPanel). Keep for reference until fully removed. */}
          {/* <IconButton
            onClick={props.toggleSettings}
            style={{ marginLeft: 'auto' }}
          >
            <SettingsIcon />
          </IconButton> */}
          <Box style={{ marginLeft: 'auto' }} />
        </Box>
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            flexDirection: 'row',
            justifyItems: 'left',
            alignItems: 'center',
            backgroundColor: 'white',
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center'
            }}
            m={1}
          >
            <Typography
              style={{
                marginRight: 'auto'
              }}
            >
              Neurological
            </Typography>
            <Switch
              defaultChecked={false}
              checked={!props.radiological}
              onChange={props.toggleRadiological}
              sx={viewerTheme.muiSwitchSx}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center'
            }}
            m={1}
          >
            <Typography
              style={{
                marginRight: 'auto'
              }}
            >
              Show Crosshair
            </Typography>
            <Switch
              defaultChecked={true}
              checked={props.showCrosshair}
              onChange={props.toggleShowCrosshair}
              sx={viewerTheme.muiSwitchSx}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center'
            }}
            m={1}
          >
            <Typography
              style={{
                marginRight: 'auto'
              }}
            >
              Show Color Bar
            </Typography>
            <Switch
              checked={props.showColorBar}
              onChange={props.toggleColorBar}
              sx={viewerTheme.muiSwitchSx}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center'
            }}
            m={1}
          >
            <Typography
              style={{
                marginRight: 'auto'
              }}
            >
              Labels Visible
            </Typography>
            <Switch
              defaultChecked={false}

              checked={props.labelsVisible}
              onChange={props.toggleLabelsVisible}
              sx={viewerTheme.muiSwitchSx}
            />
          </Box>

          <Tooltip title="Settings">
            <IconButton size="small" onClick={openSettingsDialog} sx={{ mx: 0.5 }}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {/* Spacer pushes all view/zoom buttons to the far right */}
          <Box sx={{ flex: 1 }} />

          <Stack flexDirection={'row'} alignItems={'center'} sx={{ m: 2, gap: 0.5 }}>
            <Tooltip title={'Reset Views'} placement={'right'}>
              <IconButton onClick={() => props.nv.resetScene()}>
                <HomeIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={'Recenter Views'} placement={'right'}>
              <IconButton onClick={() => props.nv.recenter()}>
                <CenterFocusStrongIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={'Reset Zooms'} placement={'right'}>
              <IconButton onClick={() => props.nv.resetZoom()}>
                <ZoomInMapIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={'Zoom Out'} placement={'right'}>
              <IconButton
                onClick={() => {
                  const scene = props.nv.scene;
                  const current = scene.pan2Dxyzmm[3];
                  const next = Math.max(0.1, current - 0.1);
                  const delta = current - next;
                  scene.pan2Dxyzmm[3] = next;
                  const mm = props.nv.frac2mm(scene.crosshairPos);
                  scene.pan2Dxyzmm[0] += delta * mm[0];
                  scene.pan2Dxyzmm[1] += delta * mm[1];
                  scene.pan2Dxyzmm[2] += delta * mm[2];
                  props.nv.drawScene();
                }}
                size="small"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <TextField
              label="px/mm"
              size="small"
              value={zoomText}
              onChange={(e) => setZoomText(e.target.value)}
              onFocus={(e) => {
                zoomEditingRef.current = true;
                requestAnimationFrame(() => e.target.select());
              }}
              onBlur={() => {
                zoomEditingRef.current = false;
                applyZoom(zoomText);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                  zoomEditingRef.current = false;
                  setZoomText(formatPxPerMm());
                  (e.target as HTMLInputElement).blur();
                }
              }}
              sx={{
                width: 100,
                '& .MuiInputBase-input': {
                  textAlign: 'center',
                  fontSize: '0.8rem',
                },
              }}
            />
            <Tooltip title={'Zoom In'} placement={'right'}>
              <IconButton
                onClick={() => {
                  const scene = props.nv.scene;
                  const current = scene.pan2Dxyzmm[3];
                  const next = current + 0.1;
                  const delta = current - next;
                  scene.pan2Dxyzmm[3] = next;
                  const mm = props.nv.frac2mm(scene.crosshairPos);
                  scene.pan2Dxyzmm[0] += delta * mm[0];
                  scene.pan2Dxyzmm[1] += delta * mm[1];
                  scene.pan2Dxyzmm[2] += delta * mm[2];
                  props.nv.drawScene();
                }}
                size="small"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Fragment>}

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent dividers>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ "&:last-child": { paddingBottom: 2 } }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Background Settings
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CmrLabel style={{ fontSize: 14 }}>Color:</CmrLabel>
                <input
                  type="color"
                  value={draftBackColorHex}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDraftBackColorHex(e.target.value)}
                  style={{
                    width: 40,
                    height: 28,
                    padding: 0,
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ "&:last-child": { paddingBottom: 2 } }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Label Settings
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CmrLabel style={{ fontSize: 14 }}>Color:</CmrLabel>
                <input
                  type="color"
                  value={draftLabelColorHex}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDraftLabelColorHex(e.target.value)}
                  style={{
                    width: 40,
                    height: 28,
                    padding: 0,
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ "&:last-child": { paddingBottom: 2 } }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Crosshair Settings
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CmrLabel style={{ fontSize: 14 }}>Color:</CmrLabel>
                <input
                  type="color"
                  value={draftColorHex}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDraftColorHex(e.target.value)}
                  style={{
                    width: 40,
                    height: 28,
                    padding: 0,
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <CmrLabel style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>
                  Opacity: {draftOpacity.toFixed(1)}
                </CmrLabel>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={draftOpacity}
                  onChange={(e) => setDraftOpacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor }}
                />
              </Box>

              <Box>
                <CmrLabel style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>
                  Size: {draftSize}
                </CmrLabel>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={draftSize}
                  onChange={(e) => setDraftSize(Number(e.target.value))}
                  style={{ width: '100%', accentColor }}
                />
              </Box>
            </CardContent>
          </Card>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSettingsSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
}