import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getUpstreamJobs } from './jobActionCreation';
import { UploadedFile } from "../data/dataSlice";
import { convertTimestamp } from "../../common/utilities/CalendarHelper";


export interface Job {
    id: number;
    alias: string;
    //One of completed, pending, or other
    status: string;
    pipeline_id: string;
    createdAt: string;
    updatedAt: string;
    setup: any;
    files: UploadedFile[];
    logs?: LogItem[];
    slices?: number;
}

export interface LogItem {
    type: string;
    when: string;
    what: string;
}

interface JobsState {
    jobs: Array<Job>;
    loading: boolean;
    submittingText: string;
}

const initialState: JobsState = {
    jobs: [],
    loading: true,
    submittingText: 'Submitting Jobs...'
};

export const jobsSlice = createSlice({
    name: 'job',
    initialState,
    reducers: {
        // submitJob(state: JobsState, action: PayloadAction<SNR>){
        //     state.jobs.push({
        //         setup:action.payload, alias: "", createdAt: "", files: [], id: 0, status: "", updatedAt: ""
        //     });
        // },
        /**
         * Delete job referenced by its index
         * @param state
         * @param action
         */
        renameJob(state: JobsState, action: PayloadAction<{ index: number, alias: string }>) {
            state.jobs[action.payload.index].alias = action.payload.alias;
        },
        deleteJob(state: JobsState, action: PayloadAction<{ index: number }>) {
            state.jobs.splice(action.payload.index, 1);
        },
        resetSubmissionState(state: JobsState) {
            state.submittingText = 'Submitting jobs...';
        },
        setSubmittingText(state, action: PayloadAction<string>) {
            state.submittingText = action.payload;
        }

    },
    extraReducers: (builder) => (
        builder.addCase(getUpstreamJobs.pending, (state, action) => {
            state.loading = true;
        }),
        builder.addCase(getUpstreamJobs.fulfilled, (state, action) => {
            let data: Array<Job> = [];
            const payloadData: { jobs: Array<any> } = action.payload;
            if (payloadData.jobs.length > 0) {
                payloadData.jobs.forEach((element) => {
                    element.createdAt = convertTimestamp(element.createdAt);
                    data.push(element);
                });
            }

            state.jobs = data;
            // state.jobs = [sampleJob]
            state.loading = false;
            state.submittingText = 'Jobs submitted!'
        })
    ),
});

export const jobActions = jobsSlice.actions;