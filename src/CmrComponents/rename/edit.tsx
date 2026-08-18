import * as React from 'react';
import { Typography, Box, useTheme } from '@mui/material';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import CmrButton from '../CmrButton/CmrButton';
import { CmrCheckbox } from '../CmrCheckbox/CmrCheckbox';
import {useEffect} from "react";

export default function CmrNameDialog(props: {
    originalName: string;
    renamingCallback:(alias:string, isDemoData?:boolean)=>Promise<boolean>,
    open:boolean,
    setOpen:(open:boolean)=>void,
    isDemoData?: boolean
    /** Checked state color for the Demo Data checkbox. Defaults to the app's MUI theme primary color. */
    checkboxCheckedColor?: string;
}) {
    const theme = useTheme();
    let {originalName, open, setOpen, isDemoData, checkboxCheckedColor = theme.palette.primary.main} = props;
    const [helperText, setHelperText] = React.useState('');
    const [text, setText] = React.useState(originalName);
    const [error, setError] = React.useState(false);
    const [demoDataChecked, setDemoDataChecked] = React.useState(isDemoData ?? false);

    const renamingCallback = props.renamingCallback;

    const handleClose = () => {
        setOpen(false);
    };

    useEffect(() => {
        setText(originalName);
        checkError(originalName);
        setDemoDataChecked(isDemoData ?? false);
    }, [originalName, isDemoData]);

    const handleConfirm = async () => {
        // if(!error)
        if(await renamingCallback(text, isDemoData !== undefined ? demoDataChecked : undefined))
            handleClose();
    };

    const handleTextFieldChange=(e: { target: { value: string; }; })=>{
        setText( e.target.value);
        checkError(e.target.value);
    }
    const checkError=(text: string)=>{
        // Allow multi-part names/extensions (e.g. file.nii.gz, Duke_Brain_1.5T.nii.gz)
        const fileNameRegex = /^[a-zA-Z0-9_\-]+(?:\.[a-zA-Z0-9_\-]+)+$/;
        const extensionOf = (name: string) => {
            const i = name.indexOf('.');
            return i >= 0 ? name.slice(i + 1) : '?';
        };
        const newExtension = extensionOf(text);
        const orgExtension = extensionOf(originalName);
        if(!fileNameRegex.test(text)){
            setError(true);
            if(text.indexOf('.')<0){
                setHelperText('Invalid file name, needs a valid extension.');
            }else{
                setHelperText('Invalid file name, please check.');
            }
        }else if(newExtension!==orgExtension){
            setHelperText(`You are modifying your file extension from .${orgExtension} to .${newExtension}.`);
            setError(false);
        }else{
            setError(false);
            setHelperText('');
        }
    }

    return (
        <div>
            <Dialog open={open} onClose={handleClose}  fullWidth
                    maxWidth="xs">
                <DialogTitle>
                    <Typography> Rename the file {originalName} as:</Typography>
                </DialogTitle>
                <DialogContent>
                    {/*<DialogContentText>*/}
                    {/*    Renaming file {originalName} to:*/}
                    {/*</DialogContentText>*/}

                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        // type="file"
                        value={text}
                        onFocus={event => {
                            event.target.select();
                        }}
                        fullWidth
                        inputProps={{style: {fontSize: "16px"}}}
                        variant="standard"
                        onChange={handleTextFieldChange}
                        error={error}
                        helperText={helperText}
                    />

                    {isDemoData !== undefined && (
                        <Box
                            className="cmr-name-dialog-demo-data"
                            sx={{
                                mt: 2,
                                display: 'flex',
                                alignItems: 'center',
                                '& .MuiFormControlLabel-root': {
                                    margin: 0,
                                    marginLeft: 0,
                                    alignItems: 'center',
                                },
                                '& .MuiCheckbox-root': {
                                    paddingLeft: 0,
                                    paddingRight: '6px',
                                    paddingTop: '2px',
                                    paddingBottom: '2px',
                                },
                            }}
                        >
                            <CmrCheckbox
                                checked={demoDataChecked}
                                checkedColor={checkboxCheckedColor}
                                onChange={(e) => setDemoDataChecked(e.target.checked)}
                            >
                                Demo Data
                            </CmrCheckbox>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <CmrButton variant={"outlined"} onClick={handleClose}>Cancel</CmrButton>
                    <CmrButton variant={"contained"} color={'primary'} onClick={handleConfirm}>Confirm</CmrButton>
                </DialogActions>
            </Dialog>
        </div>
    );
}
