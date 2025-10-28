import type { AxiosResponse } from "axios";

// File extension utility functions
export function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length === 1) return '';
    if (parts.length === 2) return parts[1];
    
    // Handle .nii.gz case
    if (parts[parts.length - 2] === 'nii' && parts[parts.length - 1] === 'gz') {
        return 'nii.gz';
    }
    
    return parts[parts.length - 1];
}

export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const uploadHandlerFactory = (
    accessToken: string, 
    uploadToken: string, 
    dispatch: any, 
    uploader: any, 
    uploadTarget?: string
) => {
    return async (
        file: File, 
        fileAlias: string,
        fileDatabase?: string,
        onProgress?: (progress: number) => void,
        onUploaded?: (res: AxiosResponse, file: File) => void
    ) => {
        let result = await dispatch(
            uploader({ 
                file: file, 
                fileAlias: fileAlias, 
                uploadToken, 
                onProgress, 
                onUploaded, 
                uploadTarget 
            })
        );
        return result.payload.code;
    }
}