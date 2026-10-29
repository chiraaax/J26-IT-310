<div align="center">
  
  # 📱 ComfortSense: Mobile Application & UI/UX Component
  **Final Year Research Project Component - SLIIT**

  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](#)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
  [![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](#)

</div>

---

## 👤 Component Author
* **Name:** [Member Name - e.g., WEERASEKARA W.M.P.K.]
* **Student ID:** IT23321472
* **Role:** Frontend UI/UX & Mobile Development

---

## 📖 Component Overview
This repository contains the **Mobile Application and Frontend UI/UX** component for the **ComfortSense** campus environment intelligence platform. 

This component serves as the primary user interface for both students and university administrators. It is engineered using **React Native (Expo)** to provide a seamless, cross-platform experience. It connects directly to Firebase Firestore for real-time telemetry updates and visualizes complex Machine Learning data (Time-to-Threshold, Comfort Scores, and Acoustic Rankings) into intuitive, actionable mobile dashboards.

---

## ✨ Key Technical Contributions (IT23321472)

### 1. Dual-Role Mobile Architecture
* Engineered a scalable file-based routing system using **Expo Router**.
* Developed completely distinct UI flows and navigation structures for **Public Students** (no-login required) and **Authenticated Admins/Lecturers**.

### 2. Real-Time Telemetry Visualization
* Integrated dynamic Line Charts (`react-native-chart-kit`) to visualize the **40-Minute Environmental Trajectory** (combining historical CO₂ data with XGBoost predictive forecasts).
* Designed the **Live Acoustic Ranking** horizontal scroller, dynamically mapping JSON telemetry into distinct visual cards (e.g., Silence, Ambient, Disruptive).

### 3. State Management & Real-time DB Integration
* Implemented real-time listener
