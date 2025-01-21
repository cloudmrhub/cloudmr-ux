import React, { useState } from "react";
import './CmrRadioGroup.css';
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

const CmrRadioGroup: React.FC<CmrRadioProps> = ({
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
        <div className="cmr-radio-label">
            <FormControl component="fieldset">
                {groupLabel && <FormLabel component="legend">{groupLabel}</FormLabel>}
                <RadioGroup value={selectedValue} onChange={handleChange}>
                    {options.map((option) => (
                        <FormControlLabel
                            key={option.value}
                            value={option.value}
                            control={<Radio disabled={option.disabled} />}
                            label={option.label}
                            sx={{
                                '& .MuiTypography-root': {
                                    fontSize: '14.4px',
                                    fontFamily: '"Source Sans 3", sans-serif',
                                },
                            }}
                        />
                    ))}
                </RadioGroup>
            </FormControl>
        </div>
    );
};

export default CmrRadioGroup;
