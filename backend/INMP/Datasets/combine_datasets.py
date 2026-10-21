import os
import glob
import pandas as pd
import re

# ---------- CONFIG ----------
FOLDER      = "."                    # current folder; change if CSVs are elsewhere
OUTPUT_CSV  = "all_data.csv"

# Label keyword → standard label
LABEL_MAP = {
    "silent":     "silence",
    "silence":    "silence",
    "ambient":    "ambient",
    "disruptive": "disruptive",
}

# ---------- PARSE FILENAMES ----------
def parse_filename(fname):
    """
    Expected formats:
      '{old|new} {location}_{label}.csv'
      e.g. 'new library_silent.csv'      → ('new',      'library',    'silence')
           'old study area_ambient.csv'  → ('old',      'study_area', 'ambient')
    Returns (session_tag, location, label) or (None, None, None) if not parseable.
    """
    base = os.path.basename(fname).lower().replace(".csv", "")

    # Extract session tag
    session_tag = None
    for tag in ("old", "new"):
        if base.startswith(tag + " ") or base.startswith(tag + "_"):
            session_tag = tag
            base = base[len(tag) + 1:]
            break

    # Split into location and label using the last underscore
    if "_" not in base:
        return None, None, None
    location_raw, label_raw = base.rsplit("_", 1)

    # Normalize
    location = location_raw.strip().replace(" ", "_")
    label = LABEL_MAP.get(label_raw.strip())

    return session_tag, location, label

# ---------- PROCESS ----------
all_files = sorted(glob.glob(os.path.join(FOLDER, "*.csv")))
# Exclude the output file itself
all_files = [f for f in all_files if not f.endswith(OUTPUT_CSV)]

if not all_files:
    print(f"No CSV files found in {FOLDER}")
    exit(1)

print(f"Found {len(all_files)} CSV files to combine.\n")

dfs = []
for f in all_files:
    session_tag, location, label = parse_filename(f)

    if label is None:
        print(f"  SKIP (unrecognised)  {os.path.basename(f)}")
        continue

    df = pd.read_csv(f)
    df["location"]    = location
    df["session_tag"] = session_tag
    df["label"]       = label
    dfs.append(df)
    print(f"  OK   {os.path.basename(f):45s}  →  location={location:12s}  label={label}")

# ---------- COMBINE ----------
combined = pd.concat(dfs, ignore_index=True)

# Reorder columns so metadata is up front
meta_cols = ["location", "session_tag", "label"]
other_cols = [c for c in combined.columns if c not in meta_cols]
combined = combined[meta_cols + other_cols]

# ---------- REPORT ----------
print(f"\n{'='*60}")
print(f"COMBINED: {len(combined)} total rows")
print(f"{'='*60}")

print("\nRows per label:")
print(combined["label"].value_counts().to_string())

print("\nRows per (location, label):")
print(combined.groupby(["location", "label"]).size().to_string())

print("\nRows per (location, session_tag, label):")
print(combined.groupby(["location", "session_tag", "label"]).size().to_string())

# ---------- SAVE ----------
combined.to_csv(OUTPUT_CSV, index=False)
print(f"\nSaved → {OUTPUT_CSV}")
print(f"Total columns: {len(combined.columns)}")
print(f"Columns: {list(combined.columns)}")