import json
import time
import threading
from datetime import datetime
from flask import Flask, jsonify
from flask_cors import CORS
import paho.mqtt.client as mqtt

# ---------- CONFIG ----------
BROKER       = "localhost"
PORT         = 1883
TOPIC_CLASS  = "campus/zones/+/classification"
STALE_AFTER  = 3.0        # seconds
API_HOST     = "0.0.0.0"  # listen on all interfaces (so phone can reach it)
API_PORT     = 5000

# ---------- STATE ----------
latest = {}               # zone_id -> (payload, timestamp)
lock   = threading.Lock()
start_time = time.time()

# ---------- FLASK APP ----------
app = Flask(__name__)
CORS(app)   # allow cross-origin requests (needed for React Native Web)

# ---------- MQTT ----------
def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] connected (rc={rc}). Subscribing to {TOPIC_CLASS}")
    client.subscribe(TOPIC_CLASS)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        zone = data.get("zone_id", "unknown")
        with lock:
            latest[zone] = (data, time.time())
    except Exception as e:
        print(f"[error] {e}")

mqtt_client = mqtt.Client(client_id="rest-api-bridge")
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.connect(BROKER, PORT, keepalive=30)
mqtt_client.loop_start()

# ---------- ENDPOINTS ----------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status":    "ok",
        "uptime_s":  round(time.time() - start_time, 1),
        "zones":     list(latest.keys()),
        "server_time": datetime.now().isoformat(),
    })

@app.route("/api/zones", methods=["GET"])
def get_zones():
    now = time.time()
    with lock:
        snap = dict(latest)

    online = []
    stale  = []

    for zone, (data, ts) in snap.items():
        age = now - ts
        entry = {
            "zone_id":           zone,
            "label":             data.get("label", "unknown"),
            "confidence":        data.get("confidence", 0),
            "disruption_score":  data.get("disruption_score", 0),
            "rms_norm":          data.get("rms_norm", 0),
            "probabilities":     data.get("probabilities", {}),
            "age_ms":            int(age * 1000),
        }
        if age < STALE_AFTER:
            online.append(entry)
        else:
            entry["stale_for_s"] = round(age, 1)
            stale.append(entry)

    # Rank by disruption score ascending (quietest first)
    online.sort(key=lambda x: x["disruption_score"])

    # Add rank position
    for i, e in enumerate(online, 1):
        e["rank"] = i

    return jsonify({
        "server_time":     datetime.now().isoformat(),
        "count":           len(online),
        "zones":           online,
        "stale_zones":     stale,
        "quietest_zone":   online[0]["zone_id"] if online else None,
    })

# ---------- MAIN ----------
if __name__ == "__main__":
    print("=" * 60)
    print("REST API SERVER STARTING")
    print("=" * 60)
    print(f"  MQTT broker  : {BROKER}:{PORT}")
    print(f"  Listening on : http://{API_HOST}:{API_PORT}")
    print(f"  Endpoints    :")
    print(f"    GET /api/health")
    print(f"    GET /api/zones")
    print()
    print("Test from browser: http://localhost:5000/api/zones")
    print()

    try:
        app.run(host=API_HOST, port=API_PORT, debug=False, threaded=True)
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()