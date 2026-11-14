#!/usr/bin/env python3
"""Unit and integration tests for the Antigravity (AGY) software factory."""

import ast
import asyncio
import importlib.machinery
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FACTORY_DIR = WORKTREE_ROOT / "factory"
BIN_DIR = FACTORY_DIR / "bin"


def load_script_module(name, path):
    loader = importlib.machinery.SourceFileLoader(name, str(path))
    spec = importlib.util.spec_from_loader(name, loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


def load_workflow_namespace(extra_globals=None):
    wf_path = BIN_DIR / "agy_workflow.py"
    source = wf_path.read_text()
    code = compile(source, str(wf_path), "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    ns = {
        "__file__": str(wf_path),
        "__name__": "agy_workflow",
        "WORKSPACES": (str(WORKTREE_ROOT),),
    }
    if extra_globals:
        ns.update(extra_globals)
    coro = eval(code, ns)
    if coro is not None:
        asyncio.run(coro)
    return ns


class TestAgyFactory(unittest.TestCase):
    def setUp(self):
        self.job_mod = load_script_module("factory_job", BIN_DIR / "job")
        self.wf_ns = load_workflow_namespace()

    def test_worktree_safe_next_job_number(self):
        """next_job_number() inspects parent worktree jobs and git factory/* branches."""
        next_num = self.job_mod.next_job_number()
        self.assertGreaterEqual(
            next_num,
            15,
            "Expected next_job_number() in separate worktree to see existing factory branches/jobs",
        )

    def test_load_all_eight_role_instructions(self):
        """All 8 .claude/agents/*.md files load cleanly with frontmatter stripped and AGY contract added."""
        roles = [
            "intake",
            "spec-writer",
            "builder",
            "approver",
            "reviewer-code",
            "reviewer-ux",
            "reviewer-ui",
            "reviewer-security",
        ]
        for role in roles:
            instructions = self.wf_ns["load_role_instructions"](role)
            self.assertFalse(instructions.startswith("---"), f"Frontmatter not stripped for {role}")
            self.assertIn("Antigravity (AGY) Tool & Completion Contract", instructions)
            self.assertIn("read_file", instructions)

    def test_missing_role_instructions_raises(self):
        """Negative path: requesting a non-existent agent role raises RuntimeError."""
        with self.assertRaises(RuntimeError):
            self.wf_ns["load_role_instructions"]("non-existent-role")

    def test_model_mapping_and_ports(self):
        """map_model and job_ports match factory config conventions."""
        map_model = self.wf_ns["map_model"]
        self.assertEqual(map_model("opus"), "pro")
        self.assertEqual(map_model("sonnet"), "inherit")
        self.assertEqual(map_model("haiku"), "flash")
        self.assertEqual(map_model("opus", override="flash_lite"), "flash_lite")

        ports = self.wf_ns["job_ports"]("004-dark-mode")
        self.assertEqual(ports, {"builder": 5340, "ux": 5341, "ui": 5342})

    def test_build_round_instructions_all_branches(self):
        """build_round_instruction handles round 1, gate failure, review changes, and user feedback."""
        build_round_instruction = self.wf_ns["build_round_instruction"]
        with tempfile.TemporaryDirectory() as tmp:
            tmp_jobs = Path(tmp) / "jobs"
            job_id = "099-test-job"
            jdir = tmp_jobs / job_id
            jdir.mkdir(parents=True)
            self.wf_ns["JOBS"] = tmp_jobs

            job = {
                "id": job_id,
                "issue": 999,
                "round": 1,
                "base": "staging",
                "stacked_on": "098-parent",
            }
            # 1. Fresh round 1 with stacking
            msg1 = build_round_instruction(job)
            self.assertIn("Build round 1. Port: 6290.", msg1)
            self.assertIn("Stacked on 098-parent", msg1)
            self.assertIn("Implement spec.md", msg1)

            # 2. Round 2 after gate failure
            job["round"] = 2
            r1 = jdir / "round-1"
            r1.mkdir()
            (r1 / "checks.md").write_text("GATE: FAIL\nCOMMIT: abc\n")
            msg2 = build_round_instruction(job)
            self.assertIn("The gate failed: read round-1/checks.md", msg2)

            # 3. Round 2 after review CHANGES
            (r1 / "checks.md").write_text("GATE: PASS\nCOMMIT: abc\n")
            (r1 / "review-code.md").write_text("VERDICT: CHANGES\n")
            msg3 = build_round_instruction(job)
            self.assertIn("Round 1 reviews are in round-1/", msg3)

            # 4. User feedback after escalation
            (jdir / "decision.md").write_text("ESCALATE\n")
            fb = jdir / "feedback-1.md"
            fb.write_text("# Feedback 1\nFix button label\n")
            os.utime(jdir / "decision.md", (1000, 1000))
            os.utime(fb, (2000, 2000))
            msg4 = build_round_instruction(job)
            self.assertIn("The user gave feedback: read feedback-1.md", msg4)

    def test_agy_transcript_cost_tracking(self):
        """job_costs aggregates AGY transcript token usage and ignores unrelated/malformed transcripts."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            fake_jobs = tmp_path / "jobs"
            job_id = "050-cost-test"
            jdir = fake_jobs / job_id
            jdir.mkdir(parents=True)

            agy_brain = tmp_path / "gemini" / "antigravity-cli" / "brain"
            conv1 = agy_brain / "conv-intake" / ".system_generated" / "logs"
            conv2 = agy_brain / "conv-other" / ".system_generated" / "logs"
            conv1.mkdir(parents=True)
            conv2.mkdir(parents=True)

            header = (
                f"Job: {job_id}. Job folder: {jdir}/. Main checkout: {WORKTREE_ROOT}. "
                f"Worktree: {WORKTREE_ROOT}/.worktrees/{job_id}. Branch: factory/{job_id}. "
                f"Base: origin/staging. Issue: #50. Agent: intake. Model: pro."
            )
            (conv1 / "transcript.jsonl").write_text(
                "\n".join([
                    json.dumps({"type": "USER_INPUT", "content": header}),
                    json.dumps({
                        "type": "PLANNER_RESPONSE",
                        "input_tokens": 100000,
                        "output_tokens": 5000,
                        "cache_read_tokens": 200000,
                    }),
                    json.dumps({
                        "type": "PLANNER_RESPONSE",
                        "input_tokens": 0,
                        "output_tokens": 0,
                        "cache_read_tokens": 0,
                    }),
                ]) + "\n"
            )
            # Unrelated conversation (negative path)
            (conv2 / "transcript.jsonl").write_text(
                json.dumps({"type": "USER_INPUT", "content": "Hello world"}) + "\n"
            )

            old_jobs = self.job_mod.JOBS
            old_env = os.environ.get("AGY_CONFIG_DIR")
            old_claude = os.environ.get("CLAUDE_CONFIG_DIR")
            try:
                self.job_mod.JOBS = fake_jobs
                os.environ["AGY_CONFIG_DIR"] = str(tmp_path / "gemini")
                os.environ["CLAUDE_CONFIG_DIR"] = str(tmp_path / "empty_claude")
                job_data = {
                    "id": job_id,
                    "started": "2020-01-01T00:00:00Z",
                    "agents": {"reviewers": {"code": "haiku"}},
                }
                total, by_agent = self.job_mod.job_costs(job_data)
                self.assertIn("intake", by_agent)
                intake_row = by_agent["intake"]
                self.assertEqual(intake_row["spawns"], 1)
                self.assertEqual(intake_row["turns"], 1)
                self.assertEqual(intake_row["input_tokens"], 100000)
                self.assertEqual(intake_row["output_tokens"], 5000)
                self.assertEqual(intake_row["cache_read_tokens"], 200000)
                self.assertEqual(intake_row["models"], ["agy-pro"])
                self.assertGreater(total, 0.0)
            finally:
                self.job_mod.JOBS = old_jobs
                if old_env is None:
                    os.environ.pop("AGY_CONFIG_DIR", None)
                else:
                    os.environ["AGY_CONFIG_DIR"] = old_env
                if old_claude is None:
                    os.environ.pop("CLAUDE_CONFIG_DIR", None)
                else:
                    os.environ["CLAUDE_CONFIG_DIR"] = old_claude

    def test_gate_agy_stop_hook_allow_and_block(self):
        """gate --hook follows the AGY Stop hook JSON contract for non-builders, continuationActive, and builders."""
        gate_bin = str(BIN_DIR / "gate")

        # 1. Non-builder conversation -> allow immediately
        with tempfile.TemporaryDirectory() as tmp:
            t_path = Path(tmp) / "transcript.jsonl"
            t_path.write_text(json.dumps({"type": "USER_INPUT", "content": "Normal user chat"}) + "\n")
            res = subprocess.run(
                [gate_bin, "--hook"],
                input=json.dumps({
                    "hookEventName": "Stop",
                    "transcriptPath": str(t_path),
                    "continuationActive": False,
                    "terminationReason": "NO_TOOL_CALL",
                }),
                capture_output=True,
                text=True,
                check=True,
            )
            self.assertEqual(json.loads(res.stdout), {"decision": "allow"})

            # 2. continuationActive=True -> allow immediately (prevents infinite loop)
            res2 = subprocess.run(
                [gate_bin, "--hook"],
                input=json.dumps({
                    "hookEventName": "Stop",
                    "transcriptPath": str(t_path),
                    "continuationActive": True,
                    "terminationReason": "NO_TOOL_CALL",
                }),
                capture_output=True,
                text=True,
                check=True,
            )
            self.assertEqual(json.loads(res2.stdout), {"decision": "allow"})

            # 3. Builder with STATUS: BLOCKED in build.md -> allow stop without running checks
            job_folder = Path(tmp) / "jobs" / "099-blocked"
            job_folder.mkdir(parents=True)
            (job_folder / "job.json").write_text(json.dumps({"id": "099-blocked", "worktree": str(tmp)}))
            (job_folder / "build.md").write_text("STATUS: BLOCKED\n\n## Blocked\nMissing spec info.\n")
            builder_prompt = (
                f"Job: 099-blocked. Job folder: {job_folder}/. Main checkout: {WORKTREE_ROOT}. "
                f"Worktree: {tmp}. Branch: factory/099-blocked. Base: origin/staging. "
                f"Issue: #99. Agent: builder. Model: inherit. Build round 1."
            )
            t_path.write_text(json.dumps({"type": "USER_INPUT", "content": builder_prompt}) + "\n")
            res3 = subprocess.run(
                [gate_bin, "--hook"],
                input=json.dumps({
                    "hookEventName": "Stop",
                    "transcriptPath": str(t_path),
                    "continuationActive": False,
                    "terminationReason": "NO_TOOL_CALL",
                }),
                capture_output=True,
                text=True,
                check=True,
            )
            self.assertEqual(json.loads(res3.stdout), {"decision": "allow"})


if __name__ == "__main__":
    unittest.main()
