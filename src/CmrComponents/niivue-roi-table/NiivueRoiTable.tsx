import { CSSProperties, useState } from "react";
import {
  Tooltip,
  IconButton,
  Snackbar,
  Alert,
  type SxProps,
  type Theme,
} from "@mui/material";
import Box from "@mui/material/Box";
import { GridRowSelectionModel, GridValueSetterParams } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteIcon from "@mui/icons-material/Delete";
import { Icon as WpIcon, group as wpGroup, ungroup as wpUngroup } from "@wordpress/icons";
import CmrTable from "../../CmrTable/CmrTable";
import CMRUpload from "../upload/Upload";
import { getEndpoints } from "../../core/config/AppConfig";
import { AuthenticatedHttpClient } from "../../core/common/utilities/AuthenticatedRequests";
import { useNiivueViewerTheme } from "../niivue-viewer/NiivueViewerThemeContext";

/** Default merged ROI label in Niivue patcher `groupLabelsInto` / `groupLabelsFromSelection`. */
export const DEFAULT_ROI_GROUP_TARGET_LABEL = 7;

const ROI_TOOLBAR_ICON_SIZE_PX = 24;

const ROI_TOOLBAR_ICON_BUTTON_SX: SxProps<Theme> = {
  color: "action.active",
  "&.Mui-disabled": {
    color: (theme) => theme.palette.action.disabled,
  },
};

const ROI_TOOLBAR_MUI_ICON_SX = {
  fontSize: ROI_TOOLBAR_ICON_SIZE_PX,
  color: "inherit",
} as const;

export interface NiivueRoiTableProps {
  pipelineID: string;
  rois: any[];
  resampleImage: () => void;
  zipAndSendROI: (url: string, filename: string, blob: Blob) => Promise<void>;
  unpackROI: (url: string) => Promise<void>;
  setLabelAlias: (label: number | string, alias: string) => void;
  nv: any;
  style?: CSSProperties;
  /**
   * Called after a successful ROI upload handshake, multipart upload, and `unpackROI`.
   * Use this to refresh server-side ROI metadata (e.g. `dispatch(getPipelineROI(...))`).
   */
  onAfterRoiUpload?: () => void | Promise<void>;
  /** Niivue label index ROIs merge into when grouping. Default: {@link DEFAULT_ROI_GROUP_TARGET_LABEL}. */
  groupTargetLabel?: number;
}

/**
 * Data grid + toolbar for Niivue ROI labels: edit aliases, visibility, group / ungroup,
 * download subset, delete, and upload replacement mask. No Redux — pass callbacks and `nv`.
 */
export function NiivueRoiTable(props: NiivueRoiTableProps) {
  const {
    groupTargetLabel = DEFAULT_ROI_GROUP_TARGET_LABEL,
    onAfterRoiUpload,
  } = props;

  const [uploadKey, setUploadKey] = useState(1);
  const theme = useNiivueViewerTheme();
  const endpoints = getEndpoints();
  const [selectedData, setSelectedData] = useState<GridRowSelectionModel>([]);

  const roiColumns = [
    {
      headerName: "ROI Label",
      field: "alias",
      flex: 1,
      editable: true,
      valueSetter: (params: GridValueSetterParams) => {
        if (params.value !== params.row.alias) {
          props.setLabelAlias(params.row.label, params.value as string);
        }
        return params.row;
      },
    },
    {
      headerName: "Color",
      field: "color",
      flex: 0.5,
      sortable: false,
      renderCell: (params: { row: any }) => (
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: "14pt",
              height: "14pt",
              borderRadius: "3pt",
              background: `${params.row.color}`,
            }}
          />
        </Box>
      ),
    },
    {
      headerName: "Mean",
      field: "mu",
      flex: 1,
      renderCell: (params: { row: any }) => (
        <div>{`${params.row.mu.toFixed(3)}`}</div>
      ),
    },
    {
      headerName: "SD",
      field: "std",
      flex: 1,
      renderCell: (params: { row: any }) => (
        <div>{`${params.row.std.toFixed(3)}`}</div>
      ),
    },
    {
      headerName: "Visibility",
      field: "visibility",
      flex: 1,
      sortable: false,
      renderCell: (params: { row: any }) => (
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <IconButton
            onClick={(event) => {
              props.nv.setLabelVisibility(
                Number(params.row.label),
                !props.nv.getLabelVisibility(Number(params.row.label)),
              );
              props.resampleImage();
              props.nv.drawScene();
              event.stopPropagation();
            }}
          >
            {params.row.visibility ? (
              <VisibilityIcon sx={{ color: "#aaa" }} />
            ) : (
              <VisibilityOffIcon sx={{ color: "#aaa" }} />
            )}
          </IconButton>
        </Box>
      ),
    },
    {
      headerName: "Voxel Count",
      field: "count",
      flex: 1.5,
    },
  ];

  const [warningVisible, setWarningVisible] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const warnEmptySelection = (message: string) => {
    setWarningMessage(message);
    setWarningVisible(true);
  };

  const selectedNums = selectedData.map((v) => Number(v));
  const uniqueSelected = new Set(selectedNums);
  const canGroupSelection =
    selectedNums.length >= 2 && uniqueSelected.size >= 2;
  const groupButtonDisabled =
    selectedData.length > 0 && !canGroupSelection;
  const groupTooltip =
    selectedData.length === 0
      ? "Group selected ROIs"
      : uniqueSelected.size < 2 || selectedNums.length < 2
        ? "Select at least two different ROIs to group"
        : "Group selected ROIs";

  return (
    <Box style={props.style}>
      <CmrTable
        hideFooter={true}
        getRowId={(row) => row.label}
        style={{ height: "70%" }}
        dataSource={props.rois}
        columns={roiColumns}
        columnHeaderHeight={40}
        headerBgColor={theme.headerBgColor}
        headerIconColor={theme.headerIconColor}
        checkboxCheckedColor={theme.checkboxCheckedColor}
        checkboxUncheckedColor={theme.checkboxUncheckedColor}
        rowSelectionModel={selectedData}
        onRowSelectionModelChange={(rowSelectionModel) => {
          setSelectedData(rowSelectionModel);
        }}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mt: 0,
          px: 2,
          py: 1,
          backgroundColor: "#f8f9fa",
          border: "1px solid rgba(0, 0, 0, 0.12)",
          borderTop: "none",
          borderRadius: "0 0 4px 4px",
        }}
      >
        <Tooltip title={groupTooltip}>
          <span>
            <IconButton
              disabled={groupButtonDisabled}
              sx={ROI_TOOLBAR_ICON_BUTTON_SX}
              onClick={() => {
                if (selectedData.length === 0) {
                  warnEmptySelection("Please select an ROI to group");
                  return;
                }
                if (!canGroupSelection) {
                  warnEmptySelection(
                    "Please select at least two different ROIs to group",
                  );
                  return;
                }
                if (typeof props.nv.groupLabelsFromSelection === "function") {
                  props.nv.groupLabelsFromSelection(
                    selectedNums,
                    groupTargetLabel,
                  );
                } else {
                  props.nv.groupLabelsInto(
                    selectedNums,
                    groupTargetLabel,
                  );
                }
                props.nv.drawScene();
                props.resampleImage();
              }}
            >
              <WpIcon icon={wpGroup} size={24} fill="currentColor" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Ungroup ROIs">
          <IconButton
            sx={ROI_TOOLBAR_ICON_BUTTON_SX}
            onClick={() => {
              if (selectedData.length === 0) {
                warnEmptySelection("Please select an ROI to ungroup");
                return;
              }
              props.nv.ungroup();
              props.nv.drawScene();
              props.resampleImage();
            }}
          >
            <WpIcon
              icon={wpUngroup}
              size={ROI_TOOLBAR_ICON_SIZE_PX}
              fill="currentColor"
            />
          </IconButton>
        </Tooltip>

        <Tooltip title="Download">
          <IconButton
            sx={ROI_TOOLBAR_ICON_BUTTON_SX}
            onClick={async () => {
              let fileName = "label";
              const selectedLabels: number[] = [];
              for (const label of selectedData) {
                fileName += label;
                selectedLabels.push(Number(label));
              }
              fileName += ".nii";
              if (selectedLabels.length === 0) {
                warnEmptySelection("Please select an ROI to download");
                return;
              }
              await props.nv.saveImageByLabels(fileName, selectedLabels);
            }}
          >
            <GetAppIcon sx={ROI_TOOLBAR_MUI_ICON_SX} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Delete">
          <IconButton
            sx={ROI_TOOLBAR_ICON_BUTTON_SX}
            onClick={() => {
              if (selectedData.length === 0) {
                warnEmptySelection("Please select an ROI to delete");
                return;
              }
              props.nv.deleteDrawingByLabel(
                selectedData.map((value) => Number(value)),
              );
              props.resampleImage();
              props.nv.drawScene();
            }}
          >
            <DeleteIcon sx={ROI_TOOLBAR_MUI_ICON_SX} />
          </IconButton>
        </Tooltip>

        <CMRUpload
          changeNameAfterUpload={false}
          color="primary"
          key={uploadKey}
          onUploaded={() => {}}
          uploadHandler={async (file, _fileAlias, _fileDatabase) => {
            const filename = file.name;
            const response = await AuthenticatedHttpClient.post(
              endpoints.ROI_UPLOAD,
              {
                filename,
                pipeline_id: props.pipelineID,
                type: "image",
                contentType: "application/octet-stream",
              },
            );
            await props.zipAndSendROI(
              response.data.upload_url,
              filename,
              file,
            );
            await props.unpackROI(response.data.access_url);
            await onAfterRoiUpload?.();
            setUploadKey((k) => k + 1);
            return 200;
          }}
          maxCount={1}
        />
      </Box>

      <Snackbar
        open={warningVisible}
        autoHideDuration={3000}
        onClose={() => setWarningVisible(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          sx={{ width: "100%" }}
          onClose={() => setWarningVisible(false)}
        >
          {warningMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
