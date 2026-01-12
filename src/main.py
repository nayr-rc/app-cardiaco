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
        print("Real data missing or too sparse. Falling back to synthetic for demonstration.")
        df_synth = generate_synthetic_data(days=60, anomaly_start_day=50)
        if df.empty:
            df = df_synth
        else:
            # Augment real data at the end of a synthetic baseline
            print("Augmenting synthetic baseline with real samples...")
            df_baseline = generate_synthetic_data(days=30, anomaly_start_day=31)
            df = pd.concat([df_baseline, df], ignore_index=True)
    
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
    print("\nTrending (Last 5 Days):")
    for i in range(5):
        idx = len(X) - 1 - i
        if idx >= 0:
            score = detector.predict_risk_score(X[idx:idx+1])
            print(f" T-{i} days: {score:.1f}")

if __name__ == "__main__":
    main()
