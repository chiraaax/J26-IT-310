import json
import time
import threading
from datetime import datetime
import paho.mqtt.client as mqtt

# ---------- CONFIG ----------
BROKER      = "localhost"
PORT        = 1883
TOPIC_CLASS = "campus/zones/+/classification"
STALE_AFTER = 3.0        # seconds without updates → stale

# ---------- STATE ----------
latest = {}              # zone_id -> (payload dict, timestamp)
lock   = threading.Lock()

def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] connected (rc={rc}). Subscribing to {TOPIC_CLASS}\n")
    client.subscribe(TOPIC_CLASS)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        zone = data.get("zone_id", "unknown")
        with lock:
            latest[zone] = (data, time.time())
    except Exception as e:
        print(f"[error] {e}")

client = mqtt.Client(client_id="ml-aggregator")
client.on_connect = on_connect
client.on_message = on_message
client.connect(BROKER, PORT, keepalive=30)
client.loop_start()

print("Live ML aggregator running. Ctrl+C to stop.\n")
time.sleep(0.5)

try:
    while True:
        time.sleep(1.0)
        now = time.time()

        with lock:
            snap = dict(latest)

        # Clear terminal (works on modern Windows Terminal / PowerShell 7)
        print("\033[2J\033[H", end="")

        print("=" * 82)
        print(f"  LIVE QUIET-ZONE RANKING  —  {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 82)

        if not snap:
            print("  (waiting for classified data...)")
            continue

        # Split online / stale
        online = []
        stale  = []
        for zone, (data, ts) in snap.items():
            age = now - ts
            if age < STALE_AFTER:
                online.append((zone, data, age))
            else:
                stale.append((zone, age))

        # Rank by disruption_score ascending (quietest first)
        online.sort(key=lambda x: x[1].get("disruption_score", 0))

        print("\n  🟢  QUIETEST  →  LOUDEST\n")
        print(f"   {'#':<3} {'Zone':<12} {'Score':>6}  {'State':<12} {'Conf':>6}  "
              f"{'p_sil':>6} {'p_amb':>6} {'p_dis':>6}  {'Age':>7}")
        print("   " + "-" * 88)

        for i, (zone, data, age) in enumerate(online, 1):
            label = data.get("label", "?")
            conf  = data.get("confidence", 0)
            score = data.get("disruption_score", 0)
            probs = data.get("probabilities", {})

            color = {
                "silence":    "\033[92m",   # green
                "ambient":    "\033[93m",   # yellow
                "disruptive": "\033[91m",   # red
            }.get(label, "")
            reset = "\033[0m"

            print(f"   {i:<3} {zone:<12} {score:>6}  "
                  f"{color}{label:<12}{reset} {conf:>6.2f}  "
                  f"{probs.get('silence',0):>6.2f} "
                  f"{probs.get('ambient',0):>6.2f} "
                  f"{probs.get('disruptive',0):>6.2f}  "
                  f"{age*1000:>6.0f}ms")

        if stale:
            print("\n  🔴  STALE / OFFLINE\n")
            for zone, age in stale:
                print(f"     {zone:<12}  last seen {age:.1f}s ago")

        print()

except KeyboardInterrupt:
    print("\nStopping...")
finally:
    client.loop_stop()
    client.disconnect()