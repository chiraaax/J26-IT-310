<div align="center">
  
  # 🌬️ ComfortSense: Predictive Air Quality Intelligence
  **Final Year Research Project Component - SLIIT**

  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
  [![XGBoost](https://img.shields.io/badge/XGBoost-172434?style=for-the-badge&logo=xgboost&logoColor=white)](#)
  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](#)

</div>

---

## 👤 Component Author
* **Name:** D.M.V.W. Mahakumbura
* **Student ID:** IT23321472
* **Research Component:** Predictive Air Quality Intelligence and Monitoring System

---

## 📖 Component Overview
This repository contains the **Predictive Air Quality Intelligence** component for the ComfortSense platform. 

Unlike commercial systems that passively log CO₂ and alert only after static thresholds are breached, this component introduces a proactive, explainable ML-driven approach. It processes precise telemetry from Photoacoustic NDIR sensors to dynamically compute the Air Stagnation Rate (ASR). By feeding this into an advanced Machine Learning forecasting model, the system predicts future CO₂ accumulation, derives a Time-to-Threshold (TTT) metric, and provides graduated ventilation guidance for lecturers before cognitive fatigue affects the students.

---

## ✨ Key Research Contributions & Novelty (IT23321472)

### 1. Accurate IoT Telemetry Acquisition
* Interfaced an ESP32 microcontroller with a Sensirion SCD40 Photoacoustic NDIR sensor.
* Ensured the acquisition and transmission of accurate, drift-free CO₂, temperature, and humidity telemetry through UART and Wi-Fi communication.

### 2. Time-Series Data Architecture & ASR Algorithm
* Designed and implemented a scalable time-series relational database and secure backend microservices for centralized ingestion and validation of concurrent IoT telemetry.
* Developed a deterministic Air Stagnation Rate (ASR) algorithm to quantify the real-time rate of CO₂ accumulation.

### 3. Automated ML Training Pipeline
* Collected historical session telemetry to construct an automatically labeled training dataset.
* Matched current sensor readings (CO₂, ASR, temperature, humidity, elapsed time) with actual future CO₂ values, requiring zero manual labeling.

### 4. Predictive Forecasting & Explainability
* Trained an ML-based Adaptive CO₂ Forecast Model using Random Forest and XGBoost Regression to predict a 30-minute CO₂ array.
* Derived a Time-to-Threshold (TTT) metric by scanning the forecast for the predicted breach point.
* Built a rule-based Ventilation Recommendation engine to translate ML predictions into actionable guidance.
* Generated explainable feature importance analysis, identifying key contributing factors (e.g., rapid CO₂ increase, elevated humidity) to transform the model from a black-box predictor into an interpretable diagnostic tool.

### 5. Frontend Visualization Dashboard
* Developed a React dashboard dedicated to visualizing air quality metrics.
* Visualized real-time CO₂, ASR trends, the ML forecast graph with highlighted threshold crossings, TTT countdowns, ventilation recommendations, and explainability breakdowns.

---

## 📂 Component Directory Structure

```text
ComfortSense-Analytics/
├── hardware/                 
│   └── scd40_telemetry/      # ESP32 C++ scripts for NDIR sensor interfacing
├── backend/                  
│   ├── microservices/        # Secure ingestion and database validation scripts
│   ├── core/                 
│   │   ├── asr_algorithm.py          # Air Stagnation Rate computation
│   │   ├── model_train_xgboost.py    # 30-min CO2 Forecasting & TTT scanning
│   │   └── explainability.py         # Feature importance & diagnostic tool
├── data/                     
│   └── auto_labeled/         # Automatically labeled training datasets
└── frontend/                 
    └── src/components/       # React components for TTT, Forecast Charts, and Explanations
