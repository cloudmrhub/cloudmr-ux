import React, { ChangeEvent, Fragment, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Menu,
  Stack,
  SvgIconProps,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconButton,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { ROI } from "../../../../features/rois/roiTypes";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import { getPipelineROI } from "../../../../features/rois/resultActionCreation";
import HomeIcon from "@mui/icons-material/Home";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import ZoomInMapIcon from "@mui/icons-material/ZoomInMap";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Brightness6Icon from "@mui/icons-material/Brightness6";
import AutoGraph from "@mui/icons-material/AutoGraph";

interface ToolbarProps {
  nv: any;
  nvUpdateSliceType: any;
  sliceType: string;

  toggleLayers: React.MouseEventHandler<HTMLButtonElement> | undefined;
  toggleSettings: React.MouseEventHandler<HTMLButtonElement> | undefined;
  volumes: { url: string; name: string; alias: string }[];
  selectedVolume: number;
  setSelectedVolume: (index: number) => void;
  showColorBar: boolean;
  toggleColorBar: () => void;
  rois: ROI[];
  selectedROI: number | null;
  setSelectedROI: (selected: number) => void;
  refreshROI: () => void;
  verticalLayout?: boolean;
  toggleVerticalLayout?: () => void;
  showCrosshair: boolean;
  toggleShowCrosshair: () => void;
  dragMode: string;
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
}

export default function Toolbar(props: ToolbarProps) {
  const { saving, setSaving } = props;
  let dispatch = useAppDispatch();
  function handleSliceTypeChange(e: { target: { value: any } }) {
    let newSliceType = e.target.value;
    let nvUpdateSliceType = props.nvUpdateSliceType;
    nvUpdateSliceType(newSliceType);
  }

  // let dragModes = ["Pan", "Measurement", "Contrast", 'None'];
  const dragModes = [
    { label: "Pan and Zoom", value: "pan" },
    { label: "Measurement", value: "measurement" },
    { label: "Contrast", value: "contrast" },
    { label: "None", value: "none" },
  ];
  let pipeline = useAppSelector((state) => state.result.activeJob?.pipeline_id);

  // Display-only mapping. Does NOT mutate data.
  const VOLUME_LABELS: Record<string, string> = {
    // your requested labels
    materialdensity: "Tissue Density",
    "material density": "Tissue Density",
    bloodperfusion: "Blood Perfusion",
    heatcapacity: "Heat Capacity",
    thermalconductivity: "Thermal Conductivity",
    metabolismheat: "Metabolism Heat",
    sar: "SAR", // keep as is
    told: "Initial Temperature",
    finaltemperature: "Final Temperature", // keep as is
    "final temperature": "Final Temperature",
  };

  // normalize to be case/spacing/underscore-agnostic
  const norm = (s?: string) => (s ?? "").replace(/[\s_-]/g, "").toLowerCase();

  const getVolumeDisplay = (v: { alias?: string; name?: string }) =>
    VOLUME_LABELS[norm(v?.alias)] ??
    VOLUME_LABELS[norm(v?.name)] ??
    v?.alias ??
    v?.name ??
    "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {props.volumes[props.selectedVolume] != undefined && (
        <Fragment>
          <Box
            sx={{
              display: "flex",
              width: "100%",
              flexDirection: "row",
              justifyItems: "left",
              alignItems: "center",
              backgroundColor: "white",
              flexWrap: "wrap",
            }}
          >
            {/* Temporarily Hide Hamburger Menu */}
            {/* <IconButton
                        size={'small'}
                        onClick={props.toggleLayers}
                    >
                        <MenuIcon/>
                    </IconButton> */}

            <FormControl
              size="small"
              sx={{
                m: 2,
                minWidth: 120,
              }}
            >
              <InputLabel id="slice-type-label">Opened Volume</InputLabel>
              <Select
                labelId="slice-type-label"
                id="slice-type"
                value={props.selectedVolume}
                label="Opened Volume"
                onChange={(e) =>
                  props.setSelectedVolume(Number(e.target.value))
                }
                renderValue={(i) =>
                  getVolumeDisplay(props.volumes[i as number])
                }
              >
                {props.volumes.map((value, index) => {
                  return (
                    <MenuItem value={index} key={index}>
                      {/* {value.alias} */}
                      {getVolumeDisplay(value)}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <FormControl
              size="small"
              sx={{
                m: 2,
                minWidth: 120,
              }}
            >
              <InputLabel id="slice-type-label">Display Mode</InputLabel>
              <Select
                labelId="slice-type-label"
                id="slice-type"
                value={props.sliceType}
                label="Display Mode"
                onChange={handleSliceTypeChange}
              >
                <MenuItem key={"axial"} value={"axial"}>
                  Axial
                </MenuItem>
                <MenuItem key={"coronal"} value={"coronal"}>
                  Coronal
                </MenuItem>
                <MenuItem key={"sagittal"} value={"sagittal"}>
                  Sagittal
                </MenuItem>
                <MenuItem key={"multi"} value={"multi"}>
                  Multi
                </MenuItem>
                <MenuItem key={"3d"} value={"3d"}>
                  3D
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl
              size="small"
              sx={{
                m: 2,
                minWidth: 120,
              }}
            >
              <InputLabel id="drag-mode-label">Drag Mode</InputLabel>
              <Select
                labelId="drag-mode-label"
                id="drag-mode"
                value={props.dragMode} // e.g., "pan"
                label="Drag Mode"
                onChange={(e) => props.setDragMode(e.target.value as string)}
              >
                {dragModes.map((m, idx) => (
                  <MenuItem key={idx} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
              {/* <Select
                            labelId="drag-mode-label"
                            id="drag-mode"
                            value={props.dragMode}
                            label="Display mode"
                            onChange={e => {
                                console.log(e.target.value);
                                props.setDragMode(e.target.value);
                            }}
                        >
                            {dragModes.map((value, index) =>
                                <MenuItem key={index} value={value.toLowerCase()}>
                                    {value}
                                </MenuItem>
                            )}
                        </Select> */}
            </FormControl>

            <FormControl
              size="small"
              sx={{
                m: 2,
                minWidth: 120,
              }}
            >
              <InputLabel id="slice-type-label">Complex Mode</InputLabel>
              <Select
                labelId="slice-type-label"
                id="slice-type"
                value={props.complexMode}
                label="Opened ROIs"
                onChange={(e) => props.setComplexMode(e.target.value)}
              >
                {props.complexOptions.map((value, idx) => {
                  return (
                    <MenuItem key={idx} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <FormControl
              size="small"
              sx={{
                m: 2,
                minWidth: 120,
              }}
            >
              <InputLabel id="slice-type-label">ROI Layer</InputLabel>
              <Select
                labelId="slice-type-label"
                id="slice-type"
                value={props.selectedROI !== null ? props.selectedROI : ""}
                label="Opened ROIs"
                // onChange={(e)=>}
              >
                {props.rois.map((value, index) => {
                  return (
                    <MenuItem
                      key={index}
                      value={index}
                      onClick={() => props.setSelectedROI(Number(index))}
                    >
                      {value.filename}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <Button
              variant={"contained"}
              endIcon={
                saving && <CircularProgress sx={{ color: "white" }} size={20} />
              }
              onClick={() => {
                if (saving) return;
                props.saveROI(
                  async () => {
                    if (pipeline) await dispatch(getPipelineROI({ pipeline }));
                    setSaving(false);
                  },
                  () => {
                    setSaving(true);
                  },
                );
              }}
            >
              Save Drawing Layer
            </Button>
            <IconButton
              onClick={props.toggleSettings}
              style={{ marginLeft: "auto" }}
            >
              <SettingsIcon />
            </IconButton>
          </Box>
          <Box
            sx={{
              display: "flex",
              width: "100%",
              flexDirection: "row",
              justifyItems: "left",
              alignItems: "center",
              backgroundColor: "white",
              flexWrap: "wrap",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
              }}
              m={1}
            >
              <Typography
                style={{
                  marginRight: "auto",
                }}
              >
                Neurological
              </Typography>
              <Switch
                checked={!props.radiological}
                onChange={props.toggleRadiological}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
              }}
              m={1}
            >
              <Typography
                style={{
                  marginRight: "auto",
                }}
              >
                Show Crosshair
              </Typography>
              <Switch
                checked={props.showCrosshair}
                onChange={props.toggleShowCrosshair}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
              }}
              m={1}
            >
              <Typography
                style={{
                  marginRight: "auto",
                }}
              >
                Show Color Bar
              </Typography>
              <Switch
                checked={props.showColorBar}
                onChange={props.toggleColorBar}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
              }}
              m={1}
            >
              <Typography
                style={{
                  marginRight: "auto",
                }}
              >
                Labels Visible
              </Typography>
              <Switch
                checked={props.labelsVisible}
                onChange={props.toggleLabelsVisible}
              />
            </Box>

            <Stack flexDirection={"row"} sx={{ m: 2 }}>
              <Tooltip title={"Reset Views"} placement={"right"}>
                <IconButton onClick={() => props.nv.resetScene()}>
                  <HomeIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={"Recenter Views"} placement={"right"}>
                <IconButton onClick={() => props.nv.recenter()}>
                  <CenterFocusStrongIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={"Reset Zooms"} placement={"right"}>
                <IconButton onClick={() => props.nv.resetZoom()}>
                  <ZoomInMapIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={"Reset Gamma"} placement={"right"}>
                <IconButton
                  onClick={() => {
                    props.nv.setGamma(1.0); // engine reset
                    props.nv.onResetGamma?.(); // UI reset: bumps gammaKey + sets gamma=1.0
                    // props.nv.resetContrast();
                  }}
                >
                  <AutoGraph />
                </IconButton>
              </Tooltip>
              <Tooltip title={"Reset Contrast"} placement={"right"}>
                <IconButton onClick={() => props.nv.resetContrast()}>
                  <Brightness6Icon />
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Spacer pushes zoom buttons to the far right */}
            <Box sx={{ flex: 1 }} />

            <Stack
              flexDirection={"row"}
              alignItems={"center"}
              sx={{ m: 2, gap: 0.5 }}
            >
              <Tooltip title={"Zoom Out"} placement={"right"}>
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
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={"Zoom In"} placement={"right"}>
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
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Fragment>
      )}
    </Box>
  );
}
