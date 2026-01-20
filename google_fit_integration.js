// Google Fit Integration Module - 100% GRATUITA!
// Handles OAuth2, data fetching, and synchronization with Google Fit

class GoogleFitIntegration {
    constructor() {
        this.accessToken = this.loadAccessToken();
        this.tokenExpiry = this.loadTokenExpiry();
        this.cache = new Map();
        this.syncInterval = null;
    }

    // Load access token from localStorage
    loadAccessToken() {
        return localStorage.getItem('googlefit_access_token');
    }

    // Save access token to localStorage
    saveAccessToken(token, expiresIn) {
        localStorage.setItem('googlefit_access_token', token);
        const expiry = Date.now() + (parseInt(expiresIn) * 1000);
        localStorage.setItem('googlefit_token_expiry', expiry.toString());
        this.accessToken = token;
        this.tokenExpiry = expiry;
    }

    // Load token expiry
    loadTokenExpiry() {
        const expiry = localStorage.getItem('googlefit_token_expiry');
        return expiry ? parseInt(expiry) : 0;
    }

    // Check if token is valid
    isTokenValid() {
        return this.accessToken && Date.now() < this.tokenExpiry;
    }

    // Check connection status
    getConnectionStatus() {
        if (!GOOGLE_FIT_HELPERS.isConfigured()) {
            return {
                status: 'not_configured',
                message: 'Google Fit API não configurada. Configure seu Client ID.'
            };
        }

        if (!this.isTokenValid()) {
            return {
                status: 'not_connected',
                message: 'Não conectado ao Google Fit'
            };
        }

        return {
            status: 'connected',
            message: 'Conectado ao Google Fit',
            expiresAt: new Date(this.tokenExpiry)
        };
    }

    // Initialize OAuth flow
    connectGoogleFit() {
        if (!GOOGLE_FIT_HELPERS.isConfigured()) {
            throw new Error('Configure seu Google Client ID em google_fit_config.js');
        }

        const authUrl = GOOGLE_FIT_HELPERS.buildAuthUrl();

        // Open OAuth popup
        const width = 500;
        const height = 600;
        const left = (screen.width / 2) - (width / 2);
        const top = (screen.height / 2) - (height / 2);

        const popup = window.open(
            authUrl,
            'Google Fit Authorization',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for OAuth callback
        return new Promise((resolve, reject) => {
            const checkPopup = setInterval(() => {
                try {
                    if (popup.closed) {
                        clearInterval(checkPopup);

                        // Check if we got the token
                        if (this.isTokenValid()) {
                            resolve({ success: true });
                        } else {
                            reject(new Error('Autorização cancelada'));
                        }
                    }

                    // Try to read popup URL (will fail due to CORS until redirect)
                    if (popup.location.href.includes('access_token')) {
                        const tokenData = GOOGLE_FIT_HELPERS.extractTokenFromUrl(popup.location.hash);
                        if (tokenData.accessToken) {
                            this.saveAccessToken(tokenData.accessToken, tokenData.expiresIn);
                            popup.close();
                            clearInterval(checkPopup);
                            resolve({ success: true, tokenData });
                        }
                    }
                } catch (e) {
                    // CORS error is expected during OAuth flow
                }
            }, 500);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(checkPopup);
                if (!popup.closed) popup.close();
                reject(new Error('Tempo limite de autorização excedido'));
            }, 5 * 60 * 1000);
        });
    }

    // Disconnect (revoke token)
    disconnect() {
        localStorage.removeItem('googlefit_access_token');
        localStorage.removeItem('googlefit_token_expiry');
        this.accessToken = null;
        this.tokenExpiry = 0;
        this.cache.clear();
    }

    // Fetch data from Google Fit API
    async fetchData(endpoint, options = {}) {
        if (!this.isTokenValid()) {
            throw new Error('Token inválido ou expirado. Reconecte ao Google Fit.');
        }

        const { method = 'GET', body = null, cacheKey = null } = options;

        // Check cache
        if (cacheKey && GOOGLE_FIT_CONFIG.CACHE.ENABLED) {
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp < GOOGLE_FIT_CONFIG.CACHE.MAX_AGE)) {
                console.log('Retornando do cache:', cacheKey);
                return cached.data;
            }
        }

        try {
            const response = await fetch(endpoint, {
                method,
                headers: GOOGLE_FIT_HELPERS.getHeaders(this.accessToken),
                body: body ? JSON.stringify(body) : null
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Google Fit API Error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();

            // Update cache
            if (cacheKey && GOOGLE_FIT_CONFIG.CACHE.ENABLED) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;

        } catch (error) {
            console.error('Erro ao buscar dados do Google Fit:', error);
            throw error;
        }
    }

    // Get heart rate data
    async getHeartRateData(days = 7) {
        const { startTimeMillis, endTimeMillis } = GOOGLE_FIT_HELPERS.getTimeRange(days);

        const requestBody = GOOGLE_FIT_HELPERS.buildAggregateRequest(
            [GOOGLE_FIT_CONFIG.DATA_TYPES.HEART_RATE],
            startTimeMillis,
            endTimeMillis,
            3600000  // 1 hora buckets
        );

        const endpoint = GOOGLE_FIT_ENDPOINTS.aggregate();
        const cacheKey = `heart_rate_${days}d`;

        const response = await this.fetchData(endpoint, {
            method: 'POST',
            body: requestBody,
            cacheKey
        });

        return this.parseHeartRateData(response);
    }

    // Parse heart rate data
    parseHeartRateData(response) {
        const hrData = [];

        if (!response.bucket) return hrData;

        response.bucket.forEach(bucket => {
            const dataset = bucket.dataset.find(d => d.dataSourceId.includes('heart_rate'));
            if (!dataset || !dataset.point || dataset.point.length === 0) return;

            const points = dataset.point;
            const values = points.map(p => p.value[0].fpVal);

            if (values.length > 0) {
                hrData.push({
                    date: new Date(parseInt(bucket.startTimeMillis)),
                    avgHR: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
                    maxHR: Math.round(Math.max(...values)),
                    minHR: Math.round(Math.min(...values)),
                    samples: values.length
                });
            }
        });

        return hrData;
    }

    // Get step count data
    async getStepData(days = 7) {
        const { startTimeMillis, endTimeMillis } = GOOGLE_FIT_HELPERS.getTimeRange(days);

        const requestBody = GOOGLE_FIT_HELPERS.buildAggregateRequest(
            [GOOGLE_FIT_CONFIG.DATA_TYPES.STEP_COUNT],
            startTimeMillis,
            endTimeMillis,
            86400000  // 1 dia
        );

        const endpoint = GOOGLE_FIT_ENDPOINTS.aggregate();
        const response = await this.fetchData(endpoint, {
            method: 'POST',
            body: requestBody,
            cacheKey: `steps_${days}d`
        });

        return this.parseStepData(response);
    }

    // Parse step data
    parseStepData(response) {
        const stepData = [];

        if (!response.bucket) return stepData;

        response.bucket.forEach(bucket => {
            const dataset = bucket.dataset.find(d => d.dataSourceId.includes('step_count'));
            if (!dataset || !dataset.point || dataset.point.length === 0) return;

            const totalSteps = dataset.point.reduce((sum, p) => sum + (p.value[0].intVal || 0), 0);

            stepData.push({
                date: new Date(parseInt(bucket.startTimeMillis)),
                steps: totalSteps
            });
        });

        return stepData;
    }

    // Get sleep data (requires Google Fit sleep tracking)
    async getSleepData(days = 7) {
        const { startTimeMillis, endTimeMillis } = GOOGLE_FIT_HELPERS.getTimeRange(days);

        const requestBody = GOOGLE_FIT_HELPERS.buildAggregateRequest(
            [GOOGLE_FIT_CONFIG.DATA_TYPES.SLEEP],
            startTimeMillis,
            endTimeMillis,
            86400000  // 1 dia
        );

        const endpoint = GOOGLE_FIT_ENDPOINTS.aggregate();

        try {
            const response = await this.fetchData(endpoint, {
                method: 'POST',
                body: requestBody,
                cacheKey: `sleep_${days}d`
            });

            return this.parseSleepData(response);
        } catch (error) {
            console.warn('Dados de sono não disponíveis:', error);
            return [];
        }
    }

    // Parse sleep data
    parseSleepData(response) {
        const sleepData = [];

        if (!response.bucket) return sleepData;

        response.bucket.forEach(bucket => {
            const dataset = bucket.dataset.find(d => d.dataSourceId.includes('sleep'));
            if (!dataset || !dataset.point || dataset.point.length === 0) return;

            let totalSleep = 0;
            let deepSleep = 0;
            let remSleep = 0;
            let lightSleep = 0;

            dataset.point.forEach(point => {
                const sleepType = point.value[0].intVal;  // 1=awake, 2=sleep, 3=out-of-bed, 4=light, 5=deep, 6=REM
                const duration = (point.endTimeNanos - point.startTimeNanos) / 1000000 / 3600000;  // horas

                if (sleepType === 2 || sleepType >= 4) totalSleep += duration;
                if (sleepType === 4) lightSleep += duration;
                if (sleepType === 5) deepSleep += duration;
                if (sleepType === 6) remSleep += duration;
            });

            if (totalSleep > 0) {
                sleepData.push({
                    date: new Date(parseInt(bucket.startTimeMillis)),
                    totalSleep,
                    deepSleep,
                    remSleep,
                    lightSleep,
                    awakenings: 0  // Google Fit não fornece facilmente
                });
            }
        });

        return sleepData;
    }

    // Get all data (comprehensive sync)
    async syncAllData(days = 7) {
        console.log('Sincronizando dados do Google Fit...');

        try {
            const [heartRate, steps, sleep] = await Promise.all([
                this.getHeartRateData(days),
                this.getStepData(days),
                this.getSleepData(days)
            ]);

            const syncResult = {
                success: true,
                data: {
                    heartRate,
                    steps,
                    sleep,
                    hrv: [],  // Google Fit não expõe HRV diretamente via REST API
                    spo2: []  // Limitado no Google Fit
                },
                syncedAt: new Date().toISOString()
            };

            // Trigger alert processing if alert system is available
            if (typeof alertSystem !== 'undefined') {
                alertSystem.processWearableData({
                    heartRate,
                    hrv: [],
                    sleep,
                    spo2: []
                });
            }

            return syncResult;

        } catch (error) {
            console.error('Erro na sincronização:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Start automatic sync
    startAutoSync(intervalMs = 15 * 60 * 1000) {  // 15 minutos padrão
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        console.log(`Auto-sync iniciado (intervalo: ${intervalMs / 60000} minutos)`);

        // Initial sync
        this.syncAllData();

        // Schedule periodic syncs
        this.syncInterval = setInterval(() => {
            if (this.isTokenValid()) {
                this.syncAllData();
            } else {
                console.warn('Token expirado. Reconecte ao Google Fit.');
                this.stopAutoSync();
            }
        }, intervalMs);
    }

    // Stop automatic sync
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('Auto-sync parado');
        }
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        console.log('Cache limpo');
    }
}

// Create global instance
const googleFitIntegration = new GoogleFitIntegration();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleFitIntegration;
}
