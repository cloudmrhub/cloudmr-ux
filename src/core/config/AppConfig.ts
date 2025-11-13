import { CloudMRCoreConfig, AppConfig, AppEndpoints } from './types';

let globalConfig: CloudMRCoreConfig | null = null;

export function initializeCloudMRCore(config: CloudMRCoreConfig): void {
  globalConfig = config;
}

export function getAppConfig(): AppConfig {
  if (!globalConfig) {
    throw new Error('CloudMR Core not initialized. Call initializeCloudMRCore() first.');
  }
  return globalConfig.appConfig;
}

export function getEndpoints(): AppEndpoints {
  if (!globalConfig) {
    throw new Error('CloudMR Core not initialized. Call initializeCloudMRCore() first.');
  }
  return globalConfig.endpoints;
}

export function createEndpoints(baseServer: string): AppEndpoints {
  return {
    SIGNIN: `${baseServer}/auth/login`,
    SIGNOUT: `${baseServer}/auth/logout`,
    REGISTER: `${baseServer}/auth/register`,
    CHANGE_PASSWORD: `${baseServer}/auth/change-password`,
    PROFILE: `${baseServer}/profile`,
    REFRESH_TOKEN: `${baseServer}/auth/refresh`,
    
    DATA_API: `${baseServer}/data/read`,
    DATA_DELETE_API: `${baseServer}/data/delete`,
    DATA_RENAME_API: `${baseServer}/data/update`,
    DATA_UPLOAD_INIT: `${baseServer}/upload_initiate`,
    DATA_UPLOAD_FINALIZE: `${baseServer}/upload_finalize`,
    
    JOBS_API: `${baseServer}/pipeline/queue_job`,
    JOBS_RETRIEVE_API: `${baseServer}/pipeline/list`,
    JOBS_DELETE_API: `${baseServer}/pipeline/delete`,
    JOBS_RENAME_API: `${baseServer}/pipeline/update`,
    JOB_UPLOAD_INIT: `${baseServer}/upload_initiate/results`,
    JOB_UPLOAD_FINALIZE: `${baseServer}/upload_finalize/results`,
    
    ROI_GET: `${baseServer}/roi/list`,
    ROI_UPLOAD: `${baseServer}/roi/upload`,
    
    UNZIP: `${baseServer}/unzip`
  };
}