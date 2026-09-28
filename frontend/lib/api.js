
// API Configuration
const API_BASE_URL = 'http://localhost:7860';

// Default API Key (should be in env vars for production)
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'attendx-secret-key-change-me';

export const authenticatedFetch = async (endpoint, options = {}) => {
    const headers = {
        'X-API-Key': API_KEY,
        ...options.headers
    };

    const url = `${API_BASE_URL}${endpoint}`;
    return fetch(url, { ...options, headers });
};

export default API_BASE_URL;
