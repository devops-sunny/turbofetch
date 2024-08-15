import fetch, { RequestInit, Response } from 'node-fetch';

interface ExtendedRequestInit extends RequestInit {
  timeout?: number;
}

type RequestInterceptor = (config: ExtendedRequestInit) => ExtendedRequestInit | Promise<ExtendedRequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

class FetchClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];
  
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, PATCH, OPTIONS",
    };
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  async request(url: string, options: ExtendedRequestInit = {}): Promise<any> {
    let finalOptions: ExtendedRequestInit = { ...options, headers: { ...this.defaultHeaders, ...options.headers } };

    for (const interceptor of this.requestInterceptors) {
      finalOptions = await interceptor(finalOptions) || finalOptions;
    }

    const { timeout = 5000, ...restOptions } = finalOptions;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    restOptions.signal = controller.signal;

    try {
      const response = await fetch(this.baseURL + url, restOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        (error as any).response = response;
        throw error;
      }

      let finalResponse = response;
      for (const interceptor of this.responseInterceptors) {
        finalResponse = await interceptor(finalResponse) || finalResponse;
      }

      return finalResponse.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  get(url: string, options: ExtendedRequestInit = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  post(url: string, data: any, options: ExtendedRequestInit = {}) {
    return this.sendData(url, data, { ...options, method: 'POST' });
  }

  put(url: string, data: any, options: ExtendedRequestInit = {}) {
    return this.sendData(url, data, { ...options, method: 'PUT' });
  }

  delete(url: string, data: any, options: ExtendedRequestInit = {}) {
    return this.sendData(url, data, { ...options, method: 'DELETE' });
  }

  private sendData(url: string, data: any, options: ExtendedRequestInit = {}) {
    let body: any;
    let headers: any = { ...this.defaultHeaders };

    if (data instanceof FormData) {
      body = data;
      delete headers['Content-Type']; 
    } else if (typeof data === 'object' && data !== null) {
      body = JSON.stringify(data);
    } else {
      body = data;
    }

    return this.request(url, { ...options, body, headers });
  }

  upload(url: string, file: File, options: ExtendedRequestInit = {}) {
    const formData = new FormData();
    formData.append('file', file);
    return this.sendData(url, formData, { ...options, method: 'POST' });
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    if(interceptor){
      this.requestInterceptors.push(interceptor);
    }
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    if(interceptor){
      this.responseInterceptors.push(interceptor);
    }
  }

   cancelToken(): { token: AbortSignal; cancel: () => void } {
        const controller = new AbortController();
        return {
            token: controller.signal,
            cancel: () => controller.abort()
      };
  }
}

export default FetchClient;