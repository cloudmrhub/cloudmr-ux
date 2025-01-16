import React, { useState } from 'react';
import { Radio, FormControl, FormControlLabel, RadioGroup } from '@mui/material';

const CmrRadio = () => {
  const [selectedValue, setSelectedValue] = useState<string>('option1'); // State to manage selected radio button value

  // Handle the change in selection
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedValue(event.target.value);
  };

  return (
    <FormControl component="fieldset">
      <RadioGroup
        aria-label="radio-button-group"
        name="radio-buttons"
        value={selectedValue}
        onChange={handleChange}
      >
        {/* First Radio Button */}
        <FormControlLabel
          value="option1"
          control={<Radio />}
          label="Option 1"
        />
        
        {/* Second Radio Button */}
        <FormControlLabel
          value="option2"
          control={<Radio />}
          label="Option 2"
        />
        
        {/* Third Radio Button */}
        <FormControlLabel
          value="option3"
          control={<Radio />}
          label="Option 3"
        />
      </RadioGroup>
    </FormControl>
  );
};

export default CmrRadio;
