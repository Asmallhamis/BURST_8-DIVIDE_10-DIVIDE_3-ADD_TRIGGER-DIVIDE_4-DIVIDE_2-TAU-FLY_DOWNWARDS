import argparse
import json
import time
from collections import defaultdict
from pathlib import Path

from exhaust_indexed import SPELL_NAMES, total_candidates


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def merge_histograms(results_root):
    totals = defaultdict(int)
    for path in sorted(results_root.glob("shard_*/histogram.json")):
        data = read_json(path)
        for count, amount in data.items():
            totals[int(count)] += int(amount)
    return totals


def merge_top_codes(results_root):
    codes_by_count = defaultdict(set)
    for path in sorted(results_root.glob("shard_*/top_by_count.jsonl")):
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                codes_by_count[int(row["count"])].add(row["code"])
    return codes_by_count


def spell_line(code):
    return ",".join(SPELL_NAMES[ch] for ch in code)


def clean_output(output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    for path in output_dir.glob("*.txt"):
        path.unlink()
    manifest = output_dir / "_manifest.json"
    if manifest.exists():
        manifest.unlink()


def build_index(results_root, output_dir, limit_per_count):
    histograms = merge_histograms(results_root)
    codes_by_count = merge_top_codes(results_root)
    clean_output(output_dir)

    counts_meta = {}
    indexed_rows = 0
    for count in sorted(codes_by_count):
        codes = sorted(codes_by_count[count], key=lambda code: (len(code), code))
        if limit_per_count > 0:
            codes = codes[:limit_per_count]
        indexed_rows += len(codes)

        (output_dir / f"{count}.txt").write_text(
            "\n".join(spell_line(code) for code in codes) + "\n",
            encoding="utf-8",
        )
        counts_meta[str(count)] = {
            "total": histograms.get(count, 0),
            "indexed": len(codes),
        }

    missing_index = sorted(set(histograms) - set(codes_by_count))
    manifest = {
        "dataset": "expanded13-9slots-top-index",
        "pool": "expanded13",
        "max_slots": 9,
        "index_type": "top_by_count_sample",
        "description": "Static frontend index built from per-shard top_by_count.jsonl files. The lossless count streams remain in shard_*/counts.u32le.zst.",
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "limit_per_count": limit_per_count,
        "total_candidates": total_candidates(12, 9),
        "unique_counts": len(histograms),
        "indexed_counts": len(codes_by_count),
        "indexed_rows": indexed_rows,
        "missing_index_counts": missing_index,
        "spell_codes": SPELL_NAMES,
        "counts": counts_meta,
    }
    (output_dir / "_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Build a static frontend query index from completed shard results.")
    parser.add_argument(
        "--results-root",
        type=Path,
        default=Path("results"),
        help="Directory containing shard_00 ... shard_09 result folders.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data13",
        help="Static frontend data directory to write.",
    )
    parser.add_argument(
        "--limit-per-count",
        type=int,
        default=1000,
        help="Maximum indexed sample rows per count. Use 0 for no extra limit.",
    )
    args = parser.parse_args()

    manifest = build_index(args.results_root, args.output_dir, args.limit_per_count)
    print(
        json.dumps(
            {
                "output_dir": str(args.output_dir),
                "unique_counts": manifest["unique_counts"],
                "indexed_counts": manifest["indexed_counts"],
                "indexed_rows": manifest["indexed_rows"],
                "total_candidates": manifest["total_candidates"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
