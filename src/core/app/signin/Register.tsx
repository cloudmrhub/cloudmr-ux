import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";

import {
  registerUser,
  RegisterDataType,
} from "../../features/authenticate/authenticateActionCreation";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  clearError,
  clearRegisterSuccess,
} from "../../features/authenticate/authenticateSlice";

import { useEffect, useState } from "react";
import {
  validatePassword,
  isPasswordValid as checkPasswordValid,
  PasswordValidation,
} from "../../utils/passwordValidation";
import PasswordRequirements from "../../components/PasswordRequirements";

type RegisterProps = {
  onBackToSignin: () => void;

  /**
   * When true, do not render Container/Paper wrapper.
   * Useful for embedded usage (e.g., inside a Popover) to avoid double-card outlines.
   */
  hidePaper?: boolean;
};

export default function Register({
  onBackToSignin,
  hidePaper = false,
}: RegisterProps) {
  const dispatch = useAppDispatch();
  const { loading, error, registerSuccess } = useAppSelector(
    (state) => state.authenticate,
  );

  const [showSuccess, setShowSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (registerSuccess) {
      setShowSuccess(true);
      // Clear success message after showing it
      setTimeout(() => {
        dispatch(clearRegisterSuccess());
        setShowSuccess(false);
      }, 5000);
    }
  }, [registerSuccess, dispatch]);

  useEffect(() => {
    // Clear error when component unmounts
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Validate password with debounce - only update after user stops typing
  useEffect(() => {
    if (password.length === 0) {
      setShowPasswordValidation(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      const validation = validatePassword(password);
      setPasswordValidation(validation);
      setShowPasswordValidation(true);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [password]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };

  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;

  const isEmailValid = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid = (): boolean => {
    // Check if password meets all requirements
    const passwordValid = checkPasswordValid(passwordValidation);
    // Check if passwords match
    const passwordsMatchValid = password === confirmPassword && confirmPassword.length > 0;
    // Check if password fields have content
    const hasPasswordContent = password.length > 0 && confirmPassword.length > 0;

    return passwordValid && passwordsMatchValid && hasPasswordContent;
  };

  const handleSubmit = (event: any) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const emailValue = data.get("email") as string;

    // Validate email format
    if (!isEmailValid(emailValue)) {
      return;
    }
    // Do immediate validation before submit
    const currentValidation = validatePassword(password);
    setPasswordValidation(currentValidation);
    setShowPasswordValidation(true);

    // Check if all validation rules pass
    if (!checkPasswordValid(currentValidation)) {
      return; // Validation messages will be shown
    }

    // Validate password confirmation
    if (!passwordsMatch) {
      return; // Validation message already shown
    }

    const registerData: RegisterDataType = {
      email: emailValue,
      password: password,
      firstname: data.get("firstname") as string,
      lastname: data.get("lastname") as string,
      username: data.get("username") as string,
    };

    dispatch(registerUser(registerData));
  };

  const body = (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Create Account
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

      {showSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Registration successful! Please wait for admin approval before signing in.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="firstname"
            label="First Name"
            name="firstname"
            size="small"
            autoFocus
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="lastname"
            label="Last Name"
            name="lastname"
            size="small"
          />
        </Grid>
      </Grid>

      <TextField
        margin="normal"
        required
        fullWidth
        id="username"
        label="Username"
        name="username"
        size="small"
      />

      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        type="email"
        size="small"
        autoComplete="email"
      />

      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        size="small"
        autoComplete="new-password"
        value={password}
        onChange={handlePasswordChange}
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
        label="Confirm Password"
        type="password"
        id="confirmPassword"
        size="small"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={handleConfirmPasswordChange}
        error={confirmPassword.length > 0 && !passwordsMatch}
        helperText={
          confirmPassword.length > 0 && !passwordsMatch ? "Passwords do not match" : ""
        }
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading || !isFormValid()}
      >
        {loading ? "Registering..." : "Register"}
      </Button>

      <Grid container justifyContent="flex-end">
        <Grid item>
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onBackToSignin();
            }}
            variant="body2"
          >
            Already have an account? Sign in
          </Link>
        </Grid>
      </Grid>
    </Box>
  );

  // Embedded mode: no container/paper outline (popover provides the frame)
  if (hidePaper) {
    return <Box sx={{ p: 0 }}>{body}</Box>;
  }

  // Default mode: same as before
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>{body}</Paper>
    </Container>
  );
}
