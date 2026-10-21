"""
finalize_model_rf.py

Same pipeline as finalize_model.py, but using Random Forest instead of SVM.
Purpose: compare RF vs SVM on Run #3 data (55k rows) and pick the model
with better disruptive-event recall.
"""

import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)

# ---------- CONFIG ----------
DATA_CSV     = "all_data_temporal_cleaned.csv"
RANDOM_STATE = 42
TEST_SIZE    = 0.2

FEATURES = ["rms_norm", "peak_norm", "crest", "zcr", "centroid"] + [f"mfcc{i+1}" for i in range(13)]
LABELS   = ["silence", "ambient", "disruptive"]

# ---------- LOAD & ENGINEER ----------
print("=" * 70)
print("FINALIZING MODEL — Random Forest on temporal-cleaned data")
print("=" * 70)

df = pd.read_csv(DATA_CSV)
print(f"  Loaded {len(df):,} rows")

df["rms_norm"]  = (df["rms"]  - df["calib_baseline_rms"]) / df["calib_rms_std"].replace(0, 1)
df["peak_norm"] = df["peak"] / df["calib_p90_peak"].replace(0, 1)
df["crest"]     = df["peak"] / df["rms"].replace(0, 1)

df = df.dropna(subset=FEATURES + ["label"])
X = df[FEATURES].values
y = df["label"].values

# ---------- SPLIT ----------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
)
print(f"  Train: {len(X_train):,}  |  Test: {len(X_test):,}")

# ---------- SCALE ----------
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

# ---------- TRAIN (Random Forest) ----------
print("\n  Training Random Forest (200 trees)...")
model = RandomForestClassifier(
    n_estimators=200,
    class_weight="balanced",
    random_state=RANDOM_STATE,
    n_jobs=-1,              # use all CPU cores
    max_depth=None,         # let trees grow fully
    min_samples_leaf=2,     # slight regularisation
)
model.fit(X_train_s, y_train)

y_pred = model.predict(X_test_s)

# ---------- EVALUATE ----------
acc  = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
rec  = recall_score(y_test, y_pred, average="weighted", zero_division=0)
f1   = f1_score(y_test, y_pred, average="weighted", zero_division=0)

print(f"\n  Accuracy : {acc:.4f}")
print(f"  Precision: {prec:.4f}")
print(f"  Recall   : {rec:.4f}")
print(f"  F1 Score : {f1:.4f}")

print("\n  Per-class report:")
print(classification_report(y_test, y_pred, zero_division=0))

print("  Confusion matrix:")
cm = confusion_matrix(y_test, y_pred, labels=LABELS)
print(f"{'':>14}" + "".join(f"{lbl:>13}" for lbl in LABELS))
for i, lbl in enumerate(LABELS):
    print(f"{lbl:>14}" + "".join(f"{cm[i,j]:>13,}" for j in range(len(LABELS))))

# ---------- FEATURE IMPORTANCE (bonus for dissertation) ----------
print("\n  Top feature importances (from Random Forest):")
importances = model.feature_importances_
sorted_idx = importances.argsort()[::-1]
for i in sorted_idx[:10]:
    print(f"    {FEATURES[i]:<12s}  {importances[i]:.4f}")

# ---------- SAVE ----------
joblib.dump(model, "model_rf.pkl")
joblib.dump(scaler, "scaler_rf.pkl")
print(f"\n  Saved → model_rf.pkl")
print(f"  Saved → scaler_rf.pkl")
print(f"  (existing model.pkl + scaler.pkl NOT overwritten)")