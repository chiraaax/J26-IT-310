"""
data_collector_lecture.py

Purpose: Collect labelled acoustic data in uncontrolled environments
(e.g., lecture halls) where continuous manual tagging is impractical.

Design:
  Phase 1 - Auto-calibration (5 min) : establish room's baseline from live data
  Phase 2 - Auto-labelling           : classify each window by deviation from baseline
  Phase 3 - Manual override          : user corrects / marks events on demand

Output CSV contains BOTH auto_label and final_label for every row, so you can
audit the auto-labeller's decisions later.
"""

import json
import time
import csv
import threading
import msvcrt                              # Windows keyboard reader
import statistics
from datetime import datetime
import paho.mqtt.client as mqtt

# ============================================================
# CONFIG
# ============================================================
BROKER                 = "localhost"
PORT                   = 1883
TOPIC_ACOUSTIC         = "campus/zones/+/acoustic"
TOPIC_CALIB            = "campus/zones/+/calibration"

# Auto-calibration duration (seconds) at session start
LECTURE_CALIB_SECONDS  = 300              # 5 minutes

# Auto-labelling thresholds (relative to lecture baseline)
SILENCE_THRESHOLD      = -1.0             # rms_norm < this -> silence
DISRUPTIVE_THRESHOLD   =  3.0             # rms_norm > this -> disruptive

# Retroactive marking
RETROACTIVE_WINDOW_S   = 5.0              # 'd' marks the last N seconds as disruptive

# Buffer management (rows are held in memory briefly so 'd' can modify them)
BUFFER_FLUSH_INTERVAL_S = 10.0            # older than this -> written to disk

# ============================================================
# SESSION SETUP
# ============================================================
LOCATION     = input("Location name [lecture_hall]: ").strip() or "lecture_hall"
NOTES        = input("Notes (optional): ").strip()
TIME_OF_DAY  = datetime.now().strftime("%H:%M")
SESSION_ID   = datetime.now().strftime("%Y%m%d_%H%M")
CSV_FILE     = f"dataset_{LOCATION}_{SESSION_ID}.csv"

# ============================================================
# STATE
# ============================================================
# Per-zone ESP32 calibration data (baseline_rms, rms_std, p90_peak, ...)
calibration = {}

# Lecture-hall baseline (computed during Phase 1, per zone)
lecture_calib_samples = {}          # zone_id -> [rms, rms, ...]
lecture_baseline      = {}          # zone_id -> {"mean": .., "std": ..}
lecture_calib_done    = False

# Labelling mode: "auto" | "silence" | "ambient" | "disruptive"
labelling_mode = "auto"

# Buffer of recent rows (for retroactive marking)
row_buffer = []                     # list of (timestamp_float, row_list)
row_count  = 0
shutdown_requested = False
lock = threading.Lock()

# ============================================================
# CSV FILE
# ============================================================
csv_file   = open(CSV_FILE, "w", newline="")
csv_writer = csv.writer(csv_file)
header = [
    "timestamp", "session_id", "location", "time_of_day",
    "zone_id", "mode", "auto_label", "override_label", "final_label",
    "rms", "peak", "zcr", "centroid",
    "lecture_baseline_mean", "lecture_baseline_std",
    "calib_baseline_rms", "calib_rms_std",
    "calib_baseline_peak", "calib_p90_peak",
] + [f"mfcc{i+1}" for i in range(13)]
csv_writer.writerow(header)
csv_file.flush()

# ============================================================
# AUTO-LABELLER
# ============================================================
def auto_label_for(zone_id, rms):
    """
    Classify the window based on how much its RMS deviates from the
    room's lecture baseline. Returns silence / ambient / disruptive.
    """
    baseline = lecture_baseline.get(zone_id)
    if not baseline or baseline["std"] == 0:
        return "ambient"                # safe default before baseline exists
    rms_norm = (rms - baseline["mean"]) / baseline["std"]
    if rms_norm < SILENCE_THRESHOLD:
        return "silence"
    elif rms_norm > DISRUPTIVE_THRESHOLD:
        return "disruptive"
    else:
        return "ambient"

# ============================================================
# MQTT CALLBACKS
# ============================================================
def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] connected (rc={rc}). Subscribing...")
    client.subscribe(TOPIC_ACOUSTIC)
    client.subscribe(TOPIC_CALIB)

def on_message(client, userdata, msg):
    global row_count
    try:
        data = json.loads(msg.payload.decode())

        # --- ESP32 calibration message (once per boot) ---
        if msg.topic.endswith("/calibration"):
            zone = data.get("zone_id")
            with lock:
                calibration[zone] = data
            print(f"[ESP32-CALIB] {zone}: "
                  f"baseline_rms={data.get('baseline_rms', 0):.1f}  "
                  f"rms_std={data.get('rms_std', 0):.1f}  "
                  f"p90_peak={data.get('p90_peak', 0):.1f}")
            return

        # --- Acoustic message ---
        zone = data.get("zone_id", "unknown")
        rms  = float(data.get("rms", 0))

        # During lecture calibration, we only accumulate RMS; we don't save rows
        if not lecture_calib_done:
            with lock:
                lecture_calib_samples.setdefault(zone, []).append(rms)
            return

        # Compute auto label
        auto_lbl = auto_label_for(zone, rms)

        # Apply current mode
        with lock:
            mode = labelling_mode
            cal  = calibration.get(zone, {})
            baseline = lecture_baseline.get(zone, {})

        override_lbl = ""
        if mode == "auto":
            final_lbl = auto_lbl
        else:
            override_lbl = mode
            final_lbl    = mode

        mfcc = data.get("mfcc", [])
        row = [
            datetime.now().isoformat(timespec="milliseconds"),
            SESSION_ID, LOCATION, TIME_OF_DAY,
            zone, mode, auto_lbl, override_lbl, final_lbl,
            round(rms, 3),
            round(data.get("peak", 0), 3),
            round(data.get("zcr", 0), 3),
            round(data.get("centroid", 0), 3),
            round(baseline.get("mean", 0), 3),
            round(baseline.get("std", 0), 3),
            cal.get("baseline_rms", ""),
            cal.get("rms_std", ""),
            cal.get("baseline_peak", ""),
            cal.get("p90_peak", ""),
        ] + mfcc

        with lock:
            row_buffer.append((time.time(), row))
            row_count += 1

    except Exception as e:
        print(f"[error] {e}")

# ============================================================
# BUFFER MANAGEMENT
# ============================================================
def flush_buffer(force=False):
    """Write buffered rows to CSV. Keeps rows younger than BUFFER_FLUSH_INTERVAL_S."""
    with lock:
        if not row_buffer:
            return
        now = time.time()
        keep = []
        to_write = []
        for ts, row in row_buffer:
            if force or (now - ts) > BUFFER_FLUSH_INTERVAL_S:
                to_write.append(row)
            else:
                keep.append((ts, row))
        row_buffer.clear()
        row_buffer.extend(keep)

    for row in to_write:
        csv_writer.writerow(row)
    if to_write:
        csv_file.flush()

def mark_retroactive_disruptive():
    """User pressed 'd' - mark the last RETROACTIVE_WINDOW_S of rows as disruptive."""
    with lock:
        now = time.time()
        marked = 0
        for _, row in row_buffer:
            pass  # placeholder (kept for clarity)

        for ts, row in row_buffer:
            if (now - ts) <= RETROACTIVE_WINDOW_S:
                row[7] = "disruptive"      # override_label
                row[8] = "disruptive"      # final_label
                marked += 1
    print(f"  [RETROACTIVE] marked {marked} buffered rows as DISRUPTIVE "
          f"(last {RETROACTIVE_WINDOW_S:.0f}s)")

# ============================================================
# KEYBOARD LISTENER (runs on separate thread)
# ============================================================
def keyboard_listener():
    global labelling_mode, shutdown_requested
    print("\n[KEYS]")
    print("  1 = force SILENCE       (until 'a')")
    print("  2 = force AMBIENT       (until 'a')")
    print("  3 = force DISRUPTIVE    (until 'a')")
    print("  a = return to AUTO mode")
    print("  d = retroactively mark last 5s as DISRUPTIVE")
    print("  f = flush buffer to disk now")
    print("  q = quit\n")

    while not shutdown_requested:
        if msvcrt.kbhit():
            k = msvcrt.getch().decode(errors="ignore").lower()
            if k == "1":
                with lock:
                    labelling_mode = "silence"
                print("  mode: SILENCE")
            elif k == "2":
                with lock:
                    labelling_mode = "ambient"
                print("  mode: AMBIENT")
            elif k == "3":
                with lock:
                    labelling_mode = "disruptive"
                print("  mode: DISRUPTIVE")
            elif k == "a":
                with lock:
                    labelling_mode = "auto"
                print("  mode: AUTO")
            elif k == "d":
                mark_retroactive_disruptive()
            elif k == "f":
                flush_buffer(force=True)
                print("  buffer flushed")
            elif k == "q":
                print("  quit requested")
                shutdown_requested = True
                return
        time.sleep(0.05)

# ============================================================
# LECTURE-HALL CALIBRATION (blocking, phase 1)
# ============================================================
def run_lecture_calibration():
    """Wait LECTURE_CALIB_SECONDS while accumulating RMS; then compute baseline."""
    global lecture_calib_done

    print("=" * 68)
    print(" PHASE 1 - LECTURE-HALL AUTO-CALIBRATION")
    print("=" * 68)
    print(f"Collecting baseline for {LECTURE_CALIB_SECONDS} seconds "
          f"({LECTURE_CALIB_SECONDS // 60} min).")
    print("Keep the room in its natural state (lecturer talking, normal noise).")
    print("Press 'q' to skip calibration.\n")

    start = time.time()
    last_report = 0
    while time.time() - start < LECTURE_CALIB_SECONDS:
        if shutdown_requested:
            print("Calibration skipped.")
            break
        elapsed = time.time() - start
        if int(elapsed) - int(last_report) >= 30:
            last_report = elapsed
            remaining = int(LECTURE_CALIB_SECONDS - elapsed)
            print(f"  ...calibrating ({remaining}s remaining)")
        time.sleep(1)

    # Compute baselines per zone
    with lock:
        samples_snapshot = {z: list(s) for z, s in lecture_calib_samples.items()}

    for zone, samples in samples_snapshot.items():
        if len(samples) < 10:
            print(f"  [WARN] {zone}: only {len(samples)} samples, using defaults")
            lecture_baseline[zone] = {"mean": 0, "std": 1}
            continue
        mean = statistics.mean(samples)
        std  = statistics.pstdev(samples) if len(samples) > 1 else 1.0
        lecture_baseline[zone] = {"mean": mean, "std": max(std, 0.1)}
        print(f"  [BASELINE] {zone}:  mean={mean:.2f}  std={std:.2f}")

    lecture_calib_done = True
    print("\n Phase 2 - LIVE COLLECTION WITH AUTO-LABELLING\n")

# ============================================================
# MAIN
# ============================================================
print(f"\n=== LECTURE-HALL DATA COLLECTION SESSION ===")
print(f"  Location    : {LOCATION}")
print(f"  Session ID  : {SESSION_ID}")
print(f"  Time of day : {TIME_OF_DAY}")
print(f"  CSV file    : {CSV_FILE}\n")

client = mqtt.Client(client_id=f"collector_lecture_{SESSION_ID}")
client.on_connect = on_connect
client.on_message = on_message
client.connect(BROKER, PORT, keepalive=30)
client.loop_start()

# Give MQTT a moment to connect
time.sleep(2)

# Start keyboard listener thread before calibration (so 'q' works during it)
kb_thread = threading.Thread(target=keyboard_listener, daemon=True)
kb_thread.start()

# Run blocking calibration
run_lecture_calibration()

# Main loop - periodic buffer flush
try:
    while not shutdown_requested:
        time.sleep(1)
        if lecture_calib_done:
            flush_buffer()
except KeyboardInterrupt:
    print("\nKeyboardInterrupt - stopping...")

# Clean shutdown
flush_buffer(force=True)
client.loop_stop()
client.disconnect()
csv_file.close()
print(f"\n[CSV] {row_count} rows saved -> {CSV_FILE}")