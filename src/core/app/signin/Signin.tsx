import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";
import { getLoggedInToken } from "../../features/authenticate/authenticateActionCreation";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearError } from "../../features/authenticate/authenticateSlice";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useState, useEffect } from "react";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import "./Signin.scss";

const theme = createTheme({
  palette: {
    primary: {
      main: "#580F8B",
    },
    secondary: {
      main: "#6c757d",
    },
  },
});

export default function Signin({
  appIcon,
  appTitle,
}: {
  appIcon: string;
  appTitle: string;
}) {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.authenticate);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    // Clear error when component unmounts
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = (event: any) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    //@ts-ignore
    //
    const credentials = {
      email: data.get("email") as string,
      password: data.get("password") as string,
    };
    dispatch(getLoggedInToken(credentials));
  };

  return (
    <ThemeProvider theme={theme}>
      <div
        className="flex-center page-root"
        style={{ paddingTop: "clamp(16px, 12vh, 140px)" }}
      >
        <div id="welcome">
          <div id="welcome-logo">
            <div
              style={{
                margin: "auto",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src={appIcon}
                className="img-fluid"
                style={{ margin: "auto", height: "70pt" }}
                alt=""
              />
              <h1
                style={{
                  display: "block",
                  marginTop: "8pt",
                  marginRight: "5pt",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                {appTitle}
              </h1>
            </div>
          </div>

          <div id="welcome-login">
            {!showRegister && !showForgotPassword ? (
              <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper sx={{ p: 3 }}>
                  <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      Sign In
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

                    <TextField
                      margin="normal"
                      className="col-md-6"
                      required
                      fullWidth
                      id="email"
                      label="Email Address"
                      name="email"
                      size="small"
                      autoComplete="email"
                      autoFocus
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
                      autoComplete="current-password"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          value="remember"
                          size={"small"}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="subtitle2">Remember Me</Typography>
                      }
                      style={{ float: "right", marginRight: "0" }}
                      className="input-sm"
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      sx={{ mt: 3, mb: 2 }}
                      disabled={loading}
                    >
                      {loading ? "Signing In..." : "Sign In"}
                    </Button>
                    <Grid container justifyContent="space-between" alignItems="center">
                      <Grid item>
                        <Link
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowForgotPassword(true);
                          }}
                          variant="body2"
                        >
                          Forgot Password?
                        </Link>
                      </Grid>
                      <Grid item>
                        <Link
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowRegister(true);
                          }}
                          variant="body2"
                        >
                          {"Sign Up"}
                        </Link>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Container>
            ) : showForgotPassword ? (
              <ForgotPassword onBackToSignin={() => setShowForgotPassword(false)} />
            ) : (
              <Register onBackToSignin={() => setShowRegister(false)} />
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
