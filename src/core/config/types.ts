export interface AppEndpoints {
  SIGNIN: string;
  SIGNOUT: string;
  REGISTER: string;
  CHANGE_PASSWORD: string;
  FORGOT_PASSWORD: string;
  RESET_PASSWORD: string;
  PROFILE: string;
  REFRESH_TOKEN?: string;
  FINEGRAIN?: string;
  
  // Data endpoints
  DATA_API: string;
  DATA_DELETE_API: string;
  DATA_RENAME_API: string;
  DATA_UPLOAD_INIT: string;
  DATA_UPLOAD_FINALIZE: string;
  
  // Job endpoints
  JOBS_API: string;
  JOBS_RETRIEVE_API: string;
  JOBS_DELETE_API: string;
  JOBS_RENAME_API: string;
  JOB_UPLOAD_INIT: string;
  JOB_UPLOAD_FINALIZE: string;
  
  // ROI endpoints
  ROI_GET: string;
  ROI_UPLOAD: string;
  
  // Utility endpoints
  UNZIP: string;
}

export interface AppConfig {
  APP_NAME: string;
  CLOUDMR_SERVER: string;
  API_TOKEN: string;
  API_URL?: string;
  COGNITO_CLIENT_ID?: string;
  USER_POOL_ID?: string;
  REQUESTS_TIMEOUT?: number;
  FILE_CHUNK_SIZE?: number;
  APP_BUG_REPORT?: string;
}

export interface CloudMRCoreConfig {
  appConfig: AppConfig;
  endpoints: AppEndpoints;
}