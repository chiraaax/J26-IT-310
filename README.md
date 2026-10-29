<div align="center">

  <!-- Replace 'assets/ComfortSense Logo.jpg' with the actual path where you save the logo image -->
  <img src="assets/ComfortSense Logo.jpg" alt="ComfortSense Technologies Logo" width="450"/>

  <h1>🌿 ComfortSense</h1>
  <h3><b>Team ComfortSense</b></h3>
  <p><i>IoT-Based Micro-Climate and Study-Comfort Indexing for Academic Spaces</i></p>

  [![React Native](https://img.shields.io/badge/React_Native-Expo-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
  [![Scikit-Learn](https://img.shields.io/badge/Scikit_Learn-Random_Forest-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](#)
  [![Flask](https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask&logoColor=white)](#)
  [![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](#)
  [![ESP32](https://img.shields.io/badge/ESP32--C3-Edge_AI-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](#)

  *A Final Year Research Project by SLIIT Students (Group ID: J26-IT-310)*

</div>

---

## 📖 Research Abstract & Problem Statement
Indoor Environmental Quality (IEQ) encompassing thermal comfort, acoustics, and air quality directly dictates cognitive function, decision-making, and attention spans. This problem severely impacts university students who silently suffer from unrecognized academic fatigue, drowsiness, and reduced knowledge retention due to degrading micro-climates during long lectures. Existing commercial Smart Building Management Systems (BMS) are predominantly engineered for facility energy optimization rather than safeguarding student cognitive performance. They rely on reactive static thresholds and intrusive optical cameras that introduce severe privacy violations.

**Team ComfortSense** proposes a privacy-preserving, IoT-based micro-climate monitoring system using edge computing and context-aware machine learning to quantitatively assess and enhance student concentration in varying academic environments.

### 🌍 Sustainable Development Goals (SDGs)
*   **SDG 3 (Good Health and Well-being):** Proactively preventing toxic CO₂ accumulation and acoustic fatigue to ensure healthy, focused indoor environments.
*   **SDG 4 (Quality Education):** Optimizing physical learning conditions to maximize academic concentration.
*   **SDG 9 (Industry, Innovation, and Infrastructure):** Upgrading traditional lecture halls with advanced, privacy-preserving edge-computing IoT architectures.

---

## 👥 Team ComfortSense - Research & Development

Developed by the **SST - Software Systems & Technologies** research group at the **Sri Lanka Institute of Information Technology (SLIIT)**:

| Student Name | Student ID | Core Research Component & Novelty |
| :--- | :--- | :--- |
| **K.P.C.L.B. Peellawatta** | IT23347908 | **Privacy-Preserving Thermal Occupancy:** Interfaces an ESP32-S3 with an MLX90640 thermal array to classify occupancy as "clustered" or "dispersed", guaranteeing privacy-by-design at the edge. |
| **E.A.S.N. Dulnara** | IT23416512 | **Dynamic Acoustic Classification:** Interfaces an INMP441 I2S microphone to extract MFCCs. Employs a **Random Forest Classifier (94.01% accuracy)** to categorize acoustic events and generates a room-adaptive, continuous Disruption Score for quiet-zone ranking. |
| **D.M.V.W. Mahakumbura** | IT23321472 | **Predictive Air Quality Intelligence:** Uses an SCD40 NDIR sensor to compute an Air Stagnation Rate (ASR), forecasting a 30-minute CO₂ array and deriving a Time-to-Threshold (TTT) metric for ventilation guidance. |
| **W. A.N. Oshad** | IT23387430 | **Predictive Student Drowsiness Monitoring:** Fuses multi-variable data (CO₂, acoustics, humidity, spatial mass) into a single predictive ML model to forecast the probability of cognitive decline. |

**Academic Supervisors:**
*   **Supervisor:** Ms. Uthpala Samarakoon
*   **Co-Supervisor:** Ms. Dinithi Paulimize

---

## 🎙️ Deep-Dive: Dynamic Acoustic Module (IT23416512)

> 🔒 **Privacy-by-Design:** Raw audio is NEVER recorded. The ESP32 immediately discards the audio buffer, transmitting only 18 mathematical features.

### 1. Edge Acquisition & Feature Engineering
*   **Hardware:** ESP32-C3 + INMP441 I2S Digital Microphone.
*   **Features Extracted:** 13 MFCCs (Mel-Frequency Cepstral Coefficients), Zero-Crossing Rate (ZCR), Spectral Centroid, RMS, and Peak Amplitude.
*   **Room-Adaptive Calibration:** A 10-second boot-time baseline establishes the room's normal sound profile. Live data is normalized (`rms_norm = (raw_rms - baseline) / std_dev`) ensuring the system works fairly in both quiet libraries and noisy lecture halls.

### 2. Machine Learning Pipeline
*   **Algorithm:** Random Forest Classifier (200 trees, `class_weight='balanced'`).
*   **Training Data:** 55,000+ real-world acoustic windows collected across 3 distinct environments.
*   **Performance:** **94.01% overall accuracy** and **86% recall on disruptive events**.
*   **Continuous Scoring:** Instead of static thresholds, the backend calculates a 0-100 Expected Value Disruption Score: 
    `Score = (P_silence × 0) + (P_ambient × 50) + (P_disruptive × 100)`

### 3. Backend & Cloud Sync
*   **Unified Backend:** A Python Flask server ingests MQTT telemetry, applies the ML model, and serves live data via a REST API (`/api/zones`).
*   **Dual-Write Architecture:** Every 5 seconds, synchronized snapshots of all zones are pushed to **Firebase Firestore** for time-series analysis and integration with the central fusion engine.

---

## 🏗️ System Architecture & Components

The solution employs a distributed edge-to-cloud architecture, utilizing a shared MQTT broker and Firebase database.

1.  **Edge Processing Nodes:** Independent ESP32 modules handle Thermal Occupancy, Air Quality (NDIR), and Acoustic (I2S) data acquisition. Raw data is discarded locally.
2.  **Backend Layer:** A unified Python/FastAPI backend ingests compressed JSON payloads via MQTT, validates the data, and runs it through trained ML models.
3.  **AI/ML Prediction Engine:** Fuses the acoustic disruption scores, CO₂ forecasts, and spatial clustering into a single **Study-Comfort Index**.
4.  **User Applications:** A cross-platform React Native application delivering:
    *   **Student View:** Live ranked quiet-zone recommendations and acoustic heatmaps.
    *   **Lecturer View:** Real-time CO₂ forecasting and acoustic spatial analytics.

---

## 📂 Repository Architecture

```text
ComfortSense-Main/
├── backend/                  
│   ├── api/                  # FastAPI endpoints for frontend communication
│   ├── core/                 # Core ML algorithms (Acoustic, Thermal, Air Quality)
│   │   ├── acoustic_backend.py # Unified MQTT, Flask API, and Firebase Sync (Acoustic)
│   │   ├── model.pkl           # Trained Random Forest (Acoustic)
│   │   ├── scaler.pkl          # Fitted StandardScaler (Acoustic)
│   │   └── scd40_forecast.py   # CO2 Forecasting (Air Quality)
│   ├── requirements.txt      # Unified backend dependencies
│   └── serviceAccountKey.json# Firebase Admin SDK credentials
├── hardware/                 
│   ├── esp32_acoustic/       # Firmware for INMP441 Microphone
│   ├── esp32_thermal/        # Firmware for MLX90640 Thermal Array
│   └── esp32_co2/            # Firmware for SCD40 Sensor
├── frontend/                 
│   ├── src/app/student/      # Student Dashboard (Quiet-Zone Finder, CO2 levels)
│   ├── src/app/staff/        # Lecturer Dashboard (Analytics, Heatmaps)
│   └── package.json          # React Native (Expo) dependencies
└── data/                     
    └── datasets/             # Labelled training data (Acoustic, Thermal, CO2)
```

---

## 🚀 Complete Installation & Setup Guide

### 1. Prerequisites
*   **Node.js** (v18.x or higher)
*   **Python** (3.9 or higher)
*   **Mosquitto MQTT Broker** running on `localhost:1883`
*   **Expo CLI:** `npm install -g expo-cli`

### 2. Backend & ML Setup (Python)
Navigate to the backend directory and set up the Python environment.
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install required ML and Backend dependencies
pip install pandas numpy scikit-learn xgboost shap joblib flask fastapi flask-cors paho-mqtt firebase-admin

# Ensure the machine learning models are trained and saved
python core/model_train_xgboost.py
python core/model_train_rf.py

# Start the unified acoustic backend (Flask + MQTT + Firebase)
python core/acoustic_backend.py
```
*The Acoustic API will serve live data at `http://localhost:5000/api/zones`*

### 3. Frontend Setup (React Native)
Open a new terminal window, navigate to the frontend directory.
```bash
cd frontend
npm install
npm run dev
```
*Scan the Expo QR code with your phone or press `w` to open the web browser.*

### 4. Edge Hardware Deployment
1.  Flash the respective `.ino` files to the ESP32 boards.
2.  Ensure the `MQTT_HOST` IP in the firmware matches the laptop's local IP.
3.  Power on the nodes and wait 10 seconds for baseline calibration to complete.
4.  Open the app to view live telemetry.

---

<div align="center">
  <img src="assets/ComfortSense Logo.jpg" alt="ComfortSense Logo" width="150"/>
  <p><i>Copyright © 2026. Team ComfortSense (Group J26-IT-310). All Rights Reserved.</i></p>
  <p><i>Developed for the partial fulfillment of the B.Sc. (Hons) Degree in Information Technology at SLIIT.</i></p>
</div>
