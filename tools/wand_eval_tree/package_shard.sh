#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
cd "${repo_root}"

if [ -n "${OUT_DIR:-}" ]; then
  out_dir="${OUT_DIR}"
else
  : "${SHARD_ID:?Set SHARD_ID or OUT_DIR}"
  printf -v shard_label "%02d" "${SHARD_ID}"
  out_dir="results/shard_${shard_label}"
fi

if [ ! -f "${out_dir}/manifest.json" ]; then
  echo "manifest.json missing; shard is probably not complete: ${out_dir}" >&2
  exit 2
fi

if [ -f "${out_dir}/counts.u32le" ] && [ ! -f "${out_dir}/counts.u32le.zst" ]; then
  if command -v zstd >/dev/null 2>&1; then
    zstd -T0 -19 -f "${out_dir}/counts.u32le"
  else
    echo "zstd not found; leaving counts.u32le uncompressed" >&2
  fi
fi

targets=()
for name in manifest.json histogram.json top_by_count.jsonl range.json counts.u32le.zst counts.u32le.gz counts.u32le; do
  if [ -f "${out_dir}/${name}" ]; then
    targets+=("${name}")
  fi
done

(
  cd "${out_dir}"
  sha256sum "${targets[@]}" > sha256sums.txt
)

echo "Packaged ${out_dir}"
cat "${out_dir}/sha256sums.txt"
