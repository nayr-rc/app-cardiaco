// Alert System - Real-time Health Monitoring
// Based on medical research thresholds from medical_research.html

class AlertSystem {
    constructor() {
        this.alerts = this.loadAlerts();
        this.alertHistory = this.loadAlertHistory();
        this.notificationPermission = 'default';
        this.checkNotificationPermission();
    }

    // Load active alerts
    loadAlerts() {
        const stored = localStorage.getItem('cardiorisk_active_alerts');
        return stored ? JSON.parse(stored) : [];
    }

    // Save active alerts
    saveAlerts() {
        localStorage.setItem('cardiorisk_active_alerts', JSON.stringify(this.alerts));
    }

    // Load alert history
    loadAlertHistory() {
        const stored = localStorage.getItem('cardiorisk_alert_history');
        return stored ? JSON.parse(stored) : [];
    }

    // Save alert history
    saveAlertHistory() {
        localStorage.setItem('cardiorisk_alert_history', JSON.stringify(this.alertHistory));
    }

    // Check notification permission
    async checkNotificationPermission() {
        if ('Notification' in window) {
            this.notificationPermission = Notification.permission;
            if (this.notificationPermission === 'default') {
                // Don't request automatically - wait for user action
                console.log('Permissão de notificação: padrão (não solicitado)');
            }
        }
    }

    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            return permission === 'granted';
        }
        return this.notificationPermission === 'granted';
    }

    // Create alert
    createAlert(type, severity, title, message, data = {}) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type, // 'heart_rate', 'hrv', 'sleep', 'spo2', 'blood_pressure', 'composite'
            severity, // 'critical', 'high', 'moderate', 'info'
            title,
            message,
            data,
            createdAt: new Date().toISOString(),
            acknowledged: false,
            dismissed: false
        };

        this.alerts.push(alert);
        this.alertHistory.unshift(alert);

        // Keep only last 100 in history
        if (this.alertHistory.length > 100) {
            this.alertHistory = this.alertHistory.slice(0, 100);
        }

        this.saveAlerts();
        this.saveAlertHistory();

        // Send notification for high/critical alerts
        if (severity === 'critical' || severity === 'high') {
            this.sendNotification(alert);
        }

        // Trigger custom event
        window.dispatchEvent(new CustomEvent('cardiorisk:alert', { detail: alert }));

        return alert;
    }

    // Send browser notification
    sendNotification(alert) {
        if (this.notificationPermission === 'granted') {
            try {
                const notification = new Notification(alert.title, {
                    body: alert.message,
                    icon: this.getAlertIcon(alert.severity),
                    tag: alert.id,
                    requireInteraction: alert.severity === 'critical'
                });

                notification.onclick = () => {
                    window.focus();
                    this.acknowledgeAlert(alert.id);
                    notification.close();
                };
            } catch (error) {
                console.error('Erro ao enviar notificação:', error);
            }
        }
    }

    // Get alert icon
    getAlertIcon(severity) {
        const icons = {
            critical: '🚨',
            high: '⚠️',
            moderate: '⚡',
            info: '💡'
        };
        return icons[severity] || '📢';
    }

    // Acknowledge alert
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            this.saveAlerts();
        }
    }

    // Dismiss alert
    dismissAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.dismissed = true;
            alert.dismissedAt = new Date().toISOString();
        }

        this.alerts = this.alerts.filter(a => a.id !== alertId);
        this.saveAlerts();
    }

    // Clear all alerts
    clearAllAlerts() {
        this.alerts = [];
        this.saveAlerts();
    }

    // Get active alerts
    getActiveAlerts(severity = null) {
        let alerts = this.alerts.filter(a => !a.dismissed);
        if (severity) {
            alerts = alerts.filter(a => a.severity === severity);
        }
        return alerts;
    }

    // ==== MONITORING FUNCTIONS ====

    // Monitor Heart Rate
    monitorHeartRate(hrData) {
        if (!hrData || hrData.length === 0) return;

        const latestHR = hrData[hrData.length - 1];
        const avgHR = latestHR.avgHR;
        const restingHR = latestHR.restingHR;

        // Critical: Sustained tachycardia (> 120 bpm)
        if (avgHR > 120) {
            this.createAlert(
                'heart_rate',
                'critical',
                '🚨 Frequência Cardíaca Muito Elevada',
                `Sua frequência cardíaca está em ${avgHR} bpm, acima do limiar crítico de 120 bpm. Busque atendimento médico imediatamente se sentir sintomas.`,
                { hr: avgHR, threshold: 120 }
            );
        }
        // High: Tachycardia (> 100 bpm)
        else if (avgHR > 100) {
            this.createAlert(
                'heart_rate',
                'high',
                '⚠️ Taquicardia Detectada',
                `Frequência cardíaca elevada: ${avgHR} bpm. Recomendamos consulta médica nas próximas 24-48h.`,
                { hr: avgHR, threshold: 100 }
            );
        }
        // High: Elevated resting HR with comorbidities (> 80 bpm)
        else if (restingHR && restingHR > 80) {
            this.createAlert(
                'heart_rate',
                'high',
                '⚠️ FC de Repouso Elevada',
                `Sua frequência cardíaca de repouso está em ${restingHR} bpm. Em pacientes com comorbidades, FC > 80 aumenta risco cardiovascular em 45%.`,
                { restingHR, threshold: 80 }
            );
        }

        // Critical: Bradycardia (< 50 bpm)
        if (avgHR < 50) {
            this.createAlert(
                'heart_rate',
                'critical',
                '🚨 Bradicardia Detectada',
                `Frequência cardíaca muito baixa: ${avgHR} bpm. Se não for atleta e sentir sintomas (tontura, fadiga), busque atendimento médico.`,
                { hr: avgHR, threshold: 50 }
            );
        }
    }

    // Monitor HRV
    monitorHRV(hrvData) {
        if (!hrvData || hrvData.length < 2) return;

        const latestHRV = hrvData[hrvData.length - 1];
        const sdnn = latestHRV.sdnn;
        const rmssd = latestHRV.rmssd;

        // High risk: SDNN < 20ms or RMSSD < 15ms
        if ((sdnn && sdnn < 20) || (rmssd && rmssd < 15)) {
            this.createAlert(
                'hrv',
                'critical',
                '🚨 HRV Criticamente Baixa',
                `Variabilidade cardíaca muito reduzida (SDNN: ${sdnn}ms, RMSSD: ${rmssd}ms). Alto risco de eventos cardiovasculares. Consulte seu cardiologista urgentemente.`,
                { sdnn, rmssd, threshold: { sdnn: 20, rmssd: 15 } }
            );
        }
        // Moderate risk: SDNN 20-30ms or RMSSD 15-20ms
        else if ((sdnn && sdnn < 30) || (rmssd && rmssd < 20)) {
            this.createAlert(
                'hrv',
                'high',
                '⚠️ HRV Reduzida - Risco Moderado',
                `Variabilidade cardíaca abaixo do ideal (SDNN: ${sdnn}ms, RMSSD: ${rmssd}ms). Disfunção autonômica significativa detectada.`,
                { sdnn, rmssd }
            );
        }

        // Check for 30% decline over 7 days
        if (hrvData.length >= 7) {
            const weekAgoHRV = hrvData[hrvData.length - 7];
            if (weekAgoHRV.sdnn && sdnn) {
                const decline = ((weekAgoHRV.sdnn - sdnn) / weekAgoHRV.sdnn) * 100;
                if (decline >= 30) {
                    this.createAlert(
                        'hrv',
                        'high',
                        '⚠️ Declínio Progressivo de HRV',
                        `Sua HRV caiu ${decline.toFixed(1)}% nos últimos 7 dias. Pode indicar estresse crônico, overtraining ou início de processo inflamatório.`,
                        { decline, before: weekAgoHRV.sdnn, after: sdnn }
                    );
                }
            }
        }
    }

    // Monitor Sleep
    monitorSleep(sleepData) {
        if (!sleepData || sleepData.length === 0) return;

        const latestSleep = sleepData[sleepData.length - 1];
        const totalSleep = latestSleep.totalSleep;
        const remSleep = latestSleep.remSleep;
        const deepSleep = latestSleep.deepSleep;
        const awakenings = latestSleep.awakenings;

        // Check for sleep deprivation (< 6 hours)
        if (totalSleep < 6) {
            // Check if it's chronic (3+ nights)
            if (sleepData.length >= 3) {
                const last3Nights = sleepData.slice(-3);
                const allBelowSix = last3Nights.every(night => night.totalSleep < 6);

                if (allBelowSix) {
                    this.createAlert(
                        'sleep',
                        'high',
                        '⚠️ Privação Crônica de Sono',
                        `Você dormiu menos de 6 horas por ${last3Nights.length} noites consecutivas. Privação crônica aumenta risco cardiovascular em 48%.`,
                        { avgSleep: totalSleep, nights: 3 }
                    );
                } else {
                    this.createAlert(
                        'sleep',
                        'moderate',
                        '⚡ Sono Insuficiente',
                        `Apenas ${totalSleep.toFixed(1)} horas de sono. O ideal é 7-9 horas para recuperação cardiovascular adequada.`,
                        { totalSleep, recommended: 7 }
                    );
                }
            }
        }

        // Check REM sleep (< 15%)
        if (remSleep && totalSleep) {
            const remPercentage = (remSleep / totalSleep) * 100;
            if (remPercentage < 15) {
                this.createAlert(
                    'sleep',
                    'moderate',
                    '⚡ Sono REM Reduzido',
                    `Sono REM em apenas ${remPercentage.toFixed(1)}% (ideal: 20-25%). Essencial para recuperação cardiovascular.`,
                    { remPercentage, remHours: remSleep }
                );
            }
        }

        // Check deep sleep (< 10%)
        if (deepSleep && totalSleep) {
            const deepPercentage = (deepSleep / totalSleep) * 100;
            if (deepPercentage < 10) {
                this.createAlert(
                    'sleep',
                    'moderate',
                    '⚡ Sono Profundo Insuficiente',
                    `Sono profundo em apenas ${deepPercentage.toFixed(1)}% (ideal: 15-20%). Crucial para regulação pressórica noturna.`,
                    { deepPercentage, deepHours: deepSleep }
                );
            }
        }

        // Check awakenings (> 10)
        if (awakenings > 10) {
            this.createAlert(
                'sleep',
                'moderate',
                '⚡ Sono Fragmentado',
                `${awakenings} despertares durante a noite. Fragmentação do sono está associada à hipertensão e pode indicar apneia do sono.`,
                { awakenings, threshold: 10 }
            );
        }
    }

    // Monitor SpO2
    monitorSpO2(spo2Data) {
        if (!spo2Data || spo2Data.length === 0) return;

        // Find minimum SpO2
        const minSpO2 = Math.min(...spo2Data.map(s => s.spo2));
        const avgSpO2 = spo2Data.reduce((sum, s) => sum + s.spo2, 0) / spo2Data.length;

        // Critical: Severe hypoxemia (< 85%)
        if (minSpO2 < 85) {
            this.createAlert(
                'spo2',
                'critical',
                '🚨 Hipoxemia Grave Detectada',
                `Saturação de oxigênio caiu para ${minSpO2}%. EMERGÊNCIA MÉDICA - Busque atendimento imediatamente!`,
                { minSpO2, threshold: 85 }
            );
        }
        // High: Moderate hypoxemia (85-89%)
        else if (minSpO2 < 90) {
            this.createAlert(
                'spo2',
                'high',
                '⚠️ Hipoxemia Moderada',
                `Saturação de oxigênio em ${minSpO2}%. Avaliação médica necessária. Pode indicar problemas cardíacos ou pulmonares.`,
                { minSpO2, threshold: 90 }
            );
        }
        // Moderate: Mild hypoxemia (90-94%)
        else if (avgSpO2 < 95) {
            this.createAlert(
                'spo2',
                'moderate',
                '⚡ SpO2 Abaixo do Ideal',
                `Saturação média em ${avgSpO2.toFixed(1)}%. Ideal é ≥95%. Monitoramento recomendado.`,
                { avgSpO2, threshold: 95 }
            );
        }

        // Check for nocturnal desaturations (potential sleep apnea)
        const desaturations = spo2Data.filter(s => s.spo2 < 90).length;
        if (desaturations > 5) {
            this.createAlert(
                'spo2',
                'high',
                '⚠️ Dessaturações Noturnas Frequentes',
                `${desaturations} episódios de SpO2 < 90%. Possível apneia do sono - fator de risco para hipertensão e arritmias.`,
                { desaturations, threshold: 5 }
            );
        }
    }

    // Monitor Blood Pressure (if available)
    monitorBloodPressure(bpData) {
        if (!bpData || bpData.length === 0) return;

        const latestBP = bpData[bpData.length - 1];
        const systolic = latestBP.systolic;
        const diastolic = latestBP.diastolic;

        // Critical: Hypertensive crisis (> 180/120)
        if (systolic > 180 || diastolic > 120) {
            this.createAlert(
                'blood_pressure',
                'critical',
                '🚨 CRISE HIPERTENSIVA',
                `Pressão arterial: ${systolic}/${diastolic} mmHg. EMERGÊNCIA MÉDICA! Busque atendimento imediatamente ou ligue 192.`,
                { systolic, diastolic, threshold: '180/120' }
            );
        }
        // High: Stage 2 hypertension (≥ 140/90)
        else if (systolic >= 140 || diastolic >= 90) {
            this.createAlert(
                'blood_pressure',
                'high',
                '⚠️ Hipertensão Estágio 2',
                `PA: ${systolic}/${diastolic} mmHg. Medicação + mudanças no estilo de vida são necessárias. Consulte seu médico.`,
                { systolic, diastolic, category: 'Stage 2' }
            );
        }
        // Moderate: Stage 1 hypertension (130-139 / 80-89)
        else if (systolic >= 130 || diastolic >= 80) {
            this.createAlert(
                'blood_pressure',
                'moderate',
                '⚡ Hipertensão Estágio 1',
                `PA: ${systolic}/${diastolic} mmHg. Considere medicação e mudanças no estilo de vida. Acompanhamento médico recomendado.`,
                { systolic, diastolic, category: 'Stage 1' }
            );
        }
    }

    // Composite Risk Assessment
    assessCompositeRisk(allData) {
        // Calculate composite risk score based on multiple factors
        let riskFactors = [];
        let riskScore = 0;

        // Check each metric
        if (allData.hrv && allData.hrv.length > 0) {
            const latestHRV = allData.hrv[allData.hrv.length - 1];
            if (latestHRV.sdnn < 30) {
                riskFactors.push('HRV reduzida');
                riskScore += latestHRV.sdnn < 20 ? 30 : 20;
            }
        }

        if (allData.heartRate && allData.heartRate.length > 0) {
            const latestHR = allData.heartRate[allData.heartRate.length - 1];
            if (latestHR.restingHR > 80) {
                riskFactors.push('FC repouso elevada');
                riskScore += 15;
            }
        }

        if (allData.sleep && allData.sleep.length > 0) {
            const latestSleep = allData.sleep[allData.sleep.length - 1];
            if (latestSleep.totalSleep < 6) {
                riskFactors.push('Privação de sono');
                riskScore += 10;
            }
        }

        if (allData.spo2 && allData.spo2.length > 0) {
            const avgSpO2 = allData.spo2.reduce((sum, s) => sum + s.spo2, 0) / allData.spo2.length;
            if (avgSpO2 < 95) {
                riskFactors.push('SpO2 reduzida');
                riskScore += 15;
            }
        }

        // Create composite alert if multiple risk factors
        if (riskFactors.length >= 2) {
            const severity = riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : 'moderate';

            this.createAlert(
                'composite',
                severity,
                `${severity === 'critical' ? '🚨' : '⚠️'} Múltiplos Fatores de Risco`,
                `Detectados ${riskFactors.length} indicadores de risco: ${riskFactors.join(', ')}. Score de risco: ${riskScore}/100. Recomendamos avaliação cardiológica.`,
                { riskFactors, riskScore }
            );
        }
    }

    // Process all wearable data and generate alerts
    processWearableData(wearableData) {
        if (!wearableData) return;

        // Extract different data types
        const hrData = wearableData.heartRate || [];
        const hrvData = wearableData.hrv || [];
        const sleepData = wearableData.sleep || [];
        const spo2Data = wearableData.spo2 || [];
        const bpData = wearableData.bloodPressure || [];

        // Monitor each metric
        this.monitorHeartRate(hrData);
        this.monitorHRV(hrvData);
        this.monitorSleep(sleepData);
        this.monitorSpO2(spo2Data);
        this.monitorBloodPressure(bpData);

        // Composite assessment
        this.assessCompositeRisk({
            heartRate: hrData,
            hrv: hrvData,
            sleep: sleepData,
            spo2: spo2Data
        });
    }
}

// Create global instance
const alertSystem = new AlertSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertSystem;
}
