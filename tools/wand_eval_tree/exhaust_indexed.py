import argparse
import array
import gzip
import json
import os
import shutil
import subprocess
import sys
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
BATCH_LUA = SCRIPT_DIR / "batch_eval_codes.lua"

POOLS = {
    "current8": {
        "burst": "B",
        "core": ["0", "3", "+", "4", "2", "T", "F"],
    },
    "expanded13": {
        "burst": "B",
        "core": ["0", "3", "+", "4", "2", "T", "F", "E", "R", "H", "N", "K"],
    },
}

SPELL_NAMES = {
    "B": "BURST_8",
    "0": "DIVIDE_10",
    "3": "DIVIDE_3",
    "+": "ADD_TRIGGER",
    "4": "DIVIDE_4",
    "2": "DIVIDE_2",
    "T": "TAU",
    "F": "FLY_DOWNWARDS",
    "E": "IF_ELSE",
    "R": "RESET",
    "H": "IF_HP",
    "N": "IF_END",
    "K": "BLACK_HOLE#0",
}


def total_candidates(core_size, max_slots):
    return sum(core_size**length + core_size ** (length - 1) for length in range(1, max_slots + 1))


def build_segments(pool, max_slots):
    segments = []
    cursor = 0
    core_size = len(pool["core"])
    for length in range(1, max_slots + 1):
        for prefix, rem_len in (("", length), (pool["burst"], length - 1)):
            count = core_size**rem_len
            segments.append(
                {
                    "start": cursor,
                    "end": cursor + count,
                    "prefix": prefix,
                    "rem_len": rem_len,
                }
            )
            cursor += count
    return segments


def digits_from_offset(offset, width, base):
    digits = [0] * width
    for pos in range(width - 1, -1, -1):
        offset, digit = divmod(offset, base)
        digits[pos] = digit
    return digits


def increment_digits(digits, base):
    for pos in range(len(digits) - 1, -1, -1):
        digit = digits[pos] + 1
        if digit < base:
            digits[pos] = digit
            return
        digits[pos] = 0


def iter_segment_codes(prefix, rem_len, offset, count, core_codes):
    if rem_len == 0:
        if count:
            yield prefix
        return

    base = len(core_codes)
    digits = digits_from_offset(offset, rem_len, base)
    for _ in range(count):
        yield prefix + "".join(core_codes[digit] for digit in digits)
        increment_digits(digits, base)


def iter_codes(pool, max_slots, start_index, end_index):
    for segment in build_segments(pool, max_slots):
        start = max(start_index, segment["start"])
        end = min(end_index, segment["end"])
        if start >= end:
            continue
        local_offset = start - segment["start"]
        yield from iter_segment_codes(
            segment["prefix"],
            segment["rem_len"],
            local_offset,
            end - start,
            pool["core"],
        )


def chunked(iterator, chunk_size):
    chunk = []
    for item in iterator:
        chunk.append(item)
        if len(chunk) >= chunk_size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def find_luajit(explicit):
    if explicit:
        return explicit
    found = shutil.which("luajit")
    if found:
        return found
    local = SCRIPT_DIR / ".." / ".." / ".." / "bin" / ("luajit.exe" if os.name == "nt" else "luajit")
    if local.exists():
        return str(local)
    raise SystemExit("LuaJIT not found. Pass --luajit or put luajit on PATH.")


def run_lua_chunk(luajit, codes, data_path, noita_path, mods):
    env = os.environ.copy()
    if data_path:
        env["NOITA_DATA_PATH"] = str(data_path)
    if noita_path:
        env["NOITA_PATH"] = str(noita_path)
    if mods:
        env["NOITA_MODS"] = mods

    process = subprocess.Popen(
        [luajit, str(BATCH_LUA.name)],
        cwd=str(SCRIPT_DIR),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
    )
    stdout, stderr = process.communicate("\n".join(codes) + "\n")
    if process.returncode != 0:
        raise RuntimeError(stderr[-4000:])

    counts = []
    for line in stdout.splitlines():
        if line == "ERR":
            raise RuntimeError(stderr[-4000:] or "Lua evaluator returned ERR")
        counts.append(int(line))
    if len(counts) != len(codes):
        raise RuntimeError(f"Lua returned {len(counts)} counts for {len(codes)} codes. stderr={stderr[-1000:]}")
    return codes, counts


def open_count_stream(path, mode):
    if mode == "none":
        return open(path.with_suffix(".u32le"), "wb")
    if mode == "gzip":
        return gzip.open(path.with_suffix(".u32le.gz"), "wb", compresslevel=1)
    raise ValueError(mode)


def write_counts(handle, counts):
    values = array.array("I", counts)
    if values.itemsize != 4:
        raise RuntimeError("array('I') is not 4 bytes on this platform")
    if sys.byteorder != "little":
        values.byteswap()
    values.tofile(handle)


def update_top(top_by_count, count, code, limit):
    if limit <= 0:
        return
    bucket = top_by_count[count]
    if len(bucket) < limit:
        bucket.append(code)


def spell_list(code):
    return [SPELL_NAMES[ch] for ch in code]


def write_outputs(out_dir, args, pool, start_index, end_index, histogram, top_by_count, total_done, elapsed):
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "pool": args.pool,
        "spell_codes": SPELL_NAMES,
        "core_codes": pool["core"],
        "burst_code": pool["burst"],
        "max_slots": args.max_slots,
        "shard_id": args.shard_id,
        "shard_count": args.shard_count,
        "start_index": start_index,
        "end_index": end_index,
        "total_candidates": total_candidates(len(pool["core"]), args.max_slots),
        "processed": total_done,
        "elapsed_seconds": elapsed,
        "speed_per_second": total_done / elapsed if elapsed > 0 else 0,
        "count_stream": args.count_stream,
        "count_stream_type": "u32le",
        "top_per_count": args.top_per_count,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "histogram.json").write_text(
        json.dumps(dict(sorted(histogram.items())), ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    with open(out_dir / "top_by_count.jsonl", "w", encoding="utf-8") as handle:
        for count in sorted(top_by_count):
            for code in top_by_count[count]:
                handle.write(
                    json.dumps(
                        {"count": count, "code": code, "spells": spell_list(code)},
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                    + "\n"
                )


def parse_args():
    parser = argparse.ArgumentParser(description="Distributed indexed Noita wand exhaustion runner.")
    parser.add_argument("--pool", choices=sorted(POOLS), default="expanded13")
    parser.add_argument("--max-slots", type=int, default=9)
    parser.add_argument("--shard-id", type=int, default=0)
    parser.add_argument("--shard-count", type=int, default=1)
    parser.add_argument("--start-index", type=int)
    parser.add_argument("--end-index", type=int)
    parser.add_argument("--workers", type=int, default=os.cpu_count() or 4)
    parser.add_argument("--chunk-size", type=int, default=10000)
    parser.add_argument("--out-dir", type=Path, default=Path("results/shard_000000"))
    parser.add_argument("--luajit")
    parser.add_argument("--data-path", default=os.environ.get("NOITA_DATA_PATH"))
    parser.add_argument("--noita-path", default=os.environ.get("NOITA_PATH"))
    parser.add_argument("--mods", default=os.environ.get("NOITA_MODS", ""))
    parser.add_argument("--count-stream", choices=["none", "gzip", "off"], default="none")
    parser.add_argument("--top-per-count", type=int, default=100)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, help="Process at most this many candidates from the selected range.")
    return parser.parse_args()


def main():
    args = parse_args()
    if args.shard_count < 1:
        raise SystemExit("--shard-count must be positive")
    if not (0 <= args.shard_id < args.shard_count):
        raise SystemExit("--shard-id must be in [0, shard-count)")

    pool = POOLS[args.pool]
    total = total_candidates(len(pool["core"]), args.max_slots)
    start_index = args.start_index if args.start_index is not None else total * args.shard_id // args.shard_count
    end_index = args.end_index if args.end_index is not None else total * (args.shard_id + 1) // args.shard_count
    if args.limit is not None:
        end_index = min(end_index, start_index + args.limit)
    if start_index < 0 or end_index < start_index or end_index > total:
        raise SystemExit(f"invalid index range [{start_index}, {end_index}) for total {total}")

    if args.dry_run:
        print(json.dumps({"total": total, "start_index": start_index, "end_index": end_index}, indent=2))
        return

    luajit = find_luajit(args.luajit)
    out_dir = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    histogram = defaultdict(int)
    top_by_count = defaultdict(list)
    total_done = 0
    start_time = time.perf_counter()
    last_report = start_time

    stream_handle = None
    if args.count_stream != "off":
        stream_handle = open_count_stream(out_dir / "counts", args.count_stream)

    code_chunks = chunked(iter_codes(pool, args.max_slots, start_index, end_index), args.chunk_size)

    try:
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {}
            pending_results = {}
            next_submit = 0
            next_flush = 0
            max_pending = max(args.workers * 2, 1)

            def submit_until_full():
                nonlocal next_submit
                while len(futures) < max_pending:
                    try:
                        codes = next(code_chunks)
                    except StopIteration:
                        break
                    future = executor.submit(run_lua_chunk, luajit, codes, args.data_path, args.noita_path, args.mods)
                    futures[future] = next_submit
                    next_submit += 1

            submit_until_full()
            while futures:
                for future in as_completed(list(futures)):
                    ordinal = futures.pop(future)
                    codes, counts = future.result()
                    pending_results[ordinal] = (codes, counts)

                    while next_flush in pending_results:
                        codes, counts = pending_results.pop(next_flush)
                        if stream_handle is not None:
                            write_counts(stream_handle, counts)
                        for code, count in zip(codes, counts):
                            histogram[count] += 1
                            update_top(top_by_count, count, code, args.top_per_count)
                        total_done += len(counts)
                        next_flush += 1

                        now = time.perf_counter()
                        if now - last_report >= 10:
                            speed = total_done / (now - start_time)
                            print(f"processed={total_done} speed={speed:.1f}/s elapsed={now - start_time:.1f}s", flush=True)
                            last_report = now

                    submit_until_full()
                    break
    finally:
        if stream_handle is not None:
            stream_handle.close()

    elapsed = time.perf_counter() - start_time
    write_outputs(out_dir, args, pool, start_index, end_index, histogram, top_by_count, total_done, elapsed)
    print(f"done processed={total_done} elapsed={elapsed:.2f}s speed={total_done / elapsed if elapsed else 0:.1f}/s")


if __name__ == "__main__":
    main()
