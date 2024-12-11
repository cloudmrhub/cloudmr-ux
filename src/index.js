import React from "react";
import ReactDOM from "react-dom";
import { CmrButton } from "./CmrComponents/CmrButton"; 
import { CmrInput } from "./CmrComponents/CmrInput"; 
import { CmrCheckbox } from "./CmrComponents/CmrCheckbox";
import { CmrRadio } from "./CmrComponents/CmrRadio";

const App = () => (
<div>
<h1>Testing cloudrm-ux Components</h1>
<CmrButton onClick={() => alert('Button clicked!')}>Button</CmrButton>
<CmrInput></CmrInput>
<CmrCheckbox>ded</CmrCheckbox> 
<CmrRadio></CmrRadio>
</div>
);

ReactDOM.render(<App />, document.getElementById("root"));