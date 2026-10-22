from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import datetime
import joblib
import pandas as pd
import os
import firebase_admin
from firebase_admin import credentials, firestore

# --- 1. Firebase Setup ---
try:
    cred = credentials.Certificate("firebase-service-account.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print("Firebase Error: කරුණාකර JSON file එක නිවැරදිව දමා ඇතිදැයි බලන්න.", e)

# --- 2. Load XGBoost Model ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'xgb_co2_forecast.pkl')
try:
    xgb_model = joblib.load(MODEL_PATH)
except Exception as e:
    print("Model Error: Model එක සොයාගත නොහැක.", e)
    xgb_model = None

app = FastAPI(title="ComfortSense Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ESP32 එකෙන් එන දත්ත ලබාගන්නා ආකෘතිය
class SensorReading(BaseModel):
    space_id: str
    temperature: float
    humidity: float
    co2: float
    asr: float

@app.get("/")
def read_root():
    return {"status": "ComfortSense Predictive Engine is online."}

# ESP32 එකෙන් එන Live Data භාරගන්නා Endpoint එක
@app.post("/api/sensor-data")
def receive_sensor_data(data: SensorReading):
    if xgb_model is None:
        raise HTTPException(status_code=500, detail="Model is not loaded.")
        
    try:
        # 1. Model එකට දත්ත යැවීමට සකස් කිරීම
        input_features = pd.DataFrame([{
            'CO2_ppm': data.co2,
            'Temperature_C': data.temperature,
            'Humidity_RH': data.humidity,
            'ASR_Calculated': data.asr
        }])

        # 2. අනාගත CO2 අගයන් Predict කිරීම (විනාඩි 30)
        forecast = xgb_model.predict(input_features)[0]
        future_steps = [5, 10, 15, 20, 25, 30]
        
        # 3. Time-to-Threshold (TTT) සහ Status ගණනය කිරීම
        THRESHOLD = 1000
        ttt = "> 30"
        status = "SAFE"
        for time_step, val in zip(future_steps, forecast):
            if val >= THRESHOLD:
                ttt = str(time_step)
                break
                
        if ttt != "> 30":
            t_val = int(ttt)
            if t_val <= 5: status = "CRITICAL"
            elif t_val <= 10: status = "OPEN SOON"
            elif t_val <= 20: status = "CONSIDER"
            else: status = "SAFE"

        # 4.1 Firebase: අතීත දත්ත ගබඩා කිරීම (Table View සහ Charts සඳහා)
        history_data = {
            'space_id': data.space_id,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'co2': data.co2,
            'temperature': data.temperature,
            'humidity': data.humidity,
            'asr': data.asr,
            'ttt_minutes': ttt,
            'status': status
        }
        db.collection('co2_history').add(history_data)

        # 4.2 Firebase: සජීවී දත්ත යාවත්කාලීන කිරීම (Live Dashboard එක සඳහා)
        doc_ref = db.collection('spaces').document(data.space_id)
        live_data = {
            'lastUpdated': firestore.SERVER_TIMESTAMP,
            'current_co2': data.co2,
            'current_temp': data.temperature,
            'current_hum': data.humidity,
            'asr': data.asr,
            'ttt_minutes': ttt,
            'status': status,
            'forecast_array': [float(val) for val in forecast]
        }
        doc_ref.set(live_data, merge=True)

        return {"message": "Live and History Data Saved Successfully", "status": status, "ttt": ttt}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))