"""
analyze_disruptive_session_v3.py

Robust relabelling + outlier capping for the intentional-disruptive session.

Strategy:
  1. Cap RMS and peak at physically-reasonable maxima
     (RMS: 5000, Peak: 50000) to prevent outliers from distorting the scaler
  2. Compute robust statistics (median + MAD) on the capped data
  3. Apply dual-criterion labelling
  4. Report how many rows were capped (kept vs clipped)
"""

import os
import pandas as pd
import numpy as np

# ---------- CONFIG ----------
FILES = [
    "dataset_Disruptive Lec Hall - D303 New program_20261014_0940.csv",
    "dataset_Disruptive Old program_20261014_0940.csv",
]
OUTPUT = "disruptive_session_relabelled.csv"

# Physical caps
RMS_CAP  = 5000.0     # scaled units — everything above becomes 5000
PEAK_CAP = 50000.0    # scaled units

# Robust thresholds (in units of robust_sigma = 1.4826 * MAD)
SILENCE_SIGMA    = -1.0
DISRUPTIVE_SIGMA =  1.5
CREST_VALUE      =  4.5

# ---------- LOAD + ALIGN ----------
print("=" * 78)
print("INTENTIONAL-DISRUPTIVE SESSION — robust relabel + outlier cap (v3)")
print("=" * 78)

KEEP = [
    "timestamp", "session_id", "location", "time_of_day", "zone_id",
    "rms", "peak", "zcr", "centroid",
    "calib_baseline_rms", "calib_rms_std",
    "calib_baseline_peak", "calib_p90_peak",
] + [f"mfcc{i+1}" for i in range(13)]

dfs = []
for f in FILES:
    if not os.path.exists(f):
        print(f"[WARN] missing: {f}")
        continue
    df = pd.read_csv(f)
    present = [c for c in KEEP if c in df.columns]
    df = df[present].copy()
    df["session_tag"] = "new"
    dfs.append(df)
    print(f"  Loaded {os.path.basename(f):<55s}  rows={len(df):>6,}")

merged = pd.concat(dfs, ignore_index=True)
print(f"\n  Combined (pre-dedup): {len(merged):,}")

before = len(merged)
merged = merged.drop_duplicates(subset=["timestamp", "zone_id"], keep="first")
print(f"  After dedup        : {len(merged):,}  (removed {before - len(merged):,})")

merged = merged.dropna(subset=["rms", "peak", "zcr", "centroid"])

# ---------- CAP OUTLIERS ----------
print(f"\n  Applying physical caps:")
print(f"    RMS  cap: {RMS_CAP:.0f}")
print(f"    Peak cap: {PEAK_CAP:.0f}")

n_rms_capped  = int((merged["rms"]  > RMS_CAP).sum())
n_peak_capped = int((merged["peak"] > PEAK_CAP).sum())

print(f"    Rows with RMS  > {RMS_CAP:.0f}: {n_rms_capped:,}  "
      f"({100*n_rms_capped/len(merged):.2f}%)")
print(f"    Rows with Peak > {PEAK_CAP:.0f}: {n_peak_capped:,}  "
      f"({100*n_peak_capped/len(merged):.2f}%)")

merged["rms"]  = merged["rms"].clip(upper=RMS_CAP)
merged["peak"] = merged["peak"].clip(upper=PEAK_CAP)

# ---------- ROBUST STATISTICS (on capped data) ----------
rms_vals   = merged["rms"].values
peak_vals  = merged["peak"].values
crest_vals = np.clip(peak_vals / np.maximum(rms_vals, 1.0), 0, 30)

median_rms = float(np.median(rms_vals))
mad        = float(np.median(np.abs(rms_vals - median_rms)))
robust_std = 1.4826 * mad

print(f"\n  Robust statistics (post-cap):")
print(f"    median RMS   = {median_rms:8.1f}")
print(f"    MAD          = {mad:8.1f}")
print(f"    robust σ     = {robust_std:8.1f}")

silence_cut    = median_rms + SILENCE_SIGMA    * robust_std
disruptive_cut = median_rms + DISRUPTIVE_SIGMA * robust_std

print(f"\n  Thresholds:")
print(f"    silence    : rms < {silence_cut:>8.1f}")
print(f"    disruptive : rms > {disruptive_cut:>8.1f}  OR  crest > {CREST_VALUE:.2f}")

# ---------- APPLY LABELS ----------
labels = []
for i in range(len(merged)):
    r = rms_vals[i]
    c = crest_vals[i]
    if r < silence_cut:
        labels.append("silence")
    elif (r > disruptive_cut) or (c > CREST_VALUE):
        labels.append("disruptive")
    else:
        labels.append("ambient")

merged["label"] = labels

# ---------- RESULT ----------
print(f"\n{'=' * 78}")
print("RESULTING LABEL DISTRIBUTION")
print(f"{'=' * 78}")

total = len(merged)
for lbl in ["silence", "ambient", "disruptive"]:
    n = int((merged["label"] == lbl).sum())
    print(f"  {lbl:12s}  {n:>7,}  ({100*n/total:>5.1f}%)")

print(f"\n  Per zone:")
for zone, grp in merged.groupby("zone_id"):
    n = len(grp)
    parts = []
    for lbl in ["silence", "ambient", "disruptive"]:
        c = int((grp["label"] == lbl).sum())
        parts.append(f"{lbl[0].upper()}:{c:>5}({100*c/n:>4.1f}%)")
    print(f"    {zone}:  " + "  ".join(parts))

# ---------- EVENT-RATE (with note about intentional session) ----------
merged["_ts"] = pd.to_datetime(merged["timestamp"], errors="coerce")
dur_s = (merged["_ts"].max() - merged["_ts"].min()).total_seconds()
dur_min = dur_s / 60

n_dis = int((merged["label"] == "disruptive").sum())
dis_sec = n_dis * 0.25

print(f"\n  Session duration : {dur_min:.1f} min")
print(f"  Disruptive audio : {dis_sec:.0f}s  ({100*dis_sec/dur_s:.1f}%)")
print(f"  Disruptive rate  : {dis_sec/dur_min:.1f} s/min")
print(f"\n  NOTE: this session was designed to be disruptive — a high rate is")
print(f"        expected and correct. It teaches the model what real")
print(f"        disruptions look like — data the normal lectures lacked.")

# ---------- SAVE ----------
merged = merged.drop(columns=["_ts", "session_tag"], errors="ignore")
merged.to_csv(OUTPUT, index=False)
print(f"\n  Saved → {OUTPUT}  ({len(merged):,} rows)")