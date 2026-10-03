# Dataset conditions / 数据集说明

The website normalizes contributed `ELECTRIC_CHARGE` spells to `FLY_DOWNWARDS` before filtering and presentation. Within each output count, identical normalized spell sequences are merged into one recipe. Every matching source, initial draw count and half state is retained on that recipe. Different output counts are never merged.

网站将贡献数据中的电荷统一转换为向下飞行后筛选、显示、复制并生成模拟器链接。同一产出下，相同排列只显示一条，合并保留来源、初始抽取数和 `half` 条件；不同产出不合并。初始抽取数不是施放次数。原始文件仍分别保存，便于追溯。

| Dataset / 数据集 | Initial draws / 初始抽取 | Counted spell / 计数法术 | Search scope / 搜索范围 |
| --- | --- | --- | --- |
| Legacy / 旧数据 | 26 | `FLY_DOWNWARDS` | 13-spell pool, up to 9 slots |
| Ko0bEy, 2026-09-26 | 1 | `FLY_DOWNWARDS` (original: `ELECTRIC_CHARGE`) | 12-spell pool, up to 11 slots, `half=0/1` |

## Legacy index

`data13/` remains the existing sample index: 642,222 rows across 1,445 output counts, sampled from 6,097,922,233 candidates. The manifest records full hit totals, but the page has at most 1,000 indexed recipes per output. Inventory filters operate on those samples. No filtered match is not proof that no recipe exists.

The generation script sets `spells_per_cast=26` and `number_of_casts=1`. The old pool contains no `IF_HALF`. Existing TWWE and PHASING_ARC links retain their original recipe prefixes.

The generation script also sets `unlimited_spells=true`, which models the **Unlimited Spells perk**, not a blanket override of every spell's remaining charges. The black-hole entry is explicitly `{ name = "BLACK_HOLE", count = 0 }`. Vanilla `BLACK_HOLE` has `never_unlimited=true`, and the evaluator respects that exception, so the supplied zero charges remain zero.

旧数据的索引是样本，不是全量命中列表；页面会保留两种数量的区别。旧配方仍使用原有的 TWWE 前缀和链接。

旧数据的黑洞明确为 `BLACK_HOLE#0`（0 次数）。“无限法术”指同名天赋开关，黑洞不受该天赋影响；它的 0 次数不会被改成无限。

## Ko0bEy contribution

The contributor supplied `429fc2ee33a66c94.csv` in the 2026-09-26 conversation and offered the results for inclusion on the website. The original file is preserved byte for byte at [`data-contrib/koobey-20260926/429fc2ee33a66c94.csv`](data-contrib/koobey-20260926/429fc2ee33a66c94.csv).

- SHA-256: `d836d7cc8a7cdd5e80abea1827cef9999ad35def92b67a4fe7775392559a2306`
- 171,084 rows, including one empty sequence; 2,978 distinct output values, from 0 to 8,018.
- Source metadata: `format_version=4`, `status=ok`, `max_count=50000`, `max_draws=1`, `min_len=0`, `max_len=11`, `search_depth=11`, `half=both`, `keep=shortest`.
- `max_count=50000` is the search setting, not the maximum output present in this file.
- `keep=shortest` describes the contributor's search. These rows are not all enumerated candidates, and do not establish optimality under other pools, draw counts or simulator assumptions.
- The contributor noted that the run used only draw 1 because `max-draws` was omitted. This is a supported condition, not grounds for discarding the results.
- This export's alphabet contains `BLOOD_MAGIC` but no `BLACK_HOLE` or `BLACK_HOLE#0`. The accompanying message said zero-charge Black Hole had not yet been implemented. Therefore the contribution must not be described as another zero-charge Black Hole dataset.
- `half` is retained as the initial `IF_HALF` state. Records with the same output and sequence but different states share one displayed recipe with all conditions listed. Selecting a half state filters contributed records before merging; excluded conditions are not shown on the merged result.
- The compact recipe view highlights `IF_HALF=1` and omits the ordinary `half=0` label. If a merged result also has another matching condition, the badge reads `IF_HALF=1 supported`, not a requirement for every variant. Tooltips and copied recipes retain the complete conditions, including zero states.
- The source CSV and compact buckets preserve the original symbols. The frontend maps `ELECTRIC_CHARGE` to `FLY_DOWNWARDS` before computing spell inventory counts and recipe keys. The inventory filter, icons, copied sequence and simulator links all use the normalized spell.
- The contribution includes recipes with two `BURST_8` spells. The default inventory filter does not exclude them.
- Every recipe has the same Copy, TWWE and PHASING_ARC actions. Copy includes the normalized sequence, expected output and every matching source/draw/half condition. Simulator links use the existing shared assembly templates; users must match initial draws and half to the listed recipe conditions when reproducing an output.

贡献数据保留全部原始记录及其条件，包括空序列和不同 `half` 状态。网站先归一化、筛选，再按“产出 + 排列”合并重复配方。复制会带上合并后的完整条件。最多 11 槽、初始抽取 1；查询结果不宣称是任意条件下的全局最优解。

For example, `TAU,DIVIDE_10,DIVIDE_10,FLY_DOWNWARDS,FLY_DOWNWARDS,RESET` and the same sequence with `ELECTRIC_CHARGE` become a single recipe when their output counts match. If one record requires draw 26 and another draw 1, both conditions remain attached to that recipe.

### Symbol mapping

The mapping below was supplied in the contributor's accompanying message. Only the 12 symbols used by this export are imported.

| Symbol | Spell |
| --- | --- |
| `(` | `IF_HP` |
| `{` | `IF_HALF` |
| `+` | `ADD_TRIGGER` |
| `:` | `RESET` |
| `2` | `DIVIDE_2` |
| `3` | `DIVIDE_3` |
| `4` | `DIVIDE_4` |
| `0` | `DIVIDE_10` |
| `m` | `ELECTRIC_CHARGE` |
| `T` | `TAU` |
| `?` | `BURST_8` |
| `;` | `BLOOD_MAGIC` |

### Validation

All rows passed structural checks for the schema, alphabet, lengths, search limits, draw and half values, and duplicate `(sequence, draws, half)` keys. The generated index can be reconstructed to exactly the original set of result rows. This is data-integrity validation, not a full simulation rerun.

A sample of **310 rows** was reevaluated with the existing `wand_eval_tree` engine and extracted vanilla Noita action scripts on 2026-10-03. Selection: the first 100 rows, 200 rows selected from the remainder with Python `random.Random(20261003).sample`, then the ten largest-output rows, deduplicated by `(sequence, half)`.

Our sample reevaluation used one cast, 10,000 starting/max mana, no mods and the recorded initial half state. These are settings of our sample check, not claims about the contributor's original search configuration. The default API stubs provide no health component, so `IF_HP` uses the vanilla fallback health fraction of 1.0. The contributor's simulator version, complete settings and health assumptions were not supplied; the sample does not establish agreement for every possible condition.

- `ELECTRIC_CHARGE`, initial draw 1: **310/310 matched** the supplied output.
- `ELECTRIC_CHARGE`, initial draw 26: **8/310 differed** from the supplied output.
- Replacing only `m` with `FLY_DOWNWARDS` gave the same respective counts in all 310 sampled rows. The website uses this normalization for the count model as requested by the project author. This does not claim that the spells have identical in-game effects or mana costs.
- Example: `0+m` (`DIVIDE_10,ADD_TRIGGER,ELECTRIC_CHARGE`) produced 10 at draw 1 and 11 at draw 26.

The complete sample results are in [`validation-sample.csv`](data-contrib/koobey-20260926/validation-sample.csv). Only these sampled rows have been simulated again; the website does not label the entire contribution as simulation-verified.

全表已做结构检查；310 条样本在抽取 1 时全部复现，改为 26 时有 8 条变化。未对全部 171,084 条重新模拟，也未获得贡献者的完整模拟器配置。

### Rebuilding the contribution index

Run from the repository root with Python 3. The destination must be empty; existing datasets are never overwritten by the importer.

```sh
python -B -m unittest discover -s tools -p test_import_contribution.py -v
python -B tools/import_contribution.py /path/to/429fc2ee33a66c94.csv /path/to/empty-output-directory
```

The importer writes `_manifest.json`, the original CSV and JSON buckets of 100 output values. A bucket maps each output value to `[sequence, draws, half]` rows. The manifest defines the original symbol mapping and exact source-record counts. The import archive remains lossless; spell normalization and recipe deduplication happen in the frontend before display. The validation sample is a separately retained audit record and is not regenerated by the importer.
