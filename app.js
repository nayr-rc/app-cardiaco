async function initDashboard() {
    let data;
    try {
        const response = await fetch(`dashboard_data.json?v=${new Date().getTime()}`);
        data = await response.json();
    } catch (e) {
        console.warn("Fetch failed, using local DASHBOARD_DATA fallback.");
        data = typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA : null;
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

        let color = '#2ecc71';
        if (data.latest_score > 60) color = '#e74c3c';
        else if (data.latest_score > 40) color = '#e67e22';
        else if (data.latest_score > 20) color = '#f1c40f';

        riskStatus.style.color = color;
        progressCircle.style.stroke = color;

        const offset = 283 - (data.latest_score / 100) * 283;
        progressCircle.style.strokeDashoffset = offset;

        // 2. Update Metadata
        document.getElementById('data-range').innerText = `${data.data_points_count} days`;
        document.getElementById('last-update').innerText = data.last_updated;

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
}

document.addEventListener('DOMContentLoaded', initDashboard);
