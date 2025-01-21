import React, { useState } from 'react';
import { Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import './CmrSelect.css';

interface Option {
    label: string;
    value: string;
}

interface CmrSelectProps {
    options: Option[];
    label: string;
    disabled?: boolean;
}

const CmrSelect: React.FC<CmrSelectProps> = ({ options, label, disabled }) => {
    // Handle state for selected value directly in the component
    const [selectedValue, setSelectedValue] = useState<string>('');

    const handleChange = (event: SelectChangeEvent<string>) => {
        setSelectedValue(event.target.value);
        console.log('Selected Value:', event.target.value); // For debugging or action handling
    };

    return (
        <FormControl className="dropdown-select" sx={{
            minWidth: 200, // Minimum width for the dropdown
            maxWidth: 400, // Optional: Maximum width for the dropdown
            width: 'auto', // Allow auto-resizing based on content
        }} disabled={disabled}>
            <InputLabel className="dropdown-label">{label}</InputLabel>
            <Select value={selectedValue} onChange={handleChange} label={label} MenuProps={{
                classes: { paper: 'custom-dropdown' }, // Apply the class to the dropdown menu
            }}>
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default CmrSelect;