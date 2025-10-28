import {ROIState, ROI} from './roiTypes';
import { Job } from '../jobs/jobsSlice';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { loadResult, getPipelineROI } from './resultActionCreation';

const initialState: ROIState = {
    rois:{},
    niis:{'-1':[]},
    resultLoading: -1,
    loading:false,
    activeJob:undefined,
    selectedVolume:2,
    openPanel:[0]
};

export const resultSlice = createSlice({
    name: 'job',
    initialState,
    reducers: {
        setPipelineID(state:ROIState,action:PayloadAction<Job>){
            state.activeJob = action.payload;
        },
        selectVolume(state:ROIState,action:PayloadAction<number>){
            state.selectedVolume = action.payload;
        },
        setOpenPanel(state:ROIState,action:PayloadAction<number[]>){
            state.openPanel = action.payload;
        }
    },
    extraReducers: (builder) => (
        builder.addCase(getPipelineROI.pending, (state, action) => {
            state.loading = true;
        }),
        builder.addCase(getPipelineROI.fulfilled, (state, action) => {
            const {rois, pipeline_id} = action.payload as {rois:ROI[] ,pipeline_id:string};
            state.rois[pipeline_id] = [];
            if (rois.length > 0) {
                rois.forEach((element) => {
                    if(state.rois[pipeline_id]==undefined)
                        state.rois[pipeline_id] = []
                    state.rois[pipeline_id].push(element);
                });
            }
            state.loading = false;
        }),
        builder.addCase(loadResult.pending,(state:ROIState, action) => {
            // @ts-ignore
            state.resultLoading = action.meta.jobId;
        }),
        builder.addCase(
            loadResult.fulfilled, (state:ROIState,action)=>{
                // console.log(action.payload);
            state.activeJob=action.payload.job;
            //@ts-ignore
            state.activeJob.setup = {alias:'-',version:'v0'};
            //@ts-ignore
            state.activeJob.setup.task = action.payload.result.headers.options;
            //@ts-ignore
            state.activeJob.logs = action.payload.result.log || action.payload.result.headers.log;
            //@ts-ignore
            state.activeJob.slices = action.payload.result.info?.slices;
            //@ts-ignore
            state.niis[state.activeJob.pipeline_id] = action.payload.niis;
            
            state.selectedVolume = 1;
                //ts-ignore
            state.resultLoading = -1;
        }),
        builder.addCase(
            loadResult.rejected, (state:ROIState,action)=>{
                state.resultLoading = -1;
            })
    ),
});