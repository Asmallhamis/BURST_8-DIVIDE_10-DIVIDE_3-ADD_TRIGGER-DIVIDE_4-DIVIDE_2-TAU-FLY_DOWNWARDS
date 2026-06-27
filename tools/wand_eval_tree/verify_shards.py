import argparse
import hashlib
import json
import sys
from pathlib import Path


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_checksums(shard_dir):
    sums = shard_dir / "sha256sums.txt"
    if not sums.exists():
        return False, [f"{shard_dir.name}: missing sha256sums.txt"]

    problems = []
    for line in sums.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            expected, name = line.split(maxsplit=1)
        except ValueError:
            problems.append(f"{shard_dir.name}: malformed checksum line: {line}")
            continue
        path = shard_dir / name.strip()
        if not path.exists():
            problems.append(f"{shard_dir.name}: missing checksum target: {name}")
            continue
        actual = sha256_file(path)
        if actual != expected:
            problems.append(f"{shard_dir.name}: checksum mismatch: {name}")

    return not problems, problems


def main():
    parser = argparse.ArgumentParser(description="Verify distributed shard outputs.")
    parser.add_argument("--results-root", type=Path, default=Path("results"))
    parser.add_argument("--expected-shards", type=int)
    args = parser.parse_args()

    shard_dirs = sorted(path for path in args.results_root.glob("shard_*") if (path / "manifest.json").exists())
    if not shard_dirs:
        raise SystemExit(f"No completed shards found in {args.results_root}")

    manifests = [(path, read_json(path / "manifest.json")) for path in shard_dirs]
    manifests.sort(key=lambda item: item[1]["start_index"])

    checksum_problems = []
    checksums_ok = True
    for path, _manifest in manifests:
        ok, problems = verify_checksums(path)
        checksums_ok = checksums_ok and ok
        checksum_problems.extend(problems)

    total_candidates = manifests[0][1]["total_candidates"]
    processed = sum(int(manifest["processed"]) for _path, manifest in manifests)
    histogram_total = 0
    for path, _manifest in manifests:
        histogram = read_json(path / "histogram.json")
        histogram_total += sum(int(value) for value in histogram.values())

    ranges = [(int(manifest["start_index"]), int(manifest["end_index"])) for _path, manifest in manifests]
    range_problems = []
    if ranges[0][0] != 0:
        range_problems.append(f"first range starts at {ranges[0][0]}, expected 0")
    for previous, current in zip(ranges, ranges[1:]):
        if previous[1] != current[0]:
            range_problems.append(f"gap or overlap between {previous} and {current}")
    if ranges[-1][1] != total_candidates:
        range_problems.append(f"last range ends at {ranges[-1][1]}, expected {total_candidates}")

    if args.expected_shards is not None and len(manifests) != args.expected_shards:
        range_problems.append(f"found {len(manifests)} shards, expected {args.expected_shards}")

    summary = {
        "shards": len(manifests),
        "total_candidates": total_candidates,
        "processed": processed,
        "histogram_total": histogram_total,
        "ranges_contiguous": not range_problems,
        "checksums_ok": checksums_ok,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    for problem in range_problems + checksum_problems:
        print(problem, file=sys.stderr)

    if range_problems or checksum_problems or processed != total_candidates or histogram_total != processed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
