// API Configuration
// Automatically uses environment variable for production, falls back to localhost for development

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default API_BASE_URL;
