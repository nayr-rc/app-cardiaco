// Wearable Integration Module
// Handles OAuth, data fetching, and synchronization with wearable devices

class WearableIntegration {
    constructor() {
        this.connectedDevices = this.loadConnectedDevices();
        this.syncInterval = null;
        this.cache = new Map();
        this.rateLimitQueue = [];
        this.lastRequestTime = 0;
    }

    // Load connected devices from cloud/localStorage
    async syncFromCloud() {
        const userName = "Usuário CardioRisk";
        try {
            const response = await fetch(`http://localhost:8000/api/get_devices?user_name=${encodeURIComponent(userName)}`);
            const data = await response.json();
            if (data && data.devices) {
                this.connectedDevices = data.devices;
                this.saveConnectedDevices(false); // Save locally for speed
            }
        } catch (e) {
            console.warn("Cloud device sync failed", e);
        }
    }

    async syncToCloud() {
        const userName = "Usuário CardioRisk";
        try {
            await fetch(`http://localhost:8000/api/save_devices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_name: userName,
                    devices: this.connectedDevices
                })
            });
        } catch (e) {
            console.error("Failed to sync devices to cloud", e);
        }
    }

    loadConnectedDevices() {
        const stored = localStorage.getItem('cardiorisk_connected_devices');
        const devices = stored ? JSON.parse(stored) : [];
        this.syncFromCloud();
        return devices;
    }

    // Save connected devices
    saveConnectedDevices(syncCloud = true) {
        localStorage.setItem('cardiorisk_connected_devices', JSON.stringify(this.connectedDevices));
        if (syncCloud) this.syncToCloud();
    }

    // Check if any device is connected
    hasConnectedDevices() {
        return this.connectedDevices.length > 0;
    }

    // Get connection status
    getConnectionStatus() {
        if (!API_HELPERS.isConfigured()) {
            return {
                status: 'not_configured',
                message: 'API não configurada. Configure suas credenciais Terra API.'
            };
        }

        if (this.connectedDevices.length === 0) {
            return {
                status: 'not_connected',
                message: 'Nenhum dispositivo conectado'
            };
        }

        return {
            status: 'connected',
            message: `${this.connectedDevices.length} dispositivo(s) conectado(s)`,
            devices: this.connectedDevices
        };
    }

    // Initialize OAuth flow (Terra Widget)
    async connectDevice(providerId, referenceId = null) {
        if (!API_HELPERS.isConfigured()) {
            throw new Error('API não configurada. Adicione suas credenciais Terra API em api_config.js');
        }

        try {
            // Generate widget session
            const response = await fetch(API_ENDPOINTS.generateWidgetSession(), {
                method: 'POST',
                headers: API_HELPERS.getHeaders(),
                body: JSON.stringify({
                    reference_id: referenceId || `user_${Date.now()}`,
                    providers: providerId ? [providerId] : null,
                    language: 'pt',
                    auth_success_redirect_url: window.location.origin + '/wearable_setup.html?success=true',
                    auth_failure_redirect_url: window.location.origin + '/wearable_setup.html?error=true'
                })
            });

            if (!response.ok) {
                throw new Error(`Erro ao gerar sessão: ${response.statusText}`);
            }

            const data = await response.json();

            // Open Terra widget
            if (data.url) {
                window.open(data.url, '_blank', 'width=500,height=700');
                return {
                    success: true,
                    session_id: data.session_id,
                    user_id: data.user_id
                };
            }

        } catch (error) {
            console.error('Erro ao conectar dispositivo:', error);
            throw error;
        }
    }

    // Register successfully connected device
    registerDevice(userId, provider, authData = {}) {
        const device = {
            userId,
            provider,
            connectedAt: new Date().toISOString(),
            lastSync: null,
            ...authData
        };

        // Check if already connected
        const existingIndex = this.connectedDevices.findIndex(d => d.userId === userId);
        if (existingIndex >= 0) {
            this.connectedDevices[existingIndex] = device;
        } else {
            this.connectedDevices.push(device);
        }

        this.saveConnectedDevices();
        return device;
    }

    // Disconnect device
    async disconnectDevice(userId) {
        try {
            // Call Terra deauth endpoint
            const response = await fetch(API_ENDPOINTS.deauth(userId), {
                method: 'DELETE',
                headers: API_HELPERS.getHeaders()
            });

            if (response.ok) {
                // Remove from local storage
                this.connectedDevices = this.connectedDevices.filter(d => d.userId !== userId);
                this.saveConnectedDevices();
                return { success: true };
            }

        } catch (error) {
            console.error('Erro ao desconectar dispositivo:', error);
            throw error;
        }
    }

    // Fetch data from API with caching
    async fetchData(endpoint, cacheKey = null, maxAge = API_CONFIG.CACHE.MAX_AGE) {
        // Check cache
        if (cacheKey && API_CONFIG.CACHE.ENABLED) {
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp < maxAge)) {
                console.log('Retornando dados do cache:', cacheKey);
                return cached.data;
            }
        }

        // Rate limiting
        await this.handleRateLimit();

        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: API_HELPERS.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Update cache
            if (cacheKey && API_CONFIG.CACHE.ENABLED) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            throw error;
        }
    }

    // Rate limiting handler
    async handleRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minInterval = 60000 / API_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE;

        if (timeSinceLastRequest < minInterval) {
            const waitTime = minInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    // Get daily health data
    async getDailyData(userId, days = 7) {
        const { start, end } = API_HELPERS.getDateRange(days);
        const endpoint = API_ENDPOINTS.getDaily(userId, start, end);
        const cacheKey = `daily_${userId}_${start}_${end}`;

        return await this.fetchData(endpoint, cacheKey);
    }

    // Get sleep data
    async getSleepData(userId, days = 7) {
        const { start, end } = API_HELPERS.getDateRange(days);
        const endpoint = API_ENDPOINTS.getSleep(userId, start, end);
        const cacheKey = `sleep_${userId}_${start}_${end}`;

        return await this.fetchData(endpoint, cacheKey);
    }

    // Get activity data
    async getActivityData(userId, days = 7) {
        const { start, end } = API_HELPERS.getDateRange(days);
        const endpoint = API_ENDPOINTS.getActivity(userId, start, end);
        const cacheKey = `activity_${userId}_${start}_${end}`;

        return await this.fetchData(endpoint, cacheKey);
    }

    // Get body metrics
    async getBodyData(userId, days = 7) {
        const { start, end } = API_HELPERS.getDateRange(days);
        const endpoint = API_ENDPOINTS.getBody(userId, start, end);
        const cacheKey = `body_${userId}_${start}_${end}`;

        return await this.fetchData(endpoint, cacheKey);
    }

    // Sync all connected devices
    async syncAllDevices() {
        if (this.connectedDevices.length === 0) {
            console.log('Nenhum dispositivo para sincronizar');
            return [];
        }

        const syncResults = [];

        for (const device of this.connectedDevices) {
            try {
                console.log(`Sincronizando ${device.provider}...`);

                const [daily, sleep, activity, body] = await Promise.all([
                    this.getDailyData(device.userId),
                    this.getSleepData(device.userId),
                    this.getActivityData(device.userId),
                    this.getBodyData(device.userId)
                ]);

                const result = {
                    userId: device.userId,
                    provider: device.provider,
                    success: true,
                    data: { daily, sleep, activity, body },
                    syncedAt: new Date().toISOString()
                };

                // Update last sync time
                device.lastSync = result.syncedAt;
                syncResults.push(result);

            } catch (error) {
                console.error(`Erro ao sincronizar ${device.provider}:`, error);
                syncResults.push({
                    userId: device.userId,
                    provider: device.provider,
                    success: false,
                    error: error.message
                });
            }
        }

        this.saveConnectedDevices();
        return syncResults;
    }

    // Extract heart rate data
    extractHeartRateData(dailyData) {
        if (!dailyData || !dailyData.data) return [];

        const hrData = [];
        dailyData.data.forEach(day => {
            if (day.heart_rate_data && day.heart_rate_data.summary) {
                hrData.push({
                    date: day.metadata.start_time,
                    avgHR: day.heart_rate_data.summary.avg_hr_bpm,
                    maxHR: day.heart_rate_data.summary.max_hr_bpm,
                    minHR: day.heart_rate_data.summary.min_hr_bpm,
                    restingHR: day.heart_rate_data.summary.resting_hr_bpm
                });
            }
        });

        return hrData;
    }

    // Extract HRV data
    extractHRVData(dailyData) {
        if (!dailyData || !dailyData.data) return [];

        const hrvData = [];
        dailyData.data.forEach(day => {
            if (day.heart_rate_data && day.heart_rate_data.summary && day.heart_rate_data.summary.hrv_metrics) {
                const hrv = day.heart_rate_data.summary.hrv_metrics;
                hrvData.push({
                    date: day.metadata.start_time,
                    sdnn: hrv.sdnn_ms,
                    rmssd: hrv.rmssd_ms
                });
            }
        });

        return hrvData;
    }

    // Extract sleep data
    extractSleepData(sleepData) {
        if (!sleepData || !sleepData.data) return [];

        const sleep = [];
        sleepData.data.forEach(night => {
            if (night && night.sleep_durations_data) {
                const durations = night.sleep_durations_data;
                sleep.push({
                    date: night.metadata.start_time,
                    totalSleep: durations.asleep ? durations.asleep.duration_asleep_state_seconds / 3600 : 0,
                    deepSleep: durations.deep ? durations.deep.duration_asleep_state_seconds / 3600 : 0,
                    remSleep: durations.REM ? durations.REM.duration_asleep_state_seconds / 3600 : 0,
                    lightSleep: durations.light ? durations.light.duration_asleep_state_seconds / 3600 : 0,
                    awakenings: night.sleep_durations_data.awake ? night.sleep_durations_data.awake.num_wakeup_events : 0
                });
            }
        });

        return sleep;
    }

    // Extract SpO2 data
    extractSpO2Data(dailyData) {
        if (!dailyData || !dailyData.data) return [];

        const spo2Data = [];
        dailyData.data.forEach(day => {
            if (day.oxygen_data && day.oxygen_data.saturation_samples) {
                day.oxygen_data.saturation_samples.forEach(sample => {
                    spo2Data.push({
                        timestamp: sample.timestamp,
                        spo2: sample.percentage
                    });
                });
            }
        });

        return spo2Data;
    }

    // Start automatic sync
    startAutoSync(interval = API_CONFIG.SYNC_INTERVALS.FREQUENT) {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        console.log(`Auto-sync iniciado (intervalo: ${interval / 60000} minutos)`);

        // Initial sync
        this.syncAllDevices();

        // Schedule periodic syncs
        this.syncInterval = setInterval(() => {
            this.syncAllDevices();
        }, interval);
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
const wearableIntegration = new WearableIntegration();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WearableIntegration;
}
