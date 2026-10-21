import pandas as pd
import os

# 1. Define exact paths based on your folder structure
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INPUT_PATH = os.path.join(BASE_DIR, 'raw_sensor_data_full.csv')
OUTPUT_DIR = os.path.join(BASE_DIR, 'data', 'processed')
OUTPUT_PATH = os.path.join(OUTPUT_DIR, 'clean_sensor_data.csv')

# Ensure the output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Loading raw sensor data from: {INPUT_PATH}")
df = pd.read_csv(INPUT_PATH)
print(f"Original row count: {len(df)}")

# 2. Clean the ESP32 Boot Logs
# Convert columns to numeric; anything that is text (like "rst:0x1") turns into NaN
df['CO2_ppm'] = pd.to_numeric(df['CO2_ppm'], errors='coerce')
df['Elapsed_Time_s'] = pd.to_numeric(df['Elapsed_Time_s'], errors='coerce')
df['ASR_ppm_min'] = pd.to_numeric(df['ASR_ppm_min'], errors='coerce')
df['Temperature_C'] = pd.to_numeric(df['Temperature_C'], errors='coerce')
df['Humidity_RH'] = pd.to_numeric(df['Humidity_RH'], errors='coerce')

# 3. Drop all rows that contain those NaN (invalid) values
df = df.dropna(subset=['CO2_ppm', 'Temperature_C', 'Humidity_RH'])

# 4. Fix Timestamps and sort chronologically
df['Timestamp'] = pd.to_datetime(df['Timestamp'])
df = df.sort_values(by='Timestamp')

# 5. Save the clean data
print(f"Cleaned row count: {len(df)}")
df.to_csv(OUTPUT_PATH, index=False)
print(f"Success! Clean data saved to: {OUTPUT_PATH}")