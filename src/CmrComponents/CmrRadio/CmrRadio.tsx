import React from 'react';
import './CmrRadio.css';
import { Radio } from 'antd';

interface CmrRadioProps {
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    value?: any;
    children?: any;
}

export const CmrRadio = (props: CmrRadioProps) => {
    const { checked, defaultChecked, disabled, value, children, ...rest } = props;

    return (
        <Radio checked={checked} defaultChecked={defaultChecked} disabled={disabled} value={value} {...rest}>
            {children}
        </Radio>
    );
};

// export default CmrRadio;
