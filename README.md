# CardioRisk AI

Predictive Cardiac Health Monitoring System with a modernized high-fidelity dashboard.

## 🚀 Dashboard Features
The application now features a comprehensive dashboard with several modules:
- **💓 Heart Rate**: Real-time pulse monitoring with abnormality detection.
- **📊 Trends**: Advanced 15-day historical analysis and risk assessment.
- **🏃 Activity**: Tracking of daily goals and physical exercises (Cycling, Jogging).
- **🏠 Overview**: Unified view of health metrics and predictive risk status.

## Project Structure
- `index.html`: Main dashboard entry point.
- `heart_rate.html`, `trends.html`, `activity.html`: Specialized health modules.
- `style.css` / `app.js`: Shared styling and data binding logic.
- `src/`: Backend source code for data processing and ML models.

## Setup
1. Clone the repository.
2. Install dependencies: `pip install -r requirements.txt`
3. Export your Apple Health data as `export.xml` and place it in `data/raw/`.
4. Run the analysis: `python src/main.py`
5. Open `index.html` in your browser to view the dashboard.
