"""Import KoObEy's format-v4 CSV without changing its spells or conditions."""

import argparse
import csv
import hashlib
import io
import json
from collections import defaultdict
from pathlib import Path


SPELL_CODES = {
    "(": "IF_HP",
    "{": "IF_HALF",
    "+": "ADD_TRIGGER",
    ":": "RESET",
    "2": "DIVIDE_2",
    "3": "DIVIDE_3",
    "4": "DIVIDE_4",
    "0": "DIVIDE_10",
    "m": "ELECTRIC_CHARGE",
    "T": "TAU",
    "?": "BURST_8",
    ";": "BLOOD_MAGIC",
}
BUCKET_SIZE = 100


def read_contribution(source):
    """Validate metadata and every row; keep each (sequence, draws, half)."""
    raw = Path(source).read_bytes()
    stream = io.StringIO(raw.decode("utf-8-sig"), newline="")
    metadata = {}
    while True:
        position = stream.tell()
        line = stream.readline()
        if not line.startswith("#"):
            stream.seek(position)
            break
        key, separator, value = line[1:].strip().partition("=")
        if not separator or key in metadata:
            raise ValueError("Invalid or duplicate metadata field")
        metadata[key] = value

    expected = {"format_version": "4", "status": "ok", "keep": "shortest", "half": "both"}
    if any(metadata.get(key) != value for key, value in expected.items()):
        raise ValueError("Expected a completed format-v4, shortest, half=both export")
    try:
        limits = {key: int(metadata[key]) for key in ("min_len", "max_len", "max_count", "max_draws", "search_depth")}
    except (KeyError, ValueError) as error:
        raise ValueError("Missing or invalid search limits") from error
    if limits["min_len"] != 0 or limits["max_len"] != 11 or limits["search_depth"] != 11 or limits["max_draws"] != 1 or limits["max_count"] < 0:
        raise ValueError("This importer expects the 11-slot, draws=1 contribution")
    alphabet = metadata.get("alphabet", "")
    if set(alphabet) != set(SPELL_CODES) or len(alphabet) != len(SPELL_CODES):
        raise ValueError("Unknown or incomplete spell alphabet")

    reader = csv.DictReader(stream)
    if reader.fieldnames != ["sequence", "output", "length", "draws", "half"]:
        raise ValueError("Unexpected CSV columns")
    rows = []
    seen = set()
    for number, row in enumerate(reader, start=len(metadata) + 2):
        try:
            sequence = row["sequence"]
            output, length, draws, half = (int(row[key]) for key in ("output", "length", "draws", "half"))
            if None in row or not set(sequence) <= set(SPELL_CODES):
                raise ValueError("unknown symbols or extra fields")
            if not 0 <= output <= limits["max_count"] or not 0 <= length <= limits["max_len"] or length != len(sequence):
                raise ValueError("invalid output or sequence length")
            if draws != 1 or half not in (0, 1):
                raise ValueError("invalid draws or half condition")
            key = (sequence, draws, half)
            if key in seen:
                raise ValueError("duplicate sequence and conditions")
            seen.add(key)
            rows.append((sequence, output, length, draws, half))
        except (TypeError, ValueError) as error:
            raise ValueError(f"CSV line {number}: {error}") from error
    if not rows:
        raise ValueError("No result rows")
    return raw, metadata, rows


def build_index(source, output_dir):
    """Write a separate, lossless index; never overwrite another dataset."""
    raw, metadata, rows = read_contribution(source)
    output_dir = Path(output_dir)
    if output_dir.exists() and any(output_dir.iterdir()):
        raise ValueError("Output directory must be empty")
    buckets = defaultdict(lambda: defaultdict(list))
    counts = defaultdict(int)
    for sequence, output, length, draws, half in rows:
        bucket = output // BUCKET_SIZE * BUCKET_SIZE
        buckets[bucket][str(output)].append([sequence, draws, half])
        counts[str(output)] += 1
    output_dir.mkdir(parents=True, exist_ok=True)
    for bucket, values in sorted(buckets.items()):
        for results in values.values():
            results.sort(key=lambda row: (len(row[0]), row[0], row[1], row[2]))
        (output_dir / f"{bucket}.json").write_text(json.dumps(values, separators=(",", ":")) + "\n", encoding="utf-8")
    manifest = {
        "dataset": "koobey-20260926",
        "contributor": "KoObEy",
        "contributed_on": "2026-09-26",
        "index_type": "contributed_shortest",
        "target_spell": "ELECTRIC_CHARGE",
        "max_slots": 11,
        "draws": [1],
        "half": [0, 1],
        "bucket_size": BUCKET_SIZE,
        "row_format": ["sequence", "draws", "half"],
        "indexed_rows": len(rows),
        "indexed_counts": len(counts),
        "source_file": "429fc2ee33a66c94.csv",
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "source_metadata": metadata,
        "spell_codes": SPELL_CODES,
        "counts": dict(sorted(counts.items(), key=lambda item: int(item[0]))),
    }
    (output_dir / "_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (output_dir / manifest["source_file"]).write_bytes(raw)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    try:
        manifest = build_index(args.source, args.output_dir)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Import failed: {error}\n")
    print(json.dumps({key: manifest[key] for key in ("indexed_rows", "indexed_counts", "source_sha256")}))


if __name__ == "__main__":
    main()
