class FetchClient {
    constructor(baseURL = '', options = {}) {
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
        this.shouldLogCalls = options.shouldLogCalls || false; 

        this.dbName = "ApiCallLogs";
        this.dbVersion = 1;
        this.storeName = "logs";
        this.db = null
    }

    // IndexedDB initialization and methods
    async openDatabase() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: "id", autoIncrement: true });
                    objectStore.createIndex("page", "page", { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject("Error opening database");
            };
        });
    }

    async saveLog(data) {
        const db = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getLogsByPage(page) {
        const db = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const index = store.index("page");
            const request = index.getAll(page);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllLogs() {
        const db = await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
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

    async logApiCall({ url, method, status, response, startTime, page, errorMessage = '' }) {
        if (!this.shouldLogCalls) {
            return; // Don't log if shouldLogCalls is false
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        const logData = {
            url,
            method,
            status,
            response,
            duration,
            errorMessage,
            page,
            browser: navigator.userAgent,
            timestamp: new Date(),
        };
        await this.saveLog(logData);
    }

    async request(url, options = {}, page = window?.location?.pathname) {
        let finalOptions = { ...options, headers: { ...this.defaultHeaders, ...options.headers } };

        for (const interceptor of this.requestInterceptors) {
            finalOptions = await interceptor(finalOptions) || finalOptions;
        }

        const { timeout = 5000, shouldLog = this.shouldLogCalls, ...restOptions } = finalOptions;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        restOptions.signal = controller.signal;

        this.incrementApiCount();

        const startTime = Date.now();

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

            if (shouldLog) {
                await this.logApiCall({
                    url: this.baseURL + url,
                    method: restOptions.method || "GET",
                    status: "success",
                    response: await finalResponse.clone().json(),
                    startTime,
                    page,
                });
            }

            return finalResponse.json();
        } catch (error) {
            if (shouldLog) {
                await this.logApiCall({
                    url: this.baseURL + url,
                    method: restOptions.method || "GET",
                    status: "failed",
                    response: error.response ? await error.response.json() : null,
                    errorMessage: error.message,
                    startTime,
                    page,
                });
            }

            throw error;
        } finally {
            this.decrementApiCount();
        }
    }

    get(url, options = {}, page = window?.location?.pathname) {
        return this.request(url, { ...options, method: 'GET' }, page);
    }

    post(url, data, options = {}, page = window?.location?.pathname) {
        return this.sendData(url, data, { ...options, method: 'POST' }, page);
    }

    put(url, data, options = {}, page = window?.location?.pathname) {
        return this.sendData(url, data, { ...options, method: 'PUT' }, page);
    }

    patch(url, data, options = {}, page = window?.location?.pathname) {
        return this.sendData(url, data, { ...options, method: 'PATCH' }, page);
    }

    delete(url, data, options = {}, page = window?.location?.pathname) {
        return this.sendData(url, data, { ...options, method: 'DELETE' }, page);
    }

    sendData(url, data, options = {}, page = window?.location?.pathname) {
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

        return this.request(url, { ...options, body, headers }, page);
    }

    upload(url, file, options = {}, page = window?.location?.pathname) {
        const formData = new FormData();
        formData.append('file', file);
        return this.sendData(url, formData, { ...options, method: 'POST' }, page);
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

    async getAllApiLogs() {
        return await this.getAllLogs();
    }

    async getLogsByPage(page = window?.location?.pathname) {
        return await this.getLogsByPage(page);
    }

    async getApiCallCount(page = window?.location?.pathname) {
        const logs = await this.getLogsByPage(page);
        return logs.length;
    }

    async clearDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);

            request.onsuccess = () => {
                console.log("Database successfully deleted");
                resolve();
            };

            request.onerror = (event) => {
                console.error("Error deleting database:", event.target.error);
                reject(event.target.error);
            };

            request.onblocked = () => {
                console.warn("Database deletion blocked");
            };
        });
    }
}

export default FetchClient;