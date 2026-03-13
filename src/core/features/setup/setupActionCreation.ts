import { createAsyncThunk } from "@reduxjs/toolkit";
import { Job } from "../jobs/jobsSlice";
import { getUpstreamJobs } from "../jobs/jobActionCreation";
import { getEndpoints } from "../../config/AppConfig";
import { AuthenticatedHttpClient } from "../../common/utilities/AuthenticatedRequests";

// import { API_TOKEN } from "../../env";

export const submitJobs = createAsyncThunk(
    "SUBMIT_JOBS",
    async ({ jobQueue }: { jobQueue: (Job | undefined)[] }, thunkAPI) => {
        const endpoints = getEndpoints();
        let responses = [];

        // console.log("API_TOKEN", API_TOKEN);

        for (let job of jobQueue) {
            if (job === undefined) {
                continue;
            }
            console.log(job);
            console.log(JSON.stringify(job.setup));
            let job_setup_copy = JSON.parse(JSON.stringify(job.setup));
            try {
                for (var file of job_setup_copy.task.files) {
                    if (job_setup_copy.task.options[file] && job_setup_copy.task.options[file].hasOwnProperty("link")) {
                        delete job_setup_copy.task.options[file].link;
                    }
                }
            } catch (e) {
                console.log("Error deleting link property from file options");
                console.log(e);
            }
            console.log(job_setup_copy);
            try {
                let res = await AuthenticatedHttpClient.post(
                    endpoints.JOBS_API,
                    job_setup_copy,
                    {
                        headers: {
                            accept: "*/*",
                            // "X-Api-Key": API_TOKEN,
                            "Content-Type": "application/json",
                        },
                    },
                );
                responses.push({
                    id: job.id,
                    status: res.status,
                });
            } catch (error: any) {
                // Check for monthly limit error
                const errorData = error?.response?.data;
                if (errorData?.error?.includes?.('Monthly limit') || 
                    (errorData?.current_count !== undefined && errorData?.limit !== undefined)) {
                    // Extract mode from error message (e.g., "mode_1 calculations" or "mode_2 calculations")
                    const errorMsg = errorData?.error || '';
                    const modeMatch = errorMsg.match(/(mode_[12])/);
                    const mode = modeMatch ? modeMatch[1] : undefined;
                    
                    return thunkAPI.rejectWithValue({
                        error: errorMsg || 'Monthly limit reached',
                        current_count: errorData?.current_count,
                        limit: errorData?.limit,
                        mode: mode,
                        app: errorData?.app || errorData?.cloudapp_name,
                    });
                }
                // Re-throw other errors
                throw error;
            }
        }
        // //Update upstream jobs right after submission
        thunkAPI.dispatch(getUpstreamJobs());
        // Return whether the submission was successful
        return responses;
    },
);
