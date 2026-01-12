import os
import pandas as pd
import numpy as np
from data_processor import HealthDataProcessor
from models.anomaly_detector import CardiacAnomalyDetector
from synthetic_generator import generate_synthetic_data

def main():
    print("--- CardioRisk AI: Startup ---")
    
    # Path settings
    raw_data_path = "data/raw/export.xml"
    synthetic_data_path = "data/processed/synthetic_data.csv"
    
    # 1. Data Selection & Loading
    if os.path.exists(raw_data_path):
        print(f"Found real HealthKit data at {raw_data_path}")
        processor = HealthDataProcessor(raw_data_path)
        df = processor.parse_apple_health()
    else:
        print("Real HealthKit data not found. Using synthetic data.")
        df = pd.DataFrame()

    features = ['HRV', 'RHR', 'RespiratoryRate', 'SleepDuration', 'SpO2']
    
    if df.empty or len(df) < 5:
        print("Real data missing or too sparse. FORCING 60-day synthetic crisis for interesting demonstration.")
        # Use 60 days where's there's a clear decline in the last 10 days
        df = generate_synthetic_data(days=60, anomaly_start_day=50)
    
    X = df[features].values
    
    # 2. Model Training
    detector = CardiacAnomalyDetector(contamination=0.1)
    
    # Use first 70% as baseline
    split_idx = max(5, int(len(X) * 0.7))
    X_train = X[:split_idx]
    detector.train(X_train)
    
    # 3. Prediction
    latest_data = X[-1:]
    risk_score = detector.predict_risk_score(latest_data)
    
    # 4. Output results based on PRD Thresholds
    print("\n" + "="*30)
    print(f"LATEST CARDIAC RISK SCORE: {risk_score:.1f}/100")
    print("="*30)
    
    if risk_score < 20:
        status = "NORMAL (Safe)"
    elif risk_score < 40:
        status = "MILD DEVIATION (Monitor)"
    elif risk_score < 60:
        status = "MODERATE RISK (Caution)"
    elif risk_score < 80:
        status = "HIGH RISK (Consult Doctor)"
    else:
        status = "CRITICAL (Emergency Alert)"
        
    print(f"STATUS: {status}")
    
    # 5. Export for Dashboard
    from datetime import datetime
    import json
    
    dashboard_data = {
        "latest_score": round(float(risk_score), 1),
        "status": status,
        "last_updated": datetime.now().strftime("%b %d, %Y at %I:%M %p"),
        "data_points_count": len(X),
        "trend": []
    }
    
    for i in range(7):
        idx = len(X) - 1 - i
        if idx >= 0:
            score = float(detector.predict_risk_score(X[idx:idx+1]))
            dashboard_data["trend"].append({
                "day": f"T-{i}",
                "score": round(score, 1)
            })

    with open("dashboard_data.json", "w") as f:
        json.dump(dashboard_data, f, indent=4)
    print("\nDashboard data exported to dashboard_data.json")

if __name__ == "__main__":
    main()
