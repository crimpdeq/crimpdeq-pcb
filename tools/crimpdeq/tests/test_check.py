"""Regression coverage for the CI gate, without requiring a KiCad installation."""

from collections import Counter
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("pcb_check", Path(__file__).parents[1] / "check.py")
check = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(check)


def report(kind="drc"):
    data = {
        "$schema": f"https://schemas.kicad.org/{kind}.v1.json",
        "source": f"crimpdeq.kicad_{'sch' if kind == 'erc' else 'pcb'}",
        "included_severities": ["error", "warning"],
    }
    if kind == "erc":
        data["sheets"] = [{"path": "/", "violations": []}]
    else:
        data.update(violations=[], unconnected_items=[], schematic_parity=[])
    return data


class CheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name)
        self.path = self.output / "report.json"

    def counts(self, data, kind="drc"):
        self.path.write_text(json.dumps(data), encoding="utf-8")
        return check.report_counts(self.path, kind, Path(report(kind)["source"]))

    def test_clean_reports_pass(self):
        for kind in ("erc", "drc"):
            with self.subTest(kind=kind):
                self.assertEqual(self.counts(report(kind), kind), Counter())

    def test_missing_report_fails(self):
        with self.assertRaises(OSError):
            check.report_counts(self.path, "drc", Path("crimpdeq.kicad_pcb"))

    def test_empty_garbage_truncated_and_nonobject_reports_fail(self):
        for text in ("", "not a report", '{"violations":', "null", "[]", '"report"'):
            with self.subTest(text=text):
                self.path.write_text(text, encoding="utf-8")
                with self.assertRaises(ValueError):
                    check.report_counts(self.path, "drc", Path("crimpdeq.kicad_pcb"))

    def test_missing_drc_sections_fail(self):
        for key in ("violations", "unconnected_items", "schematic_parity"):
            with self.subTest(key=key):
                data = report()
                del data[key]
                with self.assertRaises(ValueError):
                    self.counts(data)

    def test_wrong_schema_source_or_severities_fail(self):
        for key, value in (("$schema", "other"), ("source", "other.kicad_pcb"),
                           ("included_severities", ["warning"]),
                           ("included_severities", "error")):
            with self.subTest(key=key, value=value):
                data = report()
                data[key] = value
                with self.assertRaises(ValueError):
                    self.counts(data)

    def test_malformed_violation_lists_and_severities_fail(self):
        for value in (None, {}, [None], [{"severity": None}], [{"severity": []}],
                      [{"severity": "unknown"}]):
            with self.subTest(value=value):
                data = report()
                data["violations"] = value
                with self.assertRaises(ValueError):
                    self.counts(data)

    def test_all_drc_sections_are_checked(self):
        data = report()
        for key in ("violations", "unconnected_items", "schematic_parity"):
            data[key] = [{"severity": "error"}, {"severity": "warning"}]
        self.assertEqual(self.counts(data), Counter(error=3, warning=3))

    def test_every_erc_sheet_is_checked(self):
        data = report("erc")
        data["sheets"].append({"path": "/child", "violations": [{"severity": "error"}]})
        self.assertEqual(self.counts(data, "erc"), Counter(error=1))

    def test_empty_or_incomplete_erc_sheets_fail(self):
        for sheets in ([], None, [{}], [None], [{"violations": None}]):
            with self.subTest(sheets=sheets):
                data = report("erc")
                data["sheets"] = sheets
                with self.assertRaises(ValueError):
                    self.counts(data, "erc")

    def invoke(self, data, status=0, kind="drc"):
        def run(command, log):
            target = Path(command[command.index("--output") + 1])
            target.write_text(json.dumps(data), encoding="utf-8")
            return status

        with patch.object(check, "run_logged", side_effect=run) as mocked:
            detail = check.check_rules(kind, Path(report(kind)["source"]), self.output)
        return detail, mocked.call_args.args[0]

    def test_drc_requests_parity_and_refill_without_saving(self):
        detail, command = self.invoke(report())
        self.assertEqual(detail, "0 errors, 0 warning(s)")
        self.assertIn("--schematic-parity", command)
        self.assertIn("--refill-zones", command)
        self.assertIn("--exit-code-violations", command)
        self.assertNotIn("--save-board", command)

    def test_warning_exit_code_is_accepted_only_with_valid_report(self):
        data = report()
        data["violations"] = [{"severity": "warning"}]
        detail, _ = self.invoke(data, 5)
        self.assertEqual(detail, "0 errors, 1 warning(s)")
        with self.assertRaises(ValueError):
            self.invoke(report(), 5)

    def test_errors_fail_even_if_cli_returns_zero(self):
        for kind, key in (("erc", "sheets"), ("drc", "violations"),
                          ("drc", "unconnected_items"), ("drc", "schematic_parity")):
            with self.subTest(kind=kind, key=key):
                data = report(kind)
                violations = data[key][0]["violations"] if kind == "erc" else data[key]
                violations.append({"severity": "error"})
                with self.assertRaises(ValueError):
                    self.invoke(data, kind=kind)

    def test_tool_failure_is_not_masked_by_clean_report(self):
        for status in (1, 2, -9, 127):
            with self.subTest(status=status), self.assertRaises(ValueError):
                self.invoke(report(), status)

    def test_stale_report_cannot_mask_missing_output(self):
        stale = self.output / "drc.json"
        stale.write_text(json.dumps(report()), encoding="utf-8")
        with patch.object(check, "run_logged", return_value=0), self.assertRaises(OSError):
            check.check_rules("drc", Path("crimpdeq.kicad_pcb"), self.output)
        self.assertFalse(stale.exists())

    def test_failed_invariants_fail_the_gate(self):
        with patch.object(check, "run_logged", return_value=1), self.assertRaises(ValueError):
            check.check_invariants(self.output)

    def test_missing_executable_is_logged_as_failure(self):
        log = self.output / "missing.log"
        with patch.object(subprocess, "run", side_effect=FileNotFoundError("missing")), \
                contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(check.run_logged(["kicad-cli"], log), 127)
        self.assertIn("missing", log.read_text())

    def test_all_checks_and_summary_run_after_a_failure(self):
        with patch.object(sys, "argv", ["check.py", "--output", str(self.output)]), \
                patch.object(check, "check_rules", side_effect=[ValueError("ERC failed"), "0 errors"]) as rules, \
                patch.object(check, "check_invariants", return_value="passed") as invariants, \
                contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(check.main(), 1)
        self.assertEqual(rules.call_count, 2)
        invariants.assert_called_once()
        summary = (self.output / "summary.md").read_text()
        self.assertIn("FAIL — Schematic ERC", summary)
        self.assertIn("PASS — PCB DRC and schematic parity", summary)
        self.assertIn("PASS — Design invariants", summary)


if __name__ == "__main__":
    unittest.main()
