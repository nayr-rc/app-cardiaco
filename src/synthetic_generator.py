import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_synthetic_data(days=60, anomaly_start_day=50):
    """
    Generates synthetic cardiac health data.
    
    Parameters:
    - days: Total number of days to simulate.
    - anomaly_start_day: The day when physiological decline starts.
    """
    np.random.seed(42)
    
    # Time index
    dates = [datetime.now() - timedelta(days=x) for x in range(days)]
    dates.reverse()
    
    # Baselines
    # Normal: HRV ~ 50, RHR ~ 65, Resp ~ 14, Sleep ~ 7.5
    hrv = np.random.normal(50, 5, days)
    rhr = np.random.normal(65, 3, days)
    resp = np.random.normal(14, 1, days)
    sleep = np.random.normal(7.5, 0.5, days)
    spo2 = np.random.normal(98, 0.5, days)
    
    # Injecting Anomaly (consistent decline matching PRD logic)
    if anomaly_start_day < days:
        for i in range(anomaly_start_day, days):
            # Gradual shift over 10 days
            severity = (i - anomaly_start_day + 1) / (days - anomaly_start_day)
            hrv[i] -= 15 * severity # HRV ↓
            rhr[i] += 10 * severity # RHR ↑
            resp[i] += 3 * severity # Resp ↑
            sleep[i] -= 1.5 * severity # Sleep ↓
            spo2[i] -= 2 * severity # SpO2 ↓
            
    df = pd.DataFrame({
        'Date': dates,
        'HRV': hrv,
        'RHR': rhr,
        'RespiratoryRate': resp,
        'SleepDuration': sleep,
        'SpO2': spo2
    })
    
    return df

if __name__ == "__main__":
    df = generate_synthetic_data()
    output_path = "data/processed/synthetic_data.csv"
    df.to_csv(output_path, index=False)
    print(f"Synthetic data generated and saved to {output_path}")
    print(df.tail(15))
