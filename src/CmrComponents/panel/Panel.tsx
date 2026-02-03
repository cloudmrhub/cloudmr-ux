import React, { ReactNode } from "react";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

interface CmrPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  activeKey?: string | string[];
  header: ReactNode; // allow string OR JSX
  children: ReactNode;
  panelKey?: number;
  onToggle?: (key: number | undefined) => void;
  expanded?: boolean;
  cardProps?: React.HTMLAttributes<HTMLDivElement>;
  headerFontWeight?: "normal" | "bold";
}

const CmrPanel = function (props: CmrPanelProps) {
  const headerFontWeight = props.headerFontWeight ?? "normal";
  const { expanded, onToggle } = props;

  const toggle = () => {
    if (onToggle) onToggle(props.panelKey);
  };

  const headerClickable = !!onToggle;

  return (
    <div className={`card ${props.className ?? ""}`}>
      <div
        className="card-header"
        style={{
          background: "white",
          display: props.header === undefined ? "none" : undefined,
          cursor: headerClickable ? "pointer" : "default",
          userSelect: "none",
        }}
        onClick={headerClickable ? toggle : undefined} // header toggles
        role={headerClickable ? "button" : undefined}
        aria-expanded={!!expanded}
      >
        <div className="row align-items-center">
          <div className="col" style={{ fontWeight: headerFontWeight }}>
            {props.header}
          </div>

          {onToggle && (
            <div className="col text-end">
              <span
                className="react-collapse float-end btn"
                onClick={(e) => {
                  e.stopPropagation(); // prevents double toggle (span + header)
                  toggle();            // span toggles
                }}
                role="button"
                aria-label={expanded ? "Collapse panel" : "Expand panel"}
              >
                {!expanded ? <ArrowDropDownIcon /> : <ArrowDropUpIcon />}
              </span>
            </div>
          )}
        </div>
      </div>

      {!expanded ? (
        <div
          className={`card-body m-0 ${props.cardProps?.className || ""}`}
          style={{
            maxHeight: "0",
            padding: 0,
            opacity: "0",
            overflow: "hidden",
            visibility: "collapse",
            transition: "all 0.5s",
          }}
        >
          {props.children}
        </div>
      ) : (
        <div
          className={`card-body m-4 ${props.cardProps?.className || ""}`}
          style={{
            maxHeight: undefined,
            padding: 0,
            opacity: "1",
            visibility: "visible",
            transition: "all 0.5s",
          }}
        >
          {props.children}
        </div>
      )}
    </div>
  );
};

export default CmrPanel;
