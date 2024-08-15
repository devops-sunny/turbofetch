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
        this.db = null;

        this.serviceWorkerEnabled = options.serviceWorker || false;
        this.cachedUrls = new Set();

        if (this.serviceWorkerEnabled) {
            this.registerServiceWorker();
        }
    }

    async openDatabase() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: "id", autoIncrement: true });
                    objectStore.createIndex("page", "page", { unique: false });
                    objectStore.createIndex("url", "url", { unique: false });
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

    async logApiCall({ url, method, status, response, startTime, page, errorMessage = '' }) {
        if (!this.shouldLogCalls) {
            return; 
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

        const db = await this.openDatabase();
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);

        // Check if the endpoint already exists with the same method
        const index = store.index("url");
        const existingEntries = await new Promise((resolve) => {
            const request = index.getAll(url);
            request.onsuccess = () => resolve(request.result);
        });

        let existingEntry = existingEntries.find(entry => entry.method === method);

        if (existingEntry) {
            // Update the existing entry
            existingEntry.status = status;
            existingEntry.response = response;
            existingEntry.duration = duration;
            existingEntry.errorMessage = errorMessage;
            existingEntry.timestamp = new Date();

            await new Promise((resolve, reject) => {
                const updateRequest = store.put(existingEntry);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            });
        } else {
            // Add a new entry
            await new Promise((resolve, reject) => {
                const addRequest = store.add(logData);
                addRequest.onsuccess = () => resolve();
                addRequest.onerror = () => reject(addRequest.error);
            });
        }
    }

    async saveLog(data) {
        return this.logApiCall(data);
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

    setdbName(dbName) {
        this.dbName = dbName;
    }

    setstoreName(Name){
        this.storeName = Name;
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

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            const serviceWorkerScript = `
                self.addEventListener('install', (event) => {
                    console.log('Service Worker installed');
                });

                self.addEventListener('fetch', (event) => {
                    event.respondWith(
                        caches.match(event.request).then((response) => {
                            return response || fetch(event.request);
                        })
                    );
                });

                self.addEventListener('message', (event) => {
                    if (event.data.type === 'CACHE_URL') {
                        event.waitUntil(
                            caches.open('api-cache-v1').then((cache) => {
                                return cache.add(event.data.url);
                            })
                        );
                    }
                });
            `;

            try {
                const blob = new Blob([serviceWorkerScript], { type: 'application/javascript' });
                const url = URL.createObjectURL(blob);
                await navigator.serviceWorker.register(url);
                console.log('Service Worker registered');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        } else {
            console.warn('Service Worker is not supported in this browser.');
        }
    }

    async request(url, options = {}, page = window?.location?.pathname) {
        let finalOptions = { ...options, headers: { ...this.defaultHeaders, ...options.headers } };

        for (const interceptor of this.requestInterceptors) {
            finalOptions = await interceptor(finalOptions) || finalOptions;
        }

        const { timeout = 5000, shouldLog = this.shouldLogCalls, serviceWorker = false, ...restOptions } = finalOptions;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        restOptions.signal = controller.signal;

        this.incrementApiCount();

        const startTime = Date.now();

        try {
            if (this.serviceWorkerEnabled && serviceWorker) {
                await this.registerServiceWorker();
                navigator.serviceWorker.ready.then(registration => {
                    registration.active.postMessage({ type: 'CACHE_URL', url: this.baseURL + url });
                });
            }

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
