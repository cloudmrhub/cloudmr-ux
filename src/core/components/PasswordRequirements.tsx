import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import {
  PasswordValidation,
  getPasswordRequirements,
} from "../utils/passwordValidation";

interface PasswordRequirementsProps {
  validation: PasswordValidation;
  show: boolean;
}

export default function PasswordRequirements({
  validation,
  show,
}: PasswordRequirementsProps) {
  if (!show) return null;

  const requirements = getPasswordRequirements();

  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      <Typography
        variant="caption"
        display="block"
        sx={{ mb: 0.5, fontWeight: "bold" }}
      >
        Password Requirements:
      </Typography>
      {requirements.map(({ key, label }) => {
        const isValid = validation[key];
        return (
          <Typography
            key={key}
            variant="caption"
            display="flex"
            alignItems="center"
            sx={{
              color: isValid ? "success.main" : "error.main",
            }}
          >
            {isValid ? (
              <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5 }} />
            ) : (
              <CancelIcon sx={{ fontSize: 16, mr: 0.5 }} />
            )}
            {label}
          </Typography>
        );
      })}
    </Box>
  );
}
