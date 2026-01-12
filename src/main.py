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
    dashboard_js_path = "data.js"
    dashboard_v3_js_path = "v3/data.js"
    dashboard_output_path = "v3/dashboard_data.json"
    
    # 1. Data Selection & Loading
    df = pd.DataFrame()
    
    if os.path.exists(raw_data_path):
        print(f"Checking for HealthKit data at {raw_data_path}...")
        processor = HealthDataProcessor(raw_data_path)
        df_xml = processor.parse_apple_health()
        if not df_xml.empty and len(df_xml) >= 5:
            print("Successfully loaded real data.")
            df = df_xml
        else:
            print("HealthKit XML found but data is empty or too sparse.")
            
    if df.empty:
        if os.path.exists(synthetic_data_path):
            print(f"LOADING data from CSV: {synthetic_data_path}")
            df = pd.read_csv(synthetic_data_path)
        else:
            print("No CSV found. Generating fresh synthetic demonstration.")
            df = generate_synthetic_data(days=60, anomaly_start_day=50)

    features = ['HRV', 'RHR', 'RespiratoryRate', 'SleepDuration', 'SpO2']
    
    if df.empty or len(df) < 5:
        print("Final data check: Still too sparse. Forcing emergency synthetic generation.")
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
        "user": {
            "name": "Usuário CardioRisk",
            "dob": "15/05/1985",
            "photo_placeholder": "U"
        },
        "latest_score": round(float(risk_score), 1),
        "status": status,
        "last_updated": datetime.now().strftime("%b %d, %Y at %I:%M %p"),
        "data_points_count": len(X),
        "trend": []
    }
    
    for i in range(15):
        idx = len(X) - 1 - i
        if idx >= 0:
            score = float(detector.predict_risk_score(X[idx:idx+1]))
            dashboard_data["trend"].append({
                "day": f"T-{i}",
                "score": round(score, 1)
            })

    # Export to multiple formats and locations for maximum compatibility
    for path in ["dashboard_data.json", "v3/dashboard_data.json"]:
        with open(path, "w") as f:
            json.dump(dashboard_data, f, indent=4)
            
    # Export as JS variable to bypass CORS/File protocol restrictions
    js_content = f"const DASHBOARD_DATA = {json.dumps(dashboard_data, indent=4)};"
    for path in ["data.js", "v3/data.js"]:
        with open(path, "w") as f:
            f.write(js_content)
            
    print("\n[SUCCESS] Dashboard updates exported (JSON & JS).")

if __name__ == "__main__":
    main()
