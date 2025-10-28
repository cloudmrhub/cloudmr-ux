import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { AuthenticateState, AuthenticateToken } from '../../features/authenticate/authenticateSlice';
import { refreshAccessToken } from '../../features/authenticate/authenticateActionCreation';
import { getAppConfig } from '../../config/AppConfig';

type TokenGetter = () => AuthenticateState;



export class AuthenticatedHttpClient {
  private static authGetter: TokenGetter;
  private static dispatch: any;

  public static setAuthenticateStateGetter(getter: TokenGetter): void {
    this.authGetter = getter;
  }

  public static setDispatch(dispatch: any): void {
    this.dispatch = dispatch;
  }
  
  static refreshToken(tk: AuthenticateToken) {
    return this.dispatch(refreshAccessToken(tk.refreshToken)).unwrap()
  }
  public static async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    let appConfig = getAppConfig()

    try {
      let { logged_in_token } = this.authGetter();

      if (!logged_in_token) {
        throw Error("Not logged in!");
      }
      if ((logged_in_token.parsedToken.exp - Math.floor(Date.now() / 1000)) < (60*15) ) { 
        logged_in_token = await this.refreshToken(logged_in_token)
      }
      if (!logged_in_token) {
        throw Error("Not logged in!");
      }
      let requestConfig: AxiosRequestConfig = {
        timeout: appConfig.REQUESTS_TIMEOUT,
        ...config,
        headers: {
          ...config.headers,
          'Authorization': `Bearer ${logged_in_token.idToken}`
        }
      };
      
      try {
        return await axios.request<T>(requestConfig);
      } catch (error: any) {
        // Check if error is due to unauthorized/expired token
        if ( error.response?.status === 401 || error.response?.status === 403) {
          logged_in_token = await this.refreshToken(logged_in_token);
          if (!logged_in_token) {
            throw Error("Not logged in!");
          }
          // Retry the original request with the new token
          if (!requestConfig.headers) requestConfig.headers = {}
          requestConfig.headers['Authorization'] = `Bearer ${logged_in_token.idToken}`;
          return await axios.request<T>(requestConfig);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }

  public static async get<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    let appConfig = getAppConfig()
    const requestConfig:AxiosRequestConfig = {
      ...config,
      params: {
        ...config.params,
        "cloudapp_name": appConfig.APP_NAME
      },
      method: 'GET', 
      url
    }
    return this.request<T>(requestConfig);
  }

  public static async post<T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> {
    let appConfig = getAppConfig()
    const requestConfig:AxiosRequestConfig = {
      ...config,
      method: 'post', 
      url,
      data: {
        ...data,
        "cloudapp_name": appConfig.APP_NAME
      },
    }

    return this.request<T>(requestConfig);
  }

  public static async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  public static async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}