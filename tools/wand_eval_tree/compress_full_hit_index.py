import argparse
import gzip
import json
import shutil
from pathlib import Path


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_gzip(source, target, compresslevel):
    tmp = target.with_suffix(target.suffix + ".tmp")
    with source.open("rb") as src, tmp.open("wb") as raw_out:
        with gzip.GzipFile(
            filename="",
            mode="wb",
            fileobj=raw_out,
            compresslevel=compresslevel,
            mtime=0,
        ) as gz_out:
            shutil.copyfileobj(src, gz_out, length=1024 * 1024)
    tmp.replace(target)


def compress_full_hit_index(index_dir, compresslevel, min_savings):
    manifest_path = index_dir / "_manifest.json"
    manifest = read_json(manifest_path)
    total_compressed = 0
    compressed_count = 0
    saved_bytes = 0

    for key, entry in sorted(manifest["counts"].items(), key=lambda item: int(item[0])):
        source = index_dir / entry["file"]
        if not source.exists():
            raise FileNotFoundError(source)

        target = source.with_suffix(source.suffix + ".gz")
        write_gzip(source, target, compresslevel)

        raw_size = source.stat().st_size
        gzip_size = target.stat().st_size
        if gzip_size + min_savings < raw_size:
            entry["compressed_file"] = target.name
            entry["compressed_bytes"] = gzip_size
            total_compressed += gzip_size
            compressed_count += 1
            saved_bytes += raw_size - gzip_size
        else:
            target.unlink(missing_ok=True)
            entry.pop("compressed_file", None)
            entry.pop("compressed_bytes", None)
            total_compressed += raw_size

    manifest["transport_compression"] = "gzip"
    manifest["compressed_counts"] = compressed_count
    manifest["compressed_indexed_bytes"] = total_compressed
    manifest["compressed_saved_bytes"] = saved_bytes
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Create smaller gzip transport copies for full hit indexes.")
    parser.add_argument("--index-dir", type=Path, required=True)
    parser.add_argument("--level", type=int, default=9)
    parser.add_argument("--min-savings", type=int, default=32)
    args = parser.parse_args()

    manifest = compress_full_hit_index(args.index_dir, args.level, args.min_savings)
    print(
        json.dumps(
            {
                "compressed_counts": manifest["compressed_counts"],
                "indexed_bytes": manifest["indexed_bytes"],
                "compressed_indexed_bytes": manifest["compressed_indexed_bytes"],
                "compressed_saved_bytes": manifest["compressed_saved_bytes"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
