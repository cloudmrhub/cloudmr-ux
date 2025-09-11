// CmrSelect.tsx (react-select version without label)
import React, { useEffect, useId, useMemo, useState } from 'react';
import ReactSelect, { SingleValue, StylesConfig } from 'react-select';
import type { CSSProperties } from 'react';
import './CmrSelect.css';

export interface Option { label: string; value: string; disabled?: boolean; }

export interface CmrSelectProps {
  options: Option[];
  disabled?: boolean;

  /** Controlled usage (optional) */
  value?: string;
  onChange?: (value: string) => void;

  /** Uncontrolled usage (optional) */
  defaultValue?: string;

  /** Layout/Styling */
  fullWidth?: boolean;
  sx?: any;
  className?: string;

  /** Pass-through kept for compatibility */
  SelectProps?: Record<string, any>;
}

const baseStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderColor: state.isFocused ? '#580F8B' : base.borderColor,
    boxShadow: state.isFocused ? '0 0 0 1px #580F8B' : 'none',
    '&:hover': { borderColor: '#580F8B' },
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
    borderRadius: 4,
  }),
  placeholder: (base) => ({
    ...base,
    color: 'rgba(0,0,0,0.6)',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#580F8B',
    fontWeight: 400,
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused || state.isSelected ? '#F3E5F5' : 'white',
    color: '#000',
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 2000 }),
  menu: (base) => ({ ...base, zIndex: 1300 }),
};

const CmrSelect: React.FC<CmrSelectProps> = ({
  options,
  disabled,
  value,
  onChange,
  defaultValue = '',
  fullWidth,
  sx,
  className,
}) => {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string>(defaultValue);
  const currentValue = isControlled ? (value as string) : internal;

  useEffect(() => {
    if (isControlled) setInternal(value as string);
  }, [isControlled, value]);

  const id = useId();

  const rsValue = useMemo(
    () => options.find(o => o.value === currentValue) ?? null,
    [options, currentValue]
  );

  const handleChange = (opt: SingleValue<Option>) => {
    const next = opt?.value ?? '';
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const wrapperStyle: CSSProperties = {
    minWidth: 200,
    maxWidth: 400,
    width: fullWidth ? '100%' : 'auto',
    ...(sx as CSSProperties),
  };

  return (
    <div className={className ?? 'dropdown-select'} style={wrapperStyle}>
      <ReactSelect
        inputId={id}
        isDisabled={!!disabled}
        options={options.map(o => ({ ...o, isDisabled: o.disabled }))}
        value={rsValue}
        onChange={handleChange}
        placeholder="Select"
        isClearable
        styles={baseStyles}
        menuPortalTarget={document.body}
      />
    </div>
  );
};

export default CmrSelect;
