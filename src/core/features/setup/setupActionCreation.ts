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
            for (var file of job_setup_copy.task.files) {
                if (job_setup_copy.task.options[file].hasOwnProperty("link")) {
                    delete job_setup_copy.task.options[file].link;
                }
            }
            console.log(job_setup_copy);
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
        }
        // //Update upstream jobs right after submission
        thunkAPI.dispatch(getUpstreamJobs());
        // Return whether the submission was successful
        return responses;
    },
);
