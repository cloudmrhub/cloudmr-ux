import { Fragment, useEffect, useState } from "react";
import "./Upload.scss";
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
  const { uploadToken } = useAppSelector((state) => state.authenticate);
  const { files } = useAppSelector((state) => state.data);

  const renamingProxy = (newName: string, proxyCallback: () => void) => {
    return new Promise<boolean>((resolve) => {
      let originalExt = originalName.split(".").pop();
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
                setOriginalName(files[index].fileName);
                setNameDialogOpen(true);
                setRenamingCallback(() => (newName: string) => {
                  return renamingProxy(newName, () => {
                    // In case of working API
                    let dataReference = files[index];
                    //@ts-ignore
                    dispatch(
                      renameUploadedData({
                        fileId: dataReference.id,
                        newName: newName,
                      }),
                    );
                  });
                  // In case of non-working API, change name locally
                  // dispatch(dataSlice.actions.renameData({index:index,alias:newName}));
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

  // const dispatch = useAppDispatch();
  // const { uploadToken } = useAppSelector((state) => state.authenticate);
  // const { files } = useAppSelector((state) => state.data);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [renamingCallback, setRenamingCallback] = useState<
    (alias: string) => Promise<boolean>
  >(async () => true);
  const [originalName, setOriginalName] = useState("");

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

  useEffect(() => {
    //@ts-ignore
    dispatch(getUploadedData());
    //@ts-ignore
    dispatch(getUpstreamJobs());
    console.log("dispatched");
  }, []);

  const [uploadKey, setUploadKey] = useState(0);

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
        defaultActiveKey={[0, 1]}
        expandIconPosition="right"
      >
        <CmrPanel key="0" header="Uploaded Data" className="mb-2">
          <CmrTable
            dataSource={[...files].filter((file) => {
              const name = file.fileName.toLowerCase();
              // return !name.endsWith(".zip") && !name.endsWith(".nii");
              // TODO RJW: does this make sense? confusing if you upload a zip, it just disappears
              return true; // Show all files for now
            })}
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
        <CmrNameDialog
          open={nameDialogOpen}
          setOpen={setNameDialogOpen}
          originalName={originalName}
          renamingCallback={renamingCallback}
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
      </CmrCollapse>
      <div style={{ height: "69px" }}></div>
    </Fragment>
  );
};

export default Upload;
