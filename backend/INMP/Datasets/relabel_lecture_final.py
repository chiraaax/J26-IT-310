"""
relabel_lecture_final.py  (v2)

Re-labels two overlapping lecture-hall datasets using a dual-criterion rule.

v2 changes:
  - Replaced percentile-based crest cutoff (CREST_PCT) with a FIXED crest value
    (CREST_VALUE = 5.5). This prevents the disruptive class from being forced
    to a fixed percentage by construction.
  - Tightened DISRUPTIVE_SIGMA from 2.5 to 3.0.
"""

import os
import pandas as pd
import numpy as np

# ============================================================
# CONFIG
# ============================================================
INPUT_FILES = [
    "dataset_Business Lec - 20261014_0851.csv",
    "dataset_Business Lec - Old Program_20261014_0858.csv",
]
OUTPUT_FILE = "lecture_hall_relabelled.csv"
PLOT_FILE   = "lecture_relabelled_distribution.png"

# Threshold parameters (v2: fixed crest, tighter sigma)
SILENCE_SIGMA    = -1.0     # rms_norm < this       -> silence
DISRUPTIVE_SIGMA =  3.0     # rms_norm > this       -> disruptive (was 2.5)
CREST_VALUE      =  5.5     # crest > this          -> disruptive (replaces CREST_PCT)

# ============================================================
# LOAD
# ============================================================
print("=" * 78)
print("LECTURE-HALL RE-LABELLING — v2 (fixed crest, tighter sigma)")
print("=" * 78)

dfs = []
for f in INPUT_FILES:
    if not os.path.exists(f):
        print(f"[WARN] missing: {f}")
        continue
    df = pd.read_csv(f)
    df["_source"] = os.path.basename(f)
    dfs.append(df)
    print(f"  Loaded {os.path.basename(f):<50s}  rows={len(df):>6,}")

if not dfs:
    print("No files loaded. Abort.")
    exit(1)

# ============================================================
# NORMALIZE COLUMNS
# ============================================================
KEEP = [
    "timestamp", "session_id", "location", "time_of_day", "zone_id",
    "rms", "peak", "zcr", "centroid",
    "calib_baseline_rms", "calib_rms_std",
    "calib_baseline_peak", "calib_p90_peak",
] + [f"mfcc{i+1}" for i in range(13)]

for i, df in enumerate(dfs):
    present = [c for c in KEEP if c in df.columns]
    dfs[i] = df[present].copy()

# ============================================================
# MERGE + DEDUP
# ============================================================
merged = pd.concat(dfs, ignore_index=True)
print(f"\n  Combined rows (pre-dedup): {len(merged):,}")

before = len(merged)
merged = merged.drop_duplicates(subset=["timestamp", "zone_id"], keep="first")
print(f"  After dedup             : {len(merged):,}  (removed {before - len(merged):,})")

merged = merged.dropna(subset=["rms", "peak", "zcr", "centroid"])
print(f"  After na-drop           : {len(merged):,}")

# ============================================================
# BASELINE STATISTICS
# ============================================================
rms_vals   = merged["rms"].values
peak_vals  = merged["peak"].values
crest_vals = np.clip(peak_vals / np.maximum(rms_vals, 1.0), 0, 30)

mean_rms  = float(np.mean(rms_vals))
std_rms   = float(np.std(rms_vals))

silence_cut    = mean_rms + SILENCE_SIGMA    * std_rms
disruptive_cut = mean_rms + DISRUPTIVE_SIGMA * std_rms

# For diagnostics only — report what percentile the fixed crest value sits at
pct_at_crest = 100.0 * np.mean(crest_vals <= CREST_VALUE)

print(f"\n  Baseline statistics (merged session):")
print(f"    RMS mean   = {mean_rms:8.1f}")
print(f"    RMS std    = {std_rms:8.1f}")
print(f"    Crest p50  = {np.percentile(crest_vals, 50):8.2f}")
print(f"    Crest p90  = {np.percentile(crest_vals, 90):8.2f}")
print(f"    Crest p95  = {np.percentile(crest_vals, 95):8.2f}")

print(f"\n  Thresholds (v2):")
print(f"    silence    : rms < {silence_cut:8.1f}")
print(f"    disruptive : rms > {disruptive_cut:8.1f}   OR   crest > {CREST_VALUE:.2f}")
print(f"                 (crest > {CREST_VALUE:.2f} corresponds to percentile p{pct_at_crest:.1f})")

# ============================================================
# APPLY LABELS
# ============================================================
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

merged["label"]    = labels
merged["crest"]    = np.round(crest_vals, 3)
merged["rms_norm"] = np.round((rms_vals - mean_rms) / std_rms, 3)

# ============================================================
# REPORT
# ============================================================
print("\n" + "=" * 78)
print("RESULTING LABEL DISTRIBUTION")
print("=" * 78)

counts = merged["label"].value_counts()
total  = len(merged)
for lbl in ["silence", "ambient", "disruptive"]:
    n = int(counts.get(lbl, 0))
    print(f"  {lbl:12s}  {n:>7,}  ({100*n/total:>5.1f}%)")
print(f"  {'TOTAL':12s}  {total:>7,}")

# ============================================================
# SANITY CHECKS
# ============================================================
print("\n" + "=" * 78)
print("SANITY CHECKS")
print("=" * 78)

print(f"\n  Per-zone distribution:")
for zone, grp in merged.groupby("zone_id"):
    c = grp["label"].value_counts()
    n = len(grp)
    parts = []
    for lbl in ["silence", "ambient", "disruptive"]:
        cnt = int(c.get(lbl, 0))
        parts.append(f"{lbl[0].upper()}:{cnt:>5} ({100*cnt/n:>4.1f}%)")
    print(f"    {zone}:  " + "  ".join(parts))

print(f"\n  RMS by label:")
print(f"    {'label':<12} {'mean':>8} {'median':>8} {'p10':>8} {'p90':>8} {'max':>9}")
for lbl in ["silence", "ambient", "disruptive"]:
    sub = merged[merged["label"] == lbl]
    if len(sub) == 0:
        continue
    print(f"    {lbl:<12} "
          f"{sub['rms'].mean():>8.1f} "
          f"{sub['rms'].median():>8.1f} "
          f"{sub['rms'].quantile(0.10):>8.1f} "
          f"{sub['rms'].quantile(0.90):>8.1f} "
          f"{sub['rms'].max():>9.1f}")

print(f"\n  Crest by label:")
print(f"    {'label':<12} {'mean':>8} {'median':>8} {'p90':>8} {'max':>8}")
for lbl in ["silence", "ambient", "disruptive"]:
    sub = merged[merged["label"] == lbl]
    if len(sub) == 0:
        continue
    print(f"    {lbl:<12} "
          f"{sub['crest'].mean():>8.2f} "
          f"{sub['crest'].median():>8.2f} "
          f"{sub['crest'].quantile(0.90):>8.2f} "
          f"{sub['crest'].max():>8.2f}")

# ============================================================
# EVENT-RATE CHECK
# ============================================================
print("\n" + "=" * 78)
print("EVENT-RATE CHECK (physical plausibility)")
print("=" * 78)

merged["_ts"] = pd.to_datetime(merged["timestamp"], errors="coerce")
duration_s   = (merged["_ts"].max() - merged["_ts"].min()).total_seconds()
duration_min = duration_s / 60

n_dis = int((merged["label"] == "disruptive").sum())
n_sil = int((merged["label"] == "silence").sum())
n_amb = int((merged["label"] == "ambient").sum())

dis_seconds = n_dis * 0.25
sil_seconds = n_sil * 0.25

print(f"\n  Session duration       : {duration_min:.1f} min")
print(f"  Disruptive windows     : {n_dis:,}  "
      f"≈ {dis_seconds:.0f}s  "
      f"({100*dis_seconds/duration_s:.1f}% of session)")
print(f"  Silence windows        : {n_sil:,}  "
      f"≈ {sil_seconds:.0f}s  "
      f"({100*sil_seconds/duration_s:.1f}% of session)")
print(f"  Ambient windows        : {n_amb:,}")

if dis_seconds > 0:
    dis_per_min = dis_seconds / duration_min
    print(f"\n  Disruptive audio rate  : {dis_per_min:.1f} seconds per minute")
    print(f"  (target range 2-6 s/min for a typical lecture)")

    if dis_per_min < 1:
        print(f"\n  ⚠️  Very low — try lowering CREST_VALUE to 5.0")
    elif dis_per_min > 8:
        print(f"\n  ⚠️  Very high — try raising CREST_VALUE to 6.0")
    else:
        print(f"\n  ✓  Rate looks physically plausible")

# ============================================================
# SAVE
# ============================================================
merged = merged.drop(columns=["_source"], errors="ignore")
merged.drop(columns=["_ts"], inplace=True, errors="ignore")
merged.to_csv(OUTPUT_FILE, index=False)
print(f"\n  Saved → {OUTPUT_FILE}  ({len(merged):,} rows)")

# ============================================================
# VISUALISATION
# ============================================================
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
    colors = {"silence": "#4a90d9", "ambient": "#e6a400", "disruptive": "#cc2424"}

    # 1. RMS
    for lbl, color in colors.items():
        sub = merged[merged["label"] == lbl]
        if len(sub) == 0: continue
        axes[0].hist(sub["rms"], bins=60, alpha=0.6, label=lbl, color=color)
    axes[0].axvline(silence_cut,    color="blue", linestyle="--", label="silence cut")
    axes[0].axvline(disruptive_cut, color="red",  linestyle="--", label="disruptive cut")
    axes[0].set_title("RMS by assigned label")
    axes[0].set_xlabel("RMS"); axes[0].set_ylabel("Count"); axes[0].legend()

    # 2. Crest
    for lbl, color in colors.items():
        sub = merged[merged["label"] == lbl]
        if len(sub) == 0: continue
        axes[1].hist(sub["crest"], bins=60, alpha=0.6, label=lbl, color=color)
    axes[1].axvline(CREST_VALUE, color="red", linestyle="--",
                    label=f"crest={CREST_VALUE}")
    axes[1].set_title("Crest factor by label")
    axes[1].set_xlabel("peak / rms"); axes[1].legend()

    # 3. rms_norm
    for lbl, color in colors.items():
        sub = merged[merged["label"] == lbl]
        if len(sub) == 0: continue
        axes[2].hist(sub["rms_norm"], bins=60, alpha=0.6, label=lbl, color=color)
    axes[2].axvline(SILENCE_SIGMA,    color="blue", linestyle="--")
    axes[2].axvline(DISRUPTIVE_SIGMA, color="red",  linestyle="--")
    axes[2].set_title("rms_norm by label")
    axes[2].set_xlabel("(rms − mean) / std"); axes[2].legend()

    plt.tight_layout()
    plt.savefig(PLOT_FILE, dpi=100)
    print(f"  Plot  → {PLOT_FILE}")

except ImportError:
    print("  (matplotlib not installed — skipping plot)")

print("\nDone.")