import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {getLoggedInToken, refreshAccessToken, getProfile, signOut, registerUser, changePassword} from './authenticateActionCreation';
import {getUploadedData} from '../data/dataActionCreation';

export interface AuthenticateToken {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    parsedToken: any;
}

export interface AuthenticateState {
    id?: string;
    email: string;
    username?: string;
    status?: string;
    level?: string;
    isAdmin?: boolean;

    logged_in_token?: AuthenticateToken;
    loading: boolean;

    // Tokens providing fine-grained access - will be set via action
    uploadToken: string;
    queueToken: string;

    // Computed accessToken for backwards compatibility
    accessToken: string;

    // Error and success messages
    error?: string;
    registerSuccess?: boolean;
    changePasswordSuccess?: boolean;
}

const initialState: AuthenticateState = {
    email: '',
    loading: false,
    uploadToken: '', // Will be set when app initializes
    queueToken: '',  // Will be set when app initializes
    accessToken: '', // Computed from logged_in_token
};

export const authenticateSlice = createSlice({
        name: 'authenticate',
        initialState,
        reducers: {
            // Add action to set initial tokens from config
            setInitialTokens: (state, action: PayloadAction<{uploadToken: string, queueToken: string}>) => {
                state.uploadToken = action.payload.uploadToken;
                state.queueToken = action.payload.queueToken;
            },
            resetAuth: (state) => {
                state.email = "";
                state.logged_in_token = undefined;
                state.accessToken = "";
                state.loading = false;
                state.error = undefined;
                state.registerSuccess = undefined;
            },
            clearError: (state) => {
                state.error = undefined;
            },
            clearRegisterSuccess: (state) => {
                state.registerSuccess = undefined;
            },
            clearChangePasswordSuccess: (state) => {
                state.changePasswordSuccess = undefined;
            }
        },
        extraReducers: (builder) => (
            builder.addCase('persist/REHYDRATE', (state, action) => {
                let authenticate = (action as PayloadAction<any>).payload?.authenticate;
                if (authenticate) {
                    state.email = authenticate.email;
                    state.logged_in_token = authenticate.logged_in_token;
                    state.accessToken = authenticate.logged_in_token?.accessToken || "";
                }
            }),
            builder.addCase(registerUser.pending, (state, action) => {
                state.loading = true;
                state.error = undefined;
                state.registerSuccess = undefined;
            }),
            builder.addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false;
                state.registerSuccess = true;
                state.error = undefined;
            }),
            builder.addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.registerSuccess = false;
                const payload = action.payload as any;
                state.error = payload?.message || "Registration failed";
            }),
            builder.addCase(getLoggedInToken.pending, (state, action) => {
                state.loading = true;
                state.error = undefined;
            }),
            builder.addCase(getLoggedInToken.fulfilled, (state, action) => {
                const { email, id_token, access_token, refresh_token, token_type, expires_in } = action.payload;
                state.logged_in_token = {
                    idToken: id_token,
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    tokenType: token_type,
                    expiresIn: expires_in,
                    parsedToken: parseJwt(id_token)
                }
                console.log("logged in token", parseJwt(id_token));
                state.email = email;
                state.accessToken = access_token;
                state.loading = false;
                state.error = undefined;
            }),
            builder.addCase(getLoggedInToken.rejected, (state, action) => {
                state.loading = false;
                const payload = action.payload as any;
                state.error = payload?.message || "Sign in failed";
            }),
            builder.addCase(refreshAccessToken.fulfilled, (state, action) => {
                console.log("refreshed token", action.payload.parsedToken);
                state.logged_in_token = action.payload;
                state.accessToken = action.payload.accessToken;
            }),
            builder.addCase(signOut.pending, (state, action) => {
                state.loading = true;
            }),
            builder.addCase(signOut.fulfilled, (state, action) => {
                const { message } = action.payload;
                if (message === "Successfully logged out") {
                    state.email = "";
                    state.logged_in_token = undefined;
                    state.accessToken = "";
                    state.loading = false;
                }
            }),
            builder.addCase(getUploadedData.pending, (state, action) => {
                state.loading = true;
            }),
            builder.addCase(getUploadedData.fulfilled, (state, action) => {
                const payloadData: any = action.payload;
                if (payloadData === undefined || payloadData.error === 'user not recognized') {
                    state.logged_in_token = undefined;
                    state.accessToken = "";
                    state.loading = false;
                }
                state.loading = false;
            }),
            builder.addCase(getProfile.fulfilled, (state, action) => {
                const payloadData: any = action.payload;
                if (payloadData === undefined || payloadData.error === 'user not recognized') {
                    state.logged_in_token = undefined;
                    state.accessToken = "";
                    state.loading = false;
                    // Reset to default tokens
                    state.uploadToken = '';
                    state.queueToken = '';
                } else {
                    state.email = payloadData.email;
                    state.level = payloadData.level;
                    state.status = payloadData.status;
                    state.username = payloadData.username;
                    state.isAdmin = payloadData.isAdmin;
                }
                state.loading = false;
            }),
            builder.addCase(changePassword.pending, (state, action) => {
                state.loading = true;
                state.error = undefined;
                state.changePasswordSuccess = undefined;
            }),
            builder.addCase(changePassword.fulfilled, (state, action) => {
                state.loading = false;
                state.changePasswordSuccess = true;
                state.error = undefined;
            }),
            builder.addCase(changePassword.rejected, (state, action) => {
                state.loading = false;
                state.changePasswordSuccess = false;
                const payload = action.payload as any;
                state.error = payload?.message || "Failed to change password";
            })
        ),
    });

// Export actions
export const { setInitialTokens, resetAuth, clearError, clearRegisterSuccess, clearChangePasswordSuccess } = authenticateSlice.actions;

// Helper function for JWT parsing
function parseJwt(token: string) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

export default authenticateSlice.reducer;