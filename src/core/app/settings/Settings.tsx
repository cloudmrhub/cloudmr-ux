import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  changePassword,
  ChangePasswordDataType,
} from "../../features/authenticate/authenticateActionCreation";
import {
  clearError,
  clearChangePasswordSuccess,
} from "../../features/authenticate/authenticateSlice";
import {
  validatePassword,
  isPasswordValid,
  PasswordValidation,
} from "../../utils/passwordValidation";
import PasswordRequirements from "../../components/PasswordRequirements";

export default function Settings() {
  const dispatch = useAppDispatch();
  const { loading, error, changePasswordSuccess } = useAppSelector(
    (state) => state.authenticate
  );

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);
  const [passwordValidation, setPasswordValidation] =
    useState<PasswordValidation>({
      minLength: false,
      hasNumber: false,
      hasSpecial: false,
      hasUppercase: false,
      hasLowercase: false,
    });

  useEffect(() => {
    if (changePasswordSuccess) {
      // Clear the form on success
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordValidation(false);

      // Clear success message after 5 seconds
      setTimeout(() => {
        dispatch(clearChangePasswordSuccess());
      }, 5000);
    }
  }, [changePasswordSuccess, dispatch]);

  // Validate password with debounce
  useEffect(() => {
    if (newPassword.length === 0) {
      setShowPasswordValidation(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      const validation = validatePassword(newPassword);
      setPasswordValidation(validation);
      setShowPasswordValidation(true);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [newPassword]);

  useEffect(() => {
    // Clear error when component unmounts
    return () => {
      dispatch(clearError());
      dispatch(clearChangePasswordSuccess());
    };
  }, [dispatch]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    // Do immediate validation before submit
    const currentValidation = validatePassword(newPassword);
    setPasswordValidation(currentValidation);
    setShowPasswordValidation(true);

    // Check if all validation rules pass
    if (!isPasswordValid(currentValidation)) {
      setLocalError("Password does not meet requirements");
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
      setLocalError("New passwords do not match");
      return;
    }

    const passwordData: ChangePasswordDataType = {
      oldPassword,
      newPassword,
    };

    dispatch(changePassword(passwordData));
  };

  const isFormValid = (): boolean => {
    const passwordValid = isPasswordValid(passwordValidation);
    const passwordsMatch = newPassword === confirmNewPassword && confirmNewPassword.length > 0;
    const hasContent = oldPassword.length > 0 && newPassword.length > 0 && confirmNewPassword.length > 0;

    return passwordValid && passwordsMatch && hasContent;
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>

        {(error || localError) && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => {
              dispatch(clearError());
              setLocalError(null);
            }}
          >
            {error || localError}
          </Alert>
        )}

        {changePasswordSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password changed successfully!
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            name="oldPassword"
            label="Current Password"
            type="password"
            id="oldPassword"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="newPassword"
            label="New Password"
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <PasswordRequirements
            validation={passwordValidation}
            show={showPasswordValidation}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmNewPassword"
            label="Confirm New Password"
            type="password"
            id="confirmNewPassword"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            error={
              confirmNewPassword.length > 0 && newPassword !== confirmNewPassword
            }
            helperText={
              confirmNewPassword.length > 0 && newPassword !== confirmNewPassword
                ? "Passwords do not match"
                : ""
            }
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !isFormValid()}
          >
            {loading ? "Changing Password..." : "Change Password"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
