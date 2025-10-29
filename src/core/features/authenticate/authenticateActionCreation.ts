import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getAppConfig, getEndpoints } from "../../config/AppConfig";
import { AuthenticateToken } from "./authenticateSlice";

export interface SigninDataType {
    email: string;
    password: string;
}

export const getLoggedInToken = createAsyncThunk(
    "SIGN_IN",
    async (signinData: SigninDataType, thunkAPI) => {
        const endpoints = getEndpoints();

        let response;
        try {
            if (!axios.post) {
                console.error("Axios.post does not exist, axios is", axios);
                console.error("axios keys:", Object.keys(axios));
                console.error("axios.default?", (axios as any).default);
                console.error("axios.default keys?", (axios as any).default ? Object.keys((axios as any).default) : 'N/A');
            }
            response = await axios.post(endpoints.SIGNIN, signinData);
        } catch (error: any) {
            console.error(error);
            return thunkAPI.rejectWithValue({
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
        }
        return Object.assign(signinData, response.data);
    },
);

export const signOut = createAsyncThunk("SIGN_OUT", async () => {
    // const endpoints = getEndpoints();
    // const response = await axios.post(endpoints.SIGNOUT, null, config);
    // return response.data;
    return { message: "Successfully logged out" };
});

export const getFineGrainToken = createAsyncThunk(
    "FINE_GRAIN",
    async ({
        accessToken,
        categories,
    }: {
        accessToken: string;
        categories?: { app: string; activities: string[] };
    }) => {
        const config = getAppConfig();
        const endpoints = getEndpoints();

        const defaultCategories = {
            app: config.APP_NAME,
            activities: ["queue", "upload"],
        };

        if (!config.API_URL) return;

        try {
            const response = await axios.post(
                config.API_URL,
                categories || defaultCategories,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            );
            return response.data;
        } catch (e) {
            return undefined;
        }
    },
);

export const webSignin = createAsyncThunk(
    "WEB_SIGN_IN",
    async (accessToken: string, thunkAPI) => {
        // Import getUpstreamJobs dynamically to avoid circular dependency
        // thunkAPI.dispatch(getUpstreamJobs());

        if (accessToken !== undefined) {
            thunkAPI.dispatch(getProfile(accessToken));
        }

        return {
            access_token: accessToken,
            token_type: "bearer",
            expires_in: "1440",
        };
    },
);

export const getProfile = createAsyncThunk(
    "GET_PROFILE",
    async (accessToken: string) => {
        const endpoints = getEndpoints();
        const config = getAppConfig();

        try {
            const response = await axios.get(endpoints.PROFILE, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                timeout: config.REQUESTS_TIMEOUT || 5000,
            });
            if (response.data[0] === "<") {
                return { error: "user not recognized" };
            }
            return response.data;
        } catch (e) {
            return undefined;
        }
    },
);

let runningPromise: Promise<any> | null = null;

export const refreshAccessToken = createAsyncThunk(
    "REFRESH_ACCESS_TOKEN",
    async (refresh_token: string): Promise<AuthenticateToken> => {
        const endpoints = getEndpoints();

        const parseResult = (response: any) => {
            return {
                refreshToken: response.data.refresh_token || refresh_token,
                accessToken: response.data.access_token,
                idToken: response.data.id_token,
                tokenType: "bearer",
                expiresIn: response.data.expires_in,
                parsedToken: parseJwt(response.data.id_token),
            };
        };

        if (runningPromise) {
            return parseResult(await runningPromise);
        }

        const data = {
            refresh_token: refresh_token,
        };

        if (!endpoints.REFRESH_TOKEN) {
            throw new Error("Refresh token endpoint not configured");
        }

        runningPromise = axios.post(endpoints.REFRESH_TOKEN, data);
        try {
            return parseResult(await runningPromise);
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                console.error(
                    "Token refresh failed:",
                    error.response?.data || error.message,
                );
            }
            throw error;
        } finally {
            runningPromise = null;
        }
    },
);

// Helper function for JWT parsing
function parseJwt(token: string) {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
        return null;
    }
}
