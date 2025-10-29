import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
// import {NiiFile, resultActions, ROI, Volume} from "../resultSlice";
import { Job } from "../jobs/jobsSlice";
import { getEndpoints } from "../../config/AppConfig";
import { AuthenticatedHttpClient } from "../../common/utilities/AuthenticatedRequests";

export const getPipelineROI = createAsyncThunk(
    "GetROI",
    async ({ pipeline }: { pipeline: string }) => {
        const endpoints = getEndpoints();
        const config = {
            params: {
                pipeline_id: pipeline,
            },
        };
        const response = await AuthenticatedHttpClient.get(
            endpoints.ROI_GET,
            config,
        );
        // console.log(response);
        return { rois: response.data, pipeline_id: pipeline };
    },
);

export function niiToVolume(nii: any) {
    return {
        //URL is for NiiVue blob loading
        url: nii.link,
        //name is for NiiVue name replacer (needs proper extension like .nii)
        name: nii.filename.split("/").pop() as string,
        //alias is for user selection in toolbar
        alias: nii.name,
    };
}

export const loadResult = createAsyncThunk(
    "LoadResult",
    async ({ job }: { accessToken: string; job: Job }) => {
        // if(job.pipeline_id==sampleJob.pipeline_id){
        //     return sampleResult;
        // }
        const endpoints = getEndpoints();
        let volumes: any[] = [];
        let file = job.files[0];
        // console.log(file);
        let result = (
            await AuthenticatedHttpClient.post(
                endpoints.UNZIP,
                JSON.parse(file.location),
                {},
            )
        ).data;
        // console.log(result);

        let niis = result.data as any[];
        // console.log(niis);
        niis.forEach((value) => {
            // console.log(value);
            volumes.push({
                //URL is for NiiVue blob loading
                url: value.link,
                //name is for NiiVue name replacer (needs proper extension like .nii)
                name: value.filename.split("/").pop() as string,
                //alias is for user selection in toolbar
                alias: value.name,
            });
        });
        return { pipelineID: job.pipeline_id, job: job, volumes, niis, result };
        // Set pipeline ID
    },
    {
        // Adding extra information to the meta field

        getPendingMeta: ({ arg, requestId }) => {
            // console.log('Pending Meta:');
            return {
                jobId: arg.job.id, // 'arg' is your original payload
                requestId,
            };
        },
    },
);
