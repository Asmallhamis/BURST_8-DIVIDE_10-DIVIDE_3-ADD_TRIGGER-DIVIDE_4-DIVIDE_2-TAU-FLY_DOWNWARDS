import itertools
import subprocess
import os
import json
import time
from concurrent.futures import ProcessPoolExecutor

# Paths
# Paths - Using relative paths for portability
WAND_EVAL_DIR = os.path.dirname(os.path.abspath(__file__))
LUAJIT_PATH = os.path.join(WAND_EVAL_DIR, "..", "..", "..", "bin", "luajit.exe") # Fallback to parent workspace
BATCH_LUA = "batch_eval.lua"
OUTPUT_CSV = os.path.join(WAND_EVAL_DIR, "..", "..", "all_combinations.csv")
CHECKPOINT_FILE = os.path.join(WAND_EVAL_DIR, "checkpoint.json")

# Spell pool
CORE_SPELLS = ["DIVIDE_10", "DIVIDE_3", "ADD_TRIGGER", "DIVIDE_4", "DIVIDE_2", "TAU", "FLY_DOWNWARDS"]
START_OPTIONS = [None, "BURST_8"]

def get_combinations(max_slots=8):
    """
    Generate all combinations from length 1 to max_slots.
    """
    for length in range(1, max_slots + 1):
        for start in START_OPTIONS:
            rem_len = length - (1 if start else 0)
            if rem_len < 0: continue
            for combo in itertools.product(CORE_SPELLS, repeat=rem_len):
                full_list = []
                if start:
                    full_list.append(start)
                full_list.extend(combo)
                yield ",".join(full_list)

def process_chunk(chunk_data):
    """
    Worker function to process a single chunk of combinations.
    """
    chunk_id, combinations = chunk_data
    process = subprocess.Popen(
        [LUAJIT_PATH, BATCH_LUA],
        cwd=WAND_EVAL_DIR,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    input_data = "\n".join(combinations) + "\n"
    stdout, stderr = process.communicate(input=input_data)
    
    return stdout.strip().split("\n")

def main():
    max_slots = 8  # Full scale
    chunk_size = 5000 
    num_workers = os.cpu_count() or 4
    
    print(f"Workers: {num_workers}")
    
    # Load checkpoint - based on CSV line count for absolute reliability
    start_index = 0
    if os.path.exists(OUTPUT_CSV) and os.path.getsize(OUTPUT_CSV) > 0:
        with open(OUTPUT_CSV, "r", encoding="utf-8") as f:
            line_count = 0
            for _ in f:
                line_count += 1
            start_index = line_count - 1 # Subtract header
    
    print(f"Starting/Resuming from index: {start_index}")
    
    # Open CSV in append mode
    if not os.path.exists(OUTPUT_CSV) or os.path.getsize(OUTPUT_CSV) == 0:
        with open(OUTPUT_CSV, "w", encoding="utf-8") as f:
            f.write("组合,FLY_DOWNWARDS总量\n")

    combo_gen = get_combinations(max_slots)
    
    # Fast-forward to start_index
    current_idx = 0
    if start_index > 0:
        print(f"Skipping {start_index} combinations...")
        for _ in range(start_index):
            next(combo_gen, None)
            current_idx += 1

    start_time = time.time()
    total_since_start = 0
    
    def chunk_generator():
        nonlocal current_idx
        while True:
            chunk = []
            for _ in range(chunk_size):
                combo = next(combo_gen, None)
                if combo is None:
                    break
                chunk.append(combo)
            
            if not chunk:
                break
            
            current_idx += len(chunk)
            yield (current_idx, chunk)

    try:
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            for results in executor.map(process_chunk, chunk_generator()):
                # Write results
                with open(OUTPUT_CSV, "a", encoding="utf-8") as f:
                    for r in results:
                        if ":" in r:
                            wand, count = r.rsplit(":", 1)
                            f.write(f"{wand},{count}\n")
                
                total_since_start += len(results)
                completed_total = start_index + total_since_start
                
                # Checkpoint every chunk
                with open(CHECKPOINT_FILE, "w") as f:
                    json.dump({"last_index": completed_total}, f)
                
                elapsed = time.time() - start_time
                speed = total_since_start / elapsed if elapsed > 0 else 0
                print(f"Completed: {completed_total} (+{total_since_start} in this session). Speed: {speed:.2f} wands/s")

        print("All tasks submitted and processed.")

    except KeyboardInterrupt:
        print("\nStopped by user.")
    
    # Final checkpoint
    if os.path.exists(OUTPUT_CSV):
        with open(OUTPUT_CSV, "r", encoding="utf-8") as f:
            line_count = 0
            for _ in f:
                line_count += 1
            completed = line_count - 1
            with open(CHECKPOINT_FILE, "w") as f:
                json.dump({"last_index": completed}, f)

    print(f"Finished session. Total in CSV: {completed}")

if __name__ == "__main__":
    main()
