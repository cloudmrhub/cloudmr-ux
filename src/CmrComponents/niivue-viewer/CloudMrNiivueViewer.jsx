import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { NVImage, DRAG_MODE } from '@niivue/niivue';
import { NI_PEN_TYPE } from './niivuePenType';
import { SettingsPanel } from './SettingsPanel';
import { NumberPicker } from './NumberPicker';
import { ColorPicker } from './ColorPicker';
import { LayersPanel } from './LayersPanel';
import {
  applyPenDraft,
  cancelPenDraft,
  captureFreehandDraft,
  fillPolylineDraft,
  unfillPolylineDraft,
  polylineDraftFromNv,
  redrawPolylineDraft,
  redrawFreehandDraft,
  syncPolylineDraftToNv,
  registerAppliedPolyline,
  collectPolylineAppliedVoxelIndices,
} from './penDraftUtils';
import {
  registerAppliedShape,
  updateShapeRegistryErosionState,
  removeShapeRegistryEntry,
  clearShapeRegistry,
  redrawDraftShape,
} from './shapeDraftUtils';
import { CloudMrNiivuePanel } from './CloudMrNiivuePanel';
import { Niivue, CLOUDMR_DEFAULT_VIEW_ZOOM } from './NiivuePatcher';
import NVSwitch from './Switch';
import Toolbar from './Toolbar';
import Layer from './Layer';
import './Niivue.css';
import CmrEditConfirmation from '../dialogue/EditConfirmation';
import CmrConfirmation from '../dialogue/Confirmation';
import { resampleNiivueRoiHistogram } from '../niivue-roi-histogram/resampleNiivueRoiHistogram';
import axios from "axios";
import JSZip from "jszip";
import { getMax, getMin } from "../../core/common/utilities";
import { AuthenticatedHttpClient, getEndpoints } from "../../core";
import { NiivueViewerThemeProvider } from './NiivueViewerThemeContext';

/**
 * @typedef {Object} CloudMrNiivueViewerProps
 * @property {any[]} niis
 * @property {number} selectedVolume
 * @property {(i: number) => void} setSelectedVolume
 * @property {any[]} rois
 * @property {string} pipelineID
 * @property {string} [accessToken]
 * @property {(msg: string) => void} [setWarning]
 * @property {(open: boolean) => void} [setWarningOpen]
 * @property {(fn: () => void) => void} [saveROICallback]
 * @property {string} roiDeleteUrl — full URL for `ROI_DELETE` (app resolves from env)
 * @property {() => Promise<void>} refreshPipelineRois — e.g. dispatch getPipelineROI
 * @property {() => any[]} getPipelineRois — returns current ROI list for pipeline (e.g. from Redux)
 * @property {string} [accentColor] — override viewer accent; else host MUI primary if set, else `#580f8b`
 * @property {number} [sliceCount] — number of acquired slices from job settings; forwarded to the Slice # slider
 */

export const nv = new Niivue({
  loadingText: '',
  isColorbar: true,
  isRadiologicalConvention: true,
  textHeight: 0.12,
  colorbarHeight: 0.03,
  dragMode: DRAG_MODE.pan,
  crosshairWidth: 0,
  // crosshairColor: [0.098,0.453,0.824]
  crosshairColor: [1, 1, 0, 1],
  fontColor: [0.00, 0.94, 0.37, 1],
  isNearestInterpolation: true,
  isFilledPen: true,
  penValue: 1,
  penType: NI_PEN_TYPE.PEN
});

nv.opts.penBounds = 0;
nv.opts.penSize = 1;
nv._cloudMrDefaultZoom = CLOUDMR_DEFAULT_VIEW_ZOOM;

window.nv = nv;


// The NiiVue component wraps all other components in the UI. 
// It is exported so that it can be used in other projects easily
export default function CloudMrNiivueViewer(props) {
  let endpoints = getEndpoints(); // CloudMR core endpoints (mode1/mode2 helper)
  const selectedVolume = props.selectedVolume;
  const setSelectedVolume = props.setSelectedVolume;
  const { setWarning, setWarningOpen } = props;
  // const nv = props.nv;
  const [openSettings, setOpenSettings] = React.useState(false)
  const [openLayers, setOpenLayers] = React.useState(false)
  const [crosshairColor, setCrosshairColor] = React.useState(nv.opts.crosshairColor)
  const [selectionBoxColor, setSelectionBoxColor] = React.useState(nv.opts.selectionBoxColor)
  const [backColor, setBackColor] = React.useState(nv.opts.backColor)
  const [clipPlaneColor, setClipPlaneColor] = React.useState(nv.opts.clipPlaneColor)
  const [layers, setLayers] = React.useState(nv.volumes)
  const [cornerText, setCornerText] = React.useState(false)
  const [radiological, setRadiological] = React.useState(true)
  const [crosshair3D, setCrosshair3D] = React.useState(false)
  const [textSize, setTextSize] = React.useState(nv.opts.textHeight)
  const [fontColor, setFontColor] = React.useState(nv.opts.fontColor)
  const [colorBar, setColorBar] = React.useState(nv.opts.isColorbar)
  const [worldSpace, setWorldSpace] = React.useState(nv.opts.isSliceMM)
  const [clipPlane, setClipPlane] = React.useState(nv.currentClipPlaneIndex > 0 ? true : false)
  // TODO: add crosshair size state and setter
  const [opacity, setopacity] = React.useState(1.0)
  const [drawingEnabled, setDrawingEnabled] = React.useState(nv.opts.drawingEnabled);
  const [drawPen, setDrawPen] = React.useState(nv.opts.penValue);
  const [drawOpacity, setDrawOpacity] = React.useState(0.8)
  const [crosshairOpacity, setCrosshairOpacity] = React.useState(nv.opts.crosshairColor[3])
  const [clipPlaneOpacity, setClipPlaneOpacity] = React.useState(nv.opts.clipPlaneColor[3])

  const [locationTableVisible, setLocationTableVisible] = React.useState(true)
  const [locationData, setLocationData] = React.useState([])
  const [decimalPrecision, setDecimalPrecision] = React.useState(2)
  const [orientCube, setOrientCube] = React.useState(nv.opts.isOrientCube)
  const [ruler, setRuler] = React.useState(nv.opts.isRuler)
  const [multiplanarPadPixels, setMultiplanarPadPixels] = React.useState(nv.opts.multiplanarPadPixels)
  const [maxDrawUndoBitmaps, setMaxDrawUndoBitmaps] = React.useState(nv.opts.maxDrawUndoBitmaps)
  const [sagittalNoseLeft, setSagittalNoseLeft] = React.useState(nv.opts.sagittalNoseLeft)
  const [rulerWidth, setRulerWidth] = React.useState(nv.opts.rulerWidth)
  const [longTouchTimeout, setLongTouchTimeout] = React.useState(nv.opts.longTouchTimeout)
  const [doubleTouchTimeout, setDoubleTouchTimeout] = React.useState(nv.opts.doubleTouchTimeout)
  const [dragToMeasure, setDragToMeasure] = React.useState(nv.opts.isDragShowsMeasurementTool)
  const [rulerColor, setRulerColor] = React.useState(nv.opts.rulerColor)
  const [rulerOpacity, setRulerOpacity] = React.useState(nv.opts.rulerColor[3])
  const [highDPI, setHighDPI] = React.useState(false)

  const [rois, setROIs] = React.useState([]);

  // Persists gamma and opacity across volume/channel switches (pan/zoom always reset to default)
  const savedViewStateRef = React.useRef(null);
  const loadingVolumeIndexRef = React.useRef(props.selectedVolume);

  const [showCrosshair, setShowCrosshair] = React.useState(false);
  /** Preferred crosshair width when visible; toggle controls whether it is applied. */
  const [crosshairSize, setCrosshairSize] = React.useState(1);

  const [complexMode, setComplexMode] = useState('absolute');
  const [complexOptions, setComplexOptions] = useState(['absolute']);
  const [roiVisible, setROIVisible] = useState(true);
  const [drawingOpacity, setDrawingOpacity] = useState(0.8);

  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1);
  const [textsVisible, setTextsVisible] = useState(false);

  const [transformFactors, setTransformFactors] = useState({ a: 1, b: 0 });

  const [saving, setSaving] = useState(false);

  const [drawShapeTool, setDrawShapeTool] = useState(null);
  const [shapeDraft, setShapeDraft] = useState(null);
  const [penDrawMode, setPenDrawMode] = useState("freehand");
  const [polylineVertexCount, setPolylineVertexCount] = useState(0);
  const [penDraft, setPenDraft] = useState(null);
  const [brushSize, setBrushSize] = useState(1);
  const [eraserSize, setEraserSize] = useState(1);
  const brushSizeRef = React.useRef(1);
  const eraserSizeRef = React.useRef(1);
  const shapeDraftRef = React.useRef(null);
  const penDraftRef = React.useRef(null);
  const drawShapeToolRef = React.useRef(null);
  const penDrawModeRef = React.useRef("freehand");
  drawShapeToolRef.current = drawShapeTool;
  shapeDraftRef.current = shapeDraft;
  penDraftRef.current = penDraft;
  penDrawModeRef.current = penDrawMode;

  React.useEffect(() => {
    nv.opts.penBounds = 0;
    nv.opts.penSize = 1;
  }, []);
  const [gamma, setGamma] = React.useState(1.0);
  const [gammaKey, setGammaKey] = React.useState(0);

  // Niivue → React bridge so other places (Toolbar) can force the UI to reset
  nv.onResetGamma = () => {
    setGamma(1.0);
    setGammaKey(k => k + 1); // re-mounts the slider to reflect the reset
  };

  // Do not call resampleImage() here: NiivuePanel (which mounts `#histoplot`) only renders when
  // props.niis[selectedVolume] exists — running on mount throws "No DOM element with id 'histoplot'".
  // NiivuePanel’s own effect calls resampleImage after the histogram node exists.

  React.useEffect(() => {
    if (nv.volumes.length !== 0) {
      setLayers([...nv.volumes]);
      setBoundMins(nv.frac2mm([0, 0, 0]));
      setBoundMaxs(nv.frac2mm([1, 1, 1]));
      // setMMs(nv.frac2mm([0.5, 0.5, 0.5])); // Commented to prevent recentering on volume load; we now re-apply saved crosshair if available
      try {
        // Initialize sliders to the engine’s current crosshair (in mm), not a hard-coded 0.5
        setMMs(nv.frac2mm(nv.scene.crosshairPos));
      } catch { }
      setTimeout(args => nv.resizeListener(), 700);
    }
  }, []);

  React.useEffect(() => {
    loadingVolumeIndexRef.current = props.selectedVolume;
  }, [props.selectedVolume]);

  React.useEffect(() => {
    const nii = props.niis?.[props.selectedVolume];
    if (nii) stylingProxy(nii);
  }, [props.selectedVolume, props.niis])

  // only run this when the component is mounted on the page
  // or else it will be recursive and continuously add all
  // initial images supplied to the NiiVue component
  //
  // All subsequent imgaes should be added via a
  // button or drag and drop
  // React.useEffect(async ()=>{
  //   // props.volumes.map(async (vol)=>{
  //   //   let image = await NVImage.loadFromUrl({url:vol.url})
  //   //   nv.addVolume(image)
  //   //   setLayers([...nv.volumes])
  //   // })
  //   await nv.loadVolumes(props.volumes)
  //   setLayers([...nv.volumes])
  // }, [])

  // values dualslider
  const [rangeKey, setRangeKey] = useState(0);
  nv.onResetContrast = () => {
    setRangeKey(rangeKey + 1);
  }

  let [boundMins, setBoundMins] = useState([0, 0, 0]);
  let [boundMaxs, setBoundMaxs] = useState([1, 1, 1]);
  let [mms, setMMs] = useState([0.5, 0.5, 0.5]);
  let [vox, setVox] = useState([0, 0, 0]);
  nv.onImageLoaded = () => {
    if (nv.volumes.length > 1) {
      const nii = props.niis?.[loadingVolumeIndexRef.current] ?? props.niis?.[props.selectedVolume];
      if (nii?.link) {
        nv.loadVolumes([niiToVolume(nii)]);
        setWarning("Error loading results, please check internet connectivity");
        setWarningOpen(true);
        setTimeout(() => {
          setWarningOpen(false);
        }, 2500)
        setWarning("");
        return;
      }
      // One logical job file can decode as multiple Niivue volumes (e.g. some 4D / replica layouts) while Redux
      // still has a single `niis[]` entry (common for Multiple Replica without a separate noise channel). Drop
      // extras and finish init on the first volume instead of bailing with a bogus network error.
      try {
        const extras = nv.volumes.slice(1);
        for (const vol of extras) {
          nv.removeVolume(vol);
        }
      } catch (e) {
        console.warn("Niivue onImageLoaded: could not trim extra volumes", e);
        return;
      }
      if (nv.volumes.length !== 1) return;
    }

    const currentNii = props.niis?.[loadingVolumeIndexRef.current] ?? props.niis?.[props.selectedVolume];
    const axialOnlyLoad = isAxialOnlyVolume(currentNii);
    nv._cloudMrDefaultZoom = CLOUDMR_DEFAULT_VIEW_ZOOM;

    // Restore gamma/opacity/colormap when switching channels; always reset pan/zoom to default.
    const saved = savedViewStateRef.current;
    if (saved) {
      nv.setGamma(saved.gamma);
      setGamma(saved.gamma);
      setGammaKey(k => k + 1);
      const vol = nv.volumes[0];
      if (vol) {
        nv.setColorMap(vol.id, saved.colormap);
        vol.opacity = saved.opacity;
        nv.updateGLVolume();
      }
      setopacity(saved.opacity);
      savedViewStateRef.current = null;
    } else {
      nv.setGamma(1.0);
      nv.onResetGamma?.();
    }

    const defaultColormap = defaultColormapForVolume(currentNii);
    const vol = nv.volumes[0];
    if (vol) {
      nv.setColorMap(vol.id, defaultColormap);
      nv.updateGLVolume();
    }

    nv.resetScene();

    setLayers([...nv.volumes]);
    setBoundMins(nv.frac2mm([0, 0, 0]));
    setBoundMaxs(nv.frac2mm([1, 1, 1]));
    verifyComplex(nv.volumes[0], currentNii);
    nvSetDisplayedVoxels('absolute');

    nvSetDragMode(dragModeRef.current);
    nv.setSliceMM(worldSpace);
    nv.scene.crosshairPos = [0.5, 0.5, 0.5];
    nvUpdateSliceType(axialOnlyLoad ? 'axial' : sliceType);
    nv.opts.crosshairWidth = showCrosshair ? crosshairSize : 0;
    setMMs(nv.frac2mm(nv.scene.crosshairPos));
    nv.applyDefaultViewState?.();
    setTimeout(() => {
      nv.applyDefaultViewState?.();
      // Panel remount (key=selectedVolume) can finish attach after this callback —
      // re-assert the toolbar mode so dropdown and engine stay aligned.
      nvSetDragMode(dragModeRef.current);
    }, 800);
  }


  function checkRange(numbers) {
    // console.log(numbers);
    const range_min = getMin(numbers);
    const range_max = getMax(numbers);

    const range = range_max - range_min;
    if (range == 0) {
      return numbers;
    }

    if (range < 1e-2) {
      // Find a suitable 'a' that is a whole power of 10
      // Here, we want 'a' to scale the range to fit within [1, 10)
      let a = 1;
      let power = 0;
      while ((range * a) < 1) {
        a *= 10;
        power += 1;
      }

      // Calculate 'b' such that the minimum transformed value is 1 (x = 1)
      let b = Math.floor(a * range_min - a * range_min % 10) / a;
      console.log(b);

      // Apply the transformation ax + b
      const transformed = numbers.map(y => a * y - a * b);
      setTransformFactors({ a, b });
      nv.transformA = a;
      nv.transformB = b;
      nv.power = power;
      return transformed;
    } else {
      // If range is not smaller than 10E-2, return the original array
      setTransformFactors({ a: 1, b: 0 });
      nv.transformA = 1;
      nv.transformB = 0;
      nv.power = undefined;
      return numbers;
    }
  }


  function verifyComplex(volume, nii) {
    volume.real = volume.img;
    setComplexMode('absolute');
    if (isAbsoluteOnlyVolume(nii)) {
      volume.absolute = new volume.img.constructor(volume.img.length);
      for (let i = 0; i < volume.img.length; i++) {
        const realPart = volume.real[i];
        const imaginaryPart = volume.imaginary?.[i] ?? 0;
        volume.absolute[i] = Math.sqrt(realPart * realPart + imaginaryPart * imaginaryPart);
      }
    }
    // Ensure volume.imaginary is defined and has the same length as volume.img
    if (!volume.imaginary || volume.imaginary.length !== volume.img.length) {
      setComplexOptions(['absolute', 'real']);
      // Initialize absolute and phase arrays
      volume.absolute = new volume.img.constructor(volume.img.length);
      // Calculate absolute and phase values
      for (let i = 0; i < volume.img.length; i++) {
        const realPart = volume.real[i];
        // Calculate the absolute value (magnitude)
        volume.absolute[i] = Math.sqrt(realPart * realPart);
      }
      return false;
    }

    let allZero = true;
    // Test for imaginary nulls
    for (let i = 0; i < volume.img.length; i++) {
      if (volume.imaginary[i] !== 0) {
        allZero = false;
        break;
      }
    }

    // Initialize absolute and phase arrays
    volume.absolute = new Float32Array(volume.img.length);
    volume.phase = new Float32Array(volume.img.length);

    // Calculate absolute and phase values
    for (let i = 0; i < volume.img.length; i++) {
      const realPart = volume.real[i];
      const imaginaryPart = volume.imaginary[i];
      // Calculate the absolute value (magnitude)
      volume.absolute[i] = Math.sqrt(realPart * realPart + imaginaryPart * imaginaryPart);

      // Calculate the phase (argument)
      volume.phase[i] = Math.atan2(imaginaryPart, realPart);
    }
    setComplexOptions((allZero) ? ['absolute', 'real'] : ['absolute', 'imaginary', 'real', 'phase']);
    return !allZero;
  }

  function nvSetDisplayedVoxels(voxelType) {
    const nii = props.niis?.[loadingVolumeIndexRef.current] ?? props.niis?.[selectedVolume];
    if (isAbsoluteOnlyVolume(nii) && voxelType !== 'absolute') return;
    setComplexMode(voxelType);
    let volume = nv.volumes[0];
    switch (voxelType) {
      case 'phase':
        volume.img = checkRange(volume.phase);
        break;
      case 'absolute':
        volume.img = checkRange(volume.absolute);
        break;
      case 'real':
        volume.img = checkRange(volume.real);
        break;
      case 'imaginary':
        volume.img = checkRange(volume.imaginary);
        break;
    }
    volume.calMinMax();
    setMin(volume.cal_min);
    setMax(volume.cal_max);
    volume.vox_min = getMin(volume.img);
    volume.vox_max = getMax(volume.img);
    nv.setVolume(volume);
    nv.drawScene();
    resampleImage();
  }


  nv.onLocationChange = (data) => {
    if (data.values[0]) {
      setMMs([...data.values[0].mm]);                // ensure new array -> React re-renders
      if (data.values[0].vox) setVox([...data.values[0].vox]); // k-index for Slice # slider
      data.values[0].transformA = nv.transformA;
      data.values[0].transformB = nv.transformB;
      data.values[0].power = nv.power;
    }
    setLocationData(data.values);
    // if(drawingEnabled){
    //     setDrawingChanged(true);
    //     // resampleImage();
    // }
    // console.log(nv.scene.pan2Dxyzmm);
  }
  nv.onMouseUp = () => {
    const suppress = nv._cloudMrSuppressDrawingChangedMouseUp;
    if (suppress) {
      nv._cloudMrSuppressDrawingChangedMouseUp = false;
    }
    const isEraserStroke =
      nv.opts.drawingEnabled &&
      nv.opts.penType === NI_PEN_TYPE.PEN &&
      nv.opts.penValue === 0;
    if (suppress && !isEraserStroke) {
      return;
    }
    if (
      nv.opts.drawingEnabled &&
      nv.opts.penType === NI_PEN_TYPE.PEN &&
      nv.opts.penValue === 0
    ) {
      updateShapeRegistryErosionState(nv);
    }
    if (nv.opts.drawingEnabled) {
      setDrawingChanged(true);
      resampleImage();
    }
  }

  /**
   * Way to test all value changes
   */
  nv.onIntensityChange = () => {
    let volume = nv.volumes[0];
    setMin(volume.cal_min);
    setMax(volume.cal_max);
  }

  // nv.createEmptyDrawing();

  // construct an array of <Layer> components. Each layer is a NVImage or NVMesh
  const layerList = layers.map((layer, index) => {
    return (index === 0) ? (//Yuelong: we shall expect only one effective layer in this implementation
      <Layer
        key={layer.name}
        image={layer}
        nv={nv}
        nii={props.niis[props.selectedVolume]}
        onColorMapChange={nvUpdateColorMap}
        onRemoveLayer={nvRemoveLayer}
        onOpacityChange={nvUpdateLayerOpacity}
        opacity={opacity}
        colorMapValues={nv.colormapFromKey(layer.colormap)}
        getColorMapValues={(colorMapName) => {
          return nv.colormapFromKey(colorMapName)
        }}
      />
    ) : undefined;
  });

  async function addLayer(file) {
    const nvimage = await NVImage.loadFromFile({
      file: file
    })
    nv.addVolume(nvimage)
    setLayers([...nv.volumes]);
  }

  function toggleSettings() {
    setOpenSettings(!openSettings)
  }

  function toggleLayers() {
    setOpenLayers(!openLayers)
  }

  function toggleLocationTable() {
    setLocationTableVisible(!locationTableVisible)
  }

  function toggleROIVisible() {
    if (roiVisible) {
      setDrawingOpacity(nv.drawOpacity);
      setROIVisible(false);
      nv.setDrawOpacity(0);
      resampleImage();
    } else {
      nv.setDrawOpacity(drawingOpacity);
      setROIVisible(true);
      resampleImage();
    }
  }

  function nvUpdateDrawingOpacity(opacity) {
    setDrawingOpacity(opacity);
    if (roiVisible) {
      nv.setDrawOpacity(opacity);
    }
  }

  function nvUpdateOpacity(a) {
    console.log("Opacity = " + a)
    setopacity(a)
    let n = nv.volumes.length
    for (let i = 0; i < n; i++) {
      nv.volumes[i].opacity = a
    }
    nv.updateGLVolume()
  }

  function nvToggleLabelVisible() {
    if (textsVisible) {
      nv.hideText = true;
      nv.drawScene();
      setTextsVisible(false);
    } else {
      nv.hideText = false;
      nv.drawScene();
      setTextsVisible(true);
    }
  }

  const [dragMode, setDragMode] = useState("pan");
  // Ref keeps the latest mode for async paths (onImageLoaded / loadVolumes) so
  // stale closures cannot re-apply an old value after the user changes the dropdown.
  const dragModeRef = React.useRef(dragMode);
  React.useEffect(() => {
    dragModeRef.current = dragMode;
  }, [dragMode]);

  function nvSetDragMode(nextDragMode) {
    switch (nextDragMode) {
      case "none":
        nv.opts.dragMode = nv.dragModes.none;
        break;
      case "contrast":
        console.log('setting drag mode to contrast');
        nv.opts.dragMode = nv.dragModes.contrast;
        break;
      case "measurement":
        nv.opts.dragMode = nv.dragModes.measurement;
        break;
      case "pan":
        // nv.opts.dragMode = 3;
        nv.opts.dragMode = nv.dragModes.pan;
        break;
    }
    // nv.drawScene();
    dragModeRef.current = nextDragMode;
    setDragMode(nextDragMode);
  }

  function nvSaveImage() {
    nv.saveImage({
      filename: 'roi.nii',
      isSaveDrawing: true,
    });
  }

  function nvUpdateDrawingEnabled() {
    setDrawingEnabled(!drawingEnabled);
    nv.setDrawingEnabled(!drawingEnabled);
    nv.drawScene();
  }

  function nvSetDrawingEnabled(enabled) {
    setDrawingEnabled(enabled)
    nv.setDrawingEnabled(enabled)
    nv.drawScene();
  }

  function applyNvBrushSize(size) {
    nv.opts.penBounds = (size - 1) / 2;
    nv.opts.penSize = size;
  }

  function nvUpdateBrushSize(size) {
    setBrushSize(size);
    brushSizeRef.current = size;
    const tool = drawShapeToolRef.current;
    if ((tool === "pen" || tool === "polyline") && drawPen !== 0) {
      applyNvBrushSize(size);
    }
  }

  function nvUpdateEraserSize(size) {
    setEraserSize(size);
    eraserSizeRef.current = size;
    if (drawPen === 0) {
      applyNvBrushSize(size);
    }
  }

  function nvUpdateDrawPen(a) {
    const raw = Number(a.target.value);
    setDrawPen(raw);
    const isEraser = raw === 0 || raw === 8;

    if (raw === 0) {
      nv.setPenValue(0, false);
    } else if (raw === 8) {
      nv.setPenValue(0, true);
    } else {
      nv.setPenValue(raw & 7, raw > 0);
    }

    if (isEraser) {
      nv.opts.penType = NI_PEN_TYPE.PEN;
      nv.opts.deferFreehandCommit = false;
      nv.opts.deferShapeCommit = false;
      nv.opts.polylinePenMode = false;
      nv.cloudMrResetPolyline?.();
      if (raw === 0) {
        nv.opts.isFilledPen = false;
        nv.drawPenFillPts = [];
      }
      applyActiveDraftIfAny();
    } else if (drawShapeToolRef.current === "pen") {
      nv.opts.deferFreehandCommit = false;
      nv.opts.polylinePenMode = false;
      nv.opts.isFilledPen = true;
      applyNvBrushSize(brushSizeRef.current);
    } else if (drawShapeToolRef.current === "polyline") {
      nv.opts.deferFreehandCommit = false;
      nv.opts.polylinePenMode = true;
      nv.opts.isFilledPen = false;
      applyNvBrushSize(brushSizeRef.current);
    }

    // Immediately repaint any active draft in the new color so the user sees the change.
    if (!isEraser) {
      const colorValue = raw & 7;
      if (shapeDraftRef.current) {
        const next = { ...shapeDraftRef.current, penValue: colorValue };
        shapeDraftRef.current = next;
        setShapeDraft(next);
        redrawDraftShape(nv, next);
      } else if (penDraftRef.current) {
        const next = { ...penDraftRef.current, penValue: colorValue };
        penDraftRef.current = next;
        setPenDraft(next);
        if (next.kind === "polyline") {
          const count = next.vertices?.length ?? 0;
          if (count >= 2) {
            redrawPolylineDraft(nv, { ...next, filled: false });
            if (nv.drawBitmap) nv._cloudMrPolylineBaseBitmap = nv.drawBitmap.slice();
          }
        } else if (next.kind === "freehand") {
          redrawFreehandDraft(nv, next);
        }
      }
    }
  }

  function deactivateDrawTools() {
    if (shapeDraftRef.current) {
      cancelShapeDraft();
    }
    if (penDraftRef.current) {
      cancelPenDraft(nv, penDraftRef.current);
      nv.cloudMrResetPolyline?.();
      setPolylineVertexCount(0);
      setPenDraft(null);
      penDraftRef.current = null;
      nv._cloudMrPenDraftActive = false;
    }
    setDrawShapeTool(null);
    nv.opts.penType = NI_PEN_TYPE.PEN;
    nv.opts.deferShapeCommit = false;
    nv.opts.deferFreehandCommit = false;
    nv.opts.polylinePenMode = false;
    nv.cloudMrResetPolyline?.();
    nvSetDrawingEnabled(false);
    if (drawPen === 0 || drawPen === 8) {
      setDrawPen(1);
      nv.setPenValue(1, false);
      nv.opts.isFilledPen = false;
    }
    applyNvBrushSize(1);
  }

  function activateEraser() {
    applyActiveDraftIfAny();
    nv._cloudMrSuppressDrawingChangedMouseUp = false;
    setDrawShapeTool(null);
    nv.opts.penType = NI_PEN_TYPE.PEN;
    nv.opts.deferShapeCommit = false;
    nv.opts.deferFreehandCommit = false;
    nv.opts.polylinePenMode = false;
    nvUpdateDrawPen({ target: { value: 0 } });
    nv.opts.isFilledPen = false;
    nv.drawPenFillPts = [];
    applyNvBrushSize(eraserSizeRef.current);
    nvSetDrawingEnabled(true);
  }

  function nvUpdateDrawOpacity(a) {
    setDrawOpacity(a)
    nv.setDrawOpacity(a);
  }

  function nvUpdateCrosshairColor(rgb01, a = 1) {
    setCrosshairColor([...rgb01, a])
    setCrosshairOpacity(a)
    nv.setCrosshairColor([...rgb01, a])
  }

  function nvUpdateOrientCube() {
    nv.opts.isOrientCube = !orientCube
    setOrientCube(!orientCube)
    nv.drawScene()
  }

  function nvUpdateHighDPI() {
    nv.setHighResolutionCapable(!highDPI)
    setHighDPI(!highDPI)
  }

  function nvUpdateMultiplanarPadPixels(v) {
    nv.opts.multiplanarPadPixels = v
    setMultiplanarPadPixels(v)
    nv.drawScene();
  }

  function nvUpdateRuler() {
    nv.opts.isRuler = !ruler
    setRuler(!ruler)
    nv.drawScene()
  }

  function nvUpdateSagittalNoseLeft() {
    nv.opts.sagittalNoseLeft = !sagittalNoseLeft
    setSagittalNoseLeft(!sagittalNoseLeft)
    nv.drawScene()
  }

  function nvUpdateRulerWidth(v) {
    nv.opts.rulerWidth = v
    setRulerWidth(v)
    nv.drawScene()
  }

  function nvUpdateRulerOpacity(a) {
    nv.opts.rulerColor = [
      rulerColor[0],
      rulerColor[1],
      rulerColor[2],
      a
    ]
    setRulerOpacity(a)
    nv.drawScene()
  }

  function nvUpdateLongTouchTimeout(v) {
    nv.opts.longTouchTimeout = v
    setLongTouchTimeout(v)
  }

  function nvUpdateDoubleTouchTimeout(v) {
    nv.opts.doubleTouchTimeout = v
    setDoubleTouchTimeout(v)
  }

  function nvUpdateDragToMeasure() {
    nv.opts.isDragShowsMeasurementTool = !dragToMeasure
    setDragToMeasure(!dragToMeasure)
  }

  function nvUpdateMaxDrawUndoBitmaps(v) {
    nv.opts.maxDrawUndoBitmaps = v
    setMaxDrawUndoBitmaps(v)
  }

  function nvUpdateBackColor(rgb01, a = 1) {
    setBackColor([...rgb01, a])
    nv.opts.backColor = [...rgb01, a]
    nv.drawScene()
  }

  function nvUpdateRulerColor(rgb01, a = 1) {
    setRulerColor([...rgb01, a])
    nv.opts.rulerColor = [...rgb01, a]
    if (!ruler) {
      nv.opts.isRuler = !ruler
      setRuler(!ruler)
    }
    nv.drawScene()
  }

  function nvUpdateClipPlaneColor(rgb01, a = 1) {
    setClipPlaneColor([...rgb01, a])
    nv.opts.clipPlaneColor = [...rgb01, a]
    setClipPlane(true)
    nv.setClipPlane([0, 270, 0]) //left
    nv.updateGLVolume()
  }

  function nvUpdateClipPlane() {
    if (!clipPlane) {
      setClipPlane(true)
      nv.setClipPlane([0, 270, 0]) //left
    } else {
      setClipPlane(false)
      nv.setClipPlane([2, 0, 0]) //none
    }
  }

  function nvUpdateColorBar() {
    setColorBar(!colorBar)
    nv.opts.isColorbar = !colorBar
    nv.drawScene();
  }

  function nvUpdateTextSize(v) {
    setTextSize(v)
    nv.opts.textHeight = v
    nv.drawScene();
  }

  function nvUpdateFontColor(rgb01, a = 1) {
    setFontColor([...rgb01, a])
    nv.opts.fontColor = [...rgb01, a]
    nv.drawScene()
  }

  function updateDecimalPrecision(v) {
    setDecimalPrecision(v)
  }

  function nvUpdateWorldSpace(value) {
    // When called from the toolbar NVSwitch it receives a boolean value directly.
    // When called from NiivueSlicePosition onWorldSpaceChange it also receives a boolean.
    const next = typeof value === 'boolean' ? value : !worldSpace;
    nvUpdateCrosshair3D(next)
    setWorldSpace(next)
    nv.setSliceMM(next)

    // keep sliders synced to the currently displayed crosshair
    try { setMMs(nv.frac2mm(nv.scene.crosshairPos)); } catch { }
  }

  function nvUpdateCornerText() {
    nv.setCornerOrientationText(!cornerText)
    setCornerText(!cornerText)
  }

  function nvUpdateCrosshair3D() {
    nv.opts.show3Dcrosshair = !crosshair3D
    nv.updateGLVolume()
    setCrosshair3D(!crosshair3D)
  }

  function nvUpdateCrosshair() {
    const next = !showCrosshair;
    const width = next ? crosshairSize : 0;
    if (typeof nv.setCrosshairWidth === "function") {
      nv.setCrosshairWidth(width);
    } else {
      nv.opts.crosshairWidth = width;
      nv.drawScene();
    }
    setShowCrosshair(next);
  }

  function nvUpdateRadiological() {
    nv.setRadiologicalConvention(!radiological)
    setRadiological(!radiological)
  }

  function nvUpdateCrosshairOpacity(a) {
    nv.setCrosshairColor([
      crosshairColor[0],
      crosshairColor[1],
      crosshairColor[2],
      a
    ])
    setCrosshairOpacity(a)
  }

  function nvUpdateClipPlaneOpacity(a) {
    nv.opts.clipPlaneColor = [
      clipPlaneColor[0],
      clipPlaneColor[1],
      clipPlaneColor[2],
      a
    ]
    setClipPlaneOpacity(a)
    nv.updateGLVolume()
  }

  function nvUpdateCrosshairSize(w) {
    setCrosshairSize(w);
    // Toggle takes precedence: do not show the crosshair while it is off.
    if (!showCrosshair) {
      return;
    }
    // Prefer the official API — it invalidates the cached 3D crosshair mesh.
    if (typeof nv.setCrosshairWidth === "function") {
      nv.setCrosshairWidth(w);
    } else {
      nv.opts.crosshairWidth = w;
      if (nv.crosshairs3D?.mm) nv.crosshairs3D.mm[0] = NaN;
      nv.drawScene();
    }
  }


  const [labelMapping, setLabelMapping] = useState({});
  function resampleImage(mapping = labelMapping) {
    const el =
      typeof document !== "undefined" ? document.getElementById("histoplot") : null;
    const next = resampleNiivueRoiHistogram({
      nv,
      labelMapping: mapping,
      plotRoot: el,
    });
    if (next !== null) {
      setROIs(next);
    }
  }

  function syncPenDrawMode(mode) {
    const prevMode = penDrawModeRef.current;

    // Commit an in-progress freehand before switching to polyline so it stays
    // marked as pen (kind 2) and is not misidentified as a shape on click.
    if (prevMode === "freehand" && mode === "polyline") {
      const draft = penDraftRef.current;
      if (draft?.kind === "freehand") {
        applyPenDraft(nv, draft);
        markPenVoxelKind(draft, 2);
        setPenDraft(null);
        penDraftRef.current = null;
        nv._cloudMrPenDraftActive = false;
      } else if (nv._cloudMrFreehandSessionStartBitmap) {
        const axCorSag =
          nv._cloudMrFreehandAxCorSag >= 0 ? nv._cloudMrFreehandAxCorSag : nv.drawPenAxCorSag;
        const captured = captureFreehandDraft(
          nv,
          nv._cloudMrFreehandSessionStartBitmap,
          axCorSag,
        );
        nv._cloudMrFreehandSessionStartBitmap = null;
        if (captured) markPenVoxelKind(captured, 2);
      }
    }

    if (mode === "freehand") {
      nv.cloudMrCancelPolyline?.();
      if (penDraftRef.current?.kind === "polyline") {
        cancelPenDraft(nv, penDraftRef.current);
        setPenDraft(null);
        penDraftRef.current = null;
        nv._cloudMrPenDraftActive = false;
        setPolylineVertexCount(0);
      }
    }

    setPenDrawMode(mode);
    penDrawModeRef.current = mode;
    nv.opts.polylinePenMode = mode === "polyline";
    nv.opts.isFilledPen = mode === "freehand";
    nv.opts.deferFreehandCommit = false;
  }

  function cancelPenDraftHandler() {
    const draft = penDraftRef.current;
    if (!draft) return;
    const registryId = draft._registryId;
    cancelPenDraft(nv, draft);
    if (registryId) {
      // Restore the exact committed voxels from the registry (works for both the
      // legacy polyline-draft case and the new freehand-converted case).
      const entry = nv._cloudMrPolylineRegistry?.find((e) => e.id === registryId);
      if (entry) {
        const bitmap = nv.drawBitmap;
        entry.voxelIndices.forEach((idx) => {
          if (idx < bitmap.length) bitmap[idx] = entry.penValue;
        });
        nv.refreshDrawing(true, false);
        nv.drawScene();
      }
    }
    if (draft.kind === "polyline") {
      nv.cloudMrResetPolyline?.();
      setPolylineVertexCount(0);
    }
    setPenDraft(null);
    penDraftRef.current = null;
    nv._cloudMrPenDraftActive = false;
    const tool = drawShapeToolRef.current;
    if (tool === "pen" || tool === "polyline") {
      nvSetDrawingEnabled(true);
    }
  }

  function applyPenDraftHandler({ keepTool = false } = {}) {
    let draft = penDraftRef.current;
    if (!draft) return;
    if (draft.kind === "polyline" && nv._cloudMrPolylineVertices?.length >= 2) {
      const fresh = polylineDraftFromNv(nv, { filled: draft.vertices?.length >= 3 });
      if (fresh) {
        draft = fresh;
        penDraftRef.current = draft;
      }
    }
    // Auto-fill polyline on apply — fillPolylineDraft updates _cloudMrPolylineBaseBitmap
    // to the filled state so applyPenDraft commits the correct filled bitmap.
    if (draft.kind === "polyline" && draft.vertices?.length >= 3) {
      draft = fillPolylineDraft(nv, draft);
      penDraftRef.current = draft;
    }
    draft = applyPenDraft(nv, draft) ?? draft;
    if (draft.kind === "polyline" && nv._cloudMrPolylineSessionStartBitmap) {
      draft = {
        ...draft,
        baseBitmap: new Uint8Array(nv._cloudMrPolylineSessionStartBitmap),
      };
    }
    penDraftRef.current = draft;
    markPenVoxelKind(draft, draft.kind === "polyline" ? 3 : 2);
    if (draft.kind === "polyline") {
      registerAppliedPolyline(nv, draft, draft._registryId);
      nv.cloudMrResetPolyline?.();
      setPolylineVertexCount(0);
    } else if (draft._registryId && nv._cloudMrPolylineRegistry) {
      // Was a committed polyline reopened as a freehand draft (move-only, possibly recolored).
      // Re-register with the current penValue and voxel positions so future clicks
      // open it with the correct (possibly changed) color.
      const entryIdx = nv._cloudMrPolylineRegistry.findIndex((e) => e.id === draft._registryId);
      if (entryIdx >= 0) {
        const old = nv._cloudMrPolylineRegistry[entryIdx];
        // Collect the newly committed voxel positions using the draft's current penValue.
        const newIndices = new Set();
        if (nv.drawBitmap && draft.baseBitmap) {
          const pv = draft.penValue;
          for (let i = 0; i < nv.drawBitmap.length; i++) {
            if (nv.drawBitmap[i] === pv && draft.baseBitmap[i] !== pv) newIndices.add(i);
          }
        }
        // Fall back to stroke voxel positions if bitmap diff returned nothing.
        if (newIndices.size === 0 && draft.strokeVoxels && nv.back?.dims) {
          const dx = nv.back.dims[1];
          const dy = nv.back.dims[2];
          for (const [x, y, z] of draft.strokeVoxels) {
            newIndices.add(x + y * dx + z * dx * dy);
          }
        }
        if (newIndices.size > 0) {
          nv._cloudMrPolylineRegistry[entryIdx] = {
            ...old,
            penValue: draft.penValue,
            voxelIndices: newIndices,
          };
        } else {
          nv._cloudMrPolylineRegistry = nv._cloudMrPolylineRegistry.filter(
            (e) => e.id !== draft._registryId,
          );
        }
      }
    }
    setPenDraft(null);
    penDraftRef.current = null;
    nv._cloudMrPenDraftActive = false;
    setDrawingChanged(true);
    if (keepTool) {
      const tool = drawShapeToolRef.current;
      nv.opts.polylinePenMode = tool === "polyline";
      nv.opts.isFilledPen = tool === "pen";
      nv.opts.deferFreehandCommit = false;
      nvSetDrawingEnabled(true);
    } else {
      // Deactivate tool entirely — palette closes, user re-enters edit by clicking the ROI
      setDrawShapeTool(null);
      nv.opts.deferFreehandCommit = false;
      nv.opts.polylinePenMode = false;
      nvSetDrawingEnabled(false);
    }
    resampleImage();
  }

  function fillPolylineDraftHandler() {
    const draft = penDraftRef.current;
    if (!draft || draft.kind !== "polyline" || draft.vertices.length < 3) return;
    const next = draft.filled
      ? unfillPolylineDraft(nv, draft)
      : fillPolylineDraft(nv, draft);
    onPenDraftChange(next);
  }

  function onPenDraftChange(draft) {
    setPenDraft(draft);
    penDraftRef.current = draft;
    if (draft.kind === "polyline") {
      syncPolylineDraftToNv(nv, draft);
    }
  }

  function cancelPolylineDraft() {
    cancelPenDraftHandler();
  }

  nv.onShapeCommitted = (draft) => {
    nv.drawAddUndoBitmap(nv.drawFillOverwrites);
    markShapeVoxelKind(draft);
    registerAppliedShape(nv, draft);
    setDrawingChanged(true);
    resampleImage();
  };

  nv.onFreehandCommitted = (draft) => {
    markPenVoxelKind(draft, 2);
    setDrawingChanged(true);
    resampleImage();
  };

  nv.onPenDraftReady = (draft) => {
    setPenDraft(draft);
    penDraftRef.current = draft;
    nv._cloudMrPenDraftActive = true;
    nvSetDrawingEnabled(false);
  };

  // Called by NiivuePatcher when the user clicks an applied pen ROI to re-edit it.
  // penKind: 2=freehand, 3=polyline
  nv.onPenDraftReopenReady = (draft, penKind) => {
    setPenDraft(draft);
    penDraftRef.current = draft;
    nv._cloudMrPenDraftActive = true;
    // Auto-select the correct pen tool so the right palette opens
    const tool = draft.kind === "polyline" ? "polyline" : "pen";
    setDrawShapeTool(tool);
    penDrawModeRef.current = draft.kind === "polyline" ? "polyline" : "freehand";
    if (draft.kind === "polyline") {
      setPolylineVertexCount(draft.vertices?.length ?? 0);
    }
    nv.opts.deferFreehandCommit = false;
    nv.opts.polylinePenMode = false;
    nvSetDrawingEnabled(false);
    // Sync palette to the reopened ROI's color so the user can change it.
    if (draft.penValue != null) {
      setDrawPen(draft.penValue);
      nv.setPenValue(draft.penValue, false);
    }
  };

  nv.onPolylineChange = (count) => {
    setPolylineVertexCount(count);
    if (drawShapeToolRef.current === "polyline" && count >= 2) {
      const draft = polylineDraftFromNv(nv, { filled: false });
      if (draft) {
        setPenDraft(draft);
        penDraftRef.current = draft;
      }
    } else if (penDraftRef.current?.kind === "polyline") {
      setPenDraft(null);
      penDraftRef.current = null;
    }
  };

  function discardShapeDraft() {
    setShapeDraft(null);
    shapeDraftRef.current = null;
    nv._cloudMrShapeDraftActive = false;
  }

  function discardPenDraft() {
    setPenDraft(null);
    penDraftRef.current = null;
    nv._cloudMrPenDraftActive = false;
    nv.cloudMrResetPolyline?.();
    setPolylineVertexCount(0);
  }

  function resetNiivueDrawSession() {
    nv.drawShapeStartLocation = [NaN, NaN, NaN];
    nv.drawShapePreviewBitmap = null;
    nv._cloudMrFreehandSessionStartBitmap = null;
    nv._cloudMrPolylineVertices = null;
    nv._cloudMrPolylineBaseBitmap = null;
    nv._cloudMrPolylineSessionStartBitmap = null;
    nv._cloudMrToolKindBitmap = null;
    clearShapeRegistry(nv);
  }

  function clearDrawingHandler() {
    // Discard drafts without restoring baseBitmap — clearDrawing wipes the canvas anyway.
    discardShapeDraft();
    discardPenDraft();
    resetNiivueDrawSession();
    setDrawShapeTool(null);
    nv.opts.penType = NI_PEN_TYPE.PEN;
    nv.opts.deferShapeCommit = false;
    nv.opts.deferFreehandCommit = false;
    nv.opts.polylinePenMode = false;
    nv.cloudMrResetPolyline?.();
    nvSetDrawingEnabled(false);
    nv.clearDrawing();
    nv.drawScene();
    resampleImage();
    setDrawingChanged(false);
  }

  function cancelShapeDraft() {
    const draft = shapeDraftRef.current;
    if (!draft) return;
    nv.drawBitmap.set(draft.baseBitmap);
    nv.refreshDrawing(true, false);
    nv.drawScene();
    setShapeDraft(null);
    shapeDraftRef.current = null;
    nv._cloudMrShapeDraftActive = false;
    if (drawShapeToolRef.current) {
      nvSetDrawingEnabled(true);
    }
  }

  function deleteShapeDraftHandler() {
    const draft = shapeDraftRef.current;
    if (!draft?.baseBitmap) return;
    if (draft._registryId != null) {
      removeShapeRegistryEntry(nv, draft._registryId);
    }
    // Clear tool-kind tags for voxels this shape occupied
    if (nv._cloudMrToolKindBitmap) {
      for (let i = 0; i < nv.drawBitmap.length; i++) {
        if (nv.drawBitmap[i] === draft.penValue && draft.baseBitmap[i] !== draft.penValue) {
          nv._cloudMrToolKindBitmap[i] = 0;
        }
      }
    }
    nv.drawBitmap.set(draft.baseBitmap);
    nv.refreshDrawing(true, false);
    nv.drawScene();
    nv.drawAddUndoBitmap(nv.drawFillOverwrites);
    setShapeDraft(null);
    shapeDraftRef.current = null;
    nv._cloudMrShapeDraftActive = false;
    setDrawingChanged(true);
    setDrawShapeTool(null);
    nv.opts.deferShapeCommit = false;
    nv.opts.penType = NI_PEN_TYPE.PEN;
    nvSetDrawingEnabled(false);
    resampleImage();
  }

  function deletePenDraftHandler() {
    const draft = penDraftRef.current;
    if (!draft?.baseBitmap) return;
    // Clear tool-kind tags for voxels this ROI occupied
    if (nv._cloudMrToolKindBitmap) {
      for (let i = 0; i < nv.drawBitmap.length; i++) {
        if (nv.drawBitmap[i] === draft.penValue && draft.baseBitmap[i] !== draft.penValue) {
          nv._cloudMrToolKindBitmap[i] = 0;
        }
      }
    }
    nv.drawBitmap.set(draft.baseBitmap);
    nv.refreshDrawing(true, false);
    nv.drawScene();
    nv.drawAddUndoBitmap(nv.drawFillOverwrites);
    // Remove from polyline registry if this was a registered polyline
    if (draft._registryId != null && nv._cloudMrPolylineRegistry) {
      nv._cloudMrPolylineRegistry = nv._cloudMrPolylineRegistry.filter(
        (e) => e.id !== draft._registryId,
      );
    }
    if (draft.kind === "polyline") {
      nv.cloudMrResetPolyline?.();
      setPolylineVertexCount(0);
    }
    setPenDraft(null);
    penDraftRef.current = null;
    nv._cloudMrPenDraftActive = false;
    setDrawingChanged(true);
    setDrawShapeTool(null);
    nv.opts.deferFreehandCommit = false;
    nv.opts.polylinePenMode = false;
    nvSetDrawingEnabled(false);
    resampleImage();
  }

  function ensureToolKindBitmap() {
    if (!nv.drawBitmap) return;
    if (!nv._cloudMrToolKindBitmap || nv._cloudMrToolKindBitmap.length !== nv.drawBitmap.length) {
      nv._cloudMrToolKindBitmap = new Uint8Array(nv.drawBitmap.length);
    }
  }

  function markShapeVoxelKind(draft) {
    if (!nv.drawBitmap || !draft?.baseBitmap) return;
    ensureToolKindBitmap();
    const tkb = nv._cloudMrToolKindBitmap;
    for (let i = 0; i < nv.drawBitmap.length; i++) {
      if (nv.drawBitmap[i] === draft.penValue && draft.baseBitmap[i] !== draft.penValue) {
        tkb[i] = 1; // shape
      }
    }
  }

  function markPenVoxelKind(draft, kind) {
    if (!nv.drawBitmap) return;
    ensureToolKindBitmap();
    const tkb = nv._cloudMrToolKindBitmap;
    const dims = nv.back?.dims;
    if (draft.kind === "polyline") {
      for (const idx of collectPolylineAppliedVoxelIndices(nv, draft)) {
        tkb[idx] = kind;
      }
      return;
    }
    if (draft.kind === "freehand" && draft.strokeVoxels && dims) {
      const dx = dims[1];
      const dy = dims[2];
      for (const [x, y, z] of draft.strokeVoxels) {
        tkb[x + y * dx + z * dx * dy] = kind;
      }
    } else if (draft.baseBitmap) {
      for (let i = 0; i < nv.drawBitmap.length; i++) {
        if (nv.drawBitmap[i] === draft.penValue && draft.baseBitmap[i] !== draft.penValue) {
          tkb[i] = kind;
        }
      }
    }
  }

  function applyActiveDraftIfAny() {
    if (shapeDraftRef.current) {
      applyShapeDraft();
    } else if (penDraftRef.current) {
      applyPenDraftHandler();
    }
  }

  function applyShapeDraft({ keepTool = false } = {}) {
    const draft = shapeDraftRef.current;
    if (!draft) return;
    nv.drawAddUndoBitmap(nv.drawFillOverwrites);
    markShapeVoxelKind(draft);
    const registryId = registerAppliedShape(nv, draft, {
      existingId: draft._registryId,
      eroded: (draft.shapeVoxels?.length ?? 0) > 0,
    });
    if (registryId != null) {
      draft._registryId = registryId;
    }
    setDrawingChanged(true);
    setShapeDraft(null);
    shapeDraftRef.current = null;
    nv._cloudMrShapeDraftActive = false;
    if (!keepTool) {
      // Deactivate tool entirely — palette closes, user re-enters edit by clicking the ROI
      setDrawShapeTool(null);
      nv.opts.deferShapeCommit = false;
      nv.opts.penType = NI_PEN_TYPE.PEN;
      nvSetDrawingEnabled(false);
    }
    resampleImage();
  }

  function onShapeDraftChange(draft) {
    setShapeDraft(draft);
    shapeDraftRef.current = draft;
  }

  nv.onShapeDraftReady = (draft) => {
    applyNvBrushSize(1);
    setShapeDraft(draft);
    shapeDraftRef.current = draft;
    nv._cloudMrShapeDraftActive = true;
    // Auto-select the correct tool so the palette opens on re-entry via ROI click
    const tool = draft.penType === NI_PEN_TYPE.ELLIPSE ? "ellipse" : "rectangle";
    setDrawShapeTool(tool);
    nv.opts.penType = draft.penType;
    nv.opts.deferShapeCommit = true;
    nvSetDrawingEnabled(false);
    // Sync palette to the reopened shape's color so the user can change it.
    if (draft.penValue != null) {
      setDrawPen(draft.penValue);
      nv.setPenValue(draft.penValue, false);
    }
  };

  nv.onApplyActiveDraft = () => {
    applyActiveDraftIfAny();
  };

  React.useEffect(() => {
    nv._cloudMrPenDraftActive = penDraft != null;
  }, [penDraft]);

  React.useEffect(() => {
    nv._cloudMrShapeDraftActive = shapeDraft != null;
  }, [shapeDraft]);

  React.useEffect(() => {
    if (!shapeDraft && !penDraft) {
      return undefined;
    }
    const canvas = document.getElementById("niiCanvas");
    if (!canvas) {
      return undefined;
    }

    const applyOnRightClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      nv.onApplyActiveDraft?.();
    };

    const onMouseDown = (event) => {
      if (event.button === 2) {
        applyOnRightClick(event);
      }
    };

    canvas.addEventListener("mousedown", onMouseDown, true);
    canvas.addEventListener("contextmenu", applyOnRightClick, true);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown, true);
      canvas.removeEventListener("contextmenu", applyOnRightClick, true);
    };
  }, [shapeDraft, penDraft]);

  React.useEffect(() => {
    if (!shapeDraft && !penDraft) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (shapeDraft) {
          applyShapeDraft();
        } else if (penDraft) {
          applyPenDraftHandler();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shapeDraft, penDraft]);

  function nvUpdateSelectionBoxColor(rgb01) {
    setSelectionBoxColor([...rgb01, 0.5])
    nv.setSelectionBoxColor([...rgb01, 0.5])
  }

  const [sliceType, setSliceType] = React.useState('axial')
  const axialOnlyView = isAxialOnlyVolume(props.niis?.[selectedVolume]);
  const absoluteOnlyView = isAbsoluteOnlyVolume(props.niis?.[selectedVolume]);

  function nvUpdateSliceType(newSliceType) {
    if (axialOnlyView && newSliceType !== 'axial') return;
    setSliceType(newSliceType);
    if (newSliceType === 'axial') {
      nv.setSliceType(nv.sliceTypeAxial)
    } else if (newSliceType === 'coronal') {
      nv.setSliceType(nv.sliceTypeCoronal)
    } else if (newSliceType === 'sagittal') {
      nv.setSliceType(nv.sliceTypeSagittal)
    } else if (newSliceType === 'multi') {
      nv.setSliceType(nv.sliceTypeMultiplanar)
    } else if (newSliceType === '3d') {
      nv.setSliceType(nv.sliceTypeRender)
    }
    nvSetDragMode(dragModeRef.current); // some Niivue builds reset interaction on slice change
    // Re-apply world/voxel mode and last crosshair after slice type changes
    nv.setSliceMM(worldSpace);
    //applySavedCrosshairIfAny();
  }

  function nvUpdateLayerOpacity(a) {
    setopacity(a)
    nv.updateGLVolume()
  }

  function nvUpdateColorMap(id, clr) {
    nv.setColorMap(id, clr)
    let volume = nv.volumes[0];
    setMin(volume.cal_min);
    setMax(volume.cal_max);
  }

  function nvRemoveLayer(imageToRemove) {
    nv.removeVolume(imageToRemove)
    setLayers([...nv.volumes])
  }

  function stylingProxy(nii) {
    if (isAbsoluteOnlyVolume(nii)) {
      if (complexMode !== 'absolute' && nv.volumes[0]?.absolute) {
        nvSetDisplayedVoxels('absolute');
      }
    }
    if (isAxialOnlyVolume(nii)) {
      nvUpdateSliceType('axial');
      setShowCrosshair(false);
      setTextsVisible(false);
      nv.opts.crosshairWidth = 0;
      nv.hideText = true;
    } else {
      nvUpdateSliceType(sliceType);
      setShowCrosshair(false);
      setTextsVisible(false);
      nv.opts.crosshairWidth = 0;
      nv.hideText = true;
    }
    nv._cloudMrDefaultZoom = CLOUDMR_DEFAULT_VIEW_ZOOM;
    if (nv.volumes.length > 0) {
      setTimeout(() => nv.applyDefaultViewState?.(), 300);
    }
  }

  const selectVolume = async (volumeIndex) => {
    const openVolume = async () => {
      loadingVolumeIndexRef.current = volumeIndex;
      nv.closeDrawing();
      setDrawingChanged(false);
      if (drawingEnabled)
        nvUpdateDrawingEnabled();

      // Snapshot gamma, opacity and colormap so onImageLoaded can restore them
      const vol = nv.volumes[0];
      const nextNii = props.niis[volumeIndex];
      savedViewStateRef.current = {
        gamma,
        opacity,
        colormap: defaultColormapForVolume(nextNii),
      };

      if (props.niis[selectedVolume] !== undefined) {
        nv.removeVolume(niiToVolume(props.niis[selectedVolume]));
      }
      try {
        await nv.loadVolumes([niiToVolume(props.niis[volumeIndex])]);
        nvSetDragMode(dragModeRef.current); // re-apply user's drag mode after Niivue resets
        // Re-apply world/voxel mode and last crosshair after loading a new volume
        nv.setSliceMM(worldSpace);
        //applySavedCrosshairIfAny();

        // ensure engine mode matches the remembered selection (axial-only volumes force axial)
        const nextNii = props.niis[volumeIndex];
        nvUpdateSliceType(isAxialOnlyVolume(nextNii) ? 'axial' : sliceType);
        nv.opts.crosshairWidth = showCrosshair ? crosshairSize : 0;
      } catch (e) {
        setWarning("Error loading results, please check internet connectivity");
        setWarningOpen(true);
        setTimeout(() => {
          setWarningOpen(false);
          setWarning("");
        }, 2500)
        return;
      }
      setSelectedVolume(volumeIndex);
      setSelectedDrawingLayer('');
      // CloudMrNiivuePanel remounts on selectedVolume; re-apply after that commit.
      setTimeout(() => nvSetDragMode(dragModeRef.current), 0);
    }
    // In case that changes has been made
    if (drawingChanged) {
      setWarningConfirmationCallback(() => (() => {
        saveDrawingLayer(async () => {
            await props.refreshPipelineRois?.();
            setSaving(false);
            openVolume();
        }, () => {
          setSaving(true);
        });
      }));
      setWarningCancelCallback(() => (() => {
        openVolume();
      }));
      setConfirmationOpen(true);
    } else
      openVolume();
  }
  const [selectedROI, setSelectedDrawingLayer] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveConfirmCallback, setSaveConfirmCallback] = useState(() => {
  });

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [warningConfirmationCallback, setWarningConfirmationCallback] = useState(() => { });
  const [warningCancelCallback, setWarningCancelCallback] = useState(() => { });
  const [drawingChanged, setDrawingChanged] = useState(false);

  // When new drawing strokes are made on top of a saved ROI, reset the dropdown
  // so it shows the "ROI Layer" placeholder instead of the stale saved name.
  React.useEffect(() => {
    if (drawingChanged && selectedROI !== '') {
      setSelectedDrawingLayer('');
    }
  }, [drawingChanged]);

  const setLabelAlias = function (label, alias) {
    labelMapping[label] = alias;
    setLabelMapping(labelMapping);
    resampleImage(labelMapping);
  }
  const zipAndSendDrawingLayer = async function (uploadURL, filename, blob) {
    let zip = new JSZip();
    let descriptor = {
      "data": [
        {
          "filename": `${filename}.nii`,
          "id": 1,
          "name": filename,
          "type": 'image',
          // "numpyPixelType": "complex64",
          // "pixelType": "complex"
          "labelMapping": labelMapping
        }
      ]
    }
    zip.file("info.json", JSON.stringify(descriptor));
    zip.file(`${filename}.nii`, blob, { base64: true });
    let content = await zip.generateAsync({ type: "blob" });
    const file = new File([content], filename, {
      type: content.type,
      lastModified: Date.now()
    });
    // Upload to bucket
    await axios.put(uploadURL, file, {
      headers: {
        'Content-Type': "application/octet-stream"
      }
    });
  }

  /** @param mergeIntoExisting - if true (ROI upload), merge into current drawing; if false (pick saved ROI), replace */
  const unzipAndRenderDrawingLayer = async (accessURL, mergeIntoExisting = false) => {
    // console.log(props.rois[roiIndex]);
    // console.trace();

    // Fetch the file from the URL
    const response = await fetch(accessURL);

    // Check if the request was successful
    if (!response.ok) {
      props.warn('Failed to load the requested ROI Layer (was not properly saved)')
      return;
    }
    // Convert the response to a Blob
    const blob = await response.blob();
    // Create a new JSZip instance
    const zip = new JSZip();
    await zip.loadAsync(blob);

    // Check if info.js exists in the zip
    const fileInfo = zip.file("info.json");
    if (fileInfo) {
      // Read the content of info.js
      const content = await fileInfo.async("string");
      let info = JSON.parse(content);
      let niiFilePath = info.data[0].filename;
      const importedLabels = info.data[0].labelMapping || {};
      const niiDrawing = zip.file(niiFilePath);
      if (niiDrawing) {
        // Read the content as a blob
        const base64 = await niiDrawing.async("base64");
        console.log(niiFilePath);
        if (mergeIntoExisting && typeof nv.mergeDrawingFromBase64 === 'function') {
          const mergeResult = await nv.mergeDrawingFromBase64(niiFilePath, base64);
          if (!mergeResult || !mergeResult.ok) {
            props.warn('Failed to merge ROI upload (invalid file or size mismatch with volume).');
            return null;
          }
          if (mergeResult.importLabelRemap === null) {
            setLabelMapping(importedLabels);
            resampleImage(importedLabels);
          } else {
            const merged = { ...labelMapping };
            for (const [oldL, newId] of Object.entries(mergeResult.importLabelRemap)) {
              const oldN = Number(oldL);
              const newN = Number(newId);
              const alias =
                oldN === newN
                  ? (importedLabels[oldL] ??
                    importedLabels[String(oldL)] ??
                    String(newId))
                  : String(newId);
              merged[String(newId)] = alias;
            }
            setLabelMapping(merged);
            resampleImage(merged);
          }
        } else {
          await nv.loadDrawingFromBase64(niiFilePath, base64);
          setLabelMapping(importedLabels);
          resampleImage(importedLabels);
        }

      } else {
        console.log(`${niiFilePath} not found in the ZIP file.`);
        return null;
      }
      // return content;
    } else {
      console.log("info.json not found in the ZIP file.");
      return null;
    }
  };


  // Normalize ROI.data.sliceMM into [number, number, number]
  function getSavedSliceMMFromROI(roi) {
    try {
      const raw = roi?.data?.sliceMM;
      if (!raw) return null;

      // Case A: already an array
      if (Array.isArray(raw)) {
        const arr = raw.slice(0, 3).map(v => typeof v === 'string' ? parseFloat(v) : v);
        return arr.every(Number.isFinite) ? arr : null;
      }

      // Case B: object like {0:'125.29', 1:'162.80', 2:'-18.83', 3:1}
      if (typeof raw === 'object') {
        const arr = [raw[0], raw[1], raw[2]].map(v => typeof v === 'string' ? parseFloat(v) : v);
        return arr.every(Number.isFinite) ? arr : null;
      }

      return null;
    } catch {
      return null;
    }
  }

  const selectDrawingLayer = async (roiIndex) => {
    // console.log(nv.drawBitmap);
    console.log(props.rois[roiIndex].link);

    await unzipAndRenderDrawingLayer(props.rois[roiIndex].link);
    // If this ROI carries a saved slice position, jump to it
    try {
      // Log raw & normalized for debugging
      console.log('ROI sliceMM (raw):', props.rois?.[roiIndex]?.data?.sliceMM);
      const sliceMM = getSavedSliceMMFromROI(props.rois?.[roiIndex]);
      console.log('ROI sliceMM (normalized):', sliceMM);
      if (sliceMM) {
        // Ensure engine uses the currently selected coordinate system
        nv.setSliceMM(worldSpace);
        const frac = nv.mm2frac(sliceMM);
        console.log(1, frac)
        // if (Array.isArray(frac) && frac.length === 3) {
        console.log(2, frac)
        nv.scene.crosshairPos = frac;
        nv.drawScene()////;
        // use fresh array to guarantee React state update
        setMMs(nv.frac2mm(frac));
        // }
      }
    } catch (e) {
      // Intentionally ignore, if conversion fails we simply skip re-applying
    }

    setSelectedDrawingLayer(roiIndex);
    setDrawingChanged(false);
  }
  const unpackROI = async (accessURL) => {
    await unzipAndRenderDrawingLayer(accessURL, true);
    setDrawingChanged(false);
    setSelectedDrawingLayer(props.rois.length);
  }
  const refreshROI = async () => {
    let roiIndex = selectedROI;
    console.log(nv.drawBitmap);
    const load = () => {
      console.log(props.rois[roiIndex].link);
      console.trace();
      nv.loadDrawingFromUrl(props.rois[roiIndex].link).then((value) => {
        resampleImage();
      });
      setSelectedDrawingLayer(roiIndex);
      setDrawingChanged(false);
    };
    load();
  }

  const saveDrawingLayer = (afterSaveCallback, preSaveCallback = () => { }) => {
    setSaveDialogOpen(true);
    setSaveConfirmCallback(() => (async (filename) => {
      preSaveCallback();
      const config = {
        headers: {
          Authorization: `Bearer ${props.accessToken}`,
        },
      };

      // Capture the current crosshair in millimeters; fall back safely if needed
      let sliceMM = undefined;
      try {
        // Niivue keeps crosshair in fractional coords; convert to mm
        sliceMM = nv.frac2mm(nv.scene.crosshairPos);
      } catch (e) {
        // If conversion fails, use the last known mm state if you keep one,
        // or omit the field, sliceMM stays undefined in that case.
        console.log("Error with saving crosshair")
      }

      const response = await AuthenticatedHttpClient.post(endpoints.ROI_UPLOAD, {
        "filename": `${filename}`,
        "pipeline_id": props.pipelineID,
        "type": "image",
        "contentType": "application/octet-stream",
        data: sliceMM ? { sliceMM } : {} // persist current slice position (mm) into ROI.data dictionary
      }, config);

      console.log('Save ROI response:', response.data);
      console.log('Sent ROI payload sliceMM:', sliceMM);

      // Monkey patch object URL creation
      // Store the original URL.createObjectURL method
      const originalCreateObjectURL = URL.createObjectURL;
      // Redefine the method
      URL.createObjectURL = function (blob) {
        console.log('saving blob');
        console.log(blob);
        zipAndSendDrawingLayer(response.data.upload_url, filename, blob).then(async () => {
          // Update available rois with this callback
          // props.saveROICallback();
          setDrawingChanged(false);
          if (afterSaveCallback instanceof Function)
            await afterSaveCallback();
          // Read fresh ROI list from Redux store (afterSaveCallback already dispatched
          // getPipelineROI, so the store is up-to-date by the time we get here)
          const freshRois = props.getPipelineRois?.() ?? [];
          const savedIndex = freshRois.findIndex(r => r.filename === filename);
          setSelectedDrawingLayer(savedIndex !== -1 ? savedIndex : freshRois.length - 1);
        });
        // Call the original method and return its result
        return 'javascript:void(0);';
      };

      // False if nothing has been drawn on canvas
      // NiiVue 0.68+ saveImage is async — await it so the de-patch runs AFTER
      // NiiVue has called the monkey-patched URL.createObjectURL internally.
      let successful = await nv.saveImage({
        filename,
        isSaveDrawing: true,
      });
      // De-patch
      URL.createObjectURL = originalCreateObjectURL;
    }));
  }

  const drawToolkitProps = {
    nv,
    volumes: props.niis.map(niiToVolume),
    selectedVolume,
    setSelectedVolume: selectVolume,
    updateDrawPen: nvUpdateDrawPen,
    drawPen: drawPen,
    drawingEnabled: drawingEnabled,
    setDrawingEnabled: nvSetDrawingEnabled,
    showColorBar: colorBar,
    toggleColorBar: nvUpdateColorBar,
    changesMade: drawingChanged,
    // toggleSampleDistribution,
    drawUndo: () => {//To be moved and organized
      if (shapeDraftRef.current) {
        cancelShapeDraft();
        return;
      }
      if (penDraftRef.current) {
        cancelPenDraftHandler();
        return;
      }
      nv.drawUndo();
      resampleImage();
      if (nv.drawBitmap && nv.drawBitmap.every(v => v === 0)) {
        setDrawingChanged(false);
      }
    },
    resampleImage: resampleImage,
    roiVisible,
    toggleROIVisible,
    drawingOpacity,
    setDrawingOpacity: nvUpdateDrawingOpacity,
    setDrawingChanged,
    penDrawMode,
    onPenDrawModeChange: syncPenDrawMode,
    polylineVertexCount,
    onCancelPolyline: cancelPolylineDraft,
    onApplyPenDraft: applyPenDraftHandler,
    onCancelPenDraft: cancelPenDraftHandler,
    onDeletePenDraft: deletePenDraftHandler,
    onDeleteShapeDraft: deleteShapeDraftHandler,
    onFillPenDraft: fillPolylineDraftHandler,
    penDraftActive: penDraft != null,
    penDraftKind: penDraft?.kind,
    penDraftFilled: penDraft?.filled === true,
    brushSize,
    updateBrushSize: nvUpdateBrushSize,
    eraserSize,
    updateEraserSize: nvUpdateEraserSize,
    onActivateEraser: activateEraser,
    onDeactivateDrawTools: deactivateDrawTools,
    onClearDrawing: clearDrawingHandler,
  };
  return (
    <NiivueViewerThemeProvider accentColor={props.accentColor}>
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    >
      <SettingsPanel
        open={openSettings}
        width={300}
        toggleMenu={toggleSettings}
      >
        <ColorPicker
          colorRGB01={backColor}
          onSetColor={nvUpdateBackColor}
          title={'Background color'}
        >
        </ColorPicker>
        <ColorPicker
          colorRGB01={clipPlaneColor}
          onSetColor={nvUpdateClipPlaneColor}
          title={'Clip plane color'}
        >
        </ColorPicker>
        <NumberPicker
          value={clipPlaneOpacity}
          onChange={nvUpdateClipPlaneOpacity}
          title={'Clip plane opacity'}
          min={0}
          max={1}
          step={0.1}
        >
        </NumberPicker>
        <ColorPicker
          colorRGB01={crosshairColor}
          onSetColor={nvUpdateCrosshairColor}
          title={'Crosshair color'}
        >
        </ColorPicker>
        <NumberPicker
          value={crosshairOpacity}
          onChange={nvUpdateCrosshairOpacity}
          title={'Crosshair opacity'}
          min={0}
          max={1}
          step={0.1}
        >
        </NumberPicker>
        <ColorPicker
          colorRGB01={selectionBoxColor}
          onSetColor={nvUpdateSelectionBoxColor}
          title={'Selection box color'}
        >
        </ColorPicker>
        <NumberPicker
          value={crosshairSize}
          onChange={nvUpdateCrosshairSize}
          title={'Crosshair size'}
          min={0}
          max={10}
          step={1}
        >
        </NumberPicker>
        <NumberPicker
          value={textSize}
          onChange={nvUpdateTextSize}
          title={'Text size'}
          min={0}
          max={0.2}
          step={0.01}
        >
        </NumberPicker>
        <ColorPicker
          colorRGB01={rulerColor}
          onSetColor={nvUpdateRulerColor}
          title={'Ruler color'}
        >
        </ColorPicker>
        <NumberPicker
          value={rulerWidth}
          onChange={nvUpdateRulerWidth}
          title={'Ruler thickness'}
          min={0}
          max={10}
          step={1}
        >
        </NumberPicker>
        <NumberPicker
          value={rulerOpacity}
          onChange={nvUpdateRulerOpacity}
          title={'Ruler opacity'}
          min={0}
          max={1}
          step={0.1}
        >
        </NumberPicker>
        <NumberPicker
          value={opacity}
          onChange={nvUpdateOpacity}
          title={'Opacity'}
          min={0}
          max={1}
          step={0.01}
        >
        </NumberPicker>
        <NumberPicker
          value={drawOpacity}
          onChange={nvUpdateDrawOpacity}
          title={'Draw Opacity'}
          min={0}
          max={1}
          step={0.01}
        >
        </NumberPicker>
        <label htmlFor="drawPen">Draw color:</label>
        <select name="drawPen" id="drawPen" onChange={nvUpdateDrawPen} value={drawPen}>
          <option value="0">Erase</option>
          <option value="1">Red</option>
          <option value="2">Green</option>
          <option value="3">Blue</option>
          <option value="8">Filled Erase</option>
          <option value="9">Filled Red</option>
          <option value="10">Filled Green</option>
          <option value="11">Filled Blue</option>
          <option value="12">Erase Selected Cluster</option>
        </select>
        <Button
          title={'Save image'}
          onClick={nvSaveImage}
        >
          Save image
        </ Button>
        <NVSwitch
          checked={locationTableVisible}
          title={'Location table'}
          onChange={toggleLocationTable}
        >
        </NVSwitch>
        <NVSwitch
          checked={drawingEnabled}
          title={'Enable drawing'}
          onChange={nvUpdateDrawingEnabled}
        >
        </NVSwitch>
        <NVSwitch
          checked={orientCube}
          title={'Orientation cube'}
          onChange={nvUpdateOrientCube}
        >
        </NVSwitch>
        <NVSwitch
          checked={ruler}
          title={'Ruler'}
          onChange={nvUpdateRuler}
        >
        </NVSwitch>
        <NVSwitch
          checked={clipPlane}
          title={'Clip plane'}
          onChange={nvUpdateClipPlane}
        >
        </NVSwitch>
        <NVSwitch
          checked={cornerText}
          title={'Corner text'}
          onChange={nvUpdateCornerText}
        >
        </NVSwitch>
        <NVSwitch
          checked={radiological}
          title={'radiological'}
          onChange={nvUpdateRadiological}
        >
        </NVSwitch>
        <NVSwitch
          checked={crosshair3D}
          title={'3D crosshair'}
          onChange={nvUpdateCrosshair3D}
        >
        </NVSwitch>
        <NVSwitch
          checked={colorBar}
          title={'Show color bar'}
          onChange={nvUpdateColorBar}
        >
        </NVSwitch>
        <NVSwitch
          checked={worldSpace}
          title={'World space'}
          onChange={nvUpdateWorldSpace}
        >
        </NVSwitch>
        <NVSwitch
          checked={sagittalNoseLeft}
          title={'Nose left'}
          onChange={nvUpdateSagittalNoseLeft}
        >
        </NVSwitch>
        <NVSwitch
          checked={dragToMeasure}
          title={'Drag to measure'}
          onChange={nvUpdateDragToMeasure}
        >
        </NVSwitch>
        <NVSwitch
          checked={highDPI}
          title={'High DPI'}
          onChange={nvUpdateHighDPI}
        >
        </NVSwitch>
        <NumberPicker
          value={decimalPrecision}
          onChange={updateDecimalPrecision}
          title={'Decimal precision'}
          min={0}
          max={8}
          step={1}
        >
        </NumberPicker>
        <NumberPicker
          value={multiplanarPadPixels}
          onChange={nvUpdateMultiplanarPadPixels}
          title={'Multiplanar padding'}
          min={0}
          max={20}
          step={2}
        >
        </NumberPicker>
        <NumberPicker
          value={maxDrawUndoBitmaps}
          onChange={nvUpdateMaxDrawUndoBitmaps}
          title={'Max Draw Undos'}
          min={8}
          max={28}
          step={1}
        >
        </NumberPicker>
        <NumberPicker
          value={longTouchTimeout}
          onChange={nvUpdateLongTouchTimeout}
          title={'Long touch timeout msec'}
          min={1000}
          max={5000}
          step={100}
        >
        </NumberPicker>
        <NumberPicker
          value={doubleTouchTimeout}
          onChange={nvUpdateDoubleTouchTimeout}
          title={'Double touch timeout msec'}
          min={500}
          max={999}
          step={25}
        >
        </NumberPicker>
      </SettingsPanel>
      <LayersPanel
        open={openLayers}
        width={320}
        onToggleMenu={toggleLayers}
        onAddLayer={addLayer}
      >
        {layerList}
      </LayersPanel>
      <Toolbar
        nv={nv}
        nvUpdateSliceType={nvUpdateSliceType}
        sliceType={sliceType}
        axialOnlyView={axialOnlyView}
        absoluteOnlyView={absoluteOnlyView}

        toggleSettings={toggleSettings}
        toggleLayers={toggleLayers}
        volumes={props.niis.map(niiToVolume)}
        selectedVolume={selectedVolume}
        setSelectedVolume={selectVolume}
        showColorBar={colorBar}
        toggleColorBar={nvUpdateColorBar}
        rois={props.rois}
        selectedROI={selectedROI}
        refreshROI={refreshROI}
        setSelectedROI={selectDrawingLayer}
        toggleShowCrosshair={nvUpdateCrosshair}
        showCrosshair={showCrosshair}
        dragMode={dragMode}
        setDragMode={nvSetDragMode}
        toggleRadiological={nvUpdateRadiological}
        radiological={radiological}
        saveROI={saveDrawingLayer}
        complexMode={complexMode}
        setComplexMode={nvSetDisplayedVoxels}
        complexOptions={complexOptions}

        labelsVisible={textsVisible}
        toggleLabelsVisible={nvToggleLabelVisible}

        crosshairColor={crosshairColor}
        crosshairOpacity={crosshairOpacity}
        crosshairSize={crosshairSize}
        onCrosshairColorChange={(rgb01, opacity) => nvUpdateCrosshairColor(rgb01, opacity)}
        onCrosshairOpacityChange={(opacity) => nvUpdateCrosshairOpacity(opacity)}
        onCrosshairSizeChange={(size) => nvUpdateCrosshairSize(size)}
        backgroundColor={backColor}
        onBackgroundColorChange={(rgb01) => nvUpdateBackColor(rgb01)}
        labelColor={fontColor}
        onLabelColorChange={(rgb01) => nvUpdateFontColor(rgb01)}

        saving={saving}
        setSaving={setSaving}

        drawingChanged={drawingChanged}

        resampleImage={resampleImage}

        accessToken={props.accessToken}
        pipelineId={props.pipelineID}
        roiDeleteUrl={props.roiDeleteUrl}
        refreshPipelineRois={props.refreshPipelineRois}

      />
      <CmrConfirmation name={'New Changes Made'} message={"Consider saving your drawing before switching."}
        open={confirmationOpen} setOpen={setConfirmationOpen} cancellable={true}
        confirmCallback={warningConfirmationCallback}
        cancelCallback={warningCancelCallback} cancelText={"Don't save"}
      />
      <CmrEditConfirmation name={'Save drawings'}
        message={'Please enter the name of the saved drawing'}
        open={saveDialogOpen} setOpen={setSaveDialogOpen}
        confirmCallback={saveConfirmCallback}
        cancellable={true}
        cancelCallback={() => {
        }}
        // suffix={'.zip'}
        defaultText={(props.rois[selectedROI] !== undefined ?
          props.rois[selectedROI].filename : undefined)}
      />

      {props.niis[selectedVolume] != undefined && <CloudMrNiivuePanel
        nv={nv}
        key={`${selectedVolume}`}
        dragMode={dragMode}
        transformFactors={transformFactors}

        decimalPrecision={decimalPrecision}
        locationData={locationData}
        locationTableVisible={locationTableVisible}
        pipelineID={props.pipelineID}

        resampleImage={resampleImage}
        rois={rois}

        drawToolkitProps={drawToolkitProps}

        drawShapeTool={drawShapeTool}
        setDrawShapeTool={setDrawShapeTool}

        mins={boundMins}
        maxs={boundMaxs}
        mms={mms}
        vox={vox}
        sliceCount={props.sliceCount}
        sliceType={sliceType}
        worldSpace={worldSpace}
        onWorldSpaceChange={nvUpdateWorldSpace}

        min={min}
        max={max}
        setMin={setMin}
        setMax={setMax}

        unzipAndRenderROI={unpackROI}
        zipAndSendROI={zipAndSendDrawingLayer}
        setLabelAlias={setLabelAlias}
        onAfterRoiUpload={() => {
          void props.refreshPipelineRois?.();
        }}

        gamma={gamma}
        gammaKey={gammaKey}
        setGamma={setGamma}
        layerList={layerList.filter(Boolean)}

        shapeDraft={shapeDraft}
        onShapeDraftChange={onShapeDraftChange}
        onApplyShapeDraft={() => applyShapeDraft()}
        onApplyShapeDraftKeepTool={() => applyShapeDraft({ keepTool: true })}
        onCancelShapeDraft={cancelShapeDraft}
        penDraft={penDraft}
        onPenDraftChange={onPenDraftChange}
        onApplyPenDraft={() => applyPenDraftHandler()}
        onApplyPenDraftKeepTool={() => applyPenDraftHandler({ keepTool: true })}
        onCancelPenDraft={cancelPenDraftHandler}
      />}
    </Box>
    </NiivueViewerThemeProvider>
  )
}


function niiToVolume(nii) {
  return {
    //URL is for NiiVue blob loading
    url: nii.link,
    //name is for NiiVue name replacer (needs proper extension like .nii)
    name: (nii.filename.split('/').pop()),
    //alias is for user selection in toolbar
    alias: nii.name
  };
}

/** 2D matrix results (noise covariance, noise coefficients, etc.) only support axial view. */
function isAxialOnlyVolume(nii) {
  if (!nii) return false;
  if (nii.dim === 2) return true;
  return isNoiseCoefficientOrCovarianceVolume(nii);
}

/** Noise coefficient / covariance maps use the "jet" colormap by default. */
function isNoiseCoefficientOrCovarianceVolume(nii) {
  if (!nii) return false;
  const label = `${nii.name || ""} ${nii.type || ""} ${nii.filename || ""}`.toLowerCase();
  return (
    label.includes("noise covariance") ||
    label.includes("noise coefficients") ||
    label.includes("noise coefficient")
  );
}

/** Inverse g-factor maps use the "hot" colormap by default. */
function isInverseGFactorVolume(nii) {
  if (!nii) return false;
  const label = `${nii.name || ""} ${nii.type || ""} ${nii.filename || ""}`.toLowerCase();
  return (
    label.includes("inverse g factor") ||
    label.includes("inverse g-factor") ||
    label.includes("inverse gfactor") ||
    label.includes("inverse g")
  );
}

/** SNR maps use the "viridis" colormap by default. */
function isSnrVolume(nii) {
  if (!nii) return false;
  const label = `${nii.name || ""} ${nii.type || ""} ${nii.filename || ""}`.toLowerCase();
  return label.includes("snr");
}

function defaultColormapForVolume(nii) {
  if (isInverseGFactorVolume(nii)) return 'hot';
  if (isNoiseCoefficientOrCovarianceVolume(nii)) return 'jet';
  if (isSnrVolume(nii)) return 'viridis';
  return 'gray';
}

/** SNR, g-factor maps, inverse g-factor, and noise coefficients are magnitude-only. */
function isAbsoluteOnlyVolume(nii) {
  if (!nii) return false;
  const label = `${nii.name || ""} ${nii.type || ""} ${nii.filename || ""}`.toLowerCase();
  if (isNoiseCoefficientOrCovarianceVolume(nii)) return true;
  if (isInverseGFactorVolume(nii)) return true;
  if (
    label.includes("g factor") ||
    label.includes("g-factor") ||
    /\bgfactor\b/.test(label)
  ) return true;
  if (isSnrVolume(nii)) return true;
  return false;
}