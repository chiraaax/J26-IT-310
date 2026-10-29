
<div align="center">
  
  # 🎙️ ComfortSense: Dynamic Acoustic Classification & Monitoring
  **Final Year Research Project Component - SLIIT**

  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
  [![Scikit-Learn](https://img.shields.io/badge/Scikit_Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](#)
  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](#)
  [![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](#)

</div>

---

## 👤 Component Author
* **Name:** E.A.S.N. Dulnara
* **Student ID:** IT23416512
* **Research Component:** Dynamic Acoustic Classification and Monitoring Module

---

## 📖 Component Overview
This repository contains the **Dynamic Acoustic Classification and Monitoring Module** for the ComfortSense platform.

Unlike commercial noise monitors that apply a single, fixed decibel threshold to every room, this component introduces a **Privacy-Preserving, Room-Adaptive ML** approach. It captures audio via an I2S digital microphone, extracts spectral features at the edge, and immediately discards the raw audio to guarantee privacy. A Random Forest classifier evaluates these features relative to each room's unique baseline, producing a continuous Acoustic Disruption Score. This data feeds a real-time ranked quiet-zone recommendation for students, and a live acoustic heatmap for lecturers.

---

## ✨ Key Research Contributions & Novelty (IT23416512)

### 1. Privacy-Preserving Edge Acquisition
* Interfaced an ESP32-C3 microcontroller with an INMP441 I2S digital microphone.
* Extracted 18 key acoustic features (13 MFCCs, ZCR, Spectral Centroid, RMS, Peak) directly on the edge.
* **Novelty:** Raw audio buffers are discarded immediately after feature extraction. No speech or identifiable audio ever leaves the sensor.

### 2. Room-Adaptive Calibration Mechanism
* Implemented a 10-second boot-time calibration phase to establish each zone's baseline ambient sound profile (Mean, Standard Deviation, and 90th-percentile peak).
* Normalized incoming RMS and Peak features relative to the room's baseline (`rms_norm`), ensuring context-fair classification across acoustically diverse environments (e.g., a quiet library vs. a noisy lecture hall).

### 3. Lightweight Machine Learning Classification
* Trained a Random Forest Classifier on **55,000+ labelled acoustic windows** across multiple environments (Library, Study Areas, Lecture Halls).
* Achieved **94.01% overall accuracy** and **86% recall on Disruptive events**, outperforming SVM and KNN baselines.
* Utilized `class_weight='balanced'` to handle dataset imbalances and `np.clip()` to prevent Out-of-Distribution (OOD) errors during live deployment.

### 4. Expected Value Disruption Scoring
* Implemented a continuous risk score (0-100) using the Expected Value of the Random Forest's probability distribution: 
  `Score = (P_silence × 0) + (P_ambient × 50) + (P_disruptive × 100)`.
* This mathematically grounded approach captures model uncertainty, providing the fusion engine with a smooth risk metric rather than a static threshold.

### 5. Real-Time Backend & Cloud Aggregation
* Built a unified Python backend that ingests MQTT telemetry, runs ML inference, and serves a live REST API (Flask).
* Implemented a dual-write Firebase Firestore architecture, saving synchronized 5-second acoustic snapshots into a time-series cloud database for historical analysis and central fusion.

### 6. Hybrid Mobile Visualization
* Developed a React Native (Expo) frontend.
* **Student Dashboard:** Displays a live, ranked quiet-zone recommendation with a "Best Spot Right Now" banner.
* **Lecturer Dashboard:** Displays a live spatial Acoustic Heatmap (Yellow = Silence, Orange = Ambient, Red = Disruptive) to monitor lecture hall engagement in real-time.

---

## 🧠 Machine Learning Pipeline

1. **Data Collection:** Acoustic data was collected across 3 distinct environments using custom Python collection scripts.
2. **Feature Engineering:** Raw audio was converted into an 18-dimensional vector: `[rms_norm, peak_norm, crest, zcr, centroid, mfcc1...mfcc13]`.
3. **Training:** A Random Forest (200 trees) was trained on an 80/20 train-test split using Scikit-Learn.
4. **Inference:** The `acoustic_backend.py` script loads `model.pkl` and `scaler.pkl` to perform real-time predictions at ~150ms latency.

---

## 📂 Component Directory Structure

```text
ComfortSense-Acoustics/
├── hardware/                 
│   ├── zone_a.ino              # ESP32 C++ firmware for Node A
│   └── zone_b.ino              # ESP32 C++ firmware for Node B
├── backend/                  
│   ├── acoustic_backend.py     # Unified MQTT listener, Flask API, and Firebase Sync
│   ├── model.pkl               # Trained Random Forest Classifier
│   ├── scaler.pkl              # Fitted StandardScaler for features
│   └── serviceAccountKey.json  # Firebase Admin SDK credentials
├── data/                     
│   ├── raw_datasets/           # Original labelled CSVs (Library, Study Area, Lecture)
│   ├── all_data_temporal_cleaned.csv # Final training dataset (55k rows)
│   └── training_scripts/       # Python scripts for data cleaning and model training
└── frontend/                 
    └── src/app/student/        # React Native Student Dashboard
    └── src/app/staff/lecturer/ # React Native Lecturer Heatmap Dashboard
```

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10+
* Mosquitto MQTT Broker (`localhost:1883`)
* Firebase Service Account Key

### 1. Start the Acoustic Backend
```bash
cd backend
pip install flask flask-cors paho-mqtt firebase-admin scikit-learn pandas numpy joblib
python acoustic_backend.py
```
*The API will serve live data at `http://localhost:5000/api/zones`*

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Power the Edge Nodes
Flash the ESP32 firmware. Ensure the `MQTT_HOST` IP matches the backend server's IP. Wait 10 seconds for the baseline calibration to complete.

---

## 📊 Firebase Data Schema (Cloud Sync)
Every 5 seconds, the backend pushes a synchronized snapshot to Firestore for the Predictive Fusion Engine:

```json
{
  "timestamp": "2026-10-22T11:36:00.000Z",
  "zone_a": { "label": "ambient", "disruption_score": 48.5, "prob_disruptive": 0.05 },
  "zone_b": { "label": "disruptive", "disruption_score": 88.0, "prob_disruptive": 0.85 }
}
```

## 🤝 Broader Integration
This module provides the **Acoustic Disruption Score**, which acts as one of the three primary inputs to the central predictive fusion engine (Member 4). The dual-write architecture (Live API for students, Firebase for the backend) ensures the system is both highly responsive and historically auditable.

## 📜 License & Copyright
Copyright © 2026. E.A.S.N. Dulnara & Group J26-IT-310. All Rights Reserved.
*Developed for the partial fulfillment of the B.Sc. (Hons) Degree in Information Technology at SLIIT.*
```
