#!/usr/bin/env python3
"""Unit and integration tests for the Antigravity (AGY) software factory."""

import ast
import asyncio
import contextlib
import importlib.machinery
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
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
            1,
            "Expected next_job_number() in separate worktree to return a positive job number",
        )

    def test_other_worktree_jobs_includes_sibling_worktrees(self):
        with tempfile.TemporaryDirectory() as tmp:
            sibling_jobs = Path(tmp) / "factory" / "jobs" / "042-sibling-job"
            sibling_jobs.mkdir(parents=True)
            (sibling_jobs / "job.json").write_text(json.dumps({
                "id": "042-sibling-job", "issue": 4200, "stage": "intake",
            }))
            output = f"worktree {WORKTREE_ROOT}\nHEAD abc\n\nworktree {tmp}\nHEAD def\n"
            original_run = self.job_mod.run

            def fake_run(cmd, **kwargs):
                if cmd == ["git", "worktree", "list", "--porcelain"]:
                    return type("Result", (), {"stdout": output})()
                return original_run(cmd, **kwargs)

            with patch.object(self.job_mod, "run", side_effect=fake_run):
                self.assertEqual(self.job_mod.other_worktree_jobs()[4200]["id"], "042-sibling-job")
                self.assertGreaterEqual(self.job_mod.next_job_number(), 43)

    def test_next_job_number_parses_complete_numeric_prefixes(self):
        with tempfile.TemporaryDirectory() as tmp:
            jobs = Path(tmp)
            (jobs / "1000-existing-job").mkdir()
            refs = "factory/1002-existing-branch\n"

            def fake_run(cmd, **kwargs):
                if cmd[:2] == ["git", "for-each-ref"]:
                    return type("Result", (), {"stdout": refs})()
                return type("Result", (), {"stdout": ""})()

            with patch.object(self.job_mod, "JOBS", jobs), \
                    patch.object(self.job_mod, "other_worktree_jobs", return_value={
                        1001: {"id": "1001-sibling-job"},
                    }), patch.object(self.job_mod, "run", side_effect=fake_run):
                self.assertEqual(self.job_mod.next_job_number(), 1003)

    def test_single_issue_skip_row_reports_owner_without_driving_job(self):
        ns = self.wf_ns
        ns["args"] = {"mode": "single", "issue": 4200}
        for key in ("JOB_BIN", "ROUTE_BIN", "GATE_BIN"):
            self.assertIn(key, ns)
            self.assertTrue(Path(ns[key]).exists(), f"{key} should point to an existing binary: {ns[key]}")
        ns["run_cmd"] = lambda *_args, **_kwargs: type(
            "Result", (), {"stdout": "skip\t4200\t042-sibling-job\tintake\towned by another worktree"},
        )()
        messages = []
        ns["wf_log"] = messages.append
        driven = []

        async def drive_job(job_id, **_kwargs):
            driven.append(job_id)

        ns["drive_job"] = drive_job
        asyncio.run(ns["run_factory_workflow"]())

        self.assertEqual(messages, ["Issue #4200 cannot run: owned by another worktree"])
        self.assertEqual(driven, [])

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
        self.assertEqual(map_model("opus"), "gemini-4-hydrogen-high")
        self.assertEqual(map_model("sonnet"), "gemini-4-hydrogen-medium")
        self.assertEqual(map_model("haiku"), "gemini-4-hydrogen-low")
        self.assertEqual(map_model("opus", override="flash_lite"), "flash_lite")
        self.assertEqual(map_model("opus", override="gemini-4-argon-high"), "gemini-4-argon-high")

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
        gate_mod = load_script_module("factory_gate", BIN_DIR / "gate")

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

            # A normal documented model_stop event must run checks and resume a failing builder.
            (job_folder / "build.md").write_text("STATUS: READY\n")
            event = {
                "hookEventName": "Stop",
                "transcriptPath": str(t_path),
                "continuationActive": False,
                "terminationReason": "model_stop",
            }
            output = io.StringIO()
            with patch.object(gate_mod, "run_checks", return_value=(1, "checks failed", 0)):
                with contextlib.redirect_stdout(output):
                    with self.assertRaises(SystemExit) as stop:
                        gate_mod.agy_hook(event)
            self.assertEqual(stop.exception.code, 0)
            self.assertEqual(json.loads(output.getvalue()), {
                "decision": "continue",
                "reason": "factory/checks.sh fails in your worktree (exit 1). The gate will reject this "
                          "build. Fix it, or write STATUS: BLOCKED in build.md if you can't.\n\nchecks failed",
            })

    def test_cli_builder_session_multi_round_and_error(self):
        """CliBuilderSession passes standing prompt on round 1, --conversation on round 2, and raises on CLI error."""
        ns = self.wf_ns
        calls = []

        class FakeProc:
            def __init__(self, rc, stdout, stderr=""):
                self.returncode = rc
                self._stdout = stdout.encode()
                self._stderr = stderr.encode()

            async def communicate(self):
                return self._stdout, self._stderr

        async def fake_exec(*cmd, **_kwargs):
            calls.append(list(cmd))
            if len(calls) == 1:
                return FakeProc(0, json.dumps({"conversation_id": "conv-builder-1", "response": "STATUS: READY\n"}))
            if len(calls) == 2:
                return FakeProc(0, json.dumps({"conversation_id": "conv-builder-1", "response": "STATUS: READY\n"}))
            return FakeProc(2, "", "quota exceeded")

        job = {"id": "007-test"}
        with patch.object(ns["asyncio"], "create_subprocess_exec", side_effect=fake_exec), \
                patch.dict(ns, {"agy_sandbox": lambda cmd, _job: (list(cmd), Path("."))}):
            session = ns["CliBuilderSession"]("Standing rules", "builder-007", "gemini-4-hydrogen-medium", job)
            r1 = asyncio.run(session("Round 1 task"))
            self.assertEqual(r1, "STATUS: READY")
            self.assertEqual(session.conversation_id, "conv-builder-1")
            self.assertIn("--model=gemini-4-hydrogen-medium", calls[0])
            self.assertNotIn("--conversation=conv-builder-1", calls[0])
            self.assertIn("Standing rules\n\nRound 1 task", calls[0])

            r2 = asyncio.run(session("Round 2 task"))
            self.assertEqual(r2, "STATUS: READY")
            self.assertIn("--conversation=conv-builder-1", calls[1])
            self.assertEqual(calls[1][-1], "Round 2 task")

            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(session("Round 3 task"))
            self.assertIn("quota exceeded", str(ctx.exception))


    def test_agy_sandbox_limits_writes_to_the_job(self):
        """The CLI runs under bwrap: read-only root, writable job paths, read-only job.json and sibling refs."""
        ns = self.wf_ns
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            git_dir = root / "repo" / ".git"
            for sub in ("hooks", "objects", "worktrees/009-x", "refs/heads/factory", "logs/refs/heads/factory"):
                (git_dir / sub).mkdir(parents=True)
            (git_dir / "config").write_text("")
            (git_dir / "refs/heads/factory/009-x").write_text("abc\n")
            (git_dir / "refs/heads/factory/008-other").write_text("def\n")
            worktree = root / "repo" / ".worktrees" / "009-x"
            worktree.mkdir(parents=True)
            jobs = root / "repo" / "factory" / "jobs"
            (jobs / "009-x").mkdir(parents=True)
            (jobs / "009-x" / "job.json").write_text("{}")
            job = {"id": "009-x", "worktree": str(worktree)}
            with patch.object(ns["shutil"], "which", return_value="/usr/bin/bwrap"), \
                    patch.dict(ns, {"JOBS": jobs, "git_common_dir": lambda: git_dir}):
                wrapped, cwd = ns["agy_sandbox"](["agy", "-p", "hi"], job)

            self.assertEqual(wrapped[:2], ["/usr/bin/bwrap", "--die-with-parent"])
            self.assertIn(["--ro-bind", "/", "/"], [wrapped[i:i + 3] for i in range(len(wrapped))])
            binds = {wrapped[i + 1] for i, arg in enumerate(wrapped) if arg == "--bind"}
            self.assertNotIn(str(git_dir), binds)
            self.assertNotIn(str(root / "repo"), binds)
            self.assertTrue({
                str(jobs / "009-x"),
                str(worktree),
                str(git_dir / "objects"),
                str(git_dir / "worktrees" / "009-x"),
                str(git_dir / "refs" / "heads" / "factory"),
            }.issubset(binds))
            ro = [wrapped[i + 1] for i, arg in enumerate(wrapped) if arg == "--ro-bind"]
            self.assertIn(str(jobs / "009-x" / "job.json"), ro)
            self.assertIn(str(git_dir / "refs" / "heads" / "factory" / "008-other"), ro)
            self.assertNotIn(str(git_dir / "refs" / "heads" / "factory" / "009-x"), ro)
            # Read-only overlays must come after their writable parent directories to take effect.
            self.assertGreater(wrapped.index(str(jobs / "009-x" / "job.json")), wrapped.index(str(jobs / "009-x")))
            self.assertGreater(
                wrapped.index(str(git_dir / "refs" / "heads" / "factory" / "008-other")),
                wrapped.index(str(git_dir / "refs" / "heads" / "factory")),
            )
            self.assertEqual(cwd, worktree)
            self.assertEqual(wrapped[-3:], ["agy", "-p", "hi"])

            # Without a worktree (e.g. intake/spec), no Git metadata is writable.
            with patch.object(ns["shutil"], "which", return_value="/usr/bin/bwrap"), \
                    patch.dict(ns, {"JOBS": jobs, "git_common_dir": lambda: git_dir}):
                intake_wrapped, intake_cwd = ns["agy_sandbox"](["agy", "-p", "hi"], {"id": "009-x"})
            intake_binds = {intake_wrapped[i + 1] for i, arg in enumerate(intake_wrapped) if arg == "--bind"}
            self.assertNotIn(str(git_dir / "objects"), intake_binds)
            self.assertEqual(intake_cwd, jobs / "009-x")

    def test_agy_sandbox_requires_bwrap(self):
        ns = self.wf_ns
        with patch.object(ns["shutil"], "which", return_value=None):
            with self.assertRaises(RuntimeError) as ctx:
                ns["agy_sandbox"](["agy"], {"id": "009-x"})
        self.assertIn("bwrap", str(ctx.exception))

    def test_agy_cli_turn_kills_the_agent_on_timeout(self):
        ns = self.wf_ns
        killed = []

        class HangingProc:
            returncode = None

            async def communicate(self):
                await asyncio.sleep(10)

            def kill(self):
                killed.append(True)

            async def wait(self):
                return -9

        async def fake_exec(*_cmd, **_kwargs):
            return HangingProc()

        with patch.object(ns["asyncio"], "create_subprocess_exec", side_effect=fake_exec), \
                patch.dict(ns, {"agy_sandbox": lambda cmd, _job: (list(cmd), Path(".")),
                                "AGY_TURN_TIMEOUT_MINUTES": 0, "AGY_TURN_GRACE_SECONDS": 0.05}):
            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(ns["run_agy_cli_turn"]("p", "builder-009", "gemini-4-hydrogen-low", {"id": "009-x"}))
        self.assertIn("timed out", str(ctx.exception))
        self.assertEqual(killed, [True])


if __name__ == "__main__":
    unittest.main()
