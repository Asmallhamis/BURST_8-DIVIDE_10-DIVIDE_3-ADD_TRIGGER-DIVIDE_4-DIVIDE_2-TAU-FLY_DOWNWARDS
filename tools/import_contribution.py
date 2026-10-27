"""Import Ko0bEy's format-v4 CSV or CSV.GZ without changing its spells or conditions."""

import argparse
import csv
import gzip
import hashlib
import io
import json
import re
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
DEPTH12_CODES = set("(+0234:?Tm")
HALF_MODES = {
    "both": (0, 1),
    "0": (0,),
    "1": (1,),
}
KNOWN_SOURCE_FILES = {
    "d836d7cc8a7cdd5e80abea1827cef9999ad35def92b67a4fe7775392559a2306": (
        "koobey-20260926",
        "2026-09-26",
        "429fc2ee33a66c94.csv",
    ),
    "ad5594a5be584d9d4cd0137890e6f1dcfdf8339b1e6171ff13bed0398326af84": (
        "koobey-20261004",
        "2026-10-04",
        "384f1ff0dc1fa30d.csv.gz",
    ),
    "e7bc3e2d640a0ac8167468e56c4ef242d080ca0954df9cc382d2740d0ff3323d": (
        "koobey-20261004",
        "2026-10-04",
        "384f1ff0dc1fa30d.csv",
    ),
}
BUCKET_SIZE = 100


def _decode_csv_bytes(raw):
    if raw[:2] == b"\x1f\x8b":
        try:
            raw = gzip.decompress(raw)
        except OSError as error:
            raise ValueError("Invalid gzip stream") from error
    return raw.decode("utf-8-sig")


def read_contribution(source):
    """Validate metadata and every row; keep each (sequence, draws, half)."""
    raw = Path(source).read_bytes()
    stream = io.StringIO(_decode_csv_bytes(raw), newline="")
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

    expected = {"format_version": "4", "status": "ok", "keep": "shortest"}
    if any(metadata.get(key) != value for key, value in expected.items()):
        raise ValueError("Expected a completed format-v4, shortest export")
    allowed_halves = HALF_MODES.get(metadata.get("half"))
    if not allowed_halves:
        raise ValueError("Unsupported half metadata mode")
    try:
        limits = {key: int(metadata[key]) for key in ("min_len", "max_len", "max_count", "max_draws", "search_depth")}
    except (KeyError, ValueError) as error:
        raise ValueError("Missing or invalid search limits") from error
    alphabet = metadata.get("alphabet", "")
    alphabet_set = set(alphabet)
    if len(alphabet) != len(alphabet_set) or not alphabet_set <= set(SPELL_CODES):
        raise ValueError("Unknown or duplicate spell alphabet")

    is_batch_11 = (
        limits["min_len"] == 0
        and limits["max_len"] == 11
        and limits["search_depth"] == 11
        and limits["max_draws"] == 1
        and metadata.get("half") == "both"
        and alphabet_set == set(SPELL_CODES)
    )
    is_batch_12 = (
        limits["min_len"] == 0
        and limits["max_len"] == 12
        and limits["search_depth"] == 12
        and limits["max_draws"] == 26
        and metadata.get("half") == "0"
        and alphabet_set == DEPTH12_CODES
    )
    if limits["max_count"] < 0 or not (is_batch_11 or is_batch_12):
        raise ValueError("Unsupported contribution search limits or alphabet")

    reader = csv.DictReader(stream)
    if reader.fieldnames != ["sequence", "output", "length", "draws", "half"]:
        raise ValueError("Unexpected CSV columns")
    rows = []
    seen = set()
    for number, row in enumerate(reader, start=len(metadata) + 2):
        try:
            sequence = row["sequence"]
            output, length, draws, half = (int(row[key]) for key in ("output", "length", "draws", "half"))
            if None in row or not set(sequence) <= alphabet_set:
                raise ValueError("unknown symbols or extra fields")
            if not 0 <= output <= limits["max_count"] or not 0 <= length <= limits["max_len"] or length != len(sequence):
                raise ValueError("invalid output or sequence length")
            if not 1 <= draws <= limits["max_draws"] or half not in allowed_halves:
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


def _resolve_provenance(source, output_dir, sha256, max_len):
    if sha256 in KNOWN_SOURCE_FILES:
        return KNOWN_SOURCE_FILES[sha256]
    if max_len == 12:
        dataset, contributed_on, source_file = ("koobey-20261004", "2026-10-04", Path(source).name)
    else:
        dataset, contributed_on, source_file = ("koobey-20260926", "2026-09-26", "429fc2ee33a66c94.csv")
    match = re.match(r"^(koobey-(\d{4})(\d{2})(\d{2}))$", output_dir.name)
    if match:
        dataset = match.group(1)
        contributed_on = f"{match.group(2)}-{match.group(3)}-{match.group(4)}"
    return dataset, contributed_on, source_file


def build_index(source, output_dir):
    """Write a separate, lossless index; never overwrite another dataset."""
    raw, metadata, rows = read_contribution(source)
    output_dir = Path(output_dir)
    if output_dir.exists() and any(output_dir.iterdir()):
        raise ValueError("Output directory must be empty")
    buckets = defaultdict(lambda: defaultdict(list))
    counts = defaultdict(int)
    draws_set = set()
    half_set = set()
    for sequence, output, length, draws, half in rows:
        bucket = output // BUCKET_SIZE * BUCKET_SIZE
        buckets[bucket][str(output)].append([sequence, draws, half])
        counts[str(output)] += 1
        draws_set.add(draws)
        half_set.add(half)
    output_dir.mkdir(parents=True, exist_ok=True)
    for bucket, values in sorted(buckets.items()):
        for results in values.values():
            results.sort(key=lambda row: (len(row[0]), row[0], row[1], row[2]))
        (output_dir / f"{bucket}.json").write_text(json.dumps(values, separators=(",", ":")) + "\n", encoding="utf-8")
    sha256 = hashlib.sha256(raw).hexdigest()
    max_slots = int(metadata["max_len"])
    dataset, contributed_on, source_file = _resolve_provenance(source, output_dir, sha256, max_slots)
    alphabet_set = set(metadata["alphabet"])
    manifest = {
        "dataset": dataset,
        "contributor": "Ko0bEy",
        "contributed_on": contributed_on,
        "index_type": "contributed_shortest",
        "target_spell": "ELECTRIC_CHARGE",
        "max_slots": max_slots,
        "draws": sorted(draws_set),
        "half": sorted(half_set) if metadata.get("half") != "both" else [0, 1],
        "bucket_size": BUCKET_SIZE,
        "row_format": ["sequence", "draws", "half"],
        "indexed_rows": len(rows),
        "indexed_counts": len(counts),
        "source_file": source_file,
        "source_sha256": sha256,
        "source_metadata": metadata,
        "spell_codes": {code: spell for code, spell in SPELL_CODES.items() if code in alphabet_set},
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
