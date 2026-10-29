<div align="center">
  
  # 🌿 ComfortSense 
  **IoT-Based Micro-Climate and Study-Comfort Indexing for Academic Spaces**

  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
  [![XGBoost](https://img.shields.io/badge/XGBoost-172434?style=for-the-badge&logo=xgboost&logoColor=white)](#)
  [![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](#)
  [![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](#)

  *A Final Year Research Project by SLIIT Students (Group ID: J26-IT-310)*

</div>

---

## 📖 Research Abstract & Problem Statement
Indoor Environmental Quality (IEQ) encompassing thermal comfort, acoustics, and air quality directly dictates cognitive function, decision-making, and attention spans. This problem severely impacts university students who silently suffer from unrecognized academic fatigue, drowsiness, and reduced knowledge retention due to degrading micro-climates during long lectures. Existing commercial Smart Building Management Systems (BMS) are predominantly engineered for facility energy optimization rather than safeguarding student cognitive performance. They rely on reactive static thresholds (e.g., triggering alerts only after CO₂ hits dangerous levels) and intrusive optical cameras that introduce severe privacy and data-protection violations.

**ComfortSense** proposes a privacy-preserving, IoT-based micro-climate monitoring system using edge computing and context-aware machine learning to quantitatively assess and enhance student concentration in varying academic environments.

### 🌍 Sustainable Development Goals (SDGs)
This problem directly addresses:
* **SDG 3 (Good Health and Well-being):** By proactively preventing toxic CO₂ accumulation to ensure healthy, breathable indoor environments.
* **SDG 4 (Quality Education):** By optimizing physical learning conditions to maximize academic concentration and equitable learning experiences.
* **SDG 9 (Industry, Innovation, and Infrastructure):** By upgrading traditional lecture halls with advanced, privacy-preserving edge-computing IoT architectures.

---

## 👥 Research & Development Team

Developed by the **SST - Software Systems & Technologies** research group at the **Sri Lanka Institute of Information Technology (SLIIT)**:

| Student Name | Student ID | Core Research Component & Novelty |
| :--- | :--- | :--- |
| **K.P.C.L.B. Peellawatta** | IT23347908 | **Privacy-Preserving Thermal Occupancy & Spatial Pattern Analytics:** Interfaces an ESP32-S3 with an MLX90640 far-infrared thermal array. Employs lightweight, deterministic clustering to classify occupancy as "clustered" or "dispersed" guaranteeing privacy-by-design by distinguishing human heat from static electronics at the edge. |
| **E.A.S.N. Dulnara** | IT23416512 | **Dynamic Acoustic Classification Module:** Interfaces an INMP441 digital microphone via I2S to capture audio samples. Extracts acoustic features (MFCCs) to categorize acoustic events (e.g., silence, ambient, disruptive) and generates a ranked quiet-zone recommendation calibrating to each zone's baseline ambient sound profile. |
| **D.M.V.W. Mahakumbura** | IT23321472 | **Predictive Air Quality Intelligence:** Uses a Sensirion SCD40 Photoacoustic NDIR sensor for accurate CO₂ monitoring. Computes an Air Stagnation Rate (ASR) to forecast a 30-minute CO₂ array, deriving a Time-to-Threshold (TTT) metric to shift from passive alerting to proactive, explainable ML-driven ventilation intelligence. |
| **W. A.N. Oshad** | IT23387430 | **Predictive Student Drowsiness Monitoring:** Fuses multiple physical variables (CO₂, acoustics, humidity, spatial mass) into a single predictive machine learning model. Transitions from synthetic datasets to live telemetry to forecast the probability of cognitive decline before it actively disrupts the learning session. |

**Academic Supervisors:**
* **Supervisor:** Ms. Uthpala Samarakoon
* **Co-Supervisor:** Ms. Dinithi Paulimize

---

## 🏗️ System Architecture & Components

The solution employs a dual-microcontroller architecture distributed across edge and cloud layers.

1. **Edge Processing Node:** An ESP32-S3 processes 32x24 thermal matrices using background subtraction, while a standard ESP32 acts as a climate coprocessor gathering accurate NDIR CO₂, Temperature, Humidity, and digital audio.
2. **Cloud/Backend Layer:** Compressed JSON payloads are transmitted via MQTT/HTTP to decentralized time-series databases. A Central Backend API (Python) aligns the data.
3. **AI/ML Prediction Engine:** Combines the Cognitive Stagnation Rate algorithm, Acoustic Restlessness Indexing, and a K-Nearest Neighbors/Random Forest classifier to output structured comfort payloads.
4. **User Applications:** A cross-platform mobile application displaying geospatial heatmaps for students to find quiet spaces, and context-aware alerts (e.g., Exam Mode vs. Lecture) for lecturers.

---

## 🚀 Complete Installation & Setup Guide

### 1. Prerequisites
* **Node.js** (v18.x or higher)
* **Python** (3.9 or higher)
* **Expo CLI:** `npm install -g expo-cli`

### 2. Backend & ML Setup (Python)
Navigate to the backend directory and set up the Python environment.
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install required ML dependencies
pip install pandas numpy scikit-learn xgboost shap joblib flask fastapi

# Train the models (injects simulated sensor variance & generates .pkl files)
python core/model_train_xgboost.py
python core/model_train_rf.py
