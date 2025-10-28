import { Job } from '../jobs/jobsSlice'

export interface ROI {
    id: number;
    created_at: string;
    updated_at: string;
    location: string;
    link: string;
    filename: string;
    size: null | number;
    md5: null | string;
    status: string;
    database: string;
    type: string;
    pivot: {
        pipeline_id: string;
        roi_id: string;
    };
}

export interface Volume {
    name:string;
    url:string;
    alias:string;
}

export interface NiiFile {
    filename:string;
    id:number;
    dim:number;
    name:string;
    type:string;
    link:string;
}

export interface ROIState {
    rois: {[pipeline_id:string]:ROI[]};
    resultLoading: number;
    loading:boolean;
    niis:{[pipeline_id:string]:NiiFile[]};
    activeJob?: Job;
    selectedVolume: number;
    openPanel: number[];
}