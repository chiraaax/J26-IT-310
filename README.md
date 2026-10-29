<div align="center">
  
  <h1>🎙️ ComfortSense: Dynamic Acoustic Intelligence</h1>
  <p><b>Final Year Research Component - SLIIT</b></p>

  [![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
  [![Scikit-Learn](https://img.shields.io/badge/Scikit_Learn-1.3+-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](#)
  [![Flask](https://img.shields.io/badge/Flask-2.0+-000000?style=for-the-badge&logo=flask&logoColor=white)](#)
  [![React Native](https://img.shields.io/badge/React_Native-Expo-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![ESP32](https://img.shields.io/badge/ESP32--C3-Edge_AI-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](#)
  [![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](#)

  <p><i>Room-Adaptive, Privacy-Preserving Acoustic Classification for Academic Spaces</i></p>
</div>

---

<details>
<summary>📑 <b>Table of Contents</b> (Click to expand)</summary>

1. [Component Author](#-component-author)
2. [Component Overview](#-component-overview)
3. [Key Research Contributions](#-key-research-contributions)
4. [Machine Learning Pipeline](#-machine-learning-pipeline)
5. [Directory Structure](#-component-directory-structure)
6. [Getting Started](#-getting-started)
7. [Firebase Data Schema](#-firebase-data-schema)
8. [Broader Integration](#-broader-integration)

</details>

---

## 👤 Component Author
<table>
  <tr>
    <td><b>Name</b></td>
    <td>E.A.S.N. Dulnara</td>
  </tr>
  <tr>
    <td><b>Student ID</b></td>
    <td>IT23416512</td>
  </tr>
  <tr>
    <td><b>Research Component</b></td>
    <td>Dynamic Acoustic Classification and Monitoring Module</td>
  </tr>
</table>

---

## 📖 Component Overview
This repository contains the **Dynamic Acoustic Classification and Monitoring Module** for the ComfortSense platform. 

Unlike commercial noise monitors that apply a single, fixed decibel threshold to every room, this component introduces a **Privacy-Preserving, Room-Adaptive ML** approach. It captures audio via an I2S digital microphone, extracts spectral features at the edge, and immediately discards the raw audio to guarantee privacy. A Random Forest classifier evaluates these features relative to each room's unique baseline, producing a continuous Acoustic Disruption Score. This data feeds a real-time ranked quiet-zone recommendation for students, and a live acoustic heatmap for lecturers.

> 🔒 **Privacy-by-Design:** Raw audio is NEVER stored or transmitted. Only 18 mathematical features leave the ESP32 edge node.

---

## ✨ Key Research Contributions

| # | Contribution | Description |
| :--- | :--- | :--- |
| **1** | **Privacy-Preserving Edge Acquisition** | Interfaced ESP32-C3 with INMP441 I2S mic. Extracted 13 MFCCs, ZCR, Spectral Centroid, RMS, and Peak directly on the edge. Raw audio is discarded instantly. |
| **2** | **Room-Adaptive Calibration** | Implemented a 10-second boot-time calibration to establish each zone's baseline (Mean, Std Dev, P90 Peak). Incoming features are normalized relative to the room, ensuring fairness across quiet and noisy spaces. |
| **3** | **Lightweight ML Classifier** | Trained a Random Forest (200 trees) on 55,000+ real-world acoustic windows. Achieved **94.01% accuracy** and **86% disruptive recall**, outperforming SVM and KNN. |
| **4** | **Expected Value Disruption Score** | Calculates a continuous 0-100 risk score using probability weighting: `(P_silence × 0) + (P_ambient × 50) + (P_disruptive × 100)`. |
| **5** | **Real-Time Backend & Cloud Aggregation** | Unified Flask backend processes MQTT telemetry and syncs time-aligned snapshots (both zones combined) to Firebase Firestore every 5 seconds. |
| **6** | **Hybrid Mobile Visualization** | React Native (Expo) app featuring a **Student Dashboard** (ranked quiet-zone finder) and a **Lecturer Dashboard** (live spatial acoustic heatmap). |

---

## 🧠 Machine Learning Pipeline

<details>
<summary><b>1. Feature Engineering (18 Dimensions)</b></summary>

*   **Amplitude Features:** `rms`, `peak`, `crest` (Peak/RMS for impulsiveness).
*   **Spectral Features:** `zcr` (Zero-Crossing Rate), `centroid` (Spectral Brightness).
*   **Timbre Features:** `mfcc1` to `mfcc13` (Mel-Frequency Cepstral Coefficients).
*   **Room-Adaptive Normalization:** `rms_norm = (raw_rms - baseline_rms) / rms_std`.
</details>

<details>
<summary><b>2. Classification Model (Random Forest)</b></summary>

*   **Algorithm:** Random Forest Classifier (`n_estimators=200`, `class_weight='balanced'`).
*   **Training Data:** 55,000+ labelled rows across Library, Study Area, and Lecture Hall.
*   **Why Random Forest?** Robust to outliers, fast inference time (<30ms), and provides native feature importance (MFCC1 was the highest weighted feature).
</details>

<details>
<summary><b>3. Continuous Scoring & Inference</b></summary>

*   **Out-of-Distribution (OOD) Fix:** Features are clipped (`np.clip`) to the bounds seen during training to prevent confidence collapse.
*   **Expected Value:** The backend calculates a smooth 0-100 score rather than a static threshold, providing high precision for the Fusion Engine.
</details>

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
Every 5 seconds, the backend pushes a **synchronized snapshot** to Firestore. This provides a perfect time-aligned row containing both Zone A and Zone B data for the Predictive Fusion Engine:

```json
{
  "timestamp": "2026-10-22T11:36:00.000Z",
  "zone_a": {
    "label": "ambient",
    "confidence": 0.92,
    "disruption_score": 48.5,
    "prob_disruptive": 0.05,
    "rms_norm": 1.2
  },
  "zone_b": {
    "label": "disruptive",
    "confidence": 0.88,
    "disruption_score": 88.0,
    "prob_disruptive": 0.85,
    "rms_norm": 4.5
  }
}
```

---

## 🤝 Broader Integration
This module provides the **Acoustic Disruption Score**, which acts as one of the three primary inputs to the central predictive fusion engine (Member 4). The dual-write architecture (Live API for students, Firebase for the backend) ensures the system is both highly responsive and historically auditable.

---

<div align="center">
  <p><i>Copyright © 2026. E.A.S.N. Dulnara & Group J26-IT-310. All Rights Reserved.</i></p>
  <p><i>Developed for the partial fulfillment of the B.Sc. (Hons) Degree in Information Technology at SLIIT.</i></p>
</div>
