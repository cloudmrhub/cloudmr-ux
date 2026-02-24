import React, {ChangeEvent} from 'react';
import { Checkbox } from '@mui/material';
import './CmrCheckbox.css';
import { FormControlLabel } from '@mui/material';

interface CmrCheckboxProps  extends React.HTMLAttributes<HTMLDivElement>{
    autoFocus?: boolean;
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    indeterminate?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    children?: any;
    style?: any;
    /** Checked state color (e.g. '#580F8B'). Defaults to #580f8b when not set. */
    checkedColor?: string;
}

export const CmrCheckbox = (props: CmrCheckboxProps) => {
    const { defaultChecked, onChange, children, checkedColor, ...rest } = props;

    const wrapperStyle: React.CSSProperties = {
        display: 'contents',
        ...(checkedColor != null && { ['--cmr-checkbox-checked-color' as string]: checkedColor }),
    };

    return (
        <div className="cmr-checkbox-wrapper" style={wrapperStyle}>
            <FormControlLabel
                disabled={props.disabled}
                style={props.style}
                className={props.className}
                control={
                    <Checkbox
                        style={props.style}
                        checked={props.checked}
                        defaultChecked={defaultChecked}
                        onChange={onChange}
                    />
                }
                label={
                    <span className="cmr-label" style={{ paddingRight: 0, color: 'var(--bs-card-color)' }}>
                        {children}
                    </span>
                }
                labelPlacement="end"
            />
        </div>
    );
};

