# Predictive Student Drowsiness Monitoring & Analytics Platform (ComfortSense) 🎓🌡️

## 📌 Project Overview
ComfortSense is an advanced IoT-driven campus environmental monitoring system designed to optimize study spaces and prevent student drowsiness. By fusing telemetry data (CO₂, acoustic noise, thermal occupancy, and micro-climate) with Machine Learning models (Random Forest, XGBoost), the system provides real-time comfort indexing, 30-minute predictive forecasting, and automated administrative alerts.

## 🚀 Key Features
* **Live Environmental Telemetry:** Real-time sync of CO₂, Temperature, Humidity, and Acoustic data via ESP32 microcontrollers.
* **Predictive ML Analytics:** XGBoost multi-output regression for 30-minute CO₂ forecasting and Time-to-Threshold (TTT) calculations.
* **Acoustic Disturbance Classification:** Real-time audio analysis classifying study zones into silence, ambient, or disruptive.
* **Role-Based Portals (React Native):** 
  * **Student Portal:** Discover optimal study spaces, live acoustic rankings, and environmental warnings.
  * **Admin/Staff Portal:** Campus-wide analytics, CRUD space management, and automated HVAC/Ventilation alerts.

## 🛠️ Technology Stack
* **Frontend:** React Native (Expo), TypeScript, Tailwind CSS (NativeWind)
* **Backend:** Python (FastAPI / Flask)
* **Database:** Firebase (Firestore & Authentication)
* **Machine Learning:** Scikit-Learn, XGBoost, SHAP
* **Hardware/IoT:** ESP32, SCD40 CO₂ Sensors, I2S Microphones

## ⚙️ Installation & Setup
1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/your-org/ComfortSense-Analytics.git](https://github.com/your-org/ComfortSense-Analytics.git)
   cd ComfortSense-Analytics
