import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from import_contribution import build_index, read_contribution


HEADER = """# format_version=4
# max_count=50000
# max_draws=1
# min_len=0
# max_len=11
# half=both
# keep=shortest
# alphabet=(+0234:;?Tm{
# search_depth=11
# status=ok
sequence,output,length,draws,half
"""


class ImportContributionTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.source = self.root / "source.csv"

    def write_source(self, rows, header=HEADER):
        self.source.write_text(header + rows, encoding="utf-8")
        return self.source

    def test_preserves_empty_sequence_and_half_variants(self):
        self.write_source(",0,0,1,0\n{m,1,2,1,0\n{m,0,2,1,1\n??m,1,3,1,0\n")
        raw, metadata, rows = read_contribution(self.source)
        self.assertEqual(len(rows), 4)
        self.assertEqual(rows[0], ("", 0, 0, 1, 0))
        self.assertEqual(metadata["max_draws"], "1")
        self.assertEqual(raw, self.source.read_bytes())

    def test_rejects_invalid_rows(self):
        for row in ("x,1,1,1,0", "m,1,2,1,0", "m,-1,1,1,0", "m,50001,1,1,0",
                    "m,1,1,2,0", "m,1,1,1,2", "m,a,1,1,0", "m,1,1", "m,1,1,1,0,extra",
                    "m,1,1,1,0\nm,2,1,1,0", "mmmmmmmmmmmm,12,12,1,0"):
            with self.subTest(row=row):
                self.write_source(row + "\n")
                with self.assertRaisesRegex(ValueError, "CSV line"):
                    read_contribution(self.source)

    def test_rejects_unsupported_metadata_and_columns(self):
        for before, after in (("format_version=4", "format_version=5"), ("status=ok", "status=running"),
                              ("max_draws=1", "max_draws=2"), ("max_len=11", "max_len=bad"),
                              ("alphabet=(+0234:;?Tm{", "alphabet=m"), ("# min_len=0\n", ""),
                              ("sequence,output,length,draws,half", "sequence,output,length,half,draws"),
                              ("# status=ok", "# status=ok\n# status=ok")):
            with self.subTest(before=before):
                self.write_source("m,1,1,1,0\n", HEADER.replace(before, after))
                with self.assertRaises(ValueError):
                    read_contribution(self.source)
        self.write_source("")
        with self.assertRaisesRegex(ValueError, "No result"):
            read_contribution(self.source)

    def test_index_round_trip_and_source_copy(self):
        self.write_source(",0,0,1,0\nmm,2,2,1,0\nm,1,1,1,0\n0m,11,2,1,0\n{m,0,2,1,1\n")
        target = self.root / "imported"
        manifest = build_index(self.source, target)
        self.assertEqual(manifest["indexed_rows"], 5)
        self.assertEqual(manifest["counts"], {"0": 2, "1": 1, "2": 1, "11": 1})
        self.assertEqual(manifest["target_spell"], "ELECTRIC_CHARGE")
        self.assertEqual((target / manifest["source_file"]).read_bytes(), self.source.read_bytes())
        bucket = json.loads((target / "0.json").read_text())
        self.assertEqual(bucket["0"], [["", 1, 0], ["{m", 1, 1]])
        with self.assertRaisesRegex(ValueError, "empty"):
            build_index(self.source, target)
        self.assertEqual(json.loads((target / "0.json").read_text()), bucket)

    def test_invalid_source_does_not_create_output(self):
        self.write_source("x,1,1,1,0\n")
        target = self.root / "not-created"
        with self.assertRaises(ValueError):
            build_index(self.source, target)
        self.assertFalse(target.exists())

    def test_cli_success_and_error(self):
        self.write_source("m,1,1,1,0\n")
        command = [sys.executable, str(Path(__file__).with_name("import_contribution.py")), str(self.source), str(self.root / "out")]
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["indexed_rows"], 1)
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn("Output directory must be empty", result.stderr)


if __name__ == "__main__":
    unittest.main()
