class FetchClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, PATCH, OPTIONS",
        };
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.apiCount = 0; 
        this.loaderClass = "loading-indicator";
    }

    incrementApiCount() {
        this.apiCount++;
        if (this.apiCount === 1) {
            this.showLoader();
        }
    }

    decrementApiCount() {
        this.apiCount--;
        if (this.apiCount <= 0) {
            this.apiCount = 0;
            this.hideLoader();
        }
    }

    setLoaderClass(className) {
        this.loaderClass = className;
    }

    showLoader(className = this.loaderClass) {
        document.body.classList.add(className);
    }

    hideLoader(className = this.loaderClass) {
        document.body.classList.remove(className);
    }

    async request(url, options = {}) {
        let finalOptions = { ...options, headers: { ...this.defaultHeaders, ...options.headers } };
        
        for (const interceptor of this.requestInterceptors) {
            finalOptions = await interceptor(finalOptions) || finalOptions;
        }
        
        const { timeout = 5000, ...restOptions } = finalOptions;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        restOptions.signal = controller.signal;

        this.incrementApiCount(); 

        try {
            const response = await fetch(this.baseURL + url, restOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = new Error(`HTTP error! status: ${response.status}`);
                error.response = response;
                throw error;
            }

            let finalResponse = response;
            for (const interceptor of this.responseInterceptors) {
                finalResponse = await interceptor(finalResponse) || finalResponse;
            }

            return finalResponse.json();
        } catch (error) {
            throw error;
        } finally {
            this.decrementApiCount(); 
        }
    }

    get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    post(url, data, options = {}) {
        return this.sendData(url, data, { ...options, method: 'POST' });
    }

    put(url, data, options = {}) {
        return this.sendData(url, data, { ...options, method: 'PUT' });
    }

    patch(url, data, options = {}) {
        return this.sendData(url, data, { ...options, method: 'patch' });
    }

    delete(url, data, options = {}) {
        return this.sendData(url, data, { ...options, method: 'DELETE' });
    }

    sendData(url, data, options = {}) {
        let body;
        let headers = { ...this.defaultHeaders };

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

    upload(url, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        return this.sendData(url, formData, { ...options, method: 'POST' });
    }

    addRequestInterceptor(interceptor) {
        if (interceptor) {
            this.requestInterceptors.push(interceptor);
        }
    }

    addResponseInterceptor(interceptor) {
        if (interceptor) {
            this.responseInterceptors.push(interceptor);
        }
    }

    cancelToken() {
        const controller = new AbortController();
        return {
            token: controller.signal,
            cancel: () => controller.abort(),
        };
    }
}

export default FetchClient;
