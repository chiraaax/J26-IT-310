from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import datetime

from core.feature_fusion import process_live_telemetry
from core.model_predict import generate_predictions

app = FastAPI(title="ComfortSense Analytics API")

# Enable CORS so both the Web Browser and iPhone can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the data structure the mobile app will send
class SensorReading(BaseModel):
    timestamp: str
    temperature: float
    humidity: float
    noise: float
    CO2: float
    peopleCount: int

class TelemetryPayload(BaseModel):
    room_id: str
    session_start_time: str
    readings: List[SensorReading]

@app.get("/")
def read_root():
    return {"status": "ComfortSense Predictive Engine is online."}

@app.post("/api/predict")
def predict_comfort(payload: TelemetryPayload):
    # 1. Convert payload to dictionary
    data_list = [reading.dict() for reading in payload.readings]
    
    # 2. Fuse data and engineer features
    feature_vector = process_live_telemetry(data_list, payload.session_start_time)
    
    # 3. Generate predictions
    result = generate_predictions(feature_vector)
    
    return {
        "room_id": payload.room_id,
        "timestamp": str(datetime.datetime.now()),
        "predictions": result
    }