import json
import time
import threading
import joblib
import numpy as np
import paho.mqtt.client as mqtt
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime
import warnings
import os

# Firebase Imports
import firebase_admin
from firebase_admin import credentials, firestore

# Hide the scikit-learn parallel processing warnings
warnings.filterwarnings("ignore")

# ---------- CONFIG ----------
BROKER = "localhost"
PORT = 1883
TOPIC_ACOUSTIC = "campus/zones/+/acoustic"
TOPIC_CALIB = "campus/zones/+/calibration"
STALE_AFTER = 3.0
API_PORT = 5000

SCORE_BY_LABEL = {"silence": 0, "ambient": 50, "disruptive": 100}

# ---------- LOAD MODEL ----------
print("[LOAD] Loading Random Forest model...")
model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

if hasattr(model, 'n_jobs'):
    model.n_jobs = 1

try:
    DISRUPTIVE_IDX = list(model.classes_).index("disruptive")
except ValueError:
    DISRUPTIVE_IDX = 2 

# ---------- FIREBASE INITIALIZATION ----------
db = None
SERVICE_ACCOUNT_FILE = "serviceAccountKey.json"

if os.path.exists(SERVICE_ACCOUNT_FILE):
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("[FIREBASE] Initialized successfully. Cloud sync will start.")
    except Exception as e:
        print(f"[FIREBASE] Failed to initialize: {e}")
else:
    print("[FIREBASE] Warning: serviceAccountKey.json not found. Cloud sync is disabled.")

# ---------- SHARED STATE ----------
calibrations = {}
classifications = {}
lock = threading.Lock()

# ---------- FIREBASE SYNC THREAD ----------
def firebase_sync_loop():
    """Runs every 5 seconds to append a combined snapshot of all zones."""
    if not db:
        return
        
    while True:
        time.sleep(5)
        
        with lock:
            snap = dict(classifications)
            
        if not snap:
            continue

        try:
            # Create a combined document for this 5-second interval
            sync_data = {
                "timestamp": datetime.now().isoformat()
            }
            
            has_fresh_data = False
            
            for zone_id, (payload, ts) in snap.items():
                # Ignore data older than 10 seconds (ESP32 disconnected)
                if time.time() - ts > 10:
                    continue 
                
                has_fresh_data = True
                
                # Add the zone's data inside the snapshot document
                sync_data[zone_id] = {
                    "label": payload["label"],
                    "confidence": payload["confidence"],
                    "disruption_score": payload["disruption_score"],
                    "prob_disruptive": payload["prob_disruptive"],
                    "rms_norm": payload["rms_norm"],
                    "rms_raw": payload["rms_raw"],
                    "baseline_rms": payload["baseline_rms"]
                }
                
            if has_fresh_data:
                # Generate a unique ID for this snapshot based on time
                doc_id = f"snapshot_{int(time.time() * 1000)}"
                db.collection("acoustic_snapshots").document(doc_id).set(sync_data)
                print(f"[FIREBASE] Saved combined snapshot at {datetime.now().strftime('%H:%M:%S')}")
            
        except Exception as e:
            print(f"[FIREBASE ERROR] Could not sync to cloud: {e}")

# ---------- MQTT LOGIC ----------
def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] connected (rc={rc})")
    client.subscribe(TOPIC_ACOUSTIC)
    client.subscribe(TOPIC_CALIB)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        zone = data.get("zone_id")
        
        if msg.topic.endswith("/calibration"):
            with lock:
                calibrations[zone] = data
            print(f"[CALIB] {zone} baseline={data.get('baseline_rms'):.1f}")
            return
            
        with lock:
            cal = calibrations.get(zone)
        if cal is None: return

        rms = float(data.get("rms", 0))
        peak = float(data.get("peak", 0))
        zcr = float(data.get("zcr", 0))
        cen = float(data.get("centroid", 0))
        
        baseline_rms = float(cal.get("baseline_rms", 0))
        rms_std = max(float(cal.get("rms_std", 1)), 1.0)
        p90_peak = max(float(cal.get("p90_peak", 1)), 1.0)

        rms_norm_raw = (rms - baseline_rms) / rms_std
        peak_norm_raw = peak / p90_peak
        crest = min(peak / rms, 15.0) if rms > 0 else 0.0

        rms_norm = np.clip(rms_norm_raw, -3.0, 10.0)
        peak_norm = np.clip(peak_norm_raw, 0.0, 5.0)

        features = np.array([[
            rms_norm, peak_norm, crest, zcr, cen, 
            *[float(m) for m in data.get("mfcc", [])]
        ]])
        
        features_s = scaler.transform(features)
        label = model.predict(features_s)[0]
        proba = model.predict_proba(features_s)[0]
        
        prob_disruptive = float(proba[DISRUPTIVE_IDX])
        
        payload = {
            "zone_id": zone,
            "label": label,
            "confidence": float(np.max(proba)),
            "disruption_score": SCORE_BY_LABEL.get(label, 0),
            "rms_norm": round(rms_norm, 3),
            "prob_disruptive": round(prob_disruptive, 3),
            "rms_raw": round(rms, 2),
            "baseline_rms": round(baseline_rms, 2),
            "probabilities": {cls: round(float(p), 3) for cls, p in zip(model.classes_, proba)}
        }
        
        with lock:
            classifications[zone] = (payload, time.time())
            
    except Exception as e:
        print(f"[ERROR] {e}")

def start_mqtt():
    client = mqtt.Client(client_id="combined-backend")
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER, PORT, keepalive=30)
    client.loop_start()

# ---------- FLASK REST API ----------
app = Flask(__name__)
CORS(app)

@app.route("/api/zones", methods=["GET"])
def get_zones():
    now = time.time()
    with lock:
        snap = dict(classifications)

    online = [data for data, ts in snap.values() if now - ts < STALE_AFTER]
    online.sort(key=lambda x: x["disruption_score"])
    
    for i, e in enumerate(online, 1):
        e["rank"] = i

    return jsonify({
        "count": len(online),
        "zones": online,
        "quietest_zone": online[0]["zone_id"] if online else None,
    })

# ---------- MAIN ----------
if __name__ == "__main__":
    start_mqtt()
    
    if db:
        sync_thread = threading.Thread(target=firebase_sync_loop, daemon=True)
        sync_thread.start()

    print(f"[RUN] Combined Acoustic Backend running on port {API_PORT}")
    app.run(host="0.0.0.0", port=API_PORT, debug=False, threaded=True)