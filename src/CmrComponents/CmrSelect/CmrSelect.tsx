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

  primaryColor?: string;
}

const createStyles = (primaryColor: string): StylesConfig<Option, false> => {
  const optionHighlight =
    primaryColor === "#580F8B"
      ? "#F3E5F5"
      : `${primaryColor}20`; // soft tint derived from primary

  return {
    control: (base, state) => ({
      ...base,
      minHeight: 40,
      borderColor: primaryColor,
      boxShadow: state.isFocused ? `0 0 0 1px ${primaryColor}` : "none",
      "&:hover": { borderColor: primaryColor },
      fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
      borderRadius: 4,
    }),

    singleValue: (base) => ({
      ...base,
      color: primaryColor,
      fontWeight: 400,
      fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
    }),

    option: (base, state) => ({
      ...base,
      backgroundColor:
        state.isFocused || state.isSelected ? optionHighlight : "white",
      color: "#000",
      fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),

    menuPortal: (base) => ({ ...base, zIndex: 2000 }),
    menu: (base) => ({ ...base, zIndex: 1300 }),
  };
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
  primaryColor = '#580F8B',
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
        styles={createStyles(primaryColor)}
        menuPortalTarget={document.body}
      />
    </div>
  );
};

export default CmrSelect;
