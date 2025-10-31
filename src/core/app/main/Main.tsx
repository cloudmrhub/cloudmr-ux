import { CmrTabs } from "../../../index";
import type { TabInfo } from "../../../CmrTabs/tab.model";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getProfile } from "../../features/authenticate/authenticateActionCreation";

interface MainProps {
  tabData: TabInfo[];
}

const Main = ({ tabData }: MainProps) => {
  const [focusedTab, setFocusedTab] = useState(1);
  const { logged_in_token } = useAppSelector((state) => state.authenticate);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (logged_in_token) {
      dispatch(getProfile(logged_in_token.accessToken));
    }
  }, [logged_in_token, dispatch]);

  return (
    <div className="container-fluid mt-4" style={{ transition: "all 0.3s" }}>
      <CmrTabs
        tabList={tabData}
        onTabSelected={(tabIndex) => {
          setFocusedTab(tabIndex);
        }}
      />
    </div>
  );
};

export default Main;
