import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CmrButton from '../CmrButton/CmrButton';

type ExtraButton = {
    text: string;
    color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
    onClick: () => void;
};

export default function CmrConfirmation({
    name,
    message,
    cancelText = 'Cancel',
    confirmText = 'Confirm',
    color,
    open,
    setOpen,
    confirmCallback = () => { },
    cancelCallback = () => { },
    cancellable = false,
    width,
    extraButtons = [],
}: {
    name: string | undefined;
    message: string | undefined;
    cancelText?: string;
    confirmText?: string;
    color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
    open: boolean;
    setOpen: (open: boolean) => void;
    confirmCallback?: () => void;
    cancelCallback?: () => void;
    cancellable?: boolean;
    width?: number;
    extraButtons?: ExtraButton[];
}) {
    const handleClose = () => {
        setOpen(false);
    };

    const handleConfirm = () => {
        confirmCallback();
        handleClose();
    };

    const handleCancel = () => {
        cancelCallback();
        handleClose();
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>{name ? name : 'Confirmation'}</DialogTitle>
            <DialogContent sx={{ width: width }}>
                <DialogContentText alignContent={'center'}>
                    {message}
                </DialogContentText>
                <DialogActions className={'mt-4'}>
                    {cancellable && (
                        <CmrButton variant="outlined" onClick={handleCancel}>
                            {cancelText}
                        </CmrButton>
                    )}
                    {extraButtons.map((btn, idx) => (
                        <CmrButton
                            key={idx}
                            variant="outlined"
                            color={btn.color || 'success'}
                            onClick={() => {
                                btn.onClick();
                                handleClose();
                            }}
                        >
                            {btn.text}
                        </CmrButton>
                    ))}
                    <CmrButton variant="contained" color={color} onClick={handleConfirm}>
                        {confirmText}
                    </CmrButton>
                </DialogActions>
            </DialogContent>
        </Dialog>
    );
}
