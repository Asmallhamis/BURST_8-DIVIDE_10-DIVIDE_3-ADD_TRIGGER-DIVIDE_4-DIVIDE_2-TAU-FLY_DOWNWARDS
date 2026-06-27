import argparse
import array
import gzip
import json
import sys
from pathlib import Path

from exhaust_indexed import POOLS, SPELL_NAMES, iter_codes


def open_stream(path):
    if str(path).endswith(".gz"):
        return gzip.open(path, "rb")
    return open(path, "rb")


def read_counts(path, chunk_values=1_000_000):
    with open_stream(path) as handle:
        while True:
            data = handle.read(chunk_values * 4)
            if not data:
                break
            values = array.array("I")
            values.frombytes(data)
            if sys.byteorder != "little":
                values.byteswap()
            for value in values:
                yield value


def main():
    parser = argparse.ArgumentParser(description="Inspect a lossless u32le count stream.")
    parser.add_argument("stream", type=Path)
    parser.add_argument("--pool", choices=sorted(POOLS), default="expanded13")
    parser.add_argument("--max-slots", type=int, default=9)
    parser.add_argument("--start-index", type=int, required=True)
    parser.add_argument("--end-index", type=int, required=True)
    parser.add_argument("--target", type=int, required=True)
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    pool = POOLS[args.pool]
    emitted = 0
    for index, (code, count) in enumerate(
        zip(iter_codes(pool, args.max_slots, args.start_index, args.end_index), read_counts(args.stream)),
        start=args.start_index,
    ):
        if count != args.target:
            continue
        print(
            json.dumps(
                {"index": index, "count": count, "code": code, "spells": [SPELL_NAMES[ch] for ch in code]},
                ensure_ascii=False,
                separators=(",", ":"),
            )
        )
        emitted += 1
        if emitted >= args.limit:
            break


if __name__ == "__main__":
    main()
