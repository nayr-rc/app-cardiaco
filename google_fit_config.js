// Google Fit API Configuration - 100% GRATUITA!
// Documentação: https://developers.google.com/fit/rest

const GOOGLE_FIT_CONFIG = {
    // OAuth 2.0 Configuration
    // Obtenha em: https://console.cloud.google.com/apis/credentials
    CLIENT_ID: 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com',
    CLIENT_SECRET: 'SEU_CLIENT_SECRET_AQUI', // Opcional para web apps públicos

    // Redirect URI (deve ser registrado no Google Cloud Console)
    REDIRECT_URI: window.location.origin + '/oauth_callback.html',

    // API Endpoints
    API_BASE_URL: 'https://www.googleapis.com/fitness/v1/users/me',
    AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
    TOKEN_URL: 'https://oauth2.googleapis.com/token',

    // Scopes (permissões solicitadas)
    SCOPES: [
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
        'https://www.googleapis.com/auth/fitness.body.read',
        'https://www.googleapis.com/auth/fitness.location.read',
        'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
        'https://www.googleapis.com/auth/fitness.blood_pressure.read'
    ],

    // Data Types (Google Fit)
    DATA_TYPES: {
        HEART_RATE: 'com.google.heart_rate.bpm',
        STEP_COUNT: 'com.google.step_count.delta',
        CALORIES: 'com.google.calories.expended',
        DISTANCE: 'com.google.distance.delta',
        WEIGHT: 'com.google.weight',
        HEIGHT: 'com.google.height',
        SLEEP: 'com.google.sleep.segment',
        ACTIVITY: 'com.google.activity.segment',
        SPEED: 'com.google.speed',
        POWER: 'com.google.power.sample',
        OXYGEN_SATURATION: 'com.google.oxygen_saturation',
        BLOOD_PRESSURE: 'com.google.blood_pressure'
    },

    // Data Sources (origens de dados)
    DATA_SOURCES: {
        DERIVED: 'derived',    // Dados agregados pelo Google Fit
        RAW: 'raw'            // Dados brutos dos dispositivos
    },

    // Aggregate Buckets (para consultas agregadas)
    BUCKET_TYPES: {
        TIME: 'time',
        ACTIVITY_TYPE: 'activityType',
        ACTIVITY_SEGMENT: 'activitySegment'
    },

    // Rate Limits (Google Fit é generoso)
    RATE_LIMIT: {
        REQUESTS_PER_DAY: 10000,        // 10k requests/dia (gratuito!)
        REQUESTS_PER_100_SECONDS: 1000   // 1k requests/100s
    },

    // Cache Settings
    CACHE: {
        ENABLED: true,
        MAX_AGE: 5 * 60 * 1000, // 5 minutos
        STORAGE_KEY: 'cardiorisk_googlefit_cache'
    }
};

// Google Fit API Endpoints
const GOOGLE_FIT_ENDPOINTS = {
    // Data Sources
    listDataSources: () => `${GOOGLE_FIT_CONFIG.API_BASE_URL}/dataSources`,

    // Dataset (raw data)
    getDataset: (dataSource, startTime, endTime) =>
        `${GOOGLE_FIT_CONFIG.API_BASE_URL}/dataSources/${dataSource}/datasets/${startTime}-${endTime}`,

    // Aggregate data
    aggregate: () => `${GOOGLE_FIT_CONFIG.API_BASE_URL}/dataset:aggregate`,

    // Sessions (activities)
    listSessions: (startTime, endTime) =>
        `${GOOGLE_FIT_CONFIG.API_BASE_URL}/sessions?startTime=${startTime}&endTime=${endTime}`,

    // Activity types
    activityTypes: () => 'https://www.googleapis.com/fitness/v1/activityTypes'
};

// Helper Functions
const GOOGLE_FIT_HELPERS = {
    // Convert timestamp to Google Fit format (nanoseconds)
    toNanoTime: (date) => {
        return new Date(date).getTime() * 1000000;
    },

    // Convert Google Fit nanoseconds to Date
    fromNanoTime: (nanoTime) => {
        return new Date(parseInt(nanoTime) / 1000000);
    },

    // Get time range for queries
    getTimeRange: (days = 7) => {
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - days);
        return {
            startTimeMillis: startTime.getTime(),
            endTimeMillis: endTime.getTime(),
            startTimeNanos: GOOGLE_FIT_HELPERS.toNanoTime(startTime),
            endTimeNanos: GOOGLE_FIT_HELPERS.toNanoTime(endTime)
        };
    },

    // Build OAuth URL
    buildAuthUrl: () => {
        const params = new URLSearchParams({
            client_id: GOOGLE_FIT_CONFIG.CLIENT_ID,
            redirect_uri: GOOGLE_FIT_CONFIG.REDIRECT_URI,
            response_type: 'token',  // Implicit flow (para web apps públicos)
            scope: GOOGLE_FIT_CONFIG.SCOPES.join(' '),
            access_type: 'offline',
            prompt: 'consent'
        });
        return `${GOOGLE_FIT_CONFIG.AUTH_URL}?${params.toString()}`;
    },

    // Extract access token from redirect
    extractTokenFromUrl: (url = window.location.hash) => {
        const params = new URLSearchParams(url.substring(1));
        return {
            accessToken: params.get('access_token'),
            expiresIn: params.get('expires_in'),
            tokenType: params.get('token_type'),
            scope: params.get('scope')
        };
    },

    // Build headers for API requests
    getHeaders: (accessToken) => {
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
    },

    // Check if configured
    isConfigured: () => {
        return GOOGLE_FIT_CONFIG.CLIENT_ID !== 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com';
    },

    // Build aggregate request body
    buildAggregateRequest: (dataTypes, startTimeMillis, endTimeMillis, bucketDuration = 86400000) => {
        return {
            aggregateBy: dataTypes.map(type => ({
                dataTypeName: type
            })),
            bucketByTime: {
                durationMillis: bucketDuration  // 1 dia = 86400000ms
            },
            startTimeMillis,
            endTimeMillis
        };
    },

    // Parse aggregate response
    parseAggregateData: (response) => {
        const results = {};
        if (!response.bucket) return results;

        response.bucket.forEach(bucket => {
            const startTime = new Date(parseInt(bucket.startTimeMillis));

            bucket.dataset.forEach(dataset => {
                const dataType = dataset.dataSourceId.split(':').pop();
                if (!results[dataType]) results[dataType] = [];

                dataset.point.forEach(point => {
                    const value = point.value[0];
                    results[dataType].push({
                        timestamp: GOOGLE_FIT_HELPERS.fromNanoTime(point.startTimeNanos),
                        value: value.fpVal || value.intVal,
                        dataType: dataType
                    });
                });
            });
        });

        return results;
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GOOGLE_FIT_CONFIG, GOOGLE_FIT_ENDPOINTS, GOOGLE_FIT_HELPERS };
}
