# Wand Evaluation Exhaustion Tools

This directory contains the small reproducibility pipeline used to generate the
13-spell, 9-slot count index:

- `batch_eval_codes.lua` evaluates compact one-character wand codes with the
  Lua evaluator.
- `exhaust_indexed.py` enumerates the search space, runs LuaJIT workers, writes
  per-shard histograms, per-count samples, and optional lossless count streams.
- `run_shard.sh` runs one shard.
- `package_shard.sh` compresses a completed shard and writes SHA-256 checksums.
- `verify_shards.py` checks completed shard ranges and checksums.
- `build_frontend_index.py` merges completed shard samples into `data13/` for
  the static web UI.
- `decode_count_stream.py` inspects a lossless count stream and maps matching
  counts back to wand codes.

## Requirements

- Python 3.10+
- LuaJIT on `PATH`, or pass `LUAJIT=/path/to/luajit`
- Extracted vanilla Noita `data/`
- Optional: `zstd` for compact lossless count-stream archives

Point the evaluator at the extracted Noita data directory:

```bash
export NOITA_DATA_PATH=/path/to/noita/data
```

## Run One Shard

The default run is `expanded13`, max 9 slots, split into 10 shards.

```bash
SHARD_ID=0 SHARD_COUNT=10 WORKERS=32 \
  bash tools/wand_eval_tree/run_shard.sh
```

Useful environment variables:

- `POOL=expanded13`
- `MAX_SLOTS=9`
- `SHARD_ID=0`
- `SHARD_COUNT=10`
- `WORKERS=32`
- `CHUNK_SIZE=10000`
- `COUNT_STREAM=none`
- `TOP_PER_COUNT=100`
- `OUT_DIR=results/shard_00`

Use `COUNT_STREAM=off` if you only want histograms and frontend samples. Use
`COUNT_STREAM=none` to keep a lossless raw `counts.u32le` stream.

## Package And Verify

After a shard completes:

```bash
SHARD_ID=0 bash tools/wand_eval_tree/package_shard.sh
```

After all shards are present under `results/shard_00`, `results/shard_01`, ...

```bash
python3 tools/wand_eval_tree/verify_shards.py \
  --results-root results \
  --expected-shards 10
```

## Build Static Frontend Data

```bash
python3 tools/wand_eval_tree/build_frontend_index.py \
  --results-root results \
  --output-dir data13 \
  --limit-per-count 1000
```

Then serve the repository root with any static file server:

```bash
python3 -m http.server 18029
```

## Spell Codes

```text
B  BURST_8
0  DIVIDE_10
3  DIVIDE_3
+  ADD_TRIGGER
4  DIVIDE_4
2  DIVIDE_2
T  TAU
F  FLY_DOWNWARDS
E  IF_ELSE
R  RESET
H  IF_HP
N  IF_END
K  BLACK_HOLE#0
```
