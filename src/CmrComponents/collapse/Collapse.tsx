import React, { cloneElement } from "react";
import { CollapsibleType } from "antd/es/collapse/CollapsePanel";
import { ExpandIconPosition } from "antd/es/collapse/Collapse";
import "./Collapse.css";

interface CmrCollapseProps {
  accordion?: boolean;
  activeKey?: Array<string | number> | number;
  bordered?: boolean;
  collapsible?: CollapsibleType;
  defaultActiveKey?: Array<string | number>;
  destroyInactivePanel?: boolean;
  expandIconPosition?: ExpandIconPosition;
  ghost?: boolean;
  onChange?: (key: Array<string | number> | number) => void;
  children?: JSX.Element[] | JSX.Element;
}

const CmrCollapse = (props: CmrCollapseProps) => {
  let { activeKey, defaultActiveKey, onChange, children } = props;
  defaultActiveKey = defaultActiveKey || [];

  const [activeKeys, setActiveKeys] = React.useState<Array<string | number>>(
    defaultActiveKey
  );

  // Sync activeKey prop with state
  React.useEffect(() => {
    if (activeKey === undefined) return;
    const next = Array.isArray(activeKey) ? activeKey : [activeKey];
    setActiveKeys(next);
  }, [activeKey]);

  // Handle toggling panels
  const onToggle = (key: number) => {
    const newKeys = [...activeKeys];
    const keyIndex = newKeys.indexOf(key);

    if (keyIndex === -1) newKeys.push(key);
    else newKeys.splice(keyIndex, 1);

    setActiveKeys(newKeys);
    onChange?.(newKeys);
  };

  // Render children
  const renderChildren = () => {
    if (!children) return null;

    if (Array.isArray(children)) {
      return children.map((child, index) => {
        const panelKey = index;
        const expanded = activeKeys.includes(panelKey);

        return (
          <React.Fragment key={panelKey}>
            {cloneElement(child, {
              expanded,
              panelKey,
              onToggle,
            })}
          </React.Fragment>
        );
      });
    }

    const panelKey = 0;
    const expanded = activeKeys.includes(panelKey);

    return cloneElement(children, {
      expanded,
      panelKey,
      onToggle,
    });
  };

  return (
    <div className="cmr-collapse">
      <div>{renderChildren()}</div>
    </div>
  );
};

export default CmrCollapse;
