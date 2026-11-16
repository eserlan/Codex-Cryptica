#!/usr/bin/env python3
"""Unit tests for the Muse (Muse) software factory."""

import importlib.machinery
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.dont_write_bytecode = True

REPO_ROOT = Path(__file__).resolve().parents[2]
FACTORY_DIR = REPO_ROOT / "factory"
BIN_DIR = FACTORY_DIR / "bin"
SKILL_PATH = REPO_ROOT / ".agents" / "skills" / "factory-muse" / "SKILL.md"
WORKFLOW_PATH = BIN_DIR / "muse_workflow.js"


def load_job_module():
    loader = importlib.machinery.SourceFileLoader("factory_job_muse", str(BIN_DIR / "job"))
    spec = importlib.util.spec_from_loader("factory_job_muse", loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


class TestMuseWorkflowScript(unittest.TestCase):
    def test_workflow_parses_as_javascript_module(self):
        res = subprocess.run(
            ["node", "--check", str(WORKFLOW_PATH)], capture_output=True, text=True
        )
        self.assertEqual(res.returncode, 0, res.stderr)

    def test_workflow_reuses_factory_scripts_and_never_merges(self):
        source = WORKFLOW_PATH.read_text()
        for token in ("bin/job", "bin/route", "bin/gate", "host.parallel", "host.agent"):
            self.assertIn(token, source)
        self.assertIn("advance ${jobId} needs-human", source)
        self.assertNotIn("job merge", source)
        self.assertNotIn("jobBin} merge", source)

    def test_workflow_header_matches_cost_contract(self):
        source = WORKFLOW_PATH.read_text()
        self.assertIn("Job folder: ${jobsDir}/${job.id}/.", source)
        self.assertIn("Agent: ${agentName}.", source)
        self.assertIn("Model: ${model}.", source)

    def test_workflow_maps_tiers_to_models_and_requires_repo(self):
        source = WORKFLOW_PATH.read_text()
        self.assertIn('opus: { model: "muse-wonder-1.0", effort: "high" }', source)
        self.assertIn('sonnet: { model: "muse-ember-1.0", effort: "medium" }', source)
        self.assertIn('haiku: { model: "muse-spark-1.3", effort: "low" }', source)
        self.assertIn("model: sel.model", source)
        self.assertIn("args.repo", source)

    def test_workflow_uses_configured_models_and_quotes_queue_label(self):
        workflow_url = WORKFLOW_PATH.resolve().as_uri()
        script = f'''import workflow from {json.dumps(workflow_url)};
const config = JSON.parse(await (await import("node:fs/promises")).readFile({json.dumps(str(FACTORY_DIR / "config.json"))}, "utf8"));
config.muse_models.haiku = {{ model: "muse-configured-test", effort: "xhigh" }};
const calls = [];
const host = {{ args: {{ mode: "run", repo: "/repo", queue_label: "factory; touch /tmp/muse-workflow-audit; #" }}, agent: async (request) => {{
  const command = request.input.match(/:\\n\\n([\\s\\S]*?)\\n\\nReturn exitCode/)[1];
  calls.push({{ command, model: request.model, effort: request.effort }});
  const stdout = command === "cat /repo/factory/config.json" ? JSON.stringify(config) : "";
  return {{ data: {{ exitCode: 0, stdout }} }};
}} }};
await workflow(host);
console.log(JSON.stringify(calls));'''
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script], capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(calls[1]["model"], "muse-configured-test")
        self.assertEqual(calls[1]["effort"], "xhigh")
        self.assertIn(
            "FACTORY_QUEUE_LABEL='factory; touch /tmp/muse-workflow-audit; #' ",
            calls[1]["command"],
        )


class TestMuseSkill(unittest.TestCase):
    def test_skill_frontmatter_and_entry_points(self):
        text = SKILL_PATH.read_text()
        self.assertTrue(text.startswith("---\n"))
        self.assertIn("name: factory-muse", text)
        self.assertIn("/factory-muse run", text)
        self.assertIn("factory/bin/muse_workflow.js", text)
        self.assertIn("muse.workflow", text)

    def test_skill_documents_manual_fallback_and_guardrails(self):
        text = SKILL_PATH.read_text()
        self.assertIn("muse.subagent_spawn", text)
        self.assertIn("factory:needs-human", text)
        self.assertIn("Never paste issue text into a prompt", text)


class TestMuseConfig(unittest.TestCase):
    def test_config_has_muse_models_and_prices(self):
        config = json.loads((FACTORY_DIR / "config.json").read_text())
        models = config["muse_models"]
        self.assertEqual(models["opus"], {"model": "muse-wonder-1.0", "effort": "high"})
        self.assertEqual(models["sonnet"], {"model": "muse-ember-1.0", "effort": "medium"})
        self.assertEqual(models["haiku"], {"model": "muse-spark-1.3", "effort": "low"})
        for model in ("muse-wonder-1.0", "muse-ember-1.0", "muse-spark-1.3"):
            price = config["prices_usd_per_mtok"][model]
            for key in ("input", "output", "cache_write_5m", "cache_write_1h", "cache_read"):
                self.assertIn(key, price)


class TestMuseCosts(unittest.TestCase):
    def setUp(self):
        self.job_mod = load_job_module()

    def _write_session(self, root, job, quantities, agent="builder", model="muse-wonder-1.0"):
        session_dir = root / "2026" / "01" / "01" / "00000000-0000-0000-0000-000000000001"
        session_dir.mkdir(parents=True, exist_ok=True)
        header = (
            f"Job: {job['id']}. Job folder: {self.job_mod.job_dir(job['id'])}/. "
            f"Main checkout: {REPO_ROOT}. Agent: {agent}. Model: {model}."
        )
        records = [{"payload_type": "runtime.user", "payload": {"text": header}}]
        for i, quantity in enumerate(quantities):
            records.append({
                "payload_type": "runtime.session",
                "payload": {"event": {"kind": "goal_usage_attribution", "record": {
                    "usage_id": f"u{i}", "quantity": quantity}}},
            })
        children = [{"record_json": json.dumps(r)} for r in records]
        line = json.dumps({"retained_frame": "x", "children": children})
        (session_dir / "session.jsonl").write_text(line + "\n")

    def test_job_costs_counts_muse_session(self):
        job = {"id": "001-help-describe-enter-your", "started": "2020-01-01T00:00:00Z",
               "agents": {"reviewers": {}}}
        with tempfile.TemporaryDirectory() as tmp:
            sessions = Path(tmp)
            self._write_session(sessions, job, [
                {"input_tokens": 1000, "output_tokens": 100, "cached_tokens": 50},
                {"input_tokens": 2000, "output_tokens": 200, "cached_tokens": 0},
            ])
            with patch.dict(os.environ, {"MUSE_SESSIONS_DIR": str(sessions)}), \
                 patch.object(self.job_mod, "transcripts_dir", return_value=Path(tmp) / "no-claude"), \
                 patch.object(self.job_mod, "agy_transcript_files", return_value=[]):
                total, by_agent = self.job_mod.job_costs(job)
        self.assertIn("builder", by_agent)
        row = by_agent["builder"]
        # Muse input_tokens includes cached tokens; only the non-cached
        # part is billed (and reported) at the input rate.
        self.assertEqual(row["input_tokens"], 2950)
        self.assertEqual(row["output_tokens"], 300)
        self.assertEqual(row["cache_read_tokens"], 50)
        self.assertIn("muse-wonder-1.0", row["models"])
        # (2950*2 + 300*10 + 50*0.20) / 1e6 at muse-wonder-1.0 prices,
        # rounded to cents by job_costs like every other runtime.
        self.assertAlmostEqual(total, 0.01, places=5)
        self.assertAlmostEqual(row["usd"], 0.0089, places=4)

    def test_job_costs_bills_spark_at_spark_price(self):
        job = {"id": "001-help-describe-enter-your", "started": "2020-01-01T00:00:00Z",
               "agents": {"reviewers": {}}}
        with tempfile.TemporaryDirectory() as tmp:
            sessions = Path(tmp)
            self._write_session(sessions, job, [
                {"input_tokens": 10000, "output_tokens": 1000, "cached_tokens": 0},
            ], agent="reviewer-code", model="muse-spark-1.3")
            with patch.dict(os.environ, {"MUSE_SESSIONS_DIR": str(sessions)}), \
                 patch.object(self.job_mod, "transcripts_dir", return_value=Path(tmp) / "no-claude"), \
                 patch.object(self.job_mod, "agy_transcript_files", return_value=[]):
                _total, by_agent = self.job_mod.job_costs(job)
        row = by_agent["reviewer-code"]
        self.assertIn("muse-spark-1.3", row["models"])
        # (10000*0.50 + 1000*2.50) / 1e6 at muse-spark-1.3 prices
        self.assertAlmostEqual(row["usd"], 0.0075, places=4)

    def test_unknown_muse_model_is_reported_as_unpriced(self):
        job = {"id": "001-help-describe-enter-your", "started": "2020-01-01T00:00:00Z",
               "agents": {"reviewers": {}}}
        with tempfile.TemporaryDirectory() as tmp:
            sessions = Path(tmp)
            self._write_session(sessions, job, [
                {"input_tokens": 10000, "output_tokens": 1000, "cached_tokens": 100},
            ], model="muse-unlisted-model")
            with patch.dict(os.environ, {"MUSE_SESSIONS_DIR": str(sessions)}), \
                 patch.object(self.job_mod, "transcripts_dir", return_value=Path(tmp) / "no-claude"), \
                 patch.object(self.job_mod, "agy_transcript_files", return_value=[]):
                total, by_agent = self.job_mod.job_costs(job)
        row = by_agent["builder"]
        self.assertEqual(total, 0)
        self.assertEqual(row["usd"], 0)
        self.assertFalse(row["pricing_complete"])
        self.assertEqual(row["unpriced_models"], ["muse-unlisted-model"])
        self.assertEqual(row["unpriced_tokens"], 11000)

    def test_muse_session_discovery_uses_both_time_bounds(self):
        with tempfile.TemporaryDirectory() as tmp:
            paths = []
            for name, mtime in (("before", 100), ("inside", 200), ("after", 300)):
                session_dir = Path(tmp) / "2026" / "01" / "01" / name
                session_dir.mkdir(parents=True)
                path = session_dir / "session.jsonl"
                path.write_text("{}\n")
                os.utime(path, (mtime, mtime))
                paths.append(path)
            with patch.dict(os.environ, {"MUSE_SESSIONS_DIR": tmp}):
                found = self.job_mod.muse_session_files(150, 250)
        self.assertEqual(found, [paths[1]])

    def test_job_costs_bills_nested_child_not_parent(self):
        job = {"id": "001-help-describe-enter-your", "started": "2020-01-01T00:00:00Z",
               "agents": {"reviewers": {}}}
        with tempfile.TemporaryDirectory() as tmp:
            sessions = Path(tmp)
            parent = sessions / "2026" / "01" / "01" / "parent-session"
            # Parent log carries the header in spawn records and its own huge
            # usage; it must be skipped in favour of the nested child log.
            child_root = parent / "subagent"
            parent.mkdir(parents=True)
            header = (
                f"Job: {job['id']}. Job folder: {self.job_mod.job_dir(job['id'])}/. "
                f"Agent: builder. Model: muse-wonder-1.0."
            )
            def line_for(qty, uid):
                recs = [{"payload_type": "runtime.user", "payload": {"text": header}},
                        {"payload_type": "runtime.session", "payload": {"event": {
                            "kind": "goal_usage_attribution", "record": {
                                "usage_id": uid, "quantity": qty}}}}]
                return json.dumps({"children": [{"record_json": json.dumps(r)} for r in recs]}) + "\n"
            (parent / "session.jsonl").write_text(line_for(
                {"input_tokens": 9000000, "output_tokens": 9000, "cached_tokens": 0}, "p0"))
            child = child_root / "child-1"
            child.mkdir(parents=True)
            (child / "session.jsonl").write_text(line_for(
                {"input_tokens": 1000, "output_tokens": 10, "cached_tokens": 0}, "c0"))
            with patch.dict(os.environ, {"MUSE_SESSIONS_DIR": str(sessions)}), \
                 patch.object(self.job_mod, "transcripts_dir", return_value=Path(tmp) / "no-claude"), \
                 patch.object(self.job_mod, "agy_transcript_files", return_value=[]):
                _total, by_agent = self.job_mod.job_costs(job)
        row = by_agent["builder"]
        self.assertEqual(row["spawns"], 1)
        self.assertEqual(row["input_tokens"], 1000)

    def test_job_costs_ignores_session_without_factory_header(self):
        job = {"id": "001-help-describe-enter-your", "started": "2020-01-01T00:00:00Z",
               "agents": {"reviewers": {}}}
        with tempfile.TemporaryDirectory() as tmp:
            sessions = Path(tmp)
            session_dir = sessions / "2026" / "01" / "01" / "s1"
            session_dir.mkdir(parents=True)
            record = {"payload_type": "runtime.session", "payload": {"event": {
                "kind": "goal_usage_attribution", "record": {
                    "usage_id": "u0", "quantity": {
                        "input_tokens": 9999, "output_tokens": 1, "cached_tokens": 0}}}}}
            (session_dir / "session.jsonl").write_text(json.dumps(record) + "\n")
            with patch.dict(os.environ, {"MUSE_SESSIONS_DIR": str(sessions)}), \
                 patch.object(self.job_mod, "transcripts_dir", return_value=Path(tmp) / "no-claude"), \
                 patch.object(self.job_mod, "agy_transcript_files", return_value=[]):
                total, by_agent = self.job_mod.job_costs(job)
        self.assertEqual(total, 0)
        self.assertNotIn("builder", by_agent)


if __name__ == "__main__":
    unittest.main()
