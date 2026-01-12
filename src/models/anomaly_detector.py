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
        
        # Decision function: 
        #   Higher = more normal (around 0.2 to 0.5)
        #   Lower = more anomalous (negative values)
        raw_score = self.model.decision_function(current_data)[0]
        
        # Mapping logic:
        # We want "Normal" (raw > 0.1) to be 0-20
        # We want "Anomalous" (raw < 0) to scale up to 100
        # Heuristic mapping:
        if raw_score > 0.1:
            risk_score = 10 + (0.2 - raw_score) * 50 # Low risk range
        else:
            # Scale negative scores more aggressively
            # raw_score typically goes down to -0.5 for very rare points
            risk_score = 40 + abs(raw_score) * 150
            
        return np.clip(risk_score, 0, 100)

if __name__ == "__main__":
    detector = CardiacAnomalyDetector()
    print("Anomaly Detector initialized.")
