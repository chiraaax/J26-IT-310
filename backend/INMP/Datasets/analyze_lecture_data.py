"""
analyze_lecture_data.py

Purpose: Study the two lecture-hall datasets before deciding on a labelling
strategy. Prints comprehensive statistics, compares the two sessions, and
recommends a labelling scheme based on the actual distribution shapes.

Prerequisite: pip install pandas numpy
Optional:     pip install matplotlib  (for histogram PNGs)
"""

import os
import glob
import pandas as pd
import numpy as np

# ---------- CONFIG ----------
# Auto-discover lecture files matching these patterns
FILE_PATTERNS = [
    "dataset_Business Lec - 20261014_0851.csv",          # auto-labeller program
    "dataset_Business Lec - Old Program_20261014_0858.csv", # old program
]

# Where to save output artifacts
OUTPUT_DIR = "."

# ---------- HELPERS ----------
def find_input_files():
    files = []
    for pattern in FILE_PATTERNS:
        files.extend(glob.glob(pattern))
    # dedupe + sort
    return sorted(set(files))

def safe_percentiles(series, pcts):
    return {p: float(np.percentile(series, p)) for p in pcts}

def fmt_row(cells, widths):
    return "  " + "".join(f"{str(c):<{w}}" for c, w in zip(cells, widths))

# ---------- LOAD ----------
print("=" * 78)
print("LECTURE-HALL DATA ANALYSIS")
print("=" * 78)

files = find_input_files()
if not files:
    print("No input files found. Edit FILE_PATTERNS in the script.")
    exit(1)

print(f"\nFound {len(files)} files:")
for f in files:
    print(f"  • {f}")

datasets = []
for f in files:
    df = pd.read_csv(f)
    df["_source_file"] = os.path.basename(f)
    datasets.append(df)
    print(f"    {os.path.basename(f):<50s}  rows={len(df):>6,}  "
          f"cols={len(df.columns)}")

# ============================================================================
# PER-DATASET SUMMARY
# ============================================================================
print("\n" + "=" * 78)
print("PER-DATASET SUMMARY")
print("=" * 78)

for df in datasets:
    src = df["_source_file"].iloc[0]
    print(f"\n─── {src} ───")

    # Time span
    df["_ts"] = pd.to_datetime(df["timestamp"], errors="coerce")
    t_min = df["_ts"].min()
    t_max = df["_ts"].max()
    duration_s = (t_max - t_min).total_seconds()
    print(f"  Time span    : {t_min} → {t_max}  ({duration_s/60:.1f} min)")

    # Zone(s)
    print(f"  Zones        : {sorted(df['zone_id'].dropna().unique().tolist())}")

    # Original labels (if any)
    label_cols = [c for c in ["label", "final_label", "auto_label",
                              "override_label", "mode"]
                  if c in df.columns]
    if label_cols:
        print(f"  Label columns: {label_cols}")
        for c in label_cols:
            counts = df[c].value_counts(dropna=False).to_dict()
            print(f"    {c:16s}  {counts}")

    # Feature distributions
    print(f"\n  RMS distribution:")
    rms = df["rms"].dropna().values
    pcts = safe_percentiles(rms, [5, 10, 25, 50, 75, 90, 95])
    print(f"    n={len(rms):,}   min={rms.min():.1f}   "
          f"p5={pcts[5]:.1f}   p10={pcts[10]:.1f}   p25={pcts[25]:.1f}")
    print(f"    p50={pcts[50]:.1f}   p75={pcts[75]:.1f}   "
          f"p90={pcts[90]:.1f}   p95={pcts[95]:.1f}   max={rms.max():.1f}")
    print(f"    mean={rms.mean():.1f}   std={rms.std():.1f}   "
          f"skew={pd.Series(rms).skew():.2f}   kurt={pd.Series(rms).kurtosis():.2f}")

    # Peak
    peak = df["peak"].dropna().values
    print(f"\n  Peak distribution:")
    print(f"    min={peak.min():.1f}   p50={np.percentile(peak,50):.1f}   "
          f"p90={np.percentile(peak,90):.1f}   max={peak.max():.1f}")

    # Crest factor (impulsiveness)
    crest = np.clip(peak / np.maximum(rms, 1), 0, 30)
    print(f"\n  Crest factor (peak/rms) distribution:")
    print(f"    min={crest.min():.2f}   p50={np.percentile(crest,50):.2f}   "
          f"p90={np.percentile(crest,90):.2f}   max={crest.max():.2f}")

    # ZCR
    zcr = df["zcr"].dropna().values
    print(f"\n  ZCR distribution:")
    print(f"    min={zcr.min():.1f}   p50={np.percentile(zcr,50):.1f}   "
          f"p90={np.percentile(zcr,90):.1f}   max={zcr.max():.1f}")

    # Centroid
    cen = df["centroid"].dropna().values
    print(f"\n  Centroid distribution:")
    print(f"    min={cen.min():.1f}   p50={np.percentile(cen,50):.1f}   "
          f"p90={np.percentile(cen,90):.1f}   max={cen.max():.1f}")

# ============================================================================
# CROSS-DATASET COMPARISON
# ============================================================================
print("\n" + "=" * 78)
print("CROSS-DATASET COMPARISON")
print("=" * 78)

if len(datasets) >= 2:
    print(f"\n  {'Metric':<16} ", end="")
    for df in datasets:
        print(f"{df['_source_file'].iloc[0][:30]:<32}", end="")
    print()

    header = ["RMS median", "RMS p90", "RMS max", "Peak median",
              "Crest median", "ZCR median", "Centroid median"]
    for label in header:
        print(f"  {label:<16} ", end="")
        for df in datasets:
            if "RMS" in label:
                col, stat = "rms", label.split()[1]
                if stat == "median": v = df[col].median()
                elif stat == "p90":  v = df[col].quantile(0.9)
                elif stat == "max":  v = df[col].max()
            elif "Peak" in label:
                v = df["peak"].median()
            elif "Crest" in label:
                crest = np.clip(df["peak"] / np.maximum(df["rms"], 1), 0, 30)
                v = crest.median()
            elif "ZCR" in label:
                v = df["zcr"].median()
            elif "Centroid" in label:
                v = df["centroid"].median()
            print(f"{v:<32.2f}", end="")
        print()

    # Check for overlap in time
    print("\n  Temporal overlap check:")
    t_ranges = []
    for df in datasets:
        ts = pd.to_datetime(df["timestamp"], errors="coerce")
        t_ranges.append((ts.min(), ts.max()))
    for i, (s1, e1) in enumerate(t_ranges):
        print(f"    File {i+1}: {s1} → {e1}")
    if len(t_ranges) >= 2:
        overlap_start = max(t_ranges[0][0], t_ranges[1][0])
        overlap_end   = min(t_ranges[0][1], t_ranges[1][1])
        if overlap_end > overlap_start:
            print(f"    >>> OVERLAP: {overlap_start} → {overlap_end}")
        else:
            gap_s = (t_ranges[1][0] - t_ranges[0][1]).total_seconds()
            print(f"    >>> GAP of {gap_s:.0f}s between them "
                  f"(sequential, non-overlapping)")

# ============================================================================
# MERGED ANALYSIS
# ============================================================================
print("\n" + "=" * 78)
print("MERGED ANALYSIS (treating both files as one continuous lecture)")
print("=" * 78)

# Merge on timestamp (they may overlap; keep all rows)
merged = pd.concat(datasets, ignore_index=True)
merged["_ts"] = pd.to_datetime(merged["timestamp"], errors="coerce")
merged = merged.sort_values("_ts").reset_index(drop=True)

print(f"\n  Total rows: {len(merged):,}")
print(f"  Combined time span: {merged['_ts'].min()} → {merged['_ts'].max()}")
print(f"  Duration: {(merged['_ts'].max() - merged['_ts'].min()).total_seconds()/60:.1f} min")

rms_all = merged["rms"].dropna().values
print(f"\n  Combined RMS distribution:")
print(f"    min={rms_all.min():.1f}   "
      f"p5={np.percentile(rms_all,5):.1f}   "
      f"p10={np.percentile(rms_all,10):.1f}   "
      f"p25={np.percentile(rms_all,25):.1f}")
print(f"    p50={np.percentile(rms_all,50):.1f}   "
      f"p75={np.percentile(rms_all,75):.1f}   "
      f"p90={np.percentile(rms_all,90):.1f}   "
      f"p95={np.percentile(rms_all,95):.1f}   "
      f"max={rms_all.max():.1f}")
print(f"    mean={rms_all.mean():.1f}   "
      f"std={rms_all.std():.1f}   "
      f"skew={pd.Series(rms_all).skew():.2f}   "
      f"kurt={pd.Series(rms_all).kurtosis():.2f}")

# ============================================================================
# CANDIDATE LABELLING STRATEGIES COMPARED
# ============================================================================
print("\n" + "=" * 78)
print("CANDIDATE LABELLING STRATEGIES — comparison")
print("=" * 78)

strategies = [
    ("p10/p90 (recommended default)",
     np.percentile(rms_all, 10),
     np.percentile(rms_all, 90)),
    ("p5/p95 (aggressive extremes)",
     np.percentile(rms_all, 5),
     np.percentile(rms_all, 95)),
    ("p15/p85 (conservative, more ambient)",
     np.percentile(rms_all, 15),
     np.percentile(rms_all, 85)),
    ("p20/p80 (widest disruptive class)",
     np.percentile(rms_all, 20),
     np.percentile(rms_all, 80)),
]

print(f"\n  {'Strategy':<40} {'silence <':>12} {'disruptive >':>14} "
      f"{'#sil':>8} {'#amb':>8} {'#dis':>8}")
print("  " + "-" * 96)

for name, lo, hi in strategies:
    n_sil = int((rms_all < lo).sum())
    n_dis = int((rms_all > hi).sum())
    n_amb = len(rms_all) - n_sil - n_dis
    print(f"  {name:<40} {lo:>12.1f} {hi:>14.1f} "
          f"{n_sil:>8,} {n_amb:>8,} {n_dis:>8,}")

# ============================================================================
# BIMODALITY CHECK — are there natural clusters?
# ============================================================================
print("\n" + "=" * 78)
print("DISTRIBUTION SHAPE ANALYSIS")
print("=" * 78)

# Simple histogram-based peak detection
counts, bin_edges = np.histogram(rms_all, bins=40)
# Find local maxima
peaks = []
for i in range(1, len(counts) - 1):
    if counts[i] > counts[i-1] and counts[i] > counts[i+1]:
        peaks.append((bin_edges[i], counts[i]))

print(f"\n  Histogram peaks found: {len(peaks)}")
for center, count in sorted(peaks, key=lambda x: -x[1])[:5]:
    print(f"    RMS ≈ {center:.0f}  (count={count})")

if len(peaks) >= 2:
    # Two or more peaks → bimodal — cluster-based labelling is viable
    top2 = sorted(peaks, key=lambda x: -x[1])[:2]
    top2_sorted = sorted(top2, key=lambda x: x[0])
    valley_candidate = (top2_sorted[0][0] + top2_sorted[1][0]) / 2
    print(f"\n  >>> Looks BIMODAL")
    print(f"  >>> Suggested cut between modes ≈ RMS = {valley_candidate:.0f}")
    print(f"  >>> Consider Gaussian Mixture Model or a cut at the valley")
else:
    print(f"\n  >>> Looks UNIMODAL (single peak)")
    print(f"  >>> Percentile-based labelling is more appropriate than clustering")

# ============================================================================
# TEMPORAL SNAPSHOT — where were the loud moments?
# ============================================================================
print("\n" + "=" * 78)
print("TEMPORAL SNAPSHOT — RMS over time")
print("=" * 78)

# Downsample to ~1 value per 30 s for readability
merged["_minute"] = merged["_ts"].dt.floor("30s")
per30 = merged.groupby("_minute")["rms"].agg(["mean", "max", "count"])
per30 = per30.reset_index().dropna()

print(f"\n  {'Time (30s bucket)':<24} {'mean_rms':>10} {'max_rms':>10} {'n':>6}")
print("  " + "-" * 54)
for _, row in per30.head(20).iterrows():
    ts = row["_minute"].strftime("%H:%M:%S") if hasattr(row["_minute"], "strftime") else str(row["_minute"])
    print(f"  {ts:<24} {row['mean']:>10.1f} {row['max']:>10.1f} {int(row['count']):>6}")
if len(per30) > 20:
    print(f"  ... ({len(per30) - 20} more buckets)")
    # Also print the last 5
    for _, row in per30.tail(5).iterrows():
        ts = row["_minute"].strftime("%H:%M:%S") if hasattr(row["_minute"], "strftime") else str(row["_minute"])
        print(f"  {ts:<24} {row['mean']:>10.1f} {row['max']:>10.1f} {int(row['count']):>6}")

# ============================================================================
# OPTIONAL PLOTS
# ============================================================================
try:
    import matplotlib
    matplotlib.use("Agg")   # non-interactive backend
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(2, 2, figsize=(14, 8))

    # Histogram of RMS
    axes[0, 0].hist(rms_all, bins=60, alpha=0.7, edgecolor="black")
    axes[0, 0].axvline(np.percentile(rms_all, 10), color="blue",
                       linestyle="--", label="p10 (silence cutoff)")
    axes[0, 0].axvline(np.percentile(rms_all, 90), color="red",
                       linestyle="--", label="p90 (disruptive cutoff)")
    axes[0, 0].set_title("RMS distribution")
    axes[0, 0].set_xlabel("RMS")
    axes[0, 0].set_ylabel("Count")
    axes[0, 0].legend()

    # Histogram of Crest
    crest_all = np.clip(merged["peak"].values / np.maximum(merged["rms"].values, 1),
                        0, 20)
    axes[0, 1].hist(crest_all, bins=60, alpha=0.7, edgecolor="black")
    axes[0, 1].set_title("Crest factor distribution (impulsiveness)")
    axes[0, 1].set_xlabel("peak / rms")
    axes[0, 1].set_ylabel("Count")

    # RMS over time
    axes[1, 0].plot(merged["_ts"], merged["rms"], linewidth=0.5)
    axes[1, 0].set_title("RMS over time")
    axes[1, 0].set_xlabel("Time")
    axes[1, 0].set_ylabel("RMS")
    axes[1, 0].tick_params(axis="x", rotation=30)

    # Peak vs RMS scatter (colored by crest)
    axes[1, 1].scatter(merged["rms"], merged["peak"],
                       c=crest_all, cmap="viridis",
                       s=2, alpha=0.5)
    axes[1, 1].set_title("Peak vs RMS (color = crest)")
    axes[1, 1].set_xlabel("RMS")
    axes[1, 1].set_ylabel("Peak")

    plt.tight_layout()
    plot_path = os.path.join(OUTPUT_DIR, "lecture_data_analysis.png")
    plt.savefig(plot_path, dpi=100)
    print(f"\n  Plots saved → {plot_path}")

except ImportError:
    print("\n  [i] matplotlib not installed — skipping plots.")
    print("      Install with: python -m pip install matplotlib")

# ============================================================================
# RECOMMENDATION
# ============================================================================
print("\n" + "=" * 78)
print("RECOMMENDATION")
print("=" * 78)

skew = pd.Series(rms_all).skew()
kurt = pd.Series(rms_all).kurtosis()
bimodal = len(peaks) >= 2

print(f"\n  Distribution properties:")
print(f"    Skewness  : {skew:.2f}  (>1 strongly right-skewed)")
print(f"    Kurtosis  : {kurt:.2f}  (>3 heavy-tailed)")
print(f"    Modality  : {'bimodal' if bimodal else 'unimodal'}")

print(f"\n  Recommended labelling strategy:")
if bimodal:
    print(f"    → Cluster-based labelling (find the valley between modes)")
    print(f"    → Or use a Gaussian Mixture Model on [rms, peak, crest]")
else:
    print(f"    → Percentile-based labelling with p10/p90 cutoffs")
    print(f"    → Cutoffs:")
    print(f"        silence    < rms = {np.percentile(rms_all, 10):.1f}")
    print(f"        disruptive > rms = {np.percentile(rms_all, 90):.1f}")
    print(f"    → Additionally, mark 'disruptive' when crest > "
          f"{np.percentile(crest_all, 85):.2f} (impulsive events)")

print(f"\n  Expected class balance at p10/p90:")
n_sil = int((rms_all < np.percentile(rms_all, 10)).sum())
n_dis = int((rms_all > np.percentile(rms_all, 90)).sum())
n_amb = len(rms_all) - n_sil - n_dis
print(f"    silence    : {n_sil:,}  ({100*n_sil/len(rms_all):.1f}%)")
print(f"    ambient    : {n_amb:,}  ({100*n_amb/len(rms_all):.1f}%)")
print(f"    disruptive : {n_dis:,}  ({100*n_dis/len(rms_all):.1f}%)")

print(f"\n  Next step: after reviewing these results, run the relabelling script")
print(f"  with the recommended cutoffs.")
print()