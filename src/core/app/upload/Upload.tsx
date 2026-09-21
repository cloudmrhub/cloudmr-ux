import { Fragment, useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { UploadedFile } from "../../features/data/dataSlice";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteIcon from "@mui/icons-material/Delete";
import { CmrTable, CmrCollapse, CmrPanel, CmrNameDialog } from "../../../index";
import {
  deleteUploadedData,
  getUploadedData,
  renameUploadedData,
  uploadData,
} from "../../features/data/dataActionCreation";
import { getUpstreamJobs } from "../../features/jobs/jobActionCreation";
import { CmrConfirmation } from "../../../index";
import { Button, CircularProgress, Typography } from "@mui/material";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { CMRUpload } from "../../../index";
import { uploadHandlerFactory } from "../../common/utilities/SystemUtilities";
import { AuthenticatedHttpClient } from "../../common/utilities/AuthenticatedRequests";
import { getEndpoints } from "../../config/AppConfig";

// Maps userId → display email/username. Only accessible by admins (/admin/users).
function userDirectoryFromPayload(payload: any): Record<string, string> {
  const users = Array.isArray(payload?.users)
    ? payload.users
    : Array.isArray(payload?.data?.users)
      ? payload.data.users
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
  const out: Record<string, string> = {};
  for (const u of users) {
    const id = u?.userId ?? u?.user_id ?? u?.id;
    if (id == null) continue;
    const label =
      String(u?.email || "").trim() ||
      String(u?.username || "").trim() ||
      String(id);
    out[String(id)] = label;
  }
  return out;
}

export interface UploadProps {
  /** Column header background color. Defaults to the CmrTable default (#F3E5F5). */
  headerBgColor?: string;
  /** Column header text color. Defaults to #333. */
  headerTextColor?: string;
  /** Header sort/menu icon and checkbox accent color. Defaults to #580f8b. */
  headerIconColor?: string;
  /** Checked/indeterminate checkbox color. Defaults to headerIconColor. */
  checkboxCheckedColor?: string;
}

const Upload = ({
  headerBgColor,
  headerTextColor,
  headerIconColor,
  checkboxCheckedColor,
}: UploadProps = {}) => {
  const dispatch = useAppDispatch();
  const { uploadToken, level, isAdmin: isAdminFlag, email, logged_in_token } =
    useAppSelector((state) => state.authenticate);
  const { files } = useAppSelector((state) => state.data);
  const isAdmin = Boolean(isAdminFlag) || level === "admin";
  const currentUserId =
    logged_in_token?.parsedToken?.["custom:userId"] ??
    logged_in_token?.parsedToken?.user_id ??
    logged_in_token?.parsedToken?.sub;
  const [userLabelById, setUserLabelById] = useState<Record<string, string>>({});

  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [renamingCallback, setRenamingCallback] = useState<
    (alias: string, isDemoData?: boolean) => Promise<boolean>
  >(async () => true);
  const [originalName, setOriginalName] = useState("");
  const [selectedFileIsDemoData, setSelectedFileIsDemoData] = useState<
    boolean | undefined
  >(undefined);

  const [name, setName] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<
    | "inherit"
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "info"
    | "warning"
    | undefined
  >(undefined);
  const [open, setOpen] = useState<boolean>(false);
  const [confirmCallback, setConfirmCallback] = useState<() => void>(() => {});
  const [cancelCallback, setCancelCallback] = useState<() => void>(() => {});

  const [selectedData, setSelectedData] = useState<GridRowSelectionModel>([]);
  const [uploadKey, setUploadKey] = useState(0);

  const loadUserDirectory = useCallback(async () => {
    try {
      const usersUrl = getEndpoints().DATA_API.replace(
        /\/data\/read\/?$/,
        "/admin/users",
      );
      const res = await AuthenticatedHttpClient.get(usersUrl);
      setUserLabelById(userDirectoryFromPayload(res?.data ?? res));
    } catch (e) {
      console.error("Could not load user directory:", e);
    }
  }, []);

  const uploadedByLabel = (file: UploadedFile): string => {
    const userId = file.userId;
    if (!userId) return "—";

    if (isAdmin) {
      // Admins see real emails from the directory
      if (userLabelById[userId]) return userLabelById[userId];
      // Fallback: their own email if directory hasn't loaded yet
      if (currentUserId && String(currentUserId) === userId && email) return email;
      return "—";
    } else {
      // Non-admin: own files show their email, everything else is an admin upload
      if (currentUserId && String(currentUserId) === userId && email) return email;
      return "System Administrator";
    }
  };

  const renamingProxy = (
    originalFileName: string,
    newName: string,
    isDemoData: boolean | undefined,
    proxyCallback: () => void,
  ) => {
    return new Promise<boolean>((resolve) => {
      let originalExt = originalFileName.split(".").pop();
      if (newName.split(".").length === 1) {
        setMessage(`Missing file extension in '${newName}'.`);
        setColor("error");
        setConfirmCallback(() => () => {
          resolve(false);
        });
        setCancelCallback(() => () => {
          resolve(false);
        });
        setOpen(true);
      } else if (newName.split(".").pop() !== originalExt) {
        let newExt = newName.split(".").pop();
        let orgExt = originalExt ?? "?";
        setMessage(`Changing file extension from ${orgExt} to ${newExt}.`);
        setColor("primary");
        setConfirmCallback(() => () => {
          proxyCallback();
          resolve(true);
        });
        setCancelCallback(() => () => {
          resolve(false);
        });
        setOpen(true);
      } else {
        proxyCallback();
        resolve(true);
      }
    });
  };

  const uploadedFilesColumns = [
    {
      headerName: "File Name",
      dataIndex: "fileName",
      field: "fileName",
      editable: false,
      flex: 1,
      sortable: true,
      renderCell: (params: any) => {
        const index = files.findIndex((row: UploadedFile) => row.id === params.id);
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              width: "100%",
              minWidth: 0,
              paddingRight: 16,
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
              title={params.row.fileName}
            >
              {params.row.fileName}
            </span>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (index < 0) return;
                const currentFileName = files[index].fileName;
                setOriginalName(currentFileName);
                setNameDialogOpen(true);
                setSelectedFileIsDemoData(
                  isAdmin ? !!files[index].is_demo_data : undefined,
                );
                setRenamingCallback(() => (newName: string, isDemoData?: boolean) => {
                  return renamingProxy(
                    currentFileName,
                    newName,
                    isDemoData,
                    () => {
                      let dataReference = files[index];
                      dispatch(
                        renameUploadedData({
                          fileId: dataReference.id,
                          newName: newName,
                          ...(isAdmin &&
                            isDemoData !== undefined && {
                              is_demo_data: isDemoData,
                            }),
                        }),
                      );
                    },
                  );
                });
              }}
            >
              {params.row.renamingPending ? (
                <CircularProgress size={20} />
              ) : (
                <EditIcon fontSize="small" />
              )}
            </IconButton>
          </div>
        );
      },
    },
    {
      headerName: "Date Uploaded",
      dataIndex: "createdAt",
      field: "createdAt",
      flex: 1,
    },
    {
      headerName: "Uploaded By",
      dataIndex: "uploadedBy",
      field: "uploadedBy",
      flex: 1,
      renderCell: (params: any) => {
        const label = params.row.uploadedBy || "—";
        return (
          <Typography
            variant="body2"
            noWrap
            title={label !== "—" ? label : undefined}
          >
            {label}
          </Typography>
        );
      },
    },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    (async () => {
      try {
        //@ts-ignore
        const p1 = dispatch(getUploadedData());
        //@ts-ignore
        const p2 = dispatch(getUpstreamJobs());
        await Promise.all([p1, p2]);
        await loadUserDirectory();
        console.log("dispatched");
      } catch (err) {
        console.error("Initial data load failed:", err);
        setMessage("Could not load initial application data. Some features may be unavailable.");
        setColor("error");
        setOpen(true);
      }
    })();
  }, [loadUserDirectory]);

  function downloadSelectedValues() {
    let downloadPending: UploadedFile[] = [];
    selectedData.forEach((id) => {
      for (let file of files) {
        if (file.id === id) downloadPending.push(file);
      }
    });
    console.log(selectedData);
    function downloadMultipleFiles(files: UploadedFile[]) {
      // This function creates an anchor and triggers a download
      function triggerDownload(url: string, fileName: string) {
        const anchor = document.createElement("a");
        anchor.href = url;
        console.log(url);
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }

      // Iterate over the files array
      files.forEach((file, index) => {
        // Set a timeout to space out the downloads
        setTimeout(() => {
          triggerDownload(file.link, file.fileName);
        }, index * 1000); // Delay each download by 1 second
      });
    }
    downloadMultipleFiles(downloadPending);
  }
  return (
    <Fragment>
      <CmrCollapse
        accordion={false}
        defaultActiveKey={[0]}
        expandIconPosition="right"
      >
        <CmrPanel key="0" header="Uploaded Data" className="mb-2">
          <CmrTable
            dataSource={[...files].reverse().map((file) => ({
              ...file,
              uploadedBy: uploadedByLabel(file),
            }))}
            rowSelectionModel={selectedData}
            onRowSelectionModelChange={(rowSelectionModel) => {
              setSelectedData(rowSelectionModel);
            }}
            columns={uploadedFilesColumns}
            headerBgColor={headerBgColor}
            headerTextColor={headerTextColor}
            headerIconColor={headerIconColor}
            checkboxCheckedColor={checkboxCheckedColor}
          />

          <div className="row mt-2">
            <div className="col-4">
              <Button
                color={"error"}
                style={{ textTransform: "none" }}
                variant={"contained"}
                fullWidth={true}
                onClick={() => {
                  setName(`Deleting Data`);
                  setMessage(
                    `Please confirm that you are deleting the selected data.`,
                  );
                  setColor("error");
                  setConfirmCallback(() => () => {
                    for (let id of selectedData) {
                      let file = files.find((row: UploadedFile) => row.id === id);
                      if (file) {
                        dispatch(
                          deleteUploadedData({
                            fileId: file.id,
                          }),
                        );
                      }
                    }
                  });
                  setOpen(true);
                }}
                disabled={selectedData.length === 0}
              >
                {" "}
                <DeleteIcon className="me-2" />
                Delete
              </Button>
            </div>
            <div className="col-4">
              <Button
                color={"success"}
                style={{ textTransform: "none" }}
                variant={"contained"}
                fullWidth={true}
                onClick={() => {
                  downloadSelectedValues();
                }}
                disabled={selectedData.length === 0}
              >
                <GetAppIcon className="me-2" />
                Download
              </Button>
            </div>

            <div className="col-4">
              {/* TOBREMOVED AFTER THE BETA TESTING */}
              {/* <Button color={'primary'} style={{textTransform:'none'}} variant={'contained'} fullWidth={true} disabled={true}> Upload </Button> */}
              {/* TOBEACTIVATED AFTER THE BETA TESTING */}
              <CMRUpload
                fileExtension={[
                  ".nii",
                  ".nii.gz",
                  ".mha",
                  ".mhd",
                  ".mrd",
                  ".dat",
                  ".h5",
                  ".png",
                  ".jpg",
                  ".jpeg",
                  ".npx",
                  ".npy",
                  ".pkl",
                  ".mat",
                  ".zip",
                  ".seq",
                  ".mtrk",
                ]}
                color={"primary"}
                key={uploadKey}
                fullWidth
                onUploaded={(res, file) => {
                  dispatch(getUploadedData());
                  setUploadKey(uploadKey + 1);
                }}
                uploadHandler={uploadHandlerFactory(
                  uploadToken,
                  dispatch,
                  uploadData,
                )}
                maxCount={100}
              ></CMRUpload>
            </div>
          </div>
        </CmrPanel>
      </CmrCollapse>

      <CmrNameDialog
        open={nameDialogOpen}
        setOpen={setNameDialogOpen}
        originalName={originalName}
        renamingCallback={renamingCallback}
        isDemoData={selectedFileIsDemoData}
      />

      <CmrConfirmation
        name={name}
        message={message}
        color={color}
        open={open}
        setOpen={setOpen}
        confirmCallback={confirmCallback}
        cancelCallback={cancelCallback}
        cancellable={true}
        width={450}
      />

      <div style={{ height: "69px" }}></div>
    </Fragment>
  );
};

export default Upload;
