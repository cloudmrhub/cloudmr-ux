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
}

export const CmrCheckbox = (props: CmrCheckboxProps) => {
    const { defaultChecked, onChange, children, ...rest } = props;

    return (
        <FormControlLabel 
        disabled={props.disabled} 
        style={props.style} 
        className={props.className} 
        control={
            <Checkbox 
            style={props.style} 
            checked={props.checked} 
            defaultChecked={defaultChecked}
            onChange={onChange}/>
        }
                          
        label={<span className='cmr-label' style={{paddingRight:0, color:'var(--bs-card-color)'}}>
        {props.children}</span>}
        labelPlacement="end"/>
    );
};

