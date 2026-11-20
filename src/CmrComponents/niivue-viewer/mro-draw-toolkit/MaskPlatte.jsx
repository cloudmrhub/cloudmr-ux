import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Stack, IconButton, Typography, Box } from "@mui/material";
import RoiColorSwatches from "./RoiColorSwatches";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { InvertibleDualSlider, CmrCheckbox } from "cloudmr-ux";

var __assign = function () {
  __assign =
    Object.assign ||
    function (t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
    };
  return __assign.apply(this, arguments);
};

var MaskPlatte = function (_a) {
  var expanded = _a.expanded,
    nv = _a.nv,
    setMaskColor = _a.setMaskColor,
    resampleImage = _a.resampleImage,
    palette = _a.palette,
    onAddRoiColor = _a.onAddRoiColor,
    onRemoveRoiColor = _a.onRemoveRoiColor,
    unfocus = _a.unfocus;
  // ROI label (1..255) the mask is written with; its colour comes from the shared ROI palette
  var _b = useState(1),
    maskLabel = _b[0],
    storeMaskLabel = _b[1];
  var maskColor = (
    (palette || []).filter(function (entry) {
      return entry.label === maskLabel;
    })[0] || { color: "#ff0000" }
  ).color;
  var _d = useState(false),
    checked = _d[0],
    setChecked = _d[1];
  var _e = useState(undefined),
    original = _e[0],
    setOriginal = _e[1];
  if (expanded) {
    setMaskColor(maskColor);
  } else {
    setMaskColor(undefined);
  }
  var _f = useState(nv.volumes[0] ? nv.volumes[0].vox_min : 0),
    min = _f[0],
    setMin = _f[1];
  var _g = useState(nv.volumes[0] ? nv.volumes[0].vox_max : 1),
    max = _g[0],
    setMax = _g[1];
  var cancelMask = function () {
    if (original) nv.drawBitmap = new Uint8Array(original);
    else return;
    nv.refreshDrawing(true);
    resampleImage();
    setOriginal(undefined);
  };
  useEffect(
    function () {
      if (!expanded) {
        cancelMask();
      } else {
        nv.fillRange(min, max, maskLabel, checked, original, setOriginal);
        resampleImage();
      }
    },
    [expanded]
  );
  useEffect(
    function () {
      if (expanded) nv.fillRange(min, max, maskLabel, checked, original, setOriginal);
    },
    [min, max, checked]
  );
  return _jsxs(
    Stack,
    __assign(
      {
        style: {
          position: "absolute",
          top: "100%",
          left: 0,
          zIndex: expanded ? 1500 : 0,
          border: "".concat(expanded ? "1px" : 0, " solid #bbb"),
          maxWidth: expanded ? 450 : 0,
          overflow: expanded ? "visible" : "hidden",
          pointerEvents: expanded ? "auto" : "none",
          visibility: expanded ? "visible" : "hidden",
          borderRadius: "16px",
          borderTopLeftRadius: "6pt",
          borderTopRightRadius: "6pt",
          background: "#333",
        },
        direction: "column",
      },
      {
        children: [
          _jsx(
            Stack,
            __assign(
              { alignItems: "center" },
              {
                children: _jsx(
                  Typography,
                  __assign(
                    {
                      color: "white",
                      gutterBottom: true,
                      width: "100%",
                      marginLeft: "10pt",
                      fontSize: "11pt",
                      alignItems: "start",
                    },
                    { children: "Mask range:" }
                  )
                ),
              }
            )
          ),
          _jsx(RoiColorSwatches, {
            palette: palette,
            currentLabel: maskLabel,
            onAddColor: onAddRoiColor,
            onRemoveColor: function (label) {
              var removed = onRemoveRoiColor ? onRemoveRoiColor(label) : false;
              // the mask was written with this label: fall back to the default colour
              if (removed && label === maskLabel) {
                storeMaskLabel(1);
                nv.fillRange(min, max, 1, checked, original, setOriginal);
                resampleImage();
              }
              return removed;
            },
            onSelect: function (label) {
              storeMaskLabel(label);
              var entry = (palette || []).filter(function (e) {
                return e.label === label;
              })[0];
              setMaskColor(entry ? entry.color : undefined);
              nv.fillRange(min, max, label, checked, original, setOriginal);
              resampleImage();
            },
          }),
          _jsxs(
            Stack,
            __assign(
              { direction: "row", flexDirection: "row", justifyContent: "center" },
              {
                children: [
                  _jsx(
                    CmrCheckbox,
                    __assign(
                      {
                        style: { color: "white" },
                        onChange: function (e) {
                          e.stopPropagation();
                          setChecked(e.target.checked);
                          resampleImage();
                        },
                      },
                      { children: "Inverted" }
                    )
                  ),
                ],
              }
            )
          ),
          _jsx(
            Stack,
            __assign(
              { direction: "row", sx: { mb: 1 } },
              {
                children: _jsx(
                  Box,
                  __assign(
                    { width: 400, style: { paddingLeft: "10px", paddingRight: "10px" } },
                    {
                      children: _jsx(InvertibleDualSlider, {
                        name: "",
                        min: nv.volumes[0] ? nv.volumes[0].vox_min : 0,
                        max: nv.volumes[0] ? nv.volumes[0].vox_max : 1,
                        reverse: checked,
                        setMin: setMin,
                        setMax: setMax,
                        onFinalize: function () {
                          resampleImage();
                        },
                      }),
                    }
                  )
                ),
              }
            )
          ),
          _jsxs(
            Stack,
            __assign(
              { direction: "row", flexDirection: "row", justifyContent: "center" },
              {
                children: [
                  _jsx(
                    IconButton,
                    __assign(
                      {
                        onClick: function () {
                          setOriginal(undefined);
                          nv.drawAddUndoBitmapWithHiddenVoxels();
                          unfocus();
                        },
                      },
                      { children: _jsx(CheckIcon, { style: { color: "green" } }) }
                    )
                  ),
                  _jsx(
                    IconButton,
                    __assign(
                      {
                        onClick: function () {
                          cancelMask();
                          unfocus();
                        },
                      },
                      { children: _jsx(CloseIcon, { style: { color: "red" } }) }
                    )
                  ),
                ],
              }
            )
          ),
        ],
      }
    )
  );
};
export default MaskPlatte;
