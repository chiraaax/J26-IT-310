<div align="center">
  
  # 🧠 ComfortSense: Predictive ML & Backend API Component
  **Final Year Research Project Component - SLIIT**

  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
  [![XGBoost](https://img.shields.io/badge/XGBoost-172434?style=for-the-badge&logo=xgboost&logoColor=white)](#)
  [![Scikit-Learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)](#)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](#)

</div>

---

## 👤 Component Author
* **Name:** Wanniarachchige Nethna Oshad
* **Student ID:** IT23387430
* **Role:** Predictive ML & Full-Stack Integration (Member 4)

---

## 📖 Component Overview
This repository contains the **Predictive Machine Learning Engine and Backend API** component for the **ComfortSense** campus environment intelligence platform. 

While the broader ComfortSense system handles IoT data collection and mobile UI, **this specific component acts as the "brain" of the platform.** It is responsible for processing raw environmental telemetry (CO₂, temperature, humidity, noise), predicting future air quality degradation, calculating Time-to-Threshold (TTT), and quantifying an ASHRAE-standardized Comfort Score using advanced ensemble learning techniques.

---

## ✨ Key Technical Contributions (IT23387430)

### 1. Multi-Output CO₂ Forecasting (XGBoost)
* Designed a `MultiOutputRegressor` wrapped around an `XGBRegressor` to predict CO₂ levels in 5-minute intervals up to 30 minutes into the future.
* Implemented **Absolute Secretion Rate (ASR)** calculations as a dynamic feature engineering step to capture sudden spikes in classroom occupancy.

### 2. Time-to-Threshold (TTT) Engine
* Engineered the logic to calculate the exact Estimated Time of Arrival (ETA) to the **1500 ppm ASHRAE critical danger threshold**.
* Integrated proactive status categorization (`SAFE`, `CONSIDER`, `OPEN SOON`, `CRITICAL`) based on the forecasted TTT.

### 3. Comfort Score Regression (Random Forest)
* Developed a continuous 0-100 Comfort Score model using a `RandomForestRegressor`.
* Reverse-engineered environmental weights based on CO₂ penalties, acoustic disruptions (Ambient vs. Disruptive), and temperature anomalies.

### 4. Hardware Variance Simulation (Gaussian Noise Injection)
* To bridge the gap between clean synthetic baseline data and real-world ESP32 hardware inaccuracies, **Gaussian noise injection** was programmatically added to the training pipelines.
* This prevents artificial 100% accuracy overfitting and ensures the models perform robustly when exposed to live, fluctuating sensor data.

### 5. Backend Integration & API
* Developed the Python backend (FastAPI/Flask) to serialize/deserialize ML models using `joblib`.
* Bridged the Python analytics engine with the React Native frontend and Firebase Firestore, ensuring real-time telemetry is processed and updated efficiently.

---

## 📂 Component Directory Structure

Only the directories and files maintained under this component are highlighted below:

```text
ComfortSense-Analytics/
├── backend/                  # Core Component Directory (IT23387430)
│   ├── core/                 
│   │   ├── model_train_xgboost.py    # XGBoost Forecasting & TTT Logic
│   │   └── model_train_rf.py         # Random Forest Comfort Scoring
│   ├── models/               # Serialized ML artifacts (.pkl)
│   │   ├── xgb_co2_forecast.pkl
│   │   ├── rf_comfort_model.pkl
│   │   └── label_encoder.pkl
│   └── api.py                # REST API serving model inferences
├── data/                     
│   └── processed/            # Cleaned datasets used for model training
└── requirements.txt          # Python dependencies
