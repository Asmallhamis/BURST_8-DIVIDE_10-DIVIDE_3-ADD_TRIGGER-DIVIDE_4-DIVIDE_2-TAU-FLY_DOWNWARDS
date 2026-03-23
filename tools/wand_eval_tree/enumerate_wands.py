import subprocess
import json
import itertools
import os
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

# Configuration
LUX_PATH = r"E:\download\gggit\bin\luajit.exe"
MAIN_LUA = "main.lua"
WAND_EVAL_DIR = r"E:\download\gggit\wand_eval_tree"
OUTPUT_ROOT = r"E:\download\gggit\biao\纯一分"

DIVIDE_OPTIONS = ["DIVIDE_10", "DIVIDE_4", "DIVIDE_3", "DIVIDE_2"]

def run_eval(spells):
    cmd = [LUX_PATH, MAIN_LUA, "-j", "true", "-sp"]
    for i, s in enumerate(spells, 1):
        cmd.append(f"{i}:{s}")
    
    try:
        # Use a timeout to prevent hanging
        result = subprocess.run(cmd, cwd=WAND_EVAL_DIR, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return None
        data = json.loads(result.stdout)
        return data.get("counts", {}).get("FLY_DOWNWARDS", 0)
    except Exception as e:
        return None

def run_task(task_name, target_dir, include_burst8, slots, suffix=None):
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
    
    combos = list(itertools.product(DIVIDE_OPTIONS, repeat=slots))
    
    total = len(combos)
    print(f"Starting Task: {task_name} ({total} combos) with parallel execution...")
    
    tasks = []
    for combo in combos:
        spells = []
        if include_burst8:
            spells.append("BURST_8")
        spells.extend(list(combo))
        if suffix:
            spells.append(suffix)
        spells.append("FLY_DOWNWARDS")
        tasks.append(spells)

    # Use ThreadPoolExecutor for concurrent subprocesses
    results_list = []
    with ThreadPoolExecutor(max_workers=os.cpu_count() * 2) as executor:
        future_to_spells = {executor.submit(run_eval, s): s for s in tasks}
        
        count_completed = 0
        for future in future_to_spells:
            spells = future_to_spells[future]
            try:
                count = future.result()
                results_list.append((spells, count))
            except Exception as exc:
                results_list.append((spells, None))
            
            count_completed += 1
            if count_completed % 50 == 0:
                print(f"  Progress: {count_completed}/{total}")

    # Group and save
    grouped_results = defaultdict(list)
    for spells, count in results_list:
        # Identify start spell from the sequence (it's after BURST_8 if present)
        idx_start = 1 if include_burst8 else 0
        start_spell = spells[idx_start]
        full_spell_str = ",".join(spells)
        grouped_results[start_spell].append((full_spell_str, count))

    for start_spell, results in grouped_results.items():
        output_file = os.path.join(target_dir, f"{start_spell}_start.md")
        lines = []
        lines.append(f"# {start_spell} 开头 - {task_name}")
        lines.append("| 组合 | FLY_DOWNWARDS 总量 |")
        lines.append("| --- | --- |")
        # Sort results for consistency since parallel execution might reorder them
        results.sort() 
        for full_spell_str, count in results:
            lines.append(f"| {full_spell_str} | {count if count is not None else 'ERROR'} |")
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
    print(f"Finished {task_name}\n")

if __name__ == "__main__":
    # Task 1: 4位-8重
    run_task("4位-8重", os.path.join(OUTPUT_ROOT, "4位-8重"), True, 4)
    
    # Task 2: 5位-8重-d2结尾
    run_task("5位-8重-d2结尾", os.path.join(OUTPUT_ROOT, "5位-8重-d2结尾"), True, 4, "DIVIDE_2")
    
    # Task 3: 5位-无8重-d2结尾
    run_task("5位-无8重-d2结尾", os.path.join(OUTPUT_ROOT, "5位-无8重-d2结尾"), False, 4, "DIVIDE_2")
