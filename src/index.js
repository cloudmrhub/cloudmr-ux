import "./style.css";
import React from "react";
import ReactDOM from "react-dom";
import { CmrButton } from "./CmrComponents/CmrButton";
import { CmrInput } from "./CmrComponents/CmrInput";
import { CmrCheckbox } from "./CmrComponents/CmrCheckbox";
import { CmrRadio } from "./CmrComponents/CmrRadio";

const App = () => (
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
                <p><CmrButton onClick={() => alert('Button clicked!')}>Primary Button</CmrButton></p>

                <p><CmrButton variant="outlined" onClick={() => alert('Outlined button clicked!')}>
                    Outlined Button
                </CmrButton></p>

                <p><CmrButton disabled>
                    Disabled Button
                </CmrButton></p>

            </div>

            <div>
                <h3> 2. Input </h3>
                <CmrInput></CmrInput>
            </div>

            <div>
                <h3> 3. Checkbox </h3>
                <CmrCheckbox>Label</CmrCheckbox>
            </div>

            <div>
                <h3> 4. Radio Button </h3>
                <CmrRadio>Label</CmrRadio>
            </div>

        </main>

    </div>
);

ReactDOM.render(<App />, document.getElementById("root"));