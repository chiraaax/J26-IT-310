"""
PREDICTIVE AIR QUALITY INTELLIGENCE
1. 30-Minute CO2 Forecasting (Multi-Output XGBoost)
2. Time-to-Threshold (TTT) Calculation
3. SHAP Feature Importance
"""

import pandas as pd
import numpy as np
import os
import joblib
from xgboost import XGBRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import shap

# 1. Define Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'clean_sensor_data.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'backend', 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

print("Loading cleaned sensor data...")
df = pd.read_csv(DATA_PATH)

# 2. Feature Engineering: Create ASR and Future Targets
df['CO2_Previous'] = df['CO2_ppm'].shift(1)
df['ASR_Calculated'] = (df['CO2_ppm'] - df['CO2_Previous']) / 1.0 

future_steps = [5, 10, 15, 20, 25, 30]
target_cols = []
for step in future_steps:
    col_name = f'CO2_in_{step}m'
    df[col_name] = df['CO2_ppm'].shift(-step)
    target_cols.append(col_name)

df = df.dropna()

# 3. Define Features (X) and Targets (Y)
features = ['CO2_ppm', 'Temperature_C', 'Humidity_RH', 'ASR_Calculated']
X = df[features]
Y = df[target_cols]

X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2, random_state=42, shuffle=False)

# 4. Train Multi-Output XGBoost Model
print("\nTraining XGBoost Forecasting Model...")
xgb_estimator = XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
multi_model = MultiOutputRegressor(xgb_estimator)
multi_model.fit(X_train, Y_train)

# 5. Evaluate: MAE Only
predictions = multi_model.predict(X_test)
mae = mean_absolute_error(Y_test, predictions)

print("\n" + "="*50)
print("📈 MODEL PERFORMANCE EVALUATION")
print("="*50)
print(f"Mean Absolute Error (MAE): {mae:.2f} ppm")
print("="*50 + "\n")

# Save Model
model_filename = os.path.join(MODEL_DIR, 'xgb_co2_forecast.pkl')
joblib.dump(multi_model, model_filename)
print(f"Model saved to: {model_filename}\n")

# 6. Time-to-Threshold (TTT) Demonstration
THRESHOLD = 1000 
sample_input = X_test.iloc[0:1]
forecast = multi_model.predict(sample_input)[0]

print("="*50)
print("📊 30-MINUTE FORECAST & TTT CALCULATION")
print("="*50)
print(f"Current CO2: {sample_input['CO2_ppm'].values[0]:.0f} ppm")
print(f"Current ASR: {sample_input['ASR_Calculated'].values[0]:.2f} ppm/min\n")

print("Forecast Array:")
for time, val in zip(future_steps, forecast):
    print(f" +{time} min: {val:.0f} ppm")

ttt = "> 30"
status = "SAFE"
for time, val in zip(future_steps, forecast):
    if val >= THRESHOLD:
        ttt = str(time)
        break

if ttt != "> 30":
    t_val = int(ttt)
    if t_val <= 5: status = "CRITICAL"
    elif t_val <= 10: status = "OPEN SOON"
    elif t_val <= 20: status = "CONSIDER"
    else: status = "SAFE"

print(f"\nTime-to-Threshold (TTT): {ttt} minutes")
print(f"Recommended Status: {status}")
print("="*50 + "\n")

# 7. SHAP Feature Importance
print("Generating SHAP Feature Importance...")
explainer = shap.TreeExplainer(multi_model.estimators_[0]) 
shap_values = explainer.shap_values(X_test)

feature_importance = np.abs(shap_values).mean(axis=0)
importance_df = pd.DataFrame({'Feature': features, 'Importance': feature_importance})
importance_df = importance_df.sort_values(by='Importance', ascending=False)
print("\nFeature Impact on Forecast (Ranked):")
print(importance_df.to_string(index=False))