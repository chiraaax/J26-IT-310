import json
import time
import csv
import threading
import msvcrt                     # Windows keyboard reader
from datetime import datetime
import paho.mqtt.client as mqtt

# ---------- CONFIG ----------
BROKER = "localhost"
PORT   = 1883
TOPIC_ACOUSTIC = "campus/zones/+/acoustic"
TOPIC_CALIB    = "campus/zones/+/calibration"

# Ask user for session metadata
LOCATION = input("Location name (e.g. library, lecture_hall): ").strip() or "unknown"
NOTES    = input("Notes (optional, press Enter to skip): ").strip()
TIME_OF_DAY = datetime.now().strftime("%H:%M")
SESSION_ID = datetime.now().strftime("%Y%m%d_%H%M")

CSV_FILE = f"dataset_{LOCATION}_{SESSION_ID}.csv"

# ---------- STATE ----------
current_label = "silence"
labels = {"1": "silence", "2": "ambient", "3": "disruptive"}
calibration = {}
lock = threading.Lock()
row_count = 0
csv_file = open(CSV_FILE, "w", newline="")
csv_writer = csv.writer(csv_file)

header = [
    "timestamp", "session_id", "location", "time_of_day",
    "zone_id", "label",
    "rms", "peak", "zcr", "centroid",
    "calib_baseline_rms", "calib_rms_std",
    "calib_baseline_peak", "calib_p90_peak",
] + [f"mfcc{i+1}" for i in range(13)]
csv_writer.writerow(header)
csv_file.flush()

# ---------- MQTT ----------
def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] connected. Subscribing...")
    client.subscribe(TOPIC_ACOUSTIC)
    client.subscribe(TOPIC_CALIB)

def on_message(client, userdata, msg):
    global row_count
    try:
        data = json.loads(msg.payload.decode())

        if msg.topic.endswith("/calibration"):
            zone = data.get("zone_id")
            with lock:
                calibration[zone] = data
            print(f"[CALIB] {zone}: rms_mean={data.get('baseline_rms'):.1f} "
                  f"std={data.get('rms_std'):.1f}  p90_peak={data.get('p90_peak'):.1f}")
            return

        zone = data.get("zone_id", "unknown")
        with lock:
            label = current_label
            cal = calibration.get(zone, {})

        mfcc = data.get("mfcc", [])
        row = [
            datetime.now().isoformat(timespec="milliseconds"),
            SESSION_ID, LOCATION, TIME_OF_DAY,
            zone, label,
            round(data.get("rms", 0), 3),
            round(data.get("peak", 0), 3),
            round(data.get("zcr", 0), 3),
            round(data.get("centroid", 0), 3),
            cal.get("baseline_rms", ""),
            cal.get("rms_std", ""),
            cal.get("baseline_peak", ""),
            cal.get("p90_peak", ""),
        ] + mfcc

        with lock:
            csv_writer.writerow(row)
            row_count += 1
            if row_count % 20 == 0:
                csv_file.flush()
                print(f"  [{row_count} rows]  zone={zone}  label={label}  "
                      f"rms={row[6]:.1f}  peak={row[7]:.1f}")
    except Exception as e:
        print(f"[error] {e}")

# ---------- KEYBOARD ----------
def keyboard_listener():
    global current_label
    print("\n[KEYS]  1=silence   2=ambient   3=disruptive   q=quit\n")
    while True:
        if msvcrt.kbhit():
            k = msvcrt.getch().decode(errors="ignore").lower()
            if k in labels:
                with lock:
                    current_label = labels[k]
                print(f"\n  ▶ label set to: {current_label}\n")
            elif k == "q":
                print("\n  ▶ quit requested\n")
                raise KeyboardInterrupt
        time.sleep(0.05)

# ---------- MAIN ----------
print(f"\n=== DATA COLLECTION SESSION ===")
print(f"  Location    : {LOCATION}")
print(f"  Session ID  : {SESSION_ID}")
print(f"  Time of day : {TIME_OF_DAY}")
print(f"  CSV file    : {CSV_FILE}\n")

client = mqtt.Client(client_id=f"collector_{SESSION_ID}")
client.on_connect = on_connect
client.on_message = on_message
client.connect(BROKER, PORT, keepalive=30)
client.loop_start()

try:
    keyboard_listener()
except KeyboardInterrupt:
    print("\nStopping...")
finally:
    client.loop_stop()
    client.disconnect()
    csv_file.close()
    print(f"\n[CSV] {row_count} rows saved → {CSV_FILE}")