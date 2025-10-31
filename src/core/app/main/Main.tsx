import { CmrTabs } from "../../../index";
import type { TabInfo } from "../../../CmrTabs/tab.model";
interface MainProps {
  tabData: TabInfo[];
}

const Main = ({ tabData }: MainProps) => {
  return (
    <div className="container-fluid mt-4" style={{ transition: "all 0.3s" }}>
      <CmrTabs tabList={tabData} />
    </div>
  );
};

export default Main;
