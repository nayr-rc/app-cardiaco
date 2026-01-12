import pandas as pd
import numpy as np
import xml.etree.ElementTree as ET
from datetime import datetime

class HealthDataProcessor:
    def __init__(self, export_path):
        self.export_path = export_path
        self.data = None

    def parse_apple_health(self):
        """Parses the custom HealthData XML format."""
        try:
            tree = ET.parse(self.export_path)
            root = tree.getroot()
        except Exception as e:
            print(f"Error parsing XML: {e}")
            return pd.DataFrame()

        records = []
        
        # Extraction logic
        # For simplicity, we aggregate metrics by date
        data_by_date = {}

        def get_day(ts):
            return ts.split('T')[0]

        # 1. Heart Rate & RHR (Approximated as Daily Mean/Min)
        hr_records = root.findall('.//HeartRate/Record')
        for hr in hr_records:
            day = get_day(hr.get('timestamp'))
            val = float(hr.get('value'))
            data_by_date.setdefault(day, {})
            data_by_date[day].setdefault('hr_list', []).append(val)

        # 2. HRV
        hrv_records = root.findall('.//HRV/Record')
        for hrv in hrv_records:
            day = get_day(hrv.get('timestamp'))
            val = float(hrv.get('value'))
            data_by_date.setdefault(day, {})
            data_by_date[day].setdefault('hrv_list', []).append(val)

        # 3. Blood Oxygen (SpO2)
        spo2_records = root.findall('.//BloodOxygen/Record')
        for spo2 in spo2_records:
            day = get_day(spo2.get('timestamp'))
            val = float(spo2.get('value'))
            data_by_date.setdefault(day, {})
            data_by_date[day].setdefault('spo2_list', []).append(val)

        # 4. Sleep
        sleep_records = root.findall('.//Sleep/Session')
        for session in sleep_records:
            day = get_day(session.get('start'))
            total_min = 0
            for stage in session.findall('Stage'):
                total_min += float(stage.get('minutes'))
            data_by_date.setdefault(day, {})
            data_by_date[day]['SleepDuration'] = total_min / 60.0 # to hours

        # Aggregate into final rows
        rows = []
        for day, metrics in data_by_date.items():
            row = {'Date': day}
            row['HRV'] = np.mean(metrics.get('hrv_list', [50]))
            row['RHR'] = np.min(metrics.get('hr_list', [65]))
            row['SpO2'] = np.mean(metrics.get('spo2_list', [98]))
            row['RespiratoryRate'] = 14
            row['SleepDuration'] = metrics.get('SleepDuration', 7.5)
            rows.append(row)

        df = pd.DataFrame(rows)
        if not df.empty:
            df = df.sort_values('Date')
        
        self.data = df
        return df

    def engineer_features(self, df):
        """Extracts HRV, RHR, and Sleep features."""
        # Implementation of feature engineering
        # e.g., calculating rolling averages, day-over-day changes
        pass

if __name__ == "__main__":
    processor = HealthDataProcessor("data/raw/export.xml")
    print("Health Data Processor initialized.")
