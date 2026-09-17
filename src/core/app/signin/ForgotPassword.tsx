import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";
import {
  forgotPassword,
  resetPassword,
  ForgotPasswordDataType,
  ResetPasswordDataType,
} from "../../features/authenticate/authenticateActionCreation";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  clearError,
  clearForgotPasswordSuccess,
  clearResetPasswordSuccess,
} from "../../features/authenticate/authenticateSlice";
import { useEffect, useState } from "react";
import {
  validatePassword,
  isPasswordValid as checkPasswordValid,
  PasswordValidation,
} from "../../utils/passwordValidation";
import PasswordRequirements from "../../components/PasswordRequirements";

export default function ForgotPassword({
  onBackToSignin,
}: {
  onBackToSignin: () => void;
}) {
  const dispatch = useAppDispatch();
  const { loading, error, forgotPasswordSuccess, resetPasswordSuccess } =
    useAppSelector((state) => state.authenticate);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
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
    if (forgotPasswordSuccess) {
      // Show the reset form after successfully requesting code
      setShowResetForm(true);

      // Clear success message after showing it
      setTimeout(() => {
        dispatch(clearForgotPasswordSuccess());
      }, 5000);
    }
  }, [forgotPasswordSuccess, dispatch]);

  useEffect(() => {
    if (resetPasswordSuccess) {
      // Clear the form and go back to signin after successful reset
      setTimeout(() => {
        dispatch(clearResetPasswordSuccess());
        onBackToSignin();
      }, 3000);
    }
  }, [resetPasswordSuccess, dispatch, onBackToSignin]);

  useEffect(() => {
    // Clear error when component unmounts
    return () => {
      dispatch(clearError());
      dispatch(clearForgotPasswordSuccess());
      dispatch(clearResetPasswordSuccess());
    };
  }, [dispatch]);

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

  const passwordsMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;

  const isIdentifierValid = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.includes("@")) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    }
    return true;
  };

  const isResetFormValid = (): boolean => {
    const passwordValid = checkPasswordValid(passwordValidation);
    const passwordsMatchValid = passwordsMatch;
    const hasContent =
      email.length > 0 &&
      code.length > 0 &&
      newPassword.length > 0 &&
      confirmPassword.length > 0;

    return passwordValid && passwordsMatchValid && hasContent;
  };

  const handleForgotPasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isIdentifierValid(email)) {
      return;
    }

    const forgotData: ForgotPasswordDataType = {
      email,
    };

    dispatch(forgotPassword(forgotData));
  };

  const handleResetPasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    // Do immediate validation before submit
    const currentValidation = validatePassword(newPassword);
    setPasswordValidation(currentValidation);
    setShowPasswordValidation(true);

    // Check if all validation rules pass
    if (!checkPasswordValid(currentValidation)) {
      return;
    }

    // Validate password confirmation
    if (!passwordsMatch) {
      return;
    }

    const resetData: ResetPasswordDataType = {
      email,
      code,
      newPassword,
    };

    dispatch(resetPassword(resetData));
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 2, md: 4 }, width: "100%" }}>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        {!showResetForm ? (
          <Box component="form" onSubmit={handleForgotPasswordSubmit} noValidate>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Forgot Password
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter your email or username and we'll send a verification code to
              the email on your account.
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => dispatch(clearError())}
              >
                {error}
              </Alert>
            )}

            {forgotPasswordSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                A verification code has been sent to your email.
              </Alert>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email or Username"
              name="email"
              size="small"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !email || !isIdentifierValid(email)}
            >
              {loading ? "Sending Code..." : "Send Verification Code"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onBackToSignin();
                }}
                variant="body2"
              >
                Back to Sign In
              </Link>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleResetPasswordSubmit} noValidate>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Reset Password
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter the verification code sent to your email and choose a new
              password.
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => dispatch(clearError())}
              >
                {error}
              </Alert>
            )}

            {resetPasswordSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Password reset successfully! Redirecting to sign in...
              </Alert>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="code"
              label="Verification Code"
              name="code"
              size="small"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              id="newPassword"
              size="small"
              autoComplete="new-password"
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
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              size="small"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword.length > 0 && !passwordsMatch}
              helperText={
                confirmPassword.length > 0 && !passwordsMatch
                  ? "Passwords do not match"
                  : ""
              }
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !isResetFormValid()}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowResetForm(false);
                  dispatch(clearError());
                }}
                variant="body2"
              >
                Back
              </Link>
              {" | "}
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onBackToSignin();
                }}
                variant="body2"
              >
                Sign In
              </Link>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
