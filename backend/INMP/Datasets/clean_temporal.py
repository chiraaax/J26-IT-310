import pandas as pd

INPUT  = "all_data.csv"
OUTPUT = "all_data_temporal_cleaned.csv"

print("=" * 70)
print("TEMPORAL FADE-OUT CLEANING")
print("=" * 70)

df = pd.read_csv(INPUT)
print(f"  Loaded {len(df):,} rows")

# Recompute rms_norm
df["rms_norm"] = (df["rms"] - df["calib_baseline_rms"]) / df["calib_rms_std"].replace(0, 1)

# Sort so we can compute the previous window per session
df = df.sort_values(["session_id", "zone_id", "timestamp"]).reset_index(drop=True)

# Previous window's rms_norm, within the same zone of the same session
df["rms_norm_prev"] = df.groupby(["session_id", "zone_id"])["rms_norm"].shift(1)

# Fade-out criterion:
#   - current label is disruptive
#   - current rms_norm is low (the tail is quiet)
#   - previous window's rms_norm was high (the onset was loud)
is_fadeout = (
    (df["label"] == "disruptive") &
    (df["rms_norm"] < 2.0) &
    (df["rms_norm_prev"] > 6.0)
)

n_removed = int(is_fadeout.sum())
print(f"\n  Fade-out tails detected: {n_removed:,}  ({100*n_removed/len(df):.2f}% of all rows)")

# Report per session — this is the key diagnostic
print("\n  Per session removal:")
print(f"    {'Session':<30} {'Disruptive':>12} {'Removed':>10} {'%':>8}")
print("    " + "-" * 62)

for (loc, tag), grp in df[df["label"] == "disruptive"].groupby(["location", "session_tag"]):
    total_disr = len(grp)
    removed_here = ((df["location"] == loc) & (df["session_tag"] == tag) & is_fadeout).sum()
    pct = 100 * removed_here / total_disr if total_disr else 0
    print(f"    {loc}/{tag:<22} {total_disr:>12,} {removed_here:>10,} {pct:>7.1f}%")

# Save both the clean version and the removed rows (for inspection)
df_clean   = df[~is_fadeout].drop(columns=["rms_norm_prev"]).reset_index(drop=True)
df_removed = df[is_fadeout].drop(columns=["rms_norm_prev"]).reset_index(drop=True)

df_clean.to_csv(OUTPUT, index=False)
df_removed.to_csv("temporal_removed_rows.csv", index=False)

print(f"\n  Saved clean  → {OUTPUT}")
print(f"  Saved removed → temporal_removed_rows.csv")

# Distribution after cleaning
print("\n  Class distribution after cleaning:")
for lbl in ["silence", "ambient", "disruptive"]:
    n = (df_clean["label"] == lbl).sum()
    print(f"    {lbl:12s}  {n:6,}  ({100*n/len(df_clean):.1f}%)")