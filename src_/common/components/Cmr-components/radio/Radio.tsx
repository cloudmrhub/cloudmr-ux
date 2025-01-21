// import React from 'react';
// import './Radio.scss';
// import { Radio } from 'antd';

// interface CmrRadioProps {
//     checked?: boolean;
//     defaultChecked?: boolean;
//     disabled?: boolean;
//     value?: any;
//     children?: any;
// }

// const CmrRadio = (props: CmrRadioProps) => {
//     const { checked, defaultChecked, disabled, value, children, ...rest } = props;

//     return (
//         <Radio checked={checked} defaultChecked={defaultChecked} disabled={disabled} value={value} {...rest}>
//             {children}
//         </Radio>
//     );
// };

// export default CmrRadio;

import React, { useState } from "react";
import {
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormLabel,
} from "@mui/material";

interface CmrRadioOption {
  label: string; // Label for each radio button
  value: string; // Value for each radio button
  disabled?: boolean; // Optional: Disabled state for individual radio buttons
}

interface CmrRadioProps {
  options: CmrRadioOption[]; // Array of radio button options
  groupLabel?: string; // Label for the radio group
  defaultValue?: string; // Default selected value
  onChange?: (value: string) => void; // Handler to return the selected value
}

const CmrRadio: React.FC<CmrRadioProps> = ({
  options,
  groupLabel,
  defaultValue,
  onChange,
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue || "");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSelectedValue(newValue);

    // Use the passed onChange handler, or fall back to logging by default
    if (onChange) {
      onChange(newValue);
    } else {
      console.log("Selected Radio Value:", newValue);
    }
  };

  return (
    <FormControl component="fieldset">
      {groupLabel && <FormLabel component="legend">{groupLabel}</FormLabel>}
      <RadioGroup value={selectedValue} onChange={handleChange}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio disabled={option.disabled} />}
            label={option.label}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};

export default CmrRadio;
