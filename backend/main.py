import os
import pandas as pd
import numpy as np
import json
from datetime import datetime
from data_processor import HealthDataProcessor
from models.anomaly_detector import CardiacAnomalyDetector
from synthetic_generator import generate_synthetic_data
from db_manager import DBManager

def main():
    print("--- CardioRisk AI: Startup (Cloud-Sync Only) ---")
    
    # Path settings (Input only)
    raw_data_path = "data/raw/export.xml"
    synthetic_data_path = "data/processed/synthetic_data.csv"
    
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
    
    # 5. Prepare Data for MongoDB
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

    # --- MONGODB INTEGRATION (ALPHA TEST) ---
    # NO LOCAL SAVING (dashboard_data.json and data.js removed from logic)
    try:
        mongo_uri = "mongodb+srv://narsie454_db_user:BH7BP1Wg9sDA5yAY@cardiorisk.zzksboj.mongodb.net/"
        print("\n[DB] Synchronizing with MongoDB Alpha...")
        db = DBManager(mongo_uri)
        db.save_client_data(dashboard_data)
        print("[SUCCESS] Data synchronized exclusively with MongoDB Cloud.")
    except Exception as e:
        print(f"[DB] MongoDB error: {e}")

if __name__ == "__main__":
    main()
