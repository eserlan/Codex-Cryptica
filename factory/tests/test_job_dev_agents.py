import importlib.machinery
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

path = str(Path(__file__).parents[1] / "bin/job")
loader = importlib.machinery.SourceFileLoader("factory_job", path)
spec = importlib.util.spec_from_loader("factory_job", loader)
job_mod = importlib.util.module_from_spec(spec)
loader.exec_module(job_mod)


def make_job(stage="needs-human", pr=7):
    return {"id": "001-x", "issue": 1, "pr": pr, "stage": stage, "branch": "factory/001-x",
            "worktree": "/nonexistent", "round": 1, "round_limit": 3}


class DevAgentsTests(unittest.TestCase):
    def test_transitions(self):
        t = job_mod.TRANSITIONS
        self.assertIn("dev-agents", t["needs-human"])
        self.assertEqual(t["dev-agents"], {"merged"})

    def test_dev_agents_holds_no_slot(self):
        self.assertEqual(job_mod.running([make_job("dev-agents"), make_job("build")]), [make_job("build")])

    def test_approve_removes_labels_and_hands_off(self):
        calls = []
        with patch.object(job_mod, "refresh_pr"), patch.object(job_mod, "pr_state", return_value="OPEN"), \
             patch.object(job_mod, "label", side_effect=lambda *a, **k: calls.append((a, k))), \
             patch.object(job_mod, "comment"), patch.object(job_mod, "job_dir", return_value=Path("/nonexistent")), \
             patch.object(job_mod, "header", return_value={}):
            j = job_mod.advance(make_job(), "dev-agents")
        self.assertEqual(j["stage"], "dev-agents")
        self.assertEqual([c[0][0] for c in calls], ["issue", "pr"])
        for _, kw in calls:
            self.assertIn("factory:needs-human", kw["remove"])
            self.assertIn("factory", kw["remove"])

    def test_approve_refuses_a_closed_pr(self):
        with patch.object(job_mod, "refresh_pr"), patch.object(job_mod, "pr_state", return_value="CLOSED"), \
             patch.object(job_mod, "job_dir", return_value=Path("/nonexistent")), \
             patch.object(job_mod, "header", return_value={}):
            with self.assertRaises(job_mod.Refused):
                job_mod.advance(make_job(), "dev-agents")

    def test_done_only_when_merged_into_base(self):
        for state, base, ok in [("MERGED", "staging", True), ("MERGED", "factory/other", False), ("OPEN", "staging", False)]:
            with patch.object(job_mod, "gh_json", return_value={"state": state, "baseRefName": base}), \
                 patch.object(job_mod, "job_dir", return_value=Path("/nonexistent")), \
                 patch.object(job_mod, "header", return_value={}):
                if ok:
                    self.assertEqual(job_mod.advance(make_job("dev-agents"), "merged")["stage"], "merged")
                else:
                    with self.assertRaises(job_mod.Refused):
                        job_mod.advance(make_job("dev-agents"), "merged")

    def test_stacked_job_done_when_merged_parent_chain_reaches_base(self):
        child = make_job("dev-agents")
        child.update({"id": "002-child", "stacked_on": "001-parent", "base": "factory/001-parent"})
        parent = {"id": "001-parent", "pr": 8, "branch": "factory/001-parent", "stacked_on": None}
        with tempfile.TemporaryDirectory() as temp_dir:
            parent_dir = Path(temp_dir) / parent["id"]
            parent_dir.mkdir()
            (parent_dir / "job.json").write_text(json.dumps(parent))
            with patch.object(job_mod, "JOBS", Path(temp_dir)), \
                 patch.object(job_mod, "gh_json", side_effect=[
                     {"state": "MERGED", "baseRefName": "factory/001-parent"},
                     {"state": "MERGED", "baseRefName": "staging"},
                 ]):
                self.assertEqual(job_mod.advance(child, "merged")["stage"], "merged")

    def test_stacked_job_waits_until_parent_chain_reaches_base(self):
        child = make_job("dev-agents")
        child.update({"id": "002-child", "stacked_on": "001-parent", "base": "factory/001-parent"})
        parent = {"id": "001-parent", "pr": 8, "branch": "factory/001-parent", "stacked_on": None}
        with tempfile.TemporaryDirectory() as temp_dir:
            parent_dir = Path(temp_dir) / parent["id"]
            parent_dir.mkdir()
            (parent_dir / "job.json").write_text(json.dumps(parent))
            with patch.object(job_mod, "JOBS", Path(temp_dir)), \
                 patch.object(job_mod, "gh_json", side_effect=[
                     {"state": "MERGED", "baseRefName": "factory/001-parent"},
                     {"state": "OPEN", "baseRefName": "staging"},
                 ]):
                with self.assertRaises(job_mod.Refused):
                    job_mod.advance(child, "merged")

    def test_cmd_queue_memoizes_stacked_pr_chain_queries(self):
        chain = [
            {"id": "001-root", "issue": 1, "pr": 101, "stage": "dev-agents",
             "branch": "factory/001-root", "worktree": "/nonexistent", "stacked_on": None, "base": "staging"},
            {"id": "002-mid", "issue": 2, "pr": 102, "stage": "dev-agents",
             "branch": "factory/002-mid", "worktree": "/nonexistent", "stacked_on": "001-root", "base": "factory/001-root"},
            {"id": "003-leaf", "issue": 3, "pr": 103, "stage": "dev-agents",
             "branch": "factory/003-leaf", "worktree": "/nonexistent", "stacked_on": "002-mid", "base": "factory/002-mid"},
        ]
        pr_views = {
            "101": {"state": "OPEN", "baseRefName": "staging"},
            "102": {"state": "MERGED", "baseRefName": "factory/001-root"},
            "103": {"state": "MERGED", "baseRefName": "factory/002-mid"},
        }
        pr_view_calls = []

        def fake_gh_json(*args):
            if args[:2] == ("pr", "view"):
                pr_view_calls.append(args[2])
                return pr_views[args[2]]
            if args[:2] == ("issue", "list"):
                return []
            raise AssertionError(f"unexpected gh_json call: {args}")

        with tempfile.TemporaryDirectory() as temp_dir:
            for item in chain:
                d = Path(temp_dir) / item["id"]
                d.mkdir()
                (d / "job.json").write_text(json.dumps(item))
            with patch.object(job_mod, "JOBS", Path(temp_dir)), \
                 patch.object(job_mod, "all_jobs", return_value=chain), \
                 patch.object(job_mod, "other_worktree_jobs", return_value={}), \
                 patch.object(job_mod, "gh_json", side_effect=fake_gh_json):
                job_mod.cmd_queue()

        self.assertEqual(len(pr_view_calls), 3)
        self.assertEqual(set(pr_view_calls), {"101", "102", "103"})


if __name__ == "__main__":
    unittest.main()
