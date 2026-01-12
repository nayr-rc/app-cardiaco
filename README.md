# CardioRisk AI

Predictive Cardiac Health Monitoring System.

## Project Structure
- `src/`: Source code
  - `data_processor.py`: Data cleaning and feature engineering.
  - `models/`: ML models (Anomaly detection, Time-series analysis).
- `data/`: Data storage (ignored by git).
- `tests/`: Unit and integration tests.

## Setup
1. Clone the repository.
2. Install dependencies: `pip install -r requirements.txt`
3. Export your Apple Health data as `export.xml` and place it in `data/raw/`.
4. Run the analysis: `python src/main.py`
