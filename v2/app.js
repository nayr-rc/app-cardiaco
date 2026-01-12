async function initDashboard() {
    try {
        // Add cache-busting timestamp
        const response = await fetch(`dashboard_data.json?v=${new Date().getTime()}`);
        const data = await response.json();
        console.log("Dashboard data loaded:", data);

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

            // Set bar color
            let barColor = '#2ecc71';
            if (point.score > 60) barColor = '#e74c3c';
            else if (point.score > 40) barColor = '#e67e22';
            else if (point.score > 20) barColor = '#f1c40f';

            bar.style.background = barColor;

            const valLabel = document.createElement('span');
            valLabel.className = 'bar-val';
            valLabel.innerText = `${Math.round(point.score)}%`;

            wrapper.appendChild(bar);
            wrapper.appendChild(valLabel);
            chart.appendChild(wrapper);

            // Animate height
            setTimeout(() => {
                bar.style.height = `${point.score}%`;
            }, 100);
        });

        // 4. Update Badge
        const badge = document.getElementById('trend-badge');
        const first = trend[0].score;
        const last = trend[trend.length - 1].score;
        if (last > first) {
            badge.innerText = '↗ Rising';
            badge.style.background = 'rgba(231, 76, 60, 0.1)';
            badge.style.color = '#e74c3c';
        } else {
            badge.innerText = '↘ Falling';
        }

    } catch (e) {
        console.error("Failed to load dashboard data:", e);
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);
