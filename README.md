# Turbofetch

A flexible and efficient fetch client for TypeScript.

## Features

- Request Interceptors: Add interceptors to modify or log requests before they are sent.
- Fast Api call
- Response Interceptors: Handle responses globally with logging or error handling.
- CRUD Operations: Perform common HTTP operations like GET, POST, PUT, DELETE ,patch ,cancel.
- File Upload: Upload files with support for handling file inputs and sending them to the server.
- Dynamic Configuration: Use instance configuration to customize headers and handle different API endpoints

## Installation

Install the dependencies and devDependencies and start the server.

```sh
npm install turbofetch  --f
```
```sh
import FetchClient from 'turbofetch';
```


| Method | Description |Example Usage
| ------ | ------ | ------ |
|get	|Perform a GET request.	|await client.get('/users');|
|post	|Perform a POST request with JSON data.	|await client.post('/users', userData);|
|put	|Perform a PUT request with JSON data.	|await client.put('/users/{userId}', userData);|
|delete	|Perform a DELETE request.	|await client.delete('/users/{userId}');|
|upload	|Upload a file.	|await client.upload('/users/{userId}/avatar', file);|
|patch |Perform a patch request with JSON data.	|await client.patch('/users', userData);|

## Creating an Instance

```
const client = new FetchClient('https://api.example.com', { shouldLogCalls: true });

```
## Request custom-loader

```
fetchClient.setLoaderClass("loading-indicator");

```

```

.loading-indicator:before {
  content: "";
  background: #000000cc;
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1000;
}
.loading-indicator:after {
  content: "";
  z-index: 9999;
  height: 50px;
  width: 50px;
  position: absolute;
  border: 3px solid #fff;
  border-radius: 50%;
  border-top-color: #ff5b00;
  animation: spin 1s linear infinite;
  top: 40%;
  left: 50%;
}
@-webkit-keyframes spin {
  0% {
    -webkit-transform: rotate(0deg);
    tranform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
    tranform: rotate(360deg);
  }
}
@keyframes spin {
  0% {
    -webkit-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}

```
## Request Interceptors
Add a request interceptor to include an authentication token:

```
client.addRequestInterceptor(async (config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
```
## Response Interceptors

```
client.addResponseInterceptor(async (response) => {
  console.log('Response received:', response);
  return response;
});
```


## Examples

- GET Request

```
async function getUsers() {
  try {
    const users = await client.get('/users');
    console.log('Users:', users);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}

```

- POST Request

```
async function createUser(userData) {
  try {
    const newUser = await client.post('/users', userData);
    console.log('New user created:', newUser);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}
```

- PUT Request

```
async function updateUser(userId, userData) {
  try {
    const updatedUser = await client.put(`/users/${userId}`, userData);
    console.log('User updated:', updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
  }
}
```



- patch Request

```
async function updateUser(userId, userData) {
  try {
    const updatedUser = await client.patch(`/users/${userId}`, userData);
    console.log('User updated:', updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
  }
}
```

- DELETE Request

```
async function deleteUser(userId) {
  try {
    const result = await client.delete(`/users/${userId}`);
    console.log('User deleted:', result);
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}
```
- File Upload

```
async function uploadAvatar(userId, file) {
  try {
    const result = await client.upload(`/users/${userId}/avatar`, file);
    console.log('Avatar uploaded:', result);
  } catch (error) {
    console.error('Error uploading avatar:', error);
  }
}

<input type="file" id="fileInput" />


const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadAvatar(789, file);
  }
});
```


## cancel The Token 
```
const client = new FetchClient('https://api.example.com');
const { token, cancel } = client.cancelToken();

client.get('/some-endpoint', { signal: token })
    .then(response => {
        console.log(response);
    })
    .catch(error => {
        if (error.name === 'AbortError') {
            console.log('Request was cancelled');
        } else {
            console.error('Request failed', error);
        }
    });

// To cancel the request
cancel();
```


```
const client = new FetchClient('https://api.example.com', { shouldLogCalls: true });

- Make a request that will be logged
client.get('/items');

- Make a request that won't be logged
client.get('/users', { shouldLog: false });

```

## Retrieve logs for a specific page


```
client.getLogsByPage('/items')
  .then(logs => console.log('Logs for /items page:', logs))
  .catch(error => console.error('Error retrieving logs:', error));
```


## Get the API call count for a specific page

```
client.getApiCallCount('/items')
  .then(count => console.log('API call count for /items:', count))
  .catch(error => console.error('Error getting API call count:', error));
```
## Retrieve all API logs

```
client.getAllApiLogs()
  .then(logs => console.log('All API logs:', logs))
  .catch(error => console.error('Error retrieving all logs:', error));
```


## Database cleared successfully
```
client.clearDatabase()
    .then(() => console.log("Database cleared successfully"))
    .catch(error => console.error("Error clearing database:", error));
```



## serviceWorker Usage example
```
const client = new FetchClient('https://api.example.com', { serviceWorker: true, shouldLogCalls: true });
```
## Online Mode
```
client.get('/api/first-endpoint', { shouldLog: false }, { serviceWorker: true })
    .then(data => console.log('Online Mode:', data))
    .catch(error => console.error('Online Mode Error:', error));
```
## Simulate Offline Mode by disabling the network in DevTools
```
client.get('/api/second-endpoint', { shouldLog: true }, { serviceWorker: true })
    .then(data => console.log('Offline Mode:', data))
    .catch(error => console.error('Offline Mode Error:', error));
```

## index.html  (Pwa App)

```
  <script>
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js').then(function (registration) {
                console.log('Service Worker registration successful', registration.scope);
            }, function (err) {
                console.log('Service Worker registration failed', err);
            });
        } else {
            console.log('Service Worker is not supported by this browser.');
        }
      </script>
```

## service-worker.js 
```
const CACHE_NAME = 'api-cache-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(['/offline.html'])
                .catch((error) => {
                    console.error('Failed to cache offline page:', error);
                });
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName)
                            .catch((error) => {
                                console.error('Failed to delete old cache:', error);
                            });
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache)
                                    .catch((error) => {
                                        console.error('Failed to cache new response:', error);
                                    });
                            });
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('Fetch failed:', error);
                        return caches.match('/offline.html');
                    });
            })
            .catch((error) => {
                console.error('Cache match failed:', error);
                return caches.match('/offline.html');
            })
    );
});

self.addEventListener('message', (event) => {
    if (event.data.type === 'CACHE_URL') {
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.add(event.data.url)
                    .catch((error) => {
                        console.error('Failed to cache URL:', error);
                    });
            })
        );
    }
});

```

### License
MIT
**Free Software**

#   t u r b o f e t c h  
 