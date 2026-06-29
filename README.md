# Noita 13-Spell 9-Slot Wand Codex

Static lookup page for an exhaustive Noita wand enumeration using a 13-spell pool and up to 9 slots.

The page uses two static indexes:

- Full hit-position indexes for output counts greater than `10`. These are exact and are filtered in the browser.
- A compact preview index for output counts `0` through `10`, where the full hit sets are too large to be useful on a static page.

The original lossless count streams are archived separately and are not included in this Pages build.

## Dataset

- Pool: `BURST_8`, `DIVIDE_10`, `DIVIDE_3`, `ADD_TRIGGER`, `DIVIDE_4`, `DIVIDE_2`, `TAU`, `FLY_DOWNWARDS`, `IF_ELSE`, `RESET`, `IF_HP`, `IF_END`, `BLACK_HOLE#0`
- Max slots: `9`
- Total candidates: `6,097,922,233`
- Full hit-position index rows: `472,850,625`
- Preview index rows: `642,222`
- Unique output counts: `1,445`

## Local Preview

```bash
python -m http.server 18029
```

Then open `http://127.0.0.1:18029/`.

## Reproducing

The generic shard runner and merge tools are in `tools/wand_eval_tree/`.
They require Python, LuaJIT, and an extracted vanilla Noita `data/` directory.

```bash
export NOITA_DATA_PATH=/path/to/noita/data
SHARD_ID=0 SHARD_COUNT=10 WORKERS=32 bash tools/wand_eval_tree/run_shard.sh
```

After shard results are available, build the full static hit-position index:

```bash
python tools/wand_eval_tree/build_full_hit_index.py \
  --results-root /path/to/results \
  --output-dir data13/full_hits \
  --min-count 11 \
  --max-total 0
```
