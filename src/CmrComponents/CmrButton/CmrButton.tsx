import './CmrButton.css';
import { Button, ButtonProps } from '@mui/material';

export const CmrButton = (props: ButtonProps) => {
    const { children, onClick, ...rest } = props;

    return (
        <Button onClick={onClick} {...rest} className="cmr-button"  style={{textTransform:'none'}}>
            {children}
        </Button>
    );
};

// ...props.style