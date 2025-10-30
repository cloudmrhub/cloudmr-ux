import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { getEndpoints, getAppConfig } from "../../config/AppConfig";
import { getFileExtension } from "../../common/utilities/file-transformation/utilities";
import { is_safe_twix } from "../../common/utilities/file-transformation/anonymize";
import { AuthenticatedHttpClient } from "../../common/utilities/AuthenticatedRequests";

export interface LambdaFile {
    filename: string;
    filetype: string;
    filesize: string;
    filemd5: string;
    file: {
        lastModified: number;
        name: string;
        size: number;
        type: string;
    };
}

export const getUploadedData = createAsyncThunk(
    "GET_UPLOADED_DATA",
    async () => {
        const endpoints = getEndpoints();
        const config = getAppConfig();
        try {
            const { data } = await AuthenticatedHttpClient.get(
                endpoints.DATA_API,
            );
            return data;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    },
);

export const renameUploadedData = createAsyncThunk(
    "RENAME_UPLOADED_DATA",
    async ({ fileId, newName }: { fileId: number; newName: string }) => {
        const endpoints = getEndpoints();

        try {
            const response = await AuthenticatedHttpClient.post(
                endpoints.DATA_RENAME_API,
                {
                    fileid: fileId,
                    filename: newName,
                },
            );
            return response.data;
        } catch (e) {
            throw e;
        }
    },
);

export const deleteUploadedData = createAsyncThunk(
    "DELETE_UPLOADED_DATA",
    async ({ fileId }: { fileId: number }) => {
        const endpoints = getEndpoints();

        try {
            const response = await AuthenticatedHttpClient.post(
                `${endpoints.DATA_DELETE_API}/${fileId}`,
            );
            return response.data;
        } catch (e) {
            throw e;
        }
    },
);

export const uploadData = createAsyncThunk(
    "UploadData",
    async (
        {
            uploadToken,
            file,
            fileAlias,
            onProgress,
            onUploaded,
            uploadTarget,
        }: {
            uploadToken: string;
            file: File;
            fileAlias: string;
            onProgress?: (progress: number) => void;
            uploadTarget?: string;
            onUploaded?: (res: AxiosResponse, file: File) => void;
        },
        thunkAPI,
    ) => {
        console.log("start the upload uploadData");
        try {
            const FILE_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunk size
            let payload = await createPayload(uploadToken, file, fileAlias);
            console.log("payload created", payload);
            if (payload === undefined)
                return {
                    code: 403,
                    response: "file not found",
                    file: undefined,
                    uploadTarget: uploadTarget,
                };
            if (payload.lambdaFile === undefined)
                return {
                    code: 403,
                    response: "data not allowed",
                    file: undefined,
                    uploadTarget: uploadTarget,
                };

            // Set upload progress to 0 if progress handler available
            if (onProgress) onProgress(0);

            const uploadPartWithRetries = async (
                partUrl: string,
                part: any,
                cancelTokenSource: any,
                index: number,
                retries = 2,
            ): Promise<any> => {
                try {
                    const response = await axios.put(partUrl, part, {
                        headers: {
                            "Content-Type": "",
                        },
                        onUploadProgress: (progressEvent: any) => {
                            totalUploadedParts[index] = progressEvent.loaded;
                            const totalUploaded = totalUploadedParts.reduce(
                                (a, b) => a + b,
                                0,
                            );
                            const totalProgress = totalUploaded / totalSize;
                            if (onProgress) onProgress(totalProgress);
                        },
                        cancelToken: cancelTokenSource.token,
                    });
                    console.log(response);
                    return response;
                } catch (error) {
                    if (axios.isCancel(error)) {
                        console.log("Upload cancelled:", partUrl);
                    } else if (retries > 0) {
                        console.log(
                            `Retrying upload for part: ${partUrl}, attempts remaining: ${retries}`,
                        );
                        cancelTokenSource.cancel(
                            "Cancelling the current request before retry.",
                        );
                        const newCancelTokenSource = axios.CancelToken.source();
                        return await uploadPartWithRetries(
                            partUrl,
                            part,
                            newCancelTokenSource,
                            index,
                            retries - 1,
                        );
                    } else {
                        throw error;
                    }
                }
            };

            console.log(payload);
            console.log("Uploading to destination", payload.destination);
            const initResponse = await AuthenticatedHttpClient.post(
                payload.destination,
                payload.lambdaFile,
                payload.config,
            );
            console.log(initResponse);

            const { uploadId, partUrls, Key } = initResponse.data;

            // Step 2: Prepare file parts
            const fileParts = [];
            for (let i = 0; i < file.size; i += FILE_CHUNK_SIZE) {
                const part = file.slice(i, i + FILE_CHUNK_SIZE);
                fileParts.push(part);
                console.log(part);
            }

            let totalSize = payload.file.size;
            const totalUploadedParts = new Array(fileParts.length).fill(0);

            // Step 3: Upload each part
            const uploadedParts = await Promise.all(
                fileParts.map(async (part, index) => {
                    let partUrl = partUrls[index];

                    const cancelTokenSource = axios.CancelToken.source();
                    const partResponse = await uploadPartWithRetries(
                        partUrl,
                        part,
                        cancelTokenSource,
                        index,
                    );

                    const etag = partResponse?.headers["etag"];
                    console.log(partResponse);
                    console.log(partResponse?.headers);
                    console.log(etag);

                    return {
                        partNumber: index + 1,
                        etag: etag.replace(/"/g, ""),
                    };
                }),
            );

            // Step 4: Finalize the upload
            const endpoints = getEndpoints();
            const finalizeResponse = await AuthenticatedHttpClient.post(
                endpoints.DATA_UPLOAD_FINALIZE,
                {
                    uploadId,
                    parts: uploadedParts,
                    Key: Key,
                },
                payload.config,
            );

            console.log(finalizeResponse);

            console.log("all uploads completed");
            console.log("------", onUploaded);
            if (onUploaded) onUploaded(initResponse, file);
            console.log("uploaded");

            // Refresh uploaded data
            thunkAPI.dispatch(getUploadedData());
            console.log("refreshed");
            return {
                code: 200,
                response: initResponse.data.response,
                file: payload.lambdaFile,
                uploadTarget: uploadTarget,
            };
        } catch (e: any) {
            console.log("Following error encountered during uploading:");
            console.error(e);
            return {
                code: 500,
                response: e.response,
                file: undefined,
                uploadTarget: uploadTarget,
            };
        }
    },
);

const ALLOWED_EXTENSIONS = [
    "nii",
    "nii.gz",
    "mha",
    "mhd",
    "mrd",
    "npx",
    "npy",
    "pkl",
    "mat",
    "dat",
    "h5",
    "png",
    "jpg",
    "jpeg",
];

const createPayload = async (
    uploadToken: string,
    file: File,
    fileAlias: string,
) => {
    if (!file) return undefined;

    const fileExtension = getFileExtension(file.name);
    const lowerExt = fileExtension.toLowerCase();

    // Fallback for unknown MIME types
    let fileType = file.type || "application/octet-stream";

    // Validate extension
    if (!ALLOWED_EXTENSIONS.includes(lowerExt)) {
        alert(`This file type ".${fileExtension}" is not allowed.`);
        return { lambdaFile: undefined, file: undefined };
    }

    // Handle .dat PHI check
    if (lowerExt === "dat") {
        console.log("checking for PHI data");
        const isSafe = await is_safe_twix(file);
        if (!isSafe) {
            alert(
                "This file contains PHI data. Please anonymize the file before uploading",
            );
            return undefined;
        }
    }

    const lambdaFile: LambdaFile = {
        filename: fileAlias,
        filetype: fileType,
        filesize: `${file.size}`,
        filemd5: "",
        file: {
            name: file.name,
            lastModified: file.lastModified,
            size: file.size,
            type: file.type,
        },
    };

    const UploadHeaders: AxiosRequestConfig = {
        headers: {
            "Content-Type": "application/json",
            "X-Api-Key": uploadToken,
        },
    };

    const endpoints = getEndpoints();
    return {
        destination: endpoints.DATA_UPLOAD_INIT,
        lambdaFile,
        file,
        config: UploadHeaders,
    };
};
