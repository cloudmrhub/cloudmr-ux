import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import Box from "@mui/material/Box";
import { Alert, AlertColor, Collapse, IconButton, List, ListItem, ListItemText, MenuItem } from "@mui/material";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { ChangeEvent, DragEvent } from "react";
import './Upload.css';
import CmrLabel from "../label/Label";

interface UploadWindowProps {
    upload: (file: File, fileAlias: string, fileDatabase: string) => Promise<number>;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    maxCount: number;
    fileExtension?: string | string[];
    template?: {
        showFileName?: boolean;
        showDatabase?: boolean;
        showFileSize?: boolean;
    };
}

function formatFileSize(numberOfBytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const exponent = Math.min(
        Math.floor(Math.log(numberOfBytes) / Math.log(1024)),
        units.length - 1,
    );
    const approx = numberOfBytes / 1024 ** exponent;
    return exponent === 0
        ? `${numberOfBytes} bytes`
        : `${approx.toFixed(3)} ${units[exponent]}`;
}

function responseStatusMessage(response: number): { style: AlertColor; text: string; reopen: boolean } {
    if (response === 200) {
        return { style: 'success', text: 'Upload successful', reopen: false };
    }
    if (response === 413) {
        return { style: 'error', text: 'File size limit exceeded', reopen: true };
    }
    if (response === 500) {
        return { style: 'error', text: 'Internal server error', reopen: true };
    }
    if (response === 400) {
        return { style: 'warning', text: 'File upload cancelled', reopen: true };
    }
    return { style: 'warning', text: 'Unknown status', reopen: true };
}

export default function CmrUploadWindow({
    upload,
    open,
    setOpen,
    maxCount,
    fileExtension,
    template = { showFileName: true, showDatabase: true, showFileSize: true },
}: UploadWindowProps) {
    const [fileAlias, setFileAlias] = React.useState('');
    const [fileSize, setFileSize] = React.useState('0 MB');
    const [warningText, setWarningText] = React.useState('Unknown Status');
    const [infoOpen, setInfoOpen] = React.useState(false);
    const [locationSelection] = React.useState('s3');
    const [infoStyle, setInfoStyle] = React.useState<AlertColor>('info');
    const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
    const [UpBtnDisabled, setUpBtnDisabled] = React.useState(false);
    const [UpBtnText, setUpBtnText] = React.useState('Upload');
    const [uploadBoxWarning, setUploadBoxWarning] = React.useState<undefined | string>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const allowsMultiple = maxCount > 1;

    const showAlert = (style: AlertColor, text: string, durationMs = 2500) => {
        setInfoOpen(true);
        setInfoStyle(style);
        setWarningText(text);
        setTimeout(() => setInfoOpen(false), durationMs);
    };

    const resetSelection = () => {
        setSelectedFiles([]);
        setFileAlias('');
        setFileSize('0 MB');
        setUploadBoxWarning(undefined);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    React.useEffect(() => {
        if (open) {
            resetSelection();
            setUpBtnDisabled(false);
            setUpBtnText('Upload');
            setInfoOpen(false);
        }
    }, [open]);

    const handleClose = () => {
        setOpen(false);
    };

    const checkExtension = (filename: string, allowed: string | string[]) => {
        if (!filename) return false;
        const name = filename.toLowerCase();
        if (Array.isArray(allowed)) {
            return allowed.some(ext => name.endsWith(ext.startsWith('.') ? ext : '.' + ext));
        }
        return name.endsWith(allowed.startsWith('.') ? allowed : '.' + allowed);
    };

    const INVALID_ALIAS_REGEX = /[ ,:%><]/;

    const syncSingleFileFields = (files: File[]) => {
        if (files.length === 1) {
            setFileAlias(files[0].name);
            setFileSize(formatFileSize(files[0].size));
        } else if (files.length > 1) {
            const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
            setFileSize(formatFileSize(totalBytes));
        } else {
            setFileAlias('');
            setFileSize('0 MB');
        }
    };

    const filterAndCapFiles = (incoming: File[]): File[] => {
        let files = [...incoming];

        if (fileExtension !== undefined) {
            const rejected = files.filter(f => !checkExtension(f.name, fileExtension));
            if (rejected.length > 0) {
                showAlert(
                    'warning',
                    rejected.length === 1
                        ? `"${rejected[0].name}" has an unsupported extension`
                        : `${rejected.length} file(s) skipped due to unsupported extension`,
                    4000,
                );
            }
            files = files.filter(f => checkExtension(f.name, fileExtension));
        }

        if (files.length === 0) {
            showAlert('warning', 'No valid files selected');
            return [];
        }

        if (files.length > maxCount) {
            showAlert(
                'warning',
                maxCount === 1
                    ? 'Only one file can be uploaded at a time'
                    : `Only the first ${maxCount} files will be uploaded`,
                4000,
            );
            files = files.slice(0, maxCount);
        }

        return files;
    };

    const loadFiles = (incoming: FileList | File[]) => {
        const raw = Array.from(incoming);
        if (raw.length === 0) {
            showAlert('warning', 'No file selected');
            return;
        }

        const files = filterAndCapFiles(raw);
        if (files.length === 0) {
            return;
        }

        setSelectedFiles(files);
        syncSingleFileFields(files);
        setUploadBoxWarning(undefined);
    };

    const removeFileAt = (index: number) => {
        setSelectedFiles(prev => {
            const next = prev.filter((_, i) => i !== index);
            syncSingleFileFields(next);
            return next;
        });
    };

    const handleConfirm = async () => {
        if (selectedFiles.length === 0) {
            showAlert('error', 'Must select files to upload!');
            return;
        }

        const isSingle = selectedFiles.length === 1;
        const alias = isSingle ? fileAlias : '';

        if (isSingle) {
            if (alias.length === 0) {
                showAlert('error', "File name can't be empty");
                return;
            }
            if (INVALID_ALIAS_REGEX.test(alias)) {
                showAlert('error', 'Alias contains invalid characters ( , : % > < or spaces )', 10000);
                return;
            }
        }

        setUpBtnDisabled(true);
        setUpBtnText('Uploading');
        setOpen(false);

        const total = selectedFiles.length;
        let successCount = 0;
        let lastFailure: { style: AlertColor; text: string; reopen: boolean } | null = null;

        for (let i = 0; i < total; i++) {
            const file = selectedFiles[i];
            const fileAliasForUpload = isSingle ? alias : file.name;
            if (total > 1) {
                setUpBtnText(`Uploading ${i + 1}/${total}`);
            }
            try {
                const response = await upload(file, fileAliasForUpload, locationSelection);
                if (response === 200) {
                    successCount++;
                } else {
                    lastFailure = responseStatusMessage(response);
                }
            } catch (error) {
                lastFailure = {
                    style: 'error',
                    text: `Upload unsuccessful: ${error instanceof Error ? error.message : String(error)}`,
                    reopen: true,
                };
            }
        }

        setUpBtnDisabled(false);
        setUpBtnText('Upload');
        resetSelection();

        if (successCount === total) {
            showAlert(
                'success',
                total === 1 ? 'Upload successful' : `${total} files uploaded successfully`,
                2000,
            );
        } else if (successCount === 0) {
            setOpen(true);
            showAlert(lastFailure?.style ?? 'error', lastFailure?.text ?? 'Upload failed', 4000);
        } else {
            setOpen(true);
            showAlert(
                'warning',
                `${successCount} of ${total} files uploaded successfully`,
                4000,
            );
        }
    };

    const changeFileName = (e: ChangeEvent<HTMLInputElement>) => {
        setFileAlias(e.target.value);
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const dragged = Array.from(e.dataTransfer.files);
            if (maxCount === 1 && dragged.length > 1) {
                setUploadBoxWarning('Only one file can be uploaded at a time');
            } else if (maxCount > 1 && dragged.length > maxCount) {
                setUploadBoxWarning(`You can upload up to ${maxCount} files at a time`);
            } else if (
                fileExtension !== undefined &&
                dragged.some(f => !checkExtension(f.name, fileExtension))
            ) {
                setUploadBoxWarning(
                    `Only accepting files with extension(s): ${Array.isArray(fileExtension) ? fileExtension.join(', ') : fileExtension}`,
                );
            } else {
                setUploadBoxWarning(undefined);
            }
        }
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setTimeout(() => setUploadBoxWarning(undefined), 10000);
        if (e.dataTransfer.files) {
            loadFiles(e.dataTransfer.files);
        }
    };

    const handleDragLeave = () => {
        setUploadBoxWarning(undefined);
    };

    const fileInputClick = (e: React.MouseEvent) => {
        e.preventDefault();
        fileInputRef.current?.click();
    };

    const loadSelectedFiles = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files) {
            loadFiles(e.target.files);
        }
    };

    const dropZoneLabel = allowsMultiple
        ? `Drag & Drop or Click to Upload Up to ${maxCount} Files Here`
        : 'Drag & Drop or Click to Upload Your File Here';

    return (
        <div>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>File Upload</DialogTitle>
                <DialogContent>
                    <DialogContentText />
                    <DialogContent dividers>
                        <Box
                            width="100%"
                            minHeight={250}
                            style={{
                                borderStyle: 'dashed',
                                borderRadius: '5pt',
                                borderColor: uploadBoxWarning == undefined ? 'lightGray' : '#BA3C3C',
                            }}
                        >
                            <Typography component="div" style={{ height: '100%' }}>
                                <Box
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: '100%',
                                        minHeight: 250,
                                        cursor: 'pointer',
                                    }}
                                    onClick={fileInputClick}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onDragLeave={handleDragLeave}
                                >
                                    <Typography variant="body1" align="center" style={{ marginTop: 'auto' }}>
                                        {dropZoneLabel} <sup>*</sup>
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        align="center"
                                        style={{ marginTop: 'auto', fontSize: '0.8rem', fontStyle: 'italic' }}
                                    >
                                        * Warning: The file you are uploading may contain sensitive information protected under privacy laws. Please ensure all PHI is anonymized before proceeding.Before proceeding. The user is the sole responsible for data anonymization.
                                    </Typography>
                                </Box>
                            </Typography>
                        </Box>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple={allowsMultiple}
                            accept={
                                fileExtension === undefined
                                    ? '*'
                                    : Array.isArray(fileExtension)
                                        ? fileExtension.join(',')
                                        : fileExtension
                            }
                            style={{ display: 'none' }}
                            onChange={loadSelectedFiles}
                        />

                        {selectedFiles.length > 1 && (
                            <Box sx={{ mt: 2, maxHeight: 180, overflowY: 'auto', border: '1px solid #E6E6EA', borderRadius: 1 }}>
                                <List dense disablePadding>
                                    {selectedFiles.map((file, index) => (
                                        <ListItem
                                            key={`${file.name}-${file.lastModified}-${index}`}
                                            secondaryAction={
                                                <IconButton edge="end" aria-label="remove" onClick={() => removeFileAt(index)}>
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText
                                                primary={file.name}
                                                secondary={formatFileSize(file.size)}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        )}

                        <Box component="form" sx={{ '& .MuiTextField-root': { m: 2, width: '25ch', mb: 0 } }}>
                            <div>
                                {template.showFileName && selectedFiles.length === 1 && (
                                    <TextField
                                        required
                                        style={{ marginTop: '30px' }}
                                        label="File Alias:"
                                        value={fileAlias}
                                        variant="standard"
                                        onChange={changeFileName}
                                    />
                                )}

                                {selectedFiles.length === 1 && (
                                    <CmrLabel style={{ marginLeft: '16px', fontSize: '9pt', color: '#267833' }}>
                                        {selectedFiles[0].name}
                                    </CmrLabel>
                                )}

                                {template.showDatabase && (
                                    <TextField
                                        select
                                        label="Database:"
                                        defaultValue="s3"
                                        helperText="Upstream Storage Location"
                                        variant="standard"
                                    >
                                        {[{ value: 's3', label: 'S3' }].map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            </div>
                            <div>
                                {template.showFileSize && selectedFiles.length > 0 && (
                                    <TextField
                                        label={selectedFiles.length > 1 ? 'Total Size:' : 'File Size:'}
                                        value={fileSize}
                                        InputProps={{
                                            readOnly: true,
                                        }}
                                        variant="standard"
                                    />
                                )}
                                <Collapse in={infoOpen}>
                                    <Alert severity={infoStyle} sx={{ m: 1 }}>
                                        {warningText}
                                    </Alert>
                                </Collapse>
                            </div>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button variant="outlined" disabled={UpBtnDisabled} onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button variant="contained" disabled={UpBtnDisabled || selectedFiles.length === 0} onClick={handleConfirm}>
                            {UpBtnText}{selectedFiles.length > 1 ? ` (${selectedFiles.length})` : ''}
                        </Button>
                    </DialogActions>
                </DialogContent>
            </Dialog>
        </div>
    );
}
