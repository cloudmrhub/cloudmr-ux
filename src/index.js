import "./style.css";
import React from "react";
import ReactDOM from "react-dom";
import { CmrButton } from "./CmrComponents/CmrButton";
import { CmrInput } from "./CmrComponents/CmrInput";
import { CmrCheckbox } from "./CmrComponents/CmrCheckbox";
import { CmrRadioGroup } from "./CmrComponents/CmrRadioGroup";
import { CmrSelect } from "./CmrComponents/CmrSelect";

const App = () => {
    return (
        <div>
            {/* Navigation Bar */}
            <nav>
                <ul>
                    <li>
                        <a href="">Home</a>
                    </li>
                </ul>
            </nav>

            <main>
                <h1>UX Components</h1>

                <div>
                    <h3> 1. Buttons </h3>
                    <p>
                        <CmrButton onClick={() => alert("Button clicked!")}>
                            Primary Button
                        </CmrButton>
                    </p>

                    <p>
                        <CmrButton
                            variant="outlined"
                            onClick={() => alert("Outlined button clicked!")}
                        >
                            Outlined Button
                        </CmrButton>
                    </p>

                    <p>
                        <CmrButton disabled>Disabled Button</CmrButton>
                    </p>
                </div>

                <div>
                    <h3> 2. Input </h3>
                    <CmrInput />
                </div>

                <div>
                    <h3> 3. Checkbox </h3>
                    <CmrCheckbox>Label</CmrCheckbox>
                </div>

                <div>
                    <h3> 4. Radio Button Group </h3>

                    <CmrRadioGroup
                        // groupLabel="Select an Option"
                        defaultValue="option1"
                        options={[
                            { label: "Option 1", value: "option1" },
                            { label: "Option 2", value: "option2" },
                            { label: "Option 3", value: "option3" },
                            // { label: "Option 3", value: "option3", disabled: true },
                        ]}
                    />

                </div>

                <div>
                    <h3> 5. Dropdown Selection </h3>
                    <CmrSelect
                        options={[
                            { label: 'Option 1', value: 'option1' },
                            { label: 'Option 2', value: 'option2' },
                            { label: 'Option 3', value: 'option3' }
                        ]}
                        label="Select an Option"
                    />
                </div>
            </main>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById("root"));