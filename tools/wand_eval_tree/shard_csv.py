import os
import json
import csv
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "..", "..", "all_combinations.csv")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..", "..", "data")

def shard_csv():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    
    # Store combinations grouped by count
    # To keep memory usage low, we'll write to files periodically or 
    # just do it one count at a time? 
    # With 7.6M rows, we should probably read once and append to temp files.
    
    print("Reading CSV and grouping by counts...")
    
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        # Skip header
        f.readline()
        
        # Dictionary to store file handles for each count
        handles = {}
        
        try:
            count_processed = 0
            for line in f:
                line = line.strip()
                if not line or "," not in line: continue
                
                wand, count_str = line.rsplit(",", 1)
                
                # Use subdirectories to avoid 880 files in one folder if needed, 
                # but 880 is okay for most filesystems.
                target_file = os.path.join(OUTPUT_DIR, f"{count_str}.txt")
                
                if count_str not in handles:
                    handles[count_str] = open(target_file, "w", encoding="utf-8")
                
                handles[count_str].write(wand + "\n")
                
                count_processed += 1
                if count_processed % 500000 == 0:
                    print(f"Processed {count_processed} rows...")
                    
        finally:
            for h in handles.values():
                h.close()

    print(f"Sharding complete. Files created in {OUTPUT_DIR}")
    print("Each file <count>.txt contains all wand combinations for that count.")

if __name__ == "__main__":
    shard_csv()
