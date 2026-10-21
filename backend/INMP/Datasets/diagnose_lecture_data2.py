"""
diagnose_lecture_data.py  (compatible with data_collector_lecture.py output)

Handles BOTH column conventions:
  - lecture collector: 'final_label', 'auto_label', 'override_label', 'mode'
  - basic collector:   'label'

Outputs a detailed diagnostic and a histogram PNG.
"""

import pandas as pd
import numpy as np
import glob
import os
import matplotlib.pyplot as plt

# ============================================================
# CONFIG
# ============================================================
OUTPUT_PNG = "lecture_diagnostic.png"
LABELS     = ["silence", "ambient", "disruptive"]

# ============================================================
# FIND CANDIDATE CSVs
# ============================================================
patterns = [
    "dataset_lecture_hall_*.csv",
    "dataset_*Lecture*.csv",
    "dataset_*lecture*.csv",
    "dataset_*Lec*.csv",
    "dataset_Business*.csv",
]
csv_files = []
for p in patterns:
    csv_files.extend(glob.glob(p))
csv_files = sorted(set(csv_files))

if not csv_files:
    print("No candidate CSVs found. Files present:")
    for f in sorted(glob.glob("*.csv")):
        print(f"  {f}")
    exit(1)

print(f"Found {len(csv_files)} candidate CSV(s):\n")
for f in csv_files:
    print(f"  {f}")
print()

# ============================================================
# NORMALIZE COLUMNS
# ============================================================
def normalize(df, fname):
    """Auto-detect label column, print what was found, add 'label_effective'."""
    print(f"[LOAD] {os.path.basename(fname)}")
    print(f"       rows    : {len(df):,}")
    print(f"       columns : {list(df.columns)}")

    # Detect label column
    if "final_label" in df.columns:
        df["label_effective"] = df["final_label"]
        print(f"       format  : LECTURE collector (using 'final_label')")
    elif "label" in df.columns:
        df["label_effective"] = df["label"]
        print(f"       format  : BASIC collector (using 'label')")
    else:
        print(f"       ERROR   : no label column found. SKIPPING.")
        return None

    if "rms" not in df.columns:
        print(f"       ERROR   : no 'rms' column. SKIPPING.")
        return None

    # Fill optional columns
    if "auto_label"     not in df.columns: df["auto_label"]     = df["label_effective"]
    if "override_label" not in df.columns: df["override_label"] = ""
    if "mode"           not in df.columns: df["mode"]           = "manual"

    print()
    return df

# ============================================================
# LOAD ALL SESSIONS
# ============================================================
sessions = {}
for f in csv_files:
    df = pd.read_csv(f)
    df = normalize(df, f)
    if df is not None:
        sessions[os.path.basename(f).replace(".csv","")] = df

if not sessions:
    print("No valid sessions loaded.")
    exit(1)

# ============================================================
# PER-SESSION ANALYSIS
# ============================================================
print("=" * 90)
print("PER-SESSION DIAGNOSTIC")
print("=" * 90)

for name, df in sessions.items():
    print(f"\n########## {name} ##########")
    print(f"Zones       : {df['zone_id'].unique().tolist()}")
    print(f"Total rows  : {len(df):,}")

    # Zone coverage
    print(f"\nRows per zone × label:")
    pivot = df.groupby(["zone_id", "label_effective"]).size().unstack(fill_value=0)
    print(pivot.to_string())

    # RMS stats per label
    print(f"\nRMS statistics per label:")
    print(f"  {'Label':<12} {'Count':>8} {'mean':>9} {'p10':>9} {'p50':>9} {'p90':>9} {'max':>9}")
    print("  " + "-" * 72)
    for lbl in LABELS:
        sub = df[df["label_effective"] == lbl]
        if len(sub) == 0:
            print(f"  {lbl:<12} {0:>8}")
            continue
        print(f"  {lbl:<12} {len(sub):>8,} "
              f"{sub['rms'].mean():>9.1f} "
              f"{sub['rms'].quantile(0.10):>9.1f} "
              f"{sub['rms'].quantile(0.50):>9.1f} "
              f"{sub['rms'].quantile(0.90):>9.1f} "
              f"{sub['rms'].max():>9.1f}")

    # Separation check
    print(f"\nSeparation check:")
    def q(lbl, perc):
        s = df[df["label_effective"] == lbl]["rms"]
        return s.quantile(perc) if len(s) else 0.0

    s90 = q("silence", 0.90)
    a10 = q("ambient", 0.10)
    a90 = q("ambient", 0.90)
    d10 = q("disruptive", 0.10)

    print(f"  silence p90       = {s90:.1f}")
    print(f"  ambient p10       = {a10:.1f}   (should be > silence p90)")
    print(f"  ambient p90       = {a90:.1f}")
    print(f"  disruptive p10    = {d10:.1f}   (should be > ambient p90)")

    if a10 > s90 and d10 > a90:
        print(f"  -> ✅ Labels are cleanly separated")
    else:
        print(f"  -> ⚠️  OVERLAP detected — mislabelling")

        # Diagnose WHERE the overlap is
        if a10 <= s90:
            print(f"     · ambient overlaps silence (ambient p10 <= silence p90)")
        if d10 <= a90:
            print(f"     · disruptive overlaps ambient (disruptive p10 <= ambient p90)")

    # Baseline comparison — is the calibration correct?
    if "lecture_baseline_mean" in df.columns:
        b_mean = df["lecture_baseline_mean"].median()
        b_std  = df["lecture_baseline_std"].median()
        overall_median = df["rms"].median()
        print(f"\nCalibration sanity check:")
        print(f"  Lecture baseline mean (used for labelling): {b_mean:.1f}")
        print(f"  Overall session median rms                 : {overall_median:.1f}")
        ratio = overall_median / b_mean if b_mean else 0
        print(f"  Ratio (session_median / baseline_mean)    : {ratio:.2f}")
        if ratio < 0.85:
            print(f"  ⚠️  Session median is much LOWER than calibration mean.")
            print(f"     -> The calibration window was likely louder than the actual lecture.")
            print(f"     -> This explains why real disruptive events got labelled ambient.")
        elif ratio > 1.15:
            print(f"  ⚠️  Session median is HIGHER than calibration mean.")
            print(f"     -> The lecture got louder after calibration.")
        else:
            print(f"  ✅ Session median is close to calibration mean — calibration looks fine.")

    # Override usage
    if "override_label" in df.columns:
        n_override = (df["override_label"].astype(str) != "").sum()
        print(f"\nManual overrides used: {n_override:,} / {len(df):,} "
              f"({100*n_override/len(df):.1f}%)")

    # Auto vs final: how often did auto vs override disagree?
    if "auto_label" in df.columns and "override_label" in df.columns:
        non_empty_overrides = df[df["override_label"].astype(str) != ""]
        if len(non_empty_overrides):
            disagree = (non_empty_overrides["auto_label"] !=
                        non_empty_overrides["override_label"]).sum()
            print(f"  Of {len(non_empty_overrides):,} overrides, "
                  f"{disagree:,} disagreed with auto label")

# ============================================================
# HISTOGRAMS
# ============================================================
n = len(sessions)
fig, axes = plt.subplots(n, 2, figsize=(14, 4 * n))
if n == 1:
    axes = [axes]

for i, (name, df) in enumerate(sessions.items()):
    # Left: RMS histogram by label
    ax = axes[i][0]
    for lbl, col in zip(LABELS, ["#2ecc71", "#f39c12", "#e74c3c"]):
        sub = df[df["label_effective"] == lbl]
        if len(sub):
            ax.hist(sub["rms"], bins=60, alpha=0.55,
                    label=f"{lbl} (n={len(sub):,})", color=col)
    ax.set_title(f"{name}\nRMS distribution by label")
    ax.set_xlabel("RMS")
    ax.set_ylabel("Count")
    ax.legend()
    ax.grid(alpha=0.3)

    # Right: rms_norm computed from session median (robust)
    ax = axes[i][1]
    med = df["rms"].median()
    mad = (df["rms"] - med).abs().median() * 1.4826
    if mad > 0:
        df["rms_norm_session"] = (df["rms"] - med) / mad
        for lbl, col in zip(LABELS, ["#2ecc71", "#f39c12", "#e74c3c"]):
            sub = df[df["label_effective"] == lbl]
            if len(sub):
                ax.hist(sub["rms_norm_session"], bins=60, alpha=0.55,
                        label=lbl, color=col)
        ax.axvline(-1.0, color="black", linestyle="--", alpha=0.5)
        ax.axvline( 3.0, color="black", linestyle="--", alpha=0.5)
        ax.set_title(f"{name}\nrms_norm by label (session-based)")
        ax.set_xlabel("rms_norm = (rms - session_median) / robust_std")
        ax.set_ylabel("Count")
        ax.legend()
        ax.grid(alpha=0.3)

plt.tight_layout()
plt.savefig(OUTPUT_PNG, dpi=100)
print(f"\n[PLOT] saved -> {OUTPUT_PNG}")
print(f"       Open it in Windows Photos to see the distributions visually.")