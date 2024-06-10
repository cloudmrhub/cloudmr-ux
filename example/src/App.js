import logo from './logo.svg';
import './App.css';
import { CmrButton, CmrInput,CmrCheckbox,CmrCollapse,CmrAvatar} from 'cloudmr-ux';

function App() {
  return (
    <div className="App">
    <CmrButton onClick={() => console.log(123)}>123</CmrButton>
    <CmrInput></CmrInput>
    <CmrCheckbox></CmrCheckbox>
    <CmrCollapse></CmrCollapse>
    <CmrAvatar></CmrAvatar>
    </div>
  );
}

export default App;
