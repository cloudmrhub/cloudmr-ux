import { Fragment, useEffect, useState } from "react";
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
import { Button, CircularProgress } from "@mui/material";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { CMRUpload } from "../../../index";
import { uploadHandlerFactory } from "../../common/utilities/SystemUtilities";

const Upload = () => {
  const dispatch = useAppDispatch();
  const { uploadToken, level, isAdmin: isAdminFlag } = useAppSelector(
    (state) => state.authenticate,
  );
  const { files } = useAppSelector((state) => state.data);
  const isAdmin = Boolean(isAdminFlag) || level === "admin";

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
      editable: true,
      flex: 1,
    },
    {
      headerName: "Date Submitted",
      dataIndex: "createdAt",
      field: "createdAt",
      flex: 1,
    },
    {
      headerName: "Status",
      dataIndex: "status",
      field: "status",
      flex: 1,
    },
    {
      field: "actions",
      headerName: "Edit File Name",
      sortable: false,
      width: 160,
      disableClickEventBubbling: true,
      renderCell: (params: any) => {
        let index = files.findIndex((row: UploadedFile) => row.id === params.id);
        return (
          <div>
            <IconButton
              onClick={() => {
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
                <EditIcon />
              )}
            </IconButton>
          </div>
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
        console.log("dispatched");
      } catch (err) {
        console.error("Initial data load failed:", err);
        setMessage("Could not load initial application data. Some features may be unavailable.");
        setColor("error");
        setOpen(true);
      }
    })();
  }, []);

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
            dataSource={[...files].reverse()}
            rowSelectionModel={selectedData}
            onRowSelectionModelChange={(rowSelectionModel) => {
              setSelectedData(rowSelectionModel);
            }}
            columns={uploadedFilesColumns}
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
