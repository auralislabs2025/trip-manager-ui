// Environment Configuration
// Change the ENVIRONMENT variable to switch between environments
// Options: 'development', 'staging', 'production'

const ENVIRONMENT = 'development'; // ← Change this to switch environments

const ENV_CONFIG = {
    development: {
        API_BASE_URL: 'http://localhost:8000/api/v1',
        ENVIRONMENT: 'development'
    },
    staging: {
        API_BASE_URL: 'https://staging-api.example.com/api/v1',
        ENVIRONMENT: 'staging'
    },
    production: {
        API_BASE_URL: 'https://api.example.com/api/v1',
        ENVIRONMENT: 'production'
    }
};

// Get config for current environment
const config = ENV_CONFIG[ENVIRONMENT] || ENV_CONFIG.development;

// Export config
window.config = config;

