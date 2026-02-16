from sklearn.ensemble import IsolationForest
import numpy as np

class CardiacAnomalyDetector:
    def __init__(self, contamination=0.05):
        self.model = IsolationForest(contamination=contamination, random_state=42)
        self.is_trained = False

    def train(self, historical_data):
        """Trains the model on the user's baseline data."""
        self.model.fit(historical_data)
        self.is_trained = True

    def predict_risk_score(self, current_data):
        """Returns a risk score between 0 and 100 based on isolation forest decision function."""
        if not self.is_trained:
            return 50 
        
        raw_score = self.model.decision_function(current_data)[0]
        
        # Mapping logic:
        # Decision function: 
        #   Higher = more normal (around 0.2 to 0.5)
        #   Lower = more anomalous (negative values)
        
        # We want a smoother transition. 
        # Values > 0.1 should be in the 0-20 range.
        # Values < 0 should scale into the 40-100 range.
        
        # Using a simple piecewise linear mapping with more sensitivity:
        if raw_score >= 0.15:
            # Optimal health
            risk_score = (0.5 - raw_score) * 20 # 0.15 -> 7, 0.5 -> 0
        elif raw_score >= 0:
            # Normal but moving towards anomaly
            risk_score = 10 + (0.15 - raw_score) * 150 # 0.15 -> 10, 0 -> 32.5
        else:
            # Anomalous
            risk_score = 35 + abs(raw_score) * 250 # 0 -> 35, -0.2 -> 85
            
        return np.clip(risk_score, 0, 100)

if __name__ == "__main__":
    detector = CardiacAnomalyDetector()
    print("Anomaly Detector initialized.")
