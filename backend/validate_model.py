import pandas as pd
import numpy as np
from models.anomaly_detector import CardiacAnomalyDetector

def validate_model():
    # Load data
    data_path = "data/processed/synthetic_data.csv"
    df = pd.read_csv(data_path)
    
    # Features for detection
    features = ['HRV', 'RHR', 'RespiratoryRate', 'SleepDuration', 'SpO2']
    X = df[features].values
    
    # Split: Days 0-40 as "Baseline" (Normal)
    # Days 40-60 include the "Anomaly"
    X_train = X[:40]
    X_test = X[40:]
    
    # Initialize and Train Detector
    detector = CardiacAnomalyDetector(contamination=0.1)
    detector.train(X_train)
    
    # Predict Risk Scores
    df['RiskScore'] = 0.0
    for i in range(len(df)):
        score = detector.predict_risk_score(X[i:i+1])
        df.at[i, 'RiskScore'] = score
        
    print("--- Model Validation Summary ---")
    print(f"Average Baseline Risk Score (Days 0-40): {df['RiskScore'][:40].mean():.2f}")
    print(f"Average Anomaly Risk Score (Last 10 Days): {df['RiskScore'][-10:].mean():.2f}")
    
    print("\nRecent Risk Scores:")
    print(df[['Date', 'RiskScore']].tail(15))
    
    # Check if risk score increased significantly
    baseline_avg = df['RiskScore'][:40].mean()
    anomaly_avg = df['RiskScore'][-10:].mean()
    
    if anomaly_avg > baseline_avg + 20:
        print("\n✅ Verification SUCCESS: Model detected the cardiac decline.")
    else:
        print("\n❌ Verification FAILED: Model did not react strongly enough to anomalies.")

if __name__ == "__main__":
    validate_model()
