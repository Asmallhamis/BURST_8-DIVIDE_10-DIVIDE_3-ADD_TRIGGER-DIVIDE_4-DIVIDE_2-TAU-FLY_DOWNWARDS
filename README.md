# Noita 13-Spell 9-Slot Wand Codex

Static lookup page for an exhaustive Noita wand enumeration using a 13-spell pool and up to 9 slots.

The page uses a compact per-count sample index for fast browser lookup. The original lossless count streams are archived separately and are not included in this Pages build.

## Dataset

- Pool: `BURST_8`, `DIVIDE_10`, `DIVIDE_3`, `ADD_TRIGGER`, `DIVIDE_4`, `DIVIDE_2`, `TAU`, `FLY_DOWNWARDS`, `IF_ELSE`, `RESET`, `IF_HP`, `IF_END`, `BLACK_HOLE#0`
- Max slots: `9`
- Total candidates: `6,097,922,233`
- Frontend index rows: `642,222`
- Unique output counts: `1,445`

## Local Preview

```bash
python -m http.server 18029
```

Then open `http://127.0.0.1:18029/`.
