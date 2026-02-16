// API Configuration for Wearable Integration
// Using Terra API as the bridge service for Apple HealthKit and Google Fit

const API_CONFIG = {
    // Terra API Configuration
    // Get your API key from: https://dashboard.tryterra.co/
    TERRA_API_KEY: 'YOUR_TERRA_API_KEY_HERE', // Replace with actual key
    TERRA_DEV_ID: 'YOUR_TERRA_DEV_ID_HERE', // Replace with actual dev ID
    TERRA_BASE_URL: 'https://api.tryterra.co/v2',

    // Webhook URL for real-time data (optional - for backend integration)
    WEBHOOK_URL: '', // Your backend webhook endpoint

    // Supported Providers
    SUPPORTED_PROVIDERS: [
        {
            id: 'APPLE',
            name: 'Apple Health',
            icon: '🍎',
            description: 'Apple Watch e iPhone',
            capabilities: ['heart_rate', 'hrv', 'sleep', 'activity', 'ecg', 'spo2']
        },
        {
            id: 'GOOGLE',
            name: 'Google Fit',
            icon: '🔴',
            description: 'Wear OS e Android',
            capabilities: ['heart_rate', 'sleep', 'activity', 'steps']
        },
        {
            id: 'FITBIT',
            name: 'Fitbit',
            icon: '💙',
            description: 'Dispositivos Fitbit',
            capabilities: ['heart_rate', 'hrv', 'sleep', 'activity', 'spo2']
        },
        {
            id: 'GARMIN',
            name: 'Garmin',
            icon: '🔵',
            description: 'Dispositivos Garmin',
            capabilities: ['heart_rate', 'hrv', 'sleep', 'activity', 'spo2', 'stress']
        },
        {
            id: 'OURA',
            name: 'Oura Ring',
            icon: '💍',
            description: 'Oura Ring',
            capabilities: ['heart_rate', 'hrv', 'sleep', 'activity', 'temperature']
        },
        {
            id: 'WHOOP',
            name: 'WHOOP',
            icon: '⚡',
            description: 'WHOOP Band',
            capabilities: ['heart_rate', 'hrv', 'sleep', 'activity', 'strain']
        }
    ],

    // Data Types to Request
    DATA_TYPES: {
        HEART_RATE: 'heart_rate',
        HRV: 'heart_rate_variability',
        SLEEP: 'sleep',
        ACTIVITY: 'activity',
        STEPS: 'steps',
        CALORIES: 'calories',
        DISTANCE: 'distance',
        ECG: 'ecg',
        SPO2: 'oxygen_saturation',
        BLOOD_PRESSURE: 'blood_pressure',
        TEMPERATURE: 'body_temperature',
        STRESS: 'stress'
    },

    // Sync Intervals (in milliseconds)
    SYNC_INTERVALS: {
        REALTIME: 5 * 60 * 1000,      // 5 minutes for critical metrics
        FREQUENT: 15 * 60 * 1000,      // 15 minutes for regular monitoring
        HOURLY: 60 * 60 * 1000,        // 1 hour for historical data
        DAILY: 24 * 60 * 60 * 1000     // 24 hours for trends
    },

    // Cache Settings
    CACHE: {
        ENABLED: true,
        MAX_AGE: 5 * 60 * 1000, // 5 minutes
        STORAGE_KEY: 'cardiorisk_wearable_cache'
    },

    // Rate Limiting
    RATE_LIMIT: {
        MAX_REQUESTS_PER_MINUTE: 60,
        RETRY_AFTER: 1000
    }
};

// API Endpoints
const API_ENDPOINTS = {
    // Authentication
    generateWidgetSession: () => `${API_CONFIG.TERRA_BASE_URL}/auth/generateWidgetSession`,
    getUserInfo: (userId) => `${API_CONFIG.TERRA_BASE_URL}/userInfo?user_id=${userId}`,

    // Data endpoints
    getDaily: (userId, startDate, endDate) =>
        `${API_CONFIG.TERRA_BASE_URL}/daily?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`,
    getSleep: (userId, startDate, endDate) =>
        `${API_CONFIG.TERRA_BASE_URL}/sleep?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`,
    getBody: (userId, startDate, endDate) =>
        `${API_CONFIG.TERRA_BASE_URL}/body?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`,
    getActivity: (userId, startDate, endDate) =>
        `${API_CONFIG.TERRA_BASE_URL}/activity?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`,

    // Deauthorization
    deauth: (userId) => `${API_CONFIG.TERRA_BASE_URL}/auth/deauthenticateUser?user_id=${userId}`
};

// Helper Functions
const API_HELPERS = {
    // Format date for API (YYYY-MM-DD)
    formatDate: (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Get date range for queries
    getDateRange: (days = 7) => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return {
            start: API_HELPERS.formatDate(startDate),
            end: API_HELPERS.formatDate(endDate)
        };
    },

    // Build headers for API requests
    getHeaders: () => {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'dev-id': API_CONFIG.TERRA_DEV_ID,
            'x-api-key': API_CONFIG.TERRA_API_KEY
        };
    },

    // Check if API is configured
    isConfigured: () => {
        return API_CONFIG.TERRA_API_KEY !== 'YOUR_TERRA_API_KEY_HERE' &&
            API_CONFIG.TERRA_DEV_ID !== 'YOUR_TERRA_DEV_ID_HERE';
    },

    // Get provider by ID
    getProvider: (providerId) => {
        return API_CONFIG.SUPPORTED_PROVIDERS.find(p => p.id === providerId);
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, API_ENDPOINTS, API_HELPERS };
}
