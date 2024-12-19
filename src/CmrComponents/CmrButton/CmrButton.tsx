import './CmrButton.css';
import { Button, ButtonProps } from '@mui/material';

export const CmrButton = (props: ButtonProps) => {
    const { children, onClick, variant = "contained", disabled = false, ...rest } = props;

    return (
        <Button 
            onClick={onClick} 
            {...rest} 
            className={`cmr-button ${variant}`} 
            style={{textTransform:'none'}} 
            variant={variant} 
            disabled={disabled}
            sx={{
                boxShadow: 'none',  // Removes the shadow on the button by default
                '&:hover': {
                    boxShadow: 'none',  // Removes the shadow on hover as well
                },
            }}
        >
            {children}
        </Button>
    );
};

// ...props.style