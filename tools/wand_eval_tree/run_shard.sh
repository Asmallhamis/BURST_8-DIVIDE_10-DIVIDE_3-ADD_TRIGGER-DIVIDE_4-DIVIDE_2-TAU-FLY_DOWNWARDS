#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
cd "${repo_root}"

: "${SHARD_ID:?Set SHARD_ID to the shard number, for example: SHARD_ID=0}"
: "${NOITA_DATA_PATH:?Set NOITA_DATA_PATH to an extracted vanilla Noita data directory}"

pool="${POOL:-expanded13}"
max_slots="${MAX_SLOTS:-9}"
shard_count="${SHARD_COUNT:-10}"
chunk_size="${CHUNK_SIZE:-10000}"
count_stream="${COUNT_STREAM:-none}"
top_per_count="${TOP_PER_COUNT:-100}"

if [ -n "${WORKERS:-}" ]; then
  workers="${WORKERS}"
elif command -v nproc >/dev/null 2>&1; then
  workers="$(nproc)"
else
  workers="4"
fi

export NOITA_PATH="${NOITA_PATH:-${NOITA_DATA_PATH}}"

printf -v shard_label "%02d" "${SHARD_ID}"
out_dir="${OUT_DIR:-results/shard_${shard_label}}"
mkdir -p "${out_dir}"

luajit_arg=()
if [ -n "${LUAJIT:-}" ]; then
  luajit_arg=(--luajit "${LUAJIT}")
fi

python3 tools/wand_eval_tree/exhaust_indexed.py \
  --pool "${pool}" \
  --max-slots "${max_slots}" \
  --shard-id "${SHARD_ID}" \
  --shard-count "${shard_count}" \
  --dry-run | tee "${out_dir}/range.json"

python3 tools/wand_eval_tree/exhaust_indexed.py \
  --pool "${pool}" \
  --max-slots "${max_slots}" \
  --shard-id "${SHARD_ID}" \
  --shard-count "${shard_count}" \
  --workers "${workers}" \
  --chunk-size "${chunk_size}" \
  --out-dir "${out_dir}" \
  --count-stream "${count_stream}" \
  --top-per-count "${top_per_count}" \
  "${luajit_arg[@]}" \
  2>&1 | tee "${out_dir}/run.log"
