import json
import time
import threading
import statistics
from collections import defaultdict
import paho.mqtt.client as mqtt

# ---------- CONFIG ----------
BROKER         = "localhost"
PORT           = 1883
TOPIC_ACOUSTIC = "campus/zones/+/acoustic"
TOPIC_CLASSIFY = "campus/zones/+/classification"

TEST_DURATION_S = 60
PRINT_EVERY     = 200

# ---------- STATE ----------
acoustic_at   = {}            # (zone, ts_ms) -> (arrival_time, t_i2s_us, t_proc_us)
classify_at   = {}            # (zone, ts_ms) -> arrival_time
latencies_ms  = []            # list of (zone, latency_ms)
firmware_i2s  = []            # list of t_i2s_us values
firmware_proc = []            # list of t_proc_us values
lock          = threading.Lock()
start_time    = time.time()

def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] connected (rc={rc})")
    print(f"[TEST] Subscribing. Will collect for {TEST_DURATION_S}s...\n")
    client.subscribe(TOPIC_ACOUSTIC)
    client.subscribe(TOPIC_CLASSIFY)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        zone = data.get("zone_id")
        ts   = data.get("ts_ms")
        if zone is None or ts is None:
            return
        key = (zone, ts)
        now = time.time()

        with lock:
            if msg.topic.endswith("/acoustic"):
                t_i2s  = data.get("t_i2s_us",  0)
                t_proc = data.get("t_proc_us", 0)
                acoustic_at[key] = (now, t_i2s, t_proc)
                firmware_i2s.append(t_i2s)
                firmware_proc.append(t_proc)
                if key in classify_at:
                    t_class = classify_at.pop(key)
                    delta_ms = (t_class - now) * 1000.0
                    latencies_ms.append((zone, delta_ms))

            elif msg.topic.endswith("/classification"):
                classify_at[key] = now
                if key in acoustic_at:
                    t_ac, t_i2s, t_proc = acoustic_at.pop(key)
                    delta_ms = (now - t_ac) * 1000.0
                    latencies_ms.append((zone, delta_ms))

        if len(latencies_ms) > 0 and len(latencies_ms) % PRINT_EVERY == 0:
            print(f"[{len(latencies_ms):>5} pairs] last MQTT delta = {latencies_ms[-1][1]:.1f} ms")

    except Exception as e:
        print(f"[error] {e}")

client = mqtt.Client(client_id=f"latency-v2-{int(time.time())}")
client.on_connect = on_connect
client.on_message = on_message
client.connect(BROKER, PORT, keepalive=30)
client.loop_start()

print("=" * 78)
print("LATENCY TEST v2 — True end-to-end with measured firmware timings")
print("=" * 78)
print(f"Duration: {TEST_DURATION_S} seconds\n")

while time.time() - start_time < TEST_DURATION_S:
    time.sleep(1)

client.loop_stop()
client.disconnect()

# ---------- REPORT ----------
print("\n" + "=" * 78)
print("LATENCY STATISTICS")
print("=" * 78)

if not latencies_ms:
    print("No paired samples. Check that both ESP32s + classifier_service.py are running.")
    exit()

all_lat = sorted(d for _, d in latencies_ms)
median_pipeline = statistics.median(all_lat)
p95_pipeline    = all_lat[int(0.95 * len(all_lat))]

print(f"\n  Samples: {len(all_lat)}")
print(f"\n  --- Segment 1: MQTT receive → classification output ---")
print(f"  (measures classifier processing + broker round trip)")
print(f"    Median : {median_pipeline:>8.2f} ms")
print(f"    p95    : {p95_pipeline:>8.2f} ms")
print(f"    Max    : {max(all_lat):>8.2f} ms")

# Firmware measured values
median_i2s   = statistics.median(firmware_i2s)
median_proc  = statistics.median(firmware_proc)

print(f"\n  --- Segment 2: ESP32-side (measured by firmware) ---")
print(f"    I2S window fill        median : {median_i2s:>8.0f} µs  "
      f"({median_i2s/1000:.1f} ms)")
print(f"    Feature extraction     median : {median_proc:>8.0f} µs  "
      f"({median_proc/1000:.2f} ms)")
print(f"    Subtotal per window            : {(median_i2s + median_proc)/1000:>8.2f} ms")

# The critical missing piece: the aggregation window
UPDATE_INTERVAL_MS = 250
# On average, a sound arrives in the middle of the aggregation window:
avg_aggregation_wait = UPDATE_INTERVAL_MS / 2

print(f"\n  --- Segment 3: Aggregation window wait ---")
print(f"    ESP32 aggregates 8 frames over {UPDATE_INTERVAL_MS} ms before publishing.")
print(f"    Average wait for the window to close: {avg_aggregation_wait:.0f} ms")

# ---------- TOTAL ----------
# Sound occurs at a random point during the I2S read of the current frame.
# The frame then must complete, feature-extract, then wait for the
# aggregation window to close, then publish, then MQTT, then classify.

total_median = (median_i2s/1000) + (median_proc/1000) + avg_aggregation_wait + median_pipeline
total_p95    = (median_i2s/1000) + (median_proc/1000) + UPDATE_INTERVAL_MS + p95_pipeline

print("\n" + "=" * 78)
print("TOTAL END-TO-END LATENCY (capture → classification output)")
print("=" * 78)

print(f"\n  {'Component':<40} {'Median':>10} {'p95':>10}")
print("  " + "-" * 62)
print(f"  {'I2S window fill':<40} {median_i2s/1000:>9.2f}ms {median_i2s/1000:>9.2f}ms")
print(f"  {'Feature extraction':<40} {median_proc/1000:>9.3f}ms {median_proc/1000:>9.3f}ms")
print(f"  {'Aggregation window wait':<40} {avg_aggregation_wait:>9.1f}ms {UPDATE_INTERVAL_MS:>9.1f}ms")
print(f"  {'MQTT + classification (measured)':<40} {median_pipeline:>9.2f}ms {p95_pipeline:>9.2f}ms")
print("  " + "-" * 62)
print(f"  {'TOTAL':<40} {total_median:>9.1f}ms {total_p95:>9.1f}ms")

# ---------- VERDICT ----------
print("\n" + "=" * 78)
print("VERDICT — Against Proposal Table 4 Target")
print("=" * 78)

TARGET_MS = 2000.0
print(f"\n  Target  : < {TARGET_MS:.0f} ms")
print(f"  Median  : {total_median:.1f} ms  "
      f"({100*(TARGET_MS-total_median)/TARGET_MS:.1f}% below target)")
print(f"  p95     : {total_p95:.1f} ms  "
      f"({100*(TARGET_MS-total_p95)/TARGET_MS:.1f}% below target)")

if total_p95 < TARGET_MS:
    print(f"\n  ✅ PASS — even the 95th percentile is {TARGET_MS - total_p95:.0f} ms "
          f"below the target.")
else:
    print(f"\n  ❌ FAIL — p95 exceeds target.")

print(f"\n  Note: The p95 figure includes the full aggregation window (worst case).")
print(f"        The median reflects typical sound-arrival timing mid-window.")

# ---------- DISSERTATION NUMBERS ----------
print("\n" + "=" * 78)
print("NUMBERS FOR YOUR DISSERTATION")
print("=" * 78)
print(f"  MQTT+classification segment  : {median_pipeline:.2f} ms (median), "
      f"{p95_pipeline:.2f} ms (p95)")
print(f"  ESP32 I2S window fill         : {median_i2s/1000:.1f} ms (measured)")
print(f"  ESP32 feature extraction      : {median_proc/1000:.3f} ms (measured)")
print(f"  Aggregation window (avg wait) : {avg_aggregation_wait:.0f} ms")
print(f"  -----------------------------------------------------")
print(f"  Total end-to-end (median)     : {total_median:.0f} ms")
print(f"  Total end-to-end (p95)        : {total_p95:.0f} ms")