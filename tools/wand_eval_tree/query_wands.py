import sys
import os

CSV_PATH = r"E:\download\gggit\biao\all_combinations.csv"

def query(target_count, top_n=20):
    if not os.path.exists(CSV_PATH):
        print(f"File not found: {CSV_PATH}")
        return

    results = []
    print(f"Searching for target count: {target_count}...")
    
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        # Skip header
        f.readline()
        
        for line in f:
            line = line.strip()
            if not line: continue
            
            # The count is always the last element after the last comma
            if "," in line:
                wand, count_str = line.rsplit(",", 1)
                try:
                    count = int(count_str)
                    if count == target_count:
                        length = wand.count(",") + 1
                        results.append((wand, length))
                except ValueError:
                    continue
    
    # Sort by length (fewer spells first)
    results.sort(key=lambda x: x[1])
    
    print(f"\nFound {len(results)} combinations with {target_count} output.")
    print("-" * 100)
    print(f"{'Wand Combination':<85} | {'Length'}")
    print("-" * 100)
    
    for i, (wand, length) in enumerate(results[:top_n]):
        print(f"{wand:<85} | {length}")

if __name__ == "__main__":
    target = 54
    if len(sys.argv) > 1:
        try:
            target = int(sys.argv[1])
        except ValueError:
            print("Usage: python query_wands.py <target_count>")
            sys.exit(1)
    
    query(target)
