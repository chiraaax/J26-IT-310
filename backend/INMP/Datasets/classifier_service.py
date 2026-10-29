import json
import time
import threading
import joblib
import numpy as np
import paho.mqtt.client as mqtt

# ---------- CONFIG ----------
BROKER       = "localhost"
PORT         = 1883
TOPIC_ACOUSTIC  = "campus/zones/+/acoustic"
TOPIC_CALIB     = "campus/zones/+/calibration"
TOPIC_CLASSIFY  = "campus/zones/{zone}/classification"

SCORE_BY_LABEL = {"silence": 0, "ambient": 50, "disruptive": 100}

# ---------- LOAD MODEL ----------
print("[LOAD] Loading model and scaler...")
model  = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")
print(f"[LOAD] Model classes: {list(model.classes_)}")

# ---------- STATE ----------
calibrations = {}
lock = threading.Lock()
stats = {"received": 0, "classified": 0, "errors": 0}

# ---------- MQTT CALLBACKS ----------
def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] connected (rc={rc})")
    client.subscribe(TOPIC_ACOUSTIC)
    client.subscribe(TOPIC_CALIB)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())

        if msg.topic.endswith("/calibration"):
            zone = data.get("zone_id")
            with lock:
                calibrations[zone] = data
            print(f"[CALIB] {zone}  "
                  f"baseline_rms={data.get('baseline_rms'):.1f}  "
                  f"rms_std={data.get('rms_std'):.1f}  "
                  f"p90_peak={data.get('p90_peak'):.1f}")
            return

        with lock:
            stats["received"] += 1

        zone = data.get("zone_id")
        with lock:
            cal = calibrations.get(zone)

        if cal is None:
            return

        rms  = float(data.get("rms", 0))
        peak = float(data.get("peak", 0))
        zcr  = float(data.get("zcr", 0))
        cen  = float(data.get("centroid", 0))
        mfcc = data.get("mfcc", [])

        if len(mfcc) != 13:
            return

        baseline_rms = float(cal.get("baseline_rms", 0))
        rms_std      = float(cal.get("rms_std", 1)) or 1.0
        p90_peak     = float(cal.get("p90_peak", 1)) or 1.0

        rms_norm  = (rms - baseline_rms) / rms_std
        peak_norm = peak / p90_peak
        crest     = min(peak / rms, 15.0) if rms > 0 else 0.0

        features = np.array([[
            rms_norm, peak_norm, crest, zcr, cen,
            *[float(m) for m in mfcc]
        ]])

        features_s = scaler.transform(features)
        label      = model.predict(features_s)[0]
        proba      = model.predict_proba(features_s)[0]
        confidence = float(np.max(proba))
        score      = SCORE_BY_LABEL.get(label, 0)

        out_topic = TOPIC_CLASSIFY.format(zone=zone)
        payload = json.dumps({
            "zone_id":          zone,
            "ts_ms":            data.get("ts_ms"),
            "label":            label,
            "confidence":       round(confidence, 3),
            "disruption_score": score,
            "rms_norm":         round(rms_norm, 3),
            "probabilities": {
                cls: round(float(p), 3)
                for cls, p in zip(model.classes_, proba)
            },
        })
        client.publish(out_topic, payload)

        with lock:
            stats["classified"] += 1

        if stats["classified"] % 20 == 0:
            print(f"[CLASSIFY] {zone:8s}  label={label:11s}  "
                  f"conf={confidence:.2f}  score={score}  "
                  f"(processed {stats['classified']})")

    except Exception as e:
        with lock:
            stats["errors"] += 1
        print(f"[ERROR] {e}")

# ---------- MAIN ----------
def main():
    client = mqtt.Client(client_id="classifier-service")
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER, PORT, keepalive=30)
    client.loop_start()

    print("[RUN] Classifier service running. Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(5)
            with lock:
                s = dict(stats)
                zones = list(calibrations.keys())
            print(f"[STATS] received={s['received']}  "
                  f"classified={s['classified']}  errors={s['errors']}  "
                  f"zones_calibrated={zones}")
    except KeyboardInterrupt:
        print("\n[STOP] Shutting down...")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()