import React from 'react';
import './CmrInput.css';
import { Input } from 'antd';
import { SizeType } from 'antd/lib/config-provider/SizeContext';

interface CmrInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'type'> {
    defaultValue?: string;
    id?: string;
    maxLength?: number;
    size?: SizeType;
    value?: string;
    type?: any;
    prefix?: React.ReactNode;
    bordered?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const CmrInput = (props: CmrInputProps) => {
    const { defaultValue, id, maxLength, size, value, type, prefix, bordered, onChange, onPressEnter, ...rest } = props;

    return (
        <Input
            defaultValue={defaultValue}
            id={id}
            maxLength={maxLength}
            size={size}
            value={value}
            type={type}
            prefix={prefix}
            onChange={onChange}
            onPressEnter={onPressEnter}
            {...rest}
            className="cmr-input"
        />
    );
};

