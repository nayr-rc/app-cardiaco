async function initDashboard() {
    let data;
    const API_URL = 'http://localhost:8000/api/dashboard';

    try {
        console.log("Fetching data from Cloud API...");
        const response = await fetch(`${API_URL}?user_name=Usuário CardioRisk&v=${new Date().getTime()}`);
        if (!response.ok) throw new Error('API not available');
        data = await response.json();
        console.log("Cloud data loaded successfully.");
    } catch (e) {
        console.warn("Cloud API fetch failed, trying local fallback:", e);
        try {
            const response = await fetch(`dashboard_data.json?v=${new Date().getTime()}`);
            data = await response.json();
        } catch (localErr) {
            data = typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA : null;
        }
    }

    if (!data) {
        console.error("No dashboard data available from Cloud or Local sources.");
        return;
    }

    try {
        // 1. Update Gauge
        const riskVal = document.getElementById('risk-value');
        const riskStatus = document.getElementById('risk-status');
        const progressCircle = document.querySelector('.gauge-progress');

        if (riskVal) riskVal.innerText = `${data.latest_score}%`;
        if (riskStatus) {
            riskStatus.innerText = data.status;
            let color = '#2ecc71';
            if (data.latest_score > 60) color = '#e74c3c';
            else if (data.latest_score > 40) color = '#e67e22';
            else if (data.latest_score > 20) color = '#f1c40f';
            riskStatus.style.color = color;
        }

        if (progressCircle) {
            let color = '#2ecc71';
            if (data.latest_score > 60) color = '#e74c3c';
            else if (data.latest_score > 40) color = '#e67e22';
            else if (data.latest_score > 20) color = '#f1c40f';
            progressCircle.style.stroke = color;
            const offset = 283 - (data.latest_score / 100) * 283;
            progressCircle.style.strokeDashoffset = offset;
        }

        // 2. Update Metadata
        const dataRange = document.getElementById('data-range');
        const lastUpdate = document.getElementById('last-update');
        if (dataRange) dataRange.innerText = `${data.data_points_count} days`;
        if (lastUpdate) lastUpdate.innerText = data.last_updated;

        // 3. Render Trend Chart
        const chart = document.getElementById('trend-chart');
        chart.innerHTML = '';
        const trend = [...data.trend].reverse();

        trend.forEach(point => {
            const wrapper = document.createElement('div');
            wrapper.className = 'bar-wrapper';

            const bar = document.createElement('div');
            bar.className = 'bar';

            let barAlpha = 0.3;
            if (point.score > 60) barAlpha = 0.8;

            bar.style.background = `rgba(255, 255, 255, ${barAlpha})`;

            const valLabel = document.createElement('span');
            valLabel.className = 'bar-val';
            valLabel.innerText = `${Math.round(point.score)}%`;

            wrapper.appendChild(bar);
            wrapper.appendChild(valLabel);
            chart.appendChild(wrapper);

            const finalHeight = Math.max(15, point.score);
            requestAnimationFrame(() => {
                bar.style.height = `${finalHeight}%`;
            });
        });

        // 4. Update Badge
        const badge = document.getElementById('trend-badge');
        const first = trend[0].score;
        const last = trend[trend.length - 1].score;
        if (last > first) {
            badge.innerText = '↗ Rising Risk';
            badge.style.background = '#FF5252';
            badge.style.color = '#ffffff';
        } else {
            badge.innerText = '↘ Improving';
            badge.style.background = 'rgba(255, 255, 255, 0.2)';
            badge.style.color = '#ffffff';
        }

    } catch (e) {
        console.error("Failed to load dashboard data:", e);
    }

    // 5. Initialize Wearable Integration (if available)
    if (typeof wearableIntegration !== 'undefined') {
        try {
            const connectionStatus = wearableIntegration.getConnectionStatus();

            if (connectionStatus.status === 'connected') {
                console.log('Wearable devices connected, starting sync...');

                // Start auto-sync
                wearableIntegration.startAutoSync();

                // Initial sync and alert check
                const syncResults = await wearableIntegration.syncAllDevices();

                if (syncResults.length > 0 && syncResults[0].success) {
                    const wearableData = syncResults[0].data;

                    // Extract and process data for alerts
                    const hrData = wearableIntegration.extractHeartRateData(wearableData.daily);
                    const hrvData = wearableIntegration.extractHRVData(wearableData.daily);
                    const sleepData = wearableIntegration.extractSleepData(wearableData.sleep);
                    const spo2Data = wearableIntegration.extractSpO2Data(wearableData.daily);

                    // Process data through alert system
                    if (typeof alertSystem !== 'undefined') {
                        alertSystem.processWearableData({
                            heartRate: hrData,
                            hrv: hrvData,
                            sleep: sleepData,
                            spo2: spo2Data
                        });

                        // Display active alerts
                        displayActiveAlerts();
                    }
                }
            }
        } catch (e) {
            console.warn('Wearable integration error:', e);
        }
    }
}

// Display active alerts on dashboard
function displayActiveAlerts() {
    if (typeof alertSystem === 'undefined') return;

    const alerts = alertSystem.getActiveAlerts();

    if (alerts.length === 0) return;

    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.className = 'alert-container';

        const mainContent = document.querySelector('.main-content');
        const topBar = document.querySelector('.top-bar');
        mainContent.insertBefore(alertContainer, topBar.nextSibling);
    }

    // Clear existing alerts
    alertContainer.innerHTML = '';

    // Show critical and high priority alerts
    const priorityAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

    priorityAlerts.slice(0, 3).forEach(alert => {
        const alertEl = document.createElement('div');
        alertEl.className = `alert alert-${alert.severity}`;
        alertEl.innerHTML = `
            <div class="alert-icon">${alert.severity === 'critical' ? '🚨' : '⚠️'}</div>
            <div class="alert-content">
                <strong>${alert.title}</strong>
                <p>${alert.message}</p>
            </div>
            <button class="alert-dismiss" onclick="dismissAlert('${alert.id}')">✕</button>
        `;
        alertContainer.appendChild(alertEl);
    });
}

// Dismiss alert function
function dismissAlert(alertId) {
    if (typeof alertSystem !== 'undefined') {
        alertSystem.dismissAlert(alertId);
        displayActiveAlerts();
    }
}

// Listen for new alerts
window.addEventListener('cardiorisk:alert', (event) => {
    console.log('New alert:', event.detail);
    displayActiveAlerts();
});

document.addEventListener('DOMContentLoaded', initDashboard);
