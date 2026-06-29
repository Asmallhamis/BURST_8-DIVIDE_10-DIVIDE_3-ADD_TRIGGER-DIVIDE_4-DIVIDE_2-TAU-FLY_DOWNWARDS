import argparse
import json
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
import zstandard as zstd


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def merge_histograms(results_root):
    totals = defaultdict(int)
    for path in sorted(results_root.glob("shard_*/histogram.json")):
        data = read_json(path)
        for count, amount in data.items():
            totals[int(count)] += int(amount)
    return dict(totals)


def shard_manifests(results_root):
    manifests = []
    for path in sorted(results_root.glob("shard_*/manifest.json")):
        manifests.append((path.parent, read_json(path)))
    return sorted(manifests, key=lambda item: int(item[1]["start_index"]))


def clean_output(output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    for path in output_dir.glob("*.idx"):
        path.unlink()
    manifest = output_dir / "_manifest.json"
    if manifest.exists():
        manifest.unlink()


def append_varint(buffer, value):
    while value >= 0x80:
        buffer.append((value & 0x7F) | 0x80)
        value >>= 7
    buffer.append(value)


class VarintIndexWriter:
    def __init__(self, path, flush_bytes):
        self.path = path
        self.flush_bytes = flush_bytes
        self.previous = -1
        self.written = 0
        self.bytes_written = 0
        self.buffer = bytearray()

    def append_many(self, indexes):
        for index in indexes:
            index = int(index)
            append_varint(self.buffer, index - self.previous - 1)
            self.previous = index
            self.written += 1
            if len(self.buffer) >= self.flush_bytes:
                self.flush()

    def flush(self):
        if not self.buffer:
            return
        with self.path.open("ab") as handle:
            handle.write(self.buffer)
        self.bytes_written += len(self.buffer)
        self.buffer.clear()

    def close(self):
        self.flush()
        return self.written, self.bytes_written


def scan_count_stream(stream_path, start_index, lookup, writers, chunk_bytes):
    zstd_reader = zstd.ZstdDecompressor().stream_reader(stream_path.open("rb"))
    absolute_offset = int(start_index)
    local_values = 0
    selected_values = 0
    remainder = b""

    try:
        while True:
            data = zstd_reader.read(chunk_bytes)
            if not data:
                break
            if remainder:
                data = remainder + data
                remainder = b""
            extra = len(data) % 4
            if extra:
                remainder = data[-extra:]
                data = data[:-extra]
            if not data:
                continue

            values = np.frombuffer(data, dtype="<u4")
            mask = lookup[values]
            if mask.any():
                positions = np.nonzero(mask)[0].astype(np.uint64)
                positions += np.uint64(absolute_offset)
                selected_counts = values[mask]
                order = np.argsort(selected_counts, kind="stable")
                selected_counts = selected_counts[order]
                positions = positions[order]

                unique_counts, starts = np.unique(selected_counts, return_index=True)
                ends = list(starts[1:]) + [len(selected_counts)]
                for count, start, end in zip(unique_counts, starts, ends):
                    writers[int(count)].append_many(positions[start:end])
                selected_values += int(mask.sum())

            local_values += int(values.size)
            absolute_offset += int(values.size)
    finally:
        zstd_reader.close()

    if remainder:
        raise RuntimeError(f"{stream_path} ended with a partial u32 value")
    return local_values, selected_values


def select_target_counts(histograms, min_count, max_count, max_total):
    target_counts = []
    for count, total in sorted(histograms.items()):
        if count < min_count:
            continue
        if max_count is not None and count > max_count:
            continue
        if total <= 0:
            continue
        if max_total > 0 and total > max_total:
            continue
        target_counts.append(count)
    return target_counts


def build_full_hit_index(results_root, output_dir, min_count, max_count, max_total, chunk_bytes, flush_bytes):
    histograms = merge_histograms(results_root)
    target_counts = select_target_counts(histograms, min_count, max_count, max_total)
    if not target_counts:
        raise SystemExit("No counts match the requested full-hit index range")

    lookup_max_count = max(histograms)
    lookup = np.zeros(lookup_max_count + 1, dtype=bool)
    lookup[target_counts] = True

    clean_output(output_dir)
    writers = {
        count: VarintIndexWriter(output_dir / f"{count}.idx", flush_bytes)
        for count in target_counts
    }

    started = time.perf_counter()
    scanned_values = 0
    selected_values = 0
    manifests = shard_manifests(results_root)
    for shard_dir, manifest in manifests:
        stream_path = shard_dir / "counts.u32le.zst"
        if not stream_path.exists():
            raise FileNotFoundError(stream_path)
        local_values, local_selected = scan_count_stream(
            stream_path,
            manifest["start_index"],
            lookup,
            writers,
            chunk_bytes,
        )
        expected = int(manifest["end_index"]) - int(manifest["start_index"])
        if local_values != expected:
            raise RuntimeError(f"{stream_path} has {local_values} values, expected {expected}")
        scanned_values += local_values
        selected_values += local_selected
        elapsed = time.perf_counter() - started
        print(
            f"scanned {shard_dir.name}: values={local_values} selected={local_selected} "
            f"elapsed={elapsed:.1f}s",
            flush=True,
        )
        for writer in writers.values():
            writer.flush()

    expected_selected = sum(histograms[count] for count in target_counts)
    if selected_values != expected_selected:
        raise RuntimeError(f"selected {selected_values}, expected {expected_selected}")

    counts_meta = {}
    indexed_rows = 0
    indexed_bytes = 0
    for count in target_counts:
        file_name = f"{count}.idx"
        written, size = writers[count].close()
        expected = histograms[count]
        if written != expected:
            raise RuntimeError(f"count {count}: wrote {written}, expected {expected}")
        counts_meta[str(count)] = {
            "total": expected,
            "file": file_name,
            "bytes": size,
        }
        indexed_rows += written
        indexed_bytes += size

    manifest = {
        "dataset": "expanded13-9slots-full-hit-index",
        "index_type": "global_index_varint_delta",
        "description": "Full hit-position index. Each .idx file stores sorted global candidate indexes as unsigned varint gaps.",
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "min_count": min_count,
        "max_count": max_count,
        "max_total_per_count": max_total,
        "indexed_counts": len(counts_meta),
        "indexed_rows": indexed_rows,
        "indexed_bytes": indexed_bytes,
        "scanned_values": scanned_values,
        "counts": counts_meta,
    }
    (output_dir / "_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Build compact full hit indexes from lossless count streams.")
    parser.add_argument("--results-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--min-count", type=int, default=0)
    parser.add_argument("--max-count", type=int)
    parser.add_argument("--max-total", type=int, default=1_000_000)
    parser.add_argument("--chunk-mib", type=int, default=32)
    parser.add_argument("--flush-kib", type=int, default=256)
    args = parser.parse_args()

    manifest = build_full_hit_index(
        args.results_root,
        args.output_dir,
        args.min_count,
        args.max_count,
        args.max_total,
        args.chunk_mib * 1024 * 1024,
        args.flush_kib * 1024,
    )
    print(
        json.dumps(
            {
                "output_dir": str(args.output_dir),
                "indexed_counts": manifest["indexed_counts"],
                "indexed_rows": manifest["indexed_rows"],
                "indexed_bytes": manifest["indexed_bytes"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
