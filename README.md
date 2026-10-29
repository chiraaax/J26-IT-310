<div align="center">
  
  <h1>🛡️ ComfortSense: Privacy-Preserving Thermal Occupancy</h1>
  <p><b>Final Year Research Component - SLIIT</b></p>

  [![C++](https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)](#)
  [![ESP32-S3](https://img.shields.io/badge/ESP32--S3-Edge_AI-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](#)
  [![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](#)
  [![React Native](https://img.shields.io/badge/React_Native-Expo-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![MQTT](https://img.shields.io/badge/MQTT-Protocol-660066?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white)](#)

  <p><i>Replacing intrusive CCTV and flawed PIR sensors with 100% anonymous, edge-computed thermal intelligence.</i></p>
</div>

---

<details>
<summary>📑 <b>Table of Contents</b> (Click to expand)</summary>

1. [Component Author](#-component-author)
2. [Component Overview](#-component-overview)
3. [Key Research Contributions](#-key-research-contributions)
4. [System Architecture](#-system-architecture)
5. [The SHIA Algorithm](#-the-shia-algorithm)
6. [Component Directory Structure](#-component-directory-structure)
7. [Getting Started](#-getting-started)
8. [MQTT JSON Payload Schema](#-mqtt-json-payload-schema)
9. [Broader Integration](#-broader-integration)

</details>

---

## 👤 Component Author
<table>
  <tr>
    <td><b>Name</b></td>
    <td>K.P.C.L.B. Peellawatta</td>
  </tr>
  <tr>
    <td><b>Student ID</b></td>
    <td>IT23347908</td>
  </tr>
  <tr>
    <td><b>Research Component</b></td>
    <td>Privacy-Preserving Thermal Occupancy & Spatial Pattern Analytics</td>
  </tr>
</table>

---

## 📖 Component Overview
This repository contains the **Thermal Occupancy & Spatial Pattern Analytics Module** for the ComfortSense platform. 

Traditional academic spaces use optical cameras (which violate privacy) or PIR sensors (which fail when students sit perfectly still). This component solves both issues by utilizing an **MLX90640 Far-Infrared Thermal Array** paired with an **ESP32-S3**. By executing the **Stationary Human Isolation Algorithm (SHIA)** directly at the edge, the system detects stationary humans, filters out inanimate heat sources (like laptops or coffee cups), and maps their geometric distribution.

> 🔒 **Privacy-by-Design:** No raw thermal frames, visual data, or identifiable biometrics ever leave the ESP32 edge node. Only anonymized X/Y coordinates and compressed thermal grids are transmitted over MQTT.

---

## ✨ Key Research Contributions

| # | Contribution | Description |
| :--- | :--- | :--- |
| **1** | **Edge-Level Thermal Management** | Interfaced an MLX90640 32x24 far-infrared array with an ESP32-S3. Processes matrices locally to maintain an edge latency of <500ms per frame. |
| **2** | **Stationary Human Isolation Algorithm (SHIA)** | A novel 4-gate deterministic edge filter that differentiates human thermal mass from static electronics (laptops/radiators) using Size, Absolute Temp, Temporal Variance, and Aspect Ratio. |
| **3** | **Adaptive Environmental Calibration** | Dynamically recalculates the thermal baseline using Median and MAD (Median Absolute Deviation) to prevent false negatives in fluctuating ambient room temperatures. |
| **4** | **Deterministic Spatial Clustering** | Analyzes the geometric proximity of detected human blobs to autonomously classify real-time room layouts as either "Clustered" or "Dispersed". |
| **5** | **Context-Aware Dual-Mode Mapping** | Implements a rule-based evaluation engine: **Lecture Hall Mode** (detects back-row clustering as a disengagement proxy) and **Study Zone Mode** (maps a 4x3 grid into `solo_ok`, `group_ok`, or `full` zones). |
| **6** | **Real-Time Spatial Visualization** | Developed a React Native dashboard featuring a live Thermal Heatmap and a 2D Spatial Occupancy Map driven by live MQTT telemetry. |

---

## 🏗️ System Architecture

The module operates on a lightweight, three-tier Edge-to-Cloud architecture to ensure privacy and low latency.

```text
[ MLX90640 Far-Infrared Array ]
       │ (I2C @ 400kHz)
       ▼
[ ESP32-S3 Edge Node ] ──(SHIA Algorithm & Clustering)──> [ Compressed JSON ]
       │                                                        │
       │ (Wi-Fi / MQTT)                                         │ 
       ▼                                                        ▼
[ React Native Frontend ] <──(HTTP/JSON Polling)── [ Python FastAPI Bridge ]
```

1. **Tier 1 (Edge):** The ESP32-S3 acquires 32x24 thermal matrices, applies the SHIA algorithm, and drops all raw frames from memory.
2. **Tier 2 (Bridge):** A Python FastAPI server listens to the MQTT broker and caches the latest payload.
3. **Tier 3 (UI):** The React Native mobile app polls the FastAPI bridge to render real-time heatmaps and spatial maps.

---

## 🧠 The SHIA Algorithm Architecture

To prevent a hot laptop from being counted as a human, every detected thermal blob must pass **all four** deterministic gates at the edge:

<details>
<summary><b>Gate 1: Morphological Filter (Size & Aspect)</b></summary>

*   **Size:** Blob must be between 15 and 400 pixels.
*   **Aspect:** Ratio must be between 0.30 and 3.30 to reject ultra-thin or ultra-wide surfaces (like radiators or cables).
</details>

<details>
<summary><b>Gate 2: Absolute Thermal Bounds</b></summary>

*   **Temp Max Cap:** Any pixel > 37°C instantly rejects the blob (kills ceiling lights and heaters).
*   **Avg Temp:** Must fall between 30°C and 36°C (Human physiological bounds).
</details>

<details>
<summary><b>Gate 3: Temporal Variance (The Secret Sauce)</b></summary>

*   The ESP32 tracks micro-movements (breathing/fidgeting) using an Exponential Moving Average (EMA) of the variance.
*   A truly frozen laptop has a variance of `0.000`. A living human has a variance typically between `0.03` and `1.50`. 
*   If a blob is perfectly static, it is rejected as an inanimate object.
</details>

---

## 📂 Component Directory Structure

```text
ComfortSense-Thermal/
├── firmware/                 
│   └── thermal_node.ino        # ESP32-S3 C++ firmware (SHIA & MQTT)
├── backend/                  
│   ├── main.py                 # FastAPI bridge (MQTT to HTTP/WebSockets)
│   ├── requirements.txt        # Python dependencies (paho-mqtt, fastapi)
│   └── core/                   # Backend integration logic
├── frontend/                 
│   ├── components/
│   │   ├── ThermalHeatmap.tsx        # 6x8 visual heat grid component
│   │   └── SpatialOccupancyMap.tsx   # 32x24 coordinate dot map
│   └── app/student/            # Room telemetry screen ([room].tsx)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
* Arduino IDE (with ESP32 Board Manager)
* Python 3.10+
* Node.js (for React Native/Expo)
* Public MQTT Broker (e.g., `broker.hivemq.com`)

### 1. Flash the ESP32 Edge Node
1. Open `firmware/thermal_node.ino` in the Arduino IDE.
2. Update the `ssid`, `password`, and `mqtt_server` variables.
3. Flash to the ESP32-S3.
4. Open the Serial Monitor (115200 baud). 
   * *Tip: Type `1` in the terminal for **Lecture Hall Mode**, or `2` for **Study Zone Mode**.*

### 2. Start the Python Bridge
The backend listens to the MQTT topic and serves the data to the React Native app.
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Start the Frontend
```bash
cd frontend
npm install
npx expo start
# Press 'w' to open in web browser, or scan QR with Expo Go
```

---

## 📊 MQTT JSON Payload Schema
Every second, the ESP32 publishes a lightweight, privacy-preserving JSON payload to `comfortsense/zone_a/spatial`:

```json
{
  "node_id": "Zone_A",
  "headcount": 2,
  "layout": "Clustered",
  "ambient_c": 31.5,
  "mode": "lecture",
  "coordinates": [
    { "x": 12.0, "y": 9.5 },
    { "x": 13.5, "y": 14.0 }
  ],
  "thermal_grid": [
    [31.2, 31.5, 32.0, 34.5, 34.6, 32.1, 31.0, 30.8],
    [31.1, 31.4, 33.2, 35.1, 35.0, 33.0, 31.2, 30.9]
  ],
  "seating": {
    "back_fraction": 1.0,
    "back_row_flag": true
  }
}
```
*(Note: The `subzones` array replaces `seating` when the node is switched to Study Zone Mode).*

---

## 🤝 Broader Integration
This module provides the **Spatial Occupancy Data** and **Thermal Heatmaps**, which act as the foundational spatial awareness layer for the central ComfortSense platform. The `headcount` and `subzones` payloads are consumed by Member 4's Predictive Fusion Engine to correlate physical crowding with localized CO₂ spikes and acoustic variance.

---

<div align="center">
  <p><i>Copyright © 2026. K.P.C.L.B. Peellawatta & Group J26-IT-310. All Rights Reserved.</i></p>
  <p><i>Developed for the partial fulfillment of the B.Sc. (Hons) Degree in Information Technology at SLIIT.</i></p>
</div>
