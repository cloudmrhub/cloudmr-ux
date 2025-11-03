import React from "react";
import "./Label.css";

interface CmrLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  marginLeft?: number;
  required?: boolean;
  children?: any;
}

const CmrLabel = (props: CmrLabelProps) => {
  const { children, required = false } = props;

  return (
    <label
      className="cmr-label"
      style={{ marginLeft: props.marginLeft, fontSize: "16px", ...props.style }}
    >
      {children}
      {required && <span className="asterik">*</span>}
    </label>
  );
};

export default CmrLabel;
