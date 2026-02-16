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
            hrv[i] -= 25 * severity # Severe HRV ↓ (from 50 to 25)
            rhr[i] += 20 * severity # Severe RHR ↑ (from 65 to 85)
            resp[i] += 5 * severity # Resp ↑
            sleep[i] -= 2.5 * severity # Sleep ↓
            spo2[i] -= 4 * severity # SpO2 ↓
            
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
    # In cloud-native mode, we just return the dataframe
    # instead of saving to a local CSV.
    df = generate_synthetic_data()
    print("Synthetic data generated successfuly.")
    print(df.tail(5))
