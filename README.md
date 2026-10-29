<div align="center">
  
  # 🌿 ComfortSense 
  **Predictive Campus Environment Intelligence & Drowsiness Analytics**

  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
  [![XGBoost](https://img.shields.io/badge/XGBoost-172434?style=for-the-badge&logo=xgboost&logoColor=white)](#)
  [![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](#)
  [![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](#)

</div>

---

## 📖 Project Overview & Purpose
**ComfortSense** is a cutting-edge IoT and Machine Learning platform designed to monitor, predict, and optimize Indoor Environmental Quality (IEQ) across university campuses. Poor air quality, high temperatures, and acoustic disruptions directly contribute to student cognitive fatigue and drowsiness. 

Our core purpose is to transform passive campus infrastructure into an **intelligent, proactive ecosystem**. By fusing real-time telemetry (CO₂, temperature, humidity, acoustic noise) via ESP32 hardware with advanced predictive models (XGBoost & Random Forest), ComfortSense calculates accurate **Time-to-Threshold (TTT)** metrics and **Comfort Scores**. It provides students with live study-zone recommendations and alerts facility managers before environments become critical, ensuring optimal conditions for academic success.

---

## 👥 Team & Contributions

This project was brought to life by a dedicated 4-member undergraduate research and development team at SLIIT:

| Member Name | Core Responsibility | Contribution Highlights |
| :--- | :--- | :--- |
| **WEERASEKARA W.M.P.K.** | **Frontend UI/UX & Mobile Dev** | Architected the cross-platform React Native (Expo) interfaces. Built the real-time Student Spaces dashboard, interactive charts, and role-based navigation systems. |
| **DULNARA E.A.S.N.** | **Cloud Infrastructure & Backend** | Managed Firebase Firestore schema design, real-time data synchronization (`onSnapshot`), and secure authentication protocols for Admin and Student portals. |
| **RUPASINGHE D.N.A.** | **IoT & Sensor Engineering** | Spearheaded hardware prototyping using ESP32 microcontrollers, SCD40 sensors, and acoustic telemetry. Calibrated data transmission to the cloud. |
| **Wanniarachchige Nethna Oshad** | **Predictive ML & Full-Stack Integration** | Developed the core ML engine. Engineered the 30-minute CO₂ forecasting (XGBoost), Comfort Score regression (Random Forest), TTT logic, and bridged Python APIs with the React Native frontend. |

---

## 🏗️ System Architecture & Code Structure

The repository follows a clean, modular monorepo structure separating the ML backend, mobile frontend, and raw data pipelines.

```text
ComfortSense-Analytics/
├── backend/                  # Python Predictive Analytics & APIs
│   ├── core/                 
│   │   ├── model_train_xgboost.py    # Multi-output XGBoost for CO2 forecasting & TTT
│   │   └── model_train_rf.py         # Random Forest for Comfort Score & Attention
│   ├── models/               # Serialized ML models (.pkl) and Encoders
│   └── api.py                # FastAPI/Flask endpoints for live Acoustic/ML inference
├── frontend/                 # React Native (Expo) Mobile Application
│   ├── src/
│   │   ├── app/              # File-based routing (Expo Router)
│   │   │   ├── admin/        # Staff/Admin analytics, CRUD for spaces, alerts
│   │   │   └── student/      # Student dashboard, live acoustic ranking, voting
│   │   ├── components/       # Reusable UI widgets (AcousticZoneCard, Charts)
│   │   └── config/           # Firebase initialization (firebase.ts)
├── data/                     # Data Lake & Preprocessing
│   ├── raw/                  # Raw ESP32 telemetry CSVs
│   └── processed/            # Cleaned data for ML training
├── hardware/                 # C++/Arduino scripts for ESP32 & SCD40
└── .gitignore                # Environment, keys
