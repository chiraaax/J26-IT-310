"""
COMFORT SCORE REGRESSION
Theoretical Foundation (Formula 1):
CS = w1*f(CO2) + w2*f(T) + w3*f(H) + w4*f(TTT) + e

This script utilizes a Random Forest Regressor to dynamically reverse-engineer 
and apply the weights (w) to our environmental features to predict a continuous 
Comfort Score (0-100).
"""

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import joblib
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'processed', 'processed_study_comfort_data.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'backend', 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

print("Loading data for Comfort Regression...")
df = pd.read_csv(DATA_PATH)

features = ['temperature', 'humidity', 'noise', 'CO2', 'elapsed_time_min', 'peopleCount']
X = df[features].astype(float)
y = df['Comfort_Score']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training Random Forest Regressor...")
rf_regressor = RandomForestRegressor(random_state=42, n_estimators=100, max_depth=10)
rf_regressor.fit(X_train, y_train)

predictions = rf_regressor.predict(X_test)

print("\n" + "="*50)
print("🌡️ COMFORT SCORE MODEL EVALUATION")
print("="*50)
print(f"R² Score (Accuracy Variance): {r2_score(y_test, predictions):.4f}")
print(f"Mean Absolute Error (MAE):    {mean_absolute_error(y_test, predictions):.4f}")
print(f"Mean Squared Error (MSE):     {mean_squared_error(y_test, predictions):.4f}")
print("="*50 + "\n")

print("Retraining on full dataset for production...")
rf_regressor.fit(X, y)
model_filename = os.path.join(MODEL_DIR, 'rf_comfort_model.pkl')
joblib.dump(rf_regressor, model_filename)

print(f"Success! Model permanently saved to: {model_filename}")