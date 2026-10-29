# ComfortSense: Predictive Campus Environmental Intelligence Platform 🎓🌡️

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![XGBoost](https://img.shields.io/badge/Machine%20Learning-XGBoost-orange?style=for-the-badge)](https://xgboost.readthedocs.io/)

## 📌 Executive Summary
**ComfortSense** is a comprehensive IoT and Machine Learning platform engineered to optimize university study spaces. By fusing real-time hardware telemetry (CO₂, acoustic disturbance, and thermal metrics) with advanced predictive models, the system actively mitigates student drowsiness and maximizes cognitive performance. It provides actionable, real-time insights to both students seeking optimal study environments and administrators managing campus infrastructure.

## 🚀 System Architecture & Key Features

* **Real-Time IoT Telemetry:** Continuous ingestion of micro-climate data via ESP32 microcontrollers utilizing SCD40 (CO₂) and I2S Acoustic sensors.
* **Predictive ML Engine:** 
  * **XGBoost Multi-Output Regression:** Forecasts CO₂ saturation 30 minutes into the future.
  * **Time-to-Threshold (TTT):** Dynamically calculates the exact ETA until a space breaches ASHRAE critical thresholds (1500 ppm).
* **Acoustic Disturbance Classification:** Real-time audio processing models that categorize spatial noise into *Silence*, *Ambient*, or *Disruptive* states.
* **Role-Based Cross-Platform Applications:**
  * **Student Portal:** Empowers students with live acoustic rankings, predictive comfort indexing, and intelligent space filtering (Available/Crowded).
  * **Admin/Facilities Portal:** Equips campus management with global analytical dashboards, automated HVAC/Ventilation alerts, and full CRUD spatial management.

## 🛠️ Technology Stack
* **Frontend Application:** React Native, Expo, TypeScript, Tailwind CSS (NativeWind).
* **Backend Architecture:** Python (FastAPI / Flask).
* **Database & Cloud:** Firebase (Firestore NoSQL, Authentication).
* **Machine Learning Pipeline:** Scikit-Learn, XGBoost, SHAP for feature explainability, Librosa (Audio processing).
* **Hardware:** ESP32, SCD40 CO₂ Sensors, INMP441 Microphones.

## ⚙️ Installation & Deployment

### Prerequisites
* Node.js & npm (v18+)
* Python (3.9+)
* Expo CLI

### Local Setup
1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/your-org/ComfortSense-Analytics.git](https://github.com/your-org/ComfortSense-Analytics.git)
   cd ComfortSense-Analytics
