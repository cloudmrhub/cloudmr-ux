import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { getLoggedInToken } from "../../features/authenticate/authenticateActionCreation";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearError } from "../../features/authenticate/authenticateSlice";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useState, useEffect } from "react";
import Register from "./Register";
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
        style={{ paddingTop: "calc(20vh - 20px)" }}
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
            {!showRegister ? (
              <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                style={{ width: "87.5%" }}
              >
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
                  className="col-md-12"
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
                    <Checkbox value="remember" size={"small"} color="primary" />
                  }
                  label={<Typography variant="subtitle2">Remember Me</Typography>}
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
                <Button
                  type="button"
                  fullWidth
                  variant="contained"
                  color="secondary"
                  sx={{ mb: 2 }}
                >
                  Forgot Password?
                </Button>
                <Grid container justifyContent="flex-end">
                  <Grid item>
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowRegister(true);
                      }}
                      className="btn btn-link"
                      variant="body2"
                    >
                      {"Sign Up"}
                    </Link>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Register onBackToSignin={() => setShowRegister(false)} />
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
