async function initDashboard() {
    let data;
    const API_URL = 'http://localhost:8000/api/dashboard';

    try {
        console.log("Fetching v3 data from Cloud API...");
        const response = await fetch(`${API_URL}?user_name=Usuário CardioRisk&v=${new Date().getTime()}`);
        if (!response.ok) throw new Error('API not available');
        data = await response.json();
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
        console.error("No dashboard data available.");
        return;
    }

    try {

        // 1. Update Gauge
        const riskVal = document.getElementById('risk-value');
        const riskStatus = document.getElementById('risk-status');
        const progressCircle = document.querySelector('.gauge-progress');

        riskVal.innerText = `${data.latest_score}%`;
        riskStatus.innerText = data.status;

        // Set Color and Progress
        let color = '#2ecc71'; // Green
        if (data.latest_score > 60) color = '#e74c3c'; // Red
        else if (data.latest_score > 40) color = '#e67e22'; // Orange
        else if (data.latest_score > 20) color = '#f1c40f'; // Yellow

        riskStatus.style.color = color;
        progressCircle.style.stroke = color;

        // svg circumference is 2 * PI * 45 = 282.7
        const offset = 283 - (data.latest_score / 100) * 283;
        progressCircle.style.strokeDashoffset = offset;

        // 2. Update Metadata
        document.getElementById('data-range').innerText = `Based on ${data.data_points_count} days of data`;
        document.getElementById('last-update').innerText = `Last updated: ${data.last_updated}`;

        // 3. Render Trend Chart
        const chart = document.getElementById('trend-chart');
        chart.innerHTML = '';

        // Reverse trend to be chronological (T-6 to T-0)
        const trend = [...data.trend].reverse();

        trend.forEach(point => {
            const wrapper = document.createElement('div');
            wrapper.className = 'bar-wrapper';

            const bar = document.createElement('div');
            bar.className = 'bar';

            // Set bar color - using semi-transparent white for better visibility on purple
            let barAlpha = 0.3;
            if (point.score > 60) barAlpha = 0.8; // Highlight high risk

            bar.style.background = `rgba(255, 255, 255, ${barAlpha})`;

            const valLabel = document.createElement('span');
            valLabel.className = 'bar-val';
            valLabel.innerText = `${Math.round(point.score)}%`;

            wrapper.appendChild(bar);
            wrapper.appendChild(valLabel);
            chart.appendChild(wrapper);

            // Animate height
            const finalHeight = Math.max(15, point.score); // Slightly higher min height for visibility
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
}

document.addEventListener('DOMContentLoaded', initDashboard);
