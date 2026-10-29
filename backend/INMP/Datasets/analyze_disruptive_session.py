"""
analyze_disruptive_session.py

Purpose: Study the two files from the intentional-disruptive session,
then apply dual-criterion relabelling tuned for the higher-energy distribution.

Produces:
  disruptive_session_relabelled.csv   (ready to merge into all_data.csv)
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

# Dual-criterion thresholds (will be validated against data)
SILENCE_SIGMA    = -1.0
DISRUPTIVE_SIGMA =  1.5     # lower than the normal-lecture value (1.5 vs 2.5)
                            # because we WANT to capture more of the
                            # extended intentional disruptions
CREST_VALUE      =  5.0     # impulsive events (yelling/thudding)

# ---------- LOAD + ALIGN ----------
print("=" * 78)
print("INTENTIONAL-DISRUPTIVE SESSION — analysis + relabel")
print("=" * 78)

dfs = []
for f in FILES:
    if not os.path.exists(f):
        print(f"[WARN] missing: {f}")
        continue
    df = pd.read_csv(f)
    print(f"  Loaded {os.path.basename(f):<55s}  rows={len(df):>6,}  cols={len(df.columns)}")
    dfs.append(df)

if not dfs:
    print("No files. Abort.")
    exit(1)

# Keep only columns common to both — matches the schema of `all_data.csv`
KEEP = [
    "timestamp", "session_id", "location", "time_of_day", "zone_id",
    "rms", "peak", "zcr", "centroid",
    "calib_baseline_rms", "calib_rms_std",
    "calib_baseline_peak", "calib_p90_peak",
] + [f"mfcc{i+1}" for i in range(13)]

dfs_aligned = []
for df in dfs:
    present = [c for c in KEEP if c in df.columns]
    df2 = df[present].copy()
    # Add session_tag (combine_datasets convention)
    df2["session_tag"] = "new"
    dfs_aligned.append(df2)

# Concatenate (they overlap in time — dedup on (timestamp, zone_id))
merged = pd.concat(dfs_aligned, ignore_index=True)
print(f"\n  Combined (pre-dedup): {len(merged):,}")

before = len(merged)
merged = merged.drop_duplicates(subset=["timestamp", "zone_id"], keep="first")
print(f"  After dedup        : {len(merged):,}  (removed {before - len(merged):,})")

merged = merged.dropna(subset=["rms", "peak", "zcr", "centroid"])
print(f"  After na-drop      : {len(merged):,}")

# ---------- DISTRIBUTION ----------
rms_vals   = merged["rms"].values
peak_vals  = merged["peak"].values
crest_vals = np.clip(peak_vals / np.maximum(rms_vals, 1.0), 0, 30)

print(f"\n  RMS distribution:")
print(f"    min={rms_vals.min():>8.1f}   p5={np.percentile(rms_vals,5):>8.1f}   "
      f"p25={np.percentile(rms_vals,25):>8.1f}   p50={np.percentile(rms_vals,50):>8.1f}")
print(f"    p75={np.percentile(rms_vals,75):>8.1f}   p90={np.percentile(rms_vals,90):>8.1f}   "
      f"p95={np.percentile(rms_vals,95):>8.1f}   max={rms_vals.max():>8.1f}")
print(f"    mean={rms_vals.mean():.1f}   std={rms_vals.std():.1f}   "
      f"skew={pd.Series(rms_vals).skew():.2f}")

print(f"\n  Crest distribution:")
print(f"    p50={np.percentile(crest_vals,50):.2f}   p85={np.percentile(crest_vals,85):.2f}   "
      f"p95={np.percentile(crest_vals,95):.2f}   max={crest_vals.max():.2f}")

# ---------- BASELINE STATISTICS ----------
mean_rms = float(np.mean(rms_vals))
std_rms  = float(np.std(rms_vals))

silence_cut    = mean_rms + SILENCE_SIGMA    * std_rms
disruptive_cut = mean_rms + DISRUPTIVE_SIGMA * std_rms

print(f"\n  Thresholds:")
print(f"    silence    : rms < {silence_cut:>8.1f}")
print(f"    disruptive : rms > {disruptive_cut:>8.1f}  OR  crest > {CREST_VALUE:.2f}")
print(f"    (crest > {CREST_VALUE:.2f} corresponds to p{100*np.mean(crest_vals <= CREST_VALUE):.1f})")

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

# ---------- EVENT-RATE CHECK ----------
merged["_ts"] = pd.to_datetime(merged["timestamp"], errors="coerce")
dur_s = (merged["_ts"].max() - merged["_ts"].min()).total_seconds()
dur_min = dur_s / 60

n_dis = int((merged["label"] == "disruptive").sum())
dis_sec = n_dis * 0.25

print(f"\n  Session duration : {dur_min:.1f} min")
print(f"  Disruptive audio : {dis_sec:.0f}s  ({100*dis_sec/dur_s:.1f}%)")
print(f"  Rate             : {dis_sec/dur_min:.1f} s/min")
print(f"  (this session is expected to have a HIGHER rate than the normal")
print(f"   Business Lec — real disruptions were intentionally induced)")

# ---------- SAVE ----------
merged = merged.drop(columns=["_ts"], errors="ignore")
merged = merged.drop(columns=["session_tag"], errors="ignore")  # re-added on merge
merged.to_csv(OUTPUT, index=False)
print(f"\n  Saved → {OUTPUT}  ({len(merged):,} rows)")