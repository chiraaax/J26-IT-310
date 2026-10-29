<div align="center">
  
  # 🧠 ComfortSense: Predictive Student Drowsiness Monitoring & Analytics
  **Final Year Research Project Component - SLIIT**

  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
  [![Scikit-Learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)](#)
  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](#)

</div>

---

## 👤 Component Author
* **Name:** W. A.N. Oshad
* **Student ID:** IT23387430
* **Research Component:** Predictive Student Drowsiness Monitoring and Analytics Platform

---

## 📖 Component Overview
This repository contains the **Predictive Multi-Variant Ensemble Modeling and Student Analytics** component for the **ComfortSense** platform. 

While individual sensors can flag isolated issues (e.g., a room being too hot), human cognitive fatigue is caused by the complex combination of multiple environmental factors. The novelty of this component lies in fusing disparate physical variables—CO₂, acoustic disruption, humidity, and spatial thermal mass—into a single predictive machine learning model. It shifts the system from passive environmental monitoring to **predictive behavioral analytics**, forecasting the probability of cognitive decline and drowsiness before it actively disrupts a learning session.

---

## ✨ Key Research Contributions & Novelty (IT23387430)

### 1. Synchronized Backend Data Pipeline
* Developed a robust backend data pipeline that aggregates disparate telemetry streams (CO₂, noise, headcount, climate) from decentralized IoT nodes into normalized ML feature vectors in real time.

### 2. Synthetic-to-Live Data Strategy
* Utilized Mockaroo to generate synthetic time-series datasets simulating logical environmental degradation patterns (e.g., correlating rising CO₂ with increased acoustic variance).
* Bootstrapped the initial machine learning model with this simulated data prior to physical hardware deployment, ensuring immediate software validation and UI testing.
* Transitioned the validated machine learning model to process live IoT telemetry, dynamically classifying attention levels and predicting drowsiness probability in real time.

### 3. Predictive Multi-Variant Ensemble Modeling
* Engineered the core Machine Learning architecture that fuses multiple physical variables into a unified predictive model.
* Moved beyond reactive thresholds by proactively forecasting the probability of cognitive decline based on combined environmental degradation.

### 4. "Student View" Spatial Dashboard
* Constructed a responsive cross-platform mobile frontend (React Native) serving as the "Student View Dashboard."
* Translated complex unified comfort indices into an intuitive, live 2D spatial map, actively assisting students in identifying optimal, distraction-free study zones across the campus.

### 5. Automated End-to-End Validation Framework
* Architected and executed an automated end-to-end validation framework.
* Rigorously verified data flow synchronicity and prediction accuracy between the Python-based backend ML engine and the React Native mobile frontend application.

---

## 📂 Component Directory Structure

Only the directories and files maintained under this specific component are highlighted below:

```text
ComfortSense-Analytics/
├── backend/                  # Core ML & Backend Directory (IT23387430)
│   ├── core/                 
│   │   ├── pipeline_sync.py          # Aggregates CO2, noise, and climate telemetry
│   │   └── model_train_ensemble.py   # Multi-variant Drowsiness/Attention ML models
│   ├── data_generation/      # Synthetic-to-Live data bootstrapping scripts
│   ├── models/               # Serialized ML artifacts (.pkl)
│   └── api.py                # REST API serving model inferences to the frontend
├── frontend/                 
│   └── src/app/student/      # Student View Dashboard & 2D Spatial Map (React Native)
├── tests/                    # End-to-end validation framework
└── requirements.txt          # Python dependencies
