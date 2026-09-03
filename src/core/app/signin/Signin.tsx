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
    primary: { main: "#580F8B" },
    secondary: { main: "#6c757d" },
  },
});

type SigninProps = {
  appIcon?: string;
  appTitle?: string;
  appIconHeight?: string | number;

  /**
   * Gap between the app icon and title (flex `gap`).
   * Use a negative value to pull the title closer when the icon PNG has built-in padding.
   * Only affects apps that pass this prop; others keep the default.
   */
  appIconGap?: string | number;

  /**
   * Vertical alignment of the icon relative to the title (flex `alignItems`).
   * Use "flex-end" to bottom-align the icon with the text.
   */
  appIconAlign?: "center" | "flex-start" | "flex-end" | "baseline";

  /**
   * Optical vertical nudge for the icon (CSS `translateY`).
   * Negative values move the icon up (useful when text has a visual gap below glyphs).
   */
  appIconOffsetY?: string | number;

  /**
   * "page" = original layout (flex-center + big top padding + container margins)
   * "embed" = popover/card mode (no page layout wrapper; no outer margins)
   */
  variant?: "page" | "embed";

  /**
   * Optional styling overrides for the Container that wraps the Paper card.
   * (Use this to tweak spacing/width in embed mode.)
   */
  sx?: any;

  /**
   * Optional styling overrides for the Paper card.
   * (Use this to tweak padding/shadow in embed mode.)
   */
  paperSx?: any;
};

export default function Signin({
  appIcon,
  appTitle,
  appIconHeight = "70pt",
  appIconGap = "0.25rem",
  appIconAlign = "center",
  appIconOffsetY,

  variant = "page",
  sx = {},
  paperSx = {},
}: SigninProps) {
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

  const content = (
    <div id="welcome" className={variant === "embed" ? "welcome-embed" : ""}>
      <div id="welcome-logo">
        <div
          style={{
            margin: "auto",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: appIconAlign,
            gap: appIconGap,
          }}
        >
          {appIcon ? (
            <img
              src={appIcon}
              className="img-fluid"
              style={{
                height: appIconHeight,
                display: "block",
                ...(appIconOffsetY != null
                  ? {
                      transform: `translateY(${
                        typeof appIconOffsetY === "number"
                          ? `${appIconOffsetY}px`
                          : appIconOffsetY
                      })`,
                    }
                  : {}),
              }}
              alt=""
            />
          ) : null}

          {appTitle ? (
            <h1
              style={{
                display: "block",
                margin: 0,
                lineHeight: 1,
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              {appTitle}
            </h1>
          ) : null}
        </div>
      </div>

      <div id="welcome-login">
        {!showRegister && !showForgotPassword ? (
          <Container
            // In embed mode, don't clamp width with maxWidth and remove margins/padding
            maxWidth={variant === "embed" ? false : "lg"}
            sx={{
              mt: variant === "embed" ? 0 : 4,
              mb: variant === "embed" ? 0 : 4,
              px: variant === "embed" ? 0 : undefined,
              ...sx,
            }}
          >
            <Paper
              sx={{
                p: 3,
                // In embed mode, let the Popover Paper handle shadow if desired
                ...(variant === "embed" ? { boxShadow: "none" } : {}),
                ...paperSx,
              }}
            >
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

                <Grid
                  container
                  justifyContent="space-between"
                  alignItems="center"
                >
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
                      Sign Up
                    </Link>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Container>
        ) : showForgotPassword ? (
          <ForgotPassword onBackToSignin={() => setShowForgotPassword(false)} />
        ) : (
          <Register onBackToSignin={() => setShowRegister(false)} hidePaper={variant === "embed"}/>
        )}
      </div>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      {variant === "embed" ? (
        // Popover/card mode: no "page layout" wrapper
        content
      ) : (
        // Original behavior stays the same for existing apps
        <div
          className="flex-center"
          style={{ paddingTop: "clamp(16px, 12vh, 140px)" }}
        >
          {content}
        </div>
      )}
    </ThemeProvider>
  );
}
