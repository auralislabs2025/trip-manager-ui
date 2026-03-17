// API Helper Functions
// Provides utilities for making authenticated API calls

// Get API base URL from config
function getApiBaseUrl() {
    if (!window.config || !window.config.API_BASE_URL) {
        console.error('Config not loaded. Make sure config.js is loaded before api.js');
        return 'http://localhost:8000/api/v1'; // Fallback
    }
    return window.config.API_BASE_URL;
}

// Get authentication token from session storage
function getAuthToken() {
    const session = storage?.SessionStorage?.get();
    return session?.access_token || null;
}

// Get authorization header
function getAuthHeaders() {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

// Format FastAPI validation error detail for display (422 responses)
function formatValidationError(detail) {
    if (detail == null) return null;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail.map(function (item) {
            var loc = item.loc;
            var msg = item.msg || '';
            if (loc && Array.isArray(loc) && loc.length > 1) {
                var field = loc[loc.length - 1];
                return field + ': ' + msg;
            }
            return msg;
        }).join('. ');
    }
    if (typeof detail === 'object' && detail.message) return detail.message;
    return null;
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    
    const defaultOptions = {
        headers: getAuthHeaders(),
        ...options
    };
    
    // Merge headers if provided
    if (options.headers) {
        defaultOptions.headers = {
            ...defaultOptions.headers,
            ...options.headers
        };
    }
    
    try {
        const response = await fetch(url, defaultOptions);
        
        // Parse JSON response
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        // Handle non-OK responses
        if (!response.ok) {
            if (response.status === 401 && typeof auth !== 'undefined' && typeof auth.logout === 'function') {
                auth.logout();
            }
            var errorMsg = formatValidationError(data.detail) || data.detail || data.message || ('HTTP ' + response.status);
            if (typeof errorMsg !== 'string') errorMsg = JSON.stringify(errorMsg);
            return {
                success: false,
                error: errorMsg,
                status: response.status,
                data: data
            };
        }
        
        return {
            success: true,
            data: data,
            status: response.status
        };
    } catch (error) {
        console.error('API Request Error:', error);
        return {
            success: false,
            error: error.message || 'Network error. Please check your connection.',
            status: 0
        };
    }
}

// Convenience methods for common HTTP verbs
const api = {
    get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options = {}) => apiRequest(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body)
    }),
    put: (endpoint, body, options = {}) => apiRequest(endpoint, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(body)
    }),
    delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
    patch: (endpoint, body, options = {}) => apiRequest(endpoint, {
        ...options,
        method: 'PATCH',
        body: JSON.stringify(body)
    })
};

// Export API functions
window.api = {
    request: apiRequest,
    get: api.get,
    post: api.post,
    put: api.put,
    delete: api.delete,
    patch: api.patch,
    getAuthToken,
    getApiBaseUrl,
    formatValidationError: formatValidationError
};

