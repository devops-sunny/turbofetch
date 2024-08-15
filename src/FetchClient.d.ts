import { RequestInit, Response } from 'node-fetch';
interface ExtendedRequestInit extends RequestInit {
    timeout?: number;
}
type RequestInterceptor = (config: ExtendedRequestInit) => ExtendedRequestInit | Promise<ExtendedRequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
declare class FetchClient {
    private baseURL;
    private defaultHeaders;
    private requestInterceptors;
    private responseInterceptors;
    constructor(baseURL?: string);
    request(url: string, options?: ExtendedRequestInit): Promise<any>;
    get(url: string, options?: ExtendedRequestInit): Promise<any>;
    post(url: string, data: any, options?: ExtendedRequestInit): Promise<any>;
    put(url: string, data: any, options?: ExtendedRequestInit): Promise<any>;
    delete(url: string, data: any, options?: ExtendedRequestInit): Promise<any>;
    private sendData;
    upload(url: string, file: File, options?: ExtendedRequestInit): Promise<any>;
    addRequestInterceptor(interceptor: RequestInterceptor): void;
    addResponseInterceptor(interceptor: ResponseInterceptor): void;
}
export default FetchClient;
