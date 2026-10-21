"""
fairness_evaluation_final.py

Final fairness evaluation using Random Forest (the deployed model) and 
the v2 methodology (comparing against both Global and Tuned baselines).
"""

import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score

# ---------- CONFIG ----------
DATA_CSV     = "all_data_temporal_cleaned.csv"
RANDOM_STATE = 42
TEST_SIZE    = 0.2

FEATURES = ["rms_norm", "peak_norm", "crest", "zcr", "centroid"] + [f"mfcc{i+1}" for i in range(13)]

# ============================================================================
# LOAD & ENGINEER
# ============================================================================
print("=" * 78)
print("FINAL FAIRNESS EVALUATION — Random Forest (with tuned baseline)")
print("=" * 78)

df = pd.read_csv(DATA_CSV)
df["rms_norm"]  = (df["rms"]  - df["calib_baseline_rms"]) / df["calib_rms_std"].replace(0, 1)
df["peak_norm"] = df["peak"] / df["calib_p90_peak"].replace(0, 1)
df["crest"]     = (df["peak"] / df["rms"].replace(0, 1)).clip(upper=15)
df = df.dropna(subset=FEATURES + ["label"])

print(f"  Total rows: {len(df):,}")
print(f"  Locations : {df['location'].unique().tolist()}")

# ============================================================================
# BASELINE 1 — GLOBAL FIXED THRESHOLD
# ============================================================================
print("\n" + "=" * 78)
print("BASELINE 1: GLOBAL FIXED THRESHOLD (un-tuned commercial baseline)")
print("=" * 78)

global_peak_threshold = df["calib_p90_peak"].median()
global_rms_threshold  = df["calib_baseline_rms"].median() * 2

print(f"  Threshold source: median calibration values across all rooms")
print(f"    peak > {global_peak_threshold:.1f}  →  disruptive")
print(f"    rms  > {global_rms_threshold:.1f}   →  disruptive")

def fixed_threshold_predict(row):
    if row["peak"] > global_peak_threshold or row["rms"] > global_rms_threshold:
        return "disruptive"
    return "ambient"

df["pred_fixed"] = df.apply(fixed_threshold_predict, axis=1)

baseline_results = []
for loc, grp in df.groupby("location"):
    sub = grp[grp["label"].isin(["ambient", "disruptive"])]
    if len(sub) == 0: continue
    ambient    = sub[sub["label"] == "ambient"]
    disruptive = sub[sub["label"] == "disruptive"]

    fp = (ambient["pred_fixed"]    == "disruptive").sum()
    tn = (ambient["pred_fixed"]    == "ambient").sum()
    fn = (disruptive["pred_fixed"] == "ambient").sum()
    tp = (disruptive["pred_fixed"] == "disruptive").sum()

    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0

    baseline_results.append({
        "location": loc, "ambient_n": len(ambient), "disrupt_n": len(disruptive),
        "FP": int(fp), "TN": int(tn), "FPR": fpr, "FNR": fnr,
    })

baseline_df = pd.DataFrame(baseline_results)
baseline_avg_fpr = baseline_df["FPR"].mean()
print(f"  Baseline 1 (global) average FPR: {baseline_avg_fpr:.4f}")

# ============================================================================
# BASELINE 2 — PER-ROOM TUNED THRESHOLD
# ============================================================================
print("\n" + "=" * 78)
print("BASELINE 2: PER-ROOM TUNED THRESHOLD (best-case fixed system)")
print("=" * 78)

tuned_results = []
for loc, grp in df.groupby("location"):
    sub = grp[grp["label"].isin(["ambient", "disruptive"])].copy()
    if len(sub) == 0: continue

    best_f1, best_thr = -1, 0
    for thr in np.percentile(sub["peak"], np.arange(10, 95, 2)):
        pred = np.where(sub["peak"] > thr, "disruptive", "ambient")
        f1 = f1_score(sub["label"], pred, average="binary", pos_label="disruptive", zero_division=0)
        if f1 > best_f1:
            best_f1, best_thr = f1, thr

    ambient    = sub[sub["label"] == "ambient"]
    disruptive = sub[sub["label"] == "disruptive"]
    fp = (ambient["peak"]    >  best_thr).sum()
    tn = (ambient["peak"]    <= best_thr).sum()
    fn = (disruptive["peak"] <= best_thr).sum()
    tp = (disruptive["peak"] >  best_thr).sum()

    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0

    tuned_results.append({
        "location": loc, "tuned_thr": best_thr, "best_F1": best_f1,
        "FPR": fpr, "FNR": fnr,
    })

tuned_df = pd.DataFrame(tuned_results)
tuned_avg_fpr = tuned_df["FPR"].mean()
print(f"  Baseline 2 (tuned) average FPR: {tuned_avg_fpr:.4f}")

# ============================================================================
# PROPOSED — RANDOM FOREST CLASSIFIER
# ============================================================================
print("\n" + "=" * 78)
print("PROPOSED: ROOM-ADAPTIVE RANDOM FOREST CLASSIFIER")
print("=" * 78)

X   = df[FEATURES].values
y   = df["label"].values
loc = df["location"].values

X_train, X_test, y_train, y_test, loc_train, loc_test = train_test_split(
    X, y, loc, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
)

print(f"  Training on {len(X_train):,} rows (evaluating on {len(X_test):,})")

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

# n_jobs=1 prevents the sklearn warning spam
model = RandomForestClassifier(
    n_estimators=200, class_weight="balanced",
    random_state=RANDOM_STATE, n_jobs=1
)
model.fit(X_train_s, y_train)
y_pred_ml = model.predict(X_test_s)

test_df = pd.DataFrame(X_test, columns=FEATURES)
test_df["true_label"] = y_test
test_df["pred_ml"]    = y_pred_ml
test_df["location"]   = loc_test

proposed_results = []
for loc_name, grp in test_df.groupby("location"):
    sub = grp[grp["true_label"].isin(["ambient", "disruptive"])]
    if len(sub) == 0: continue

    ambient    = sub[sub["true_label"] == "ambient"]
    disruptive = sub[sub["true_label"] == "disruptive"]

    fp = (ambient["pred_ml"]    == "disruptive").sum()
    tn = (ambient["pred_ml"]    == "ambient").sum()
    fn = (disruptive["pred_ml"] == "ambient").sum()
    tp = (disruptive["pred_ml"] == "disruptive").sum()

    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0

    proposed_results.append({
        "location": loc_name, "ambient_n": len(ambient), "disrupt_n": len(disruptive),
        "FP": int(fp), "TN": int(tn), "FPR": fpr, "FNR": fnr,
    })

proposed_df = pd.DataFrame(proposed_results)
proposed_avg_fpr = proposed_df["FPR"].mean()
print(f"  Proposed average FPR: {proposed_avg_fpr:.4f}")

# ============================================================================
# THREE-WAY COMPARISON
# ============================================================================
print("\n" + "=" * 78)
print("THREE-WAY FAIRNESS COMPARISON")
print("=" * 78)

print(f"\n  {'Location':<14} {'Fixed':>8} {'Tuned':>8} {'RF':>10} "
      f"{'vs Fixed':>10} {'vs Tuned':>10}")
print("  " + "-" * 72)

total_red_fixed, total_red_tuned, n_rooms = 0, 0, 0

for loc_name in baseline_df["location"]:
    b = baseline_df[baseline_df["location"] == loc_name].iloc[0]["FPR"]
    t = tuned_df[tuned_df["location"] == loc_name].iloc[0]["FPR"]
    p = proposed_df[proposed_df["location"] == loc_name].iloc[0]["FPR"]

    red_fixed = (b - p) / b if b > 0 else 0
    red_tuned = (t - p) / t if t > 0 else 0

    total_red_fixed += red_fixed
    total_red_tuned += red_tuned
    n_rooms += 1

    print(f"  {loc_name:<14} {b:>8.3f} {t:>8.3f} {p:>10.4f} "
          f"{red_fixed*100:>9.1f}% {red_tuned*100:>9.1f}%")

avg_red_fixed = total_red_fixed / n_rooms
avg_red_tuned = total_red_tuned / n_rooms

print("  " + "-" * 72)
print(f"  {'AVERAGE':<14} {baseline_avg_fpr:>8.3f} {tuned_avg_fpr:>8.3f} "
      f"{proposed_avg_fpr:>10.4f} {avg_red_fixed*100:>9.1f}% {avg_red_tuned*100:>9.1f}%")

# ============================================================================
# VERDICT
# ============================================================================
print("\n" + "=" * 78)
print("VERDICT — Against Proposal Table 4 Target (≥ 20% FPR reduction)")
print("=" * 78)

print(f"\n  vs Global fixed baseline : {avg_red_fixed*100:.1f}%  "
      f"→ {'✅ PASS' if avg_red_fixed >= 0.20 else '❌ FAIL'}")
print(f"  vs Tuned fixed baseline  : {avg_red_tuned*100:.1f}%  "
      f"→ {'✅ PASS' if avg_red_tuned >= 0.20 else '❌ FAIL'}")

if avg_red_tuned >= 0.20:
    print(f"\n  🎯 PRIMARY RESULT (vs tuned): {avg_red_tuned*100:.1f}% reduction")
    print(f"     Exceeds target by {(avg_red_tuned - 0.20)*100:.1f} percentage points.")

# ============================================================================
# SAVE RESULTS
# ============================================================================
out = {
    "baseline_1_global": {"avg_fpr": float(baseline_avg_fpr)},
    "baseline_2_tuned":  {"avg_fpr": float(tuned_avg_fpr)},
    "proposed_rf":       {"avg_fpr": float(proposed_avg_fpr)},
    "reduction_vs_global": float(avg_red_fixed),
    "reduction_vs_tuned":  float(avg_red_tuned),
    "target": 0.20,
    "pass_vs_global": bool(avg_red_fixed >= 0.20),
    "pass_vs_tuned":  bool(avg_red_tuned >= 0.20),
}

with open("fairness_rf_results.json", "w") as f:
    json.dump(out, f, indent=2)
print(f"\n  Results saved → fairness_rf_results.json")