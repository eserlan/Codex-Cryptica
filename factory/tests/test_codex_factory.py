"""Codex runner tests; no live agents or GitHub writes."""
import importlib.util
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location("codex_workflow", Path(__file__).parents[1] / "bin/codex_workflow.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CodexFactoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", str(self.root)], check=True, capture_output=True, text=True)
        repo_root = Path(__file__).resolve().parents[2]
        factory = self.root / "factory"
        factory.mkdir(parents=True)
        (factory / "codex-routing.json").write_text(
            (repo_root / "factory/codex-routing.json").read_text()
        )
        (factory / "config.json").write_text(json.dumps({
            "concurrency": 2,
            "ports": {"base": 5300, "step": 10},
            "labels": {"needs_human": "factory:needs-human"},
        }))
        self.runner = module.Runner(self.root, "test-model")
        self.folder = self.root / "factory/jobs/001-test"
        self.folder.mkdir(parents=True)
        self.worktree = self.root / ".worktrees/001-test"
        self.worktree.mkdir(parents=True)
        self.git_common = self.root / ".git"
        self.git_dir = self.git_common / "worktrees/001-test"
        self.git_dir.mkdir(parents=True)
        (self.git_dir / "commondir").write_text("../..\n")
        (self.worktree / ".git").write_text(f"gitdir: {self.git_dir}\n")
        (self.folder / "job.json").write_text("{}\n")
        roles = self.root / ".claude/agents"
        roles.mkdir(parents=True)
        source = repo_root / ".claude/agents"
        for role in source.glob("*.md"):
            (roles / role.name).write_text(role.read_text())
        self.job = dict(id="001-test", worktree=str(self.worktree), branch="factory/001-test",
                        base="staging", issue=12, round=1, round_limit=3, stage="build", pr=None)

    def test_runner_slots_allow_distinct_jobs_and_release_after_exit(self):
        with module.runner_slot(self.runner, 12):
            with self.assertRaisesRegex(module.RunnerBusy, "Issue #12"):
                with module.runner_slot(self.runner, 12):
                    self.fail("duplicate runner acquired a slot")
            with module.runner_slot(self.runner, 13):
                with self.assertRaisesRegex(module.RunnerBusy, "All 2"):
                    with module.runner_slot(self.runner, 14):
                        self.fail("runner exceeded capacity")
            with module.runner_slot(self.runner, 14):
                pass

    def result(self, code=0):
        events = [{"type": "thread.started", "thread_id": "session-1"},
                  {"type": "turn.completed", "usage": {"input_tokens": 10}}]
        return subprocess.CompletedProcess([], code, "\n".join(map(json.dumps, events)), "failure" if code else "")

    @staticmethod
    def directory_digest(directory):
        digest = hashlib.sha256()
        for path in sorted(Path(directory).rglob("*")):
            if path.is_symlink():
                digest.update(str(path.relative_to(directory)).encode())
                digest.update(os.readlink(path).encode())
            elif path.is_file():
                digest.update(str(path.relative_to(directory)).encode())
                digest.update(path.read_bytes())
        return digest.hexdigest()

    def create_registry_dependency_project(self):
        (self.worktree / "package.json").write_text(json.dumps({
            "name": "factory-fixture", "version": "1.0.0", "private": True,
            "workspaces": ["packages/*"],
            "dependencies": {
                "factory-fixture-package": "workspace:*",
                "is-number": "7.0.0",
            },
        }))
        package = self.worktree / "packages/factory-fixture-package"
        package.mkdir(parents=True)
        (package / "package.json").write_text(json.dumps({
            "name": "factory-fixture-package", "version": "1.0.0",
        }))
        install_env = {
            "PATH": os.pathsep.join([
                "/usr/local/bin", "/usr/bin", "/bin",
                str(Path(module.shutil.which("bun")).resolve().parent),
            ]),
            "HOME": str(self.root / "empty-home"),
            "BUN_INSTALL_CACHE_DIR": str(self.root / "empty-user-cache"),
            "NPM_CONFIG_IGNORE_SCRIPTS": "true",
            "NPM_CONFIG_REGISTRY": "https://registry.npmjs.org",
        }
        generated_lock = subprocess.run(
            ["bun", "install", "--lockfile-only", "--ignore-scripts",
             "--registry=https://registry.npmjs.org"],
            cwd=self.worktree, env=install_env, capture_output=True, text=True,
        )
        self.assertEqual(generated_lock.returncode, 0, generated_lock.stderr)
        return install_env

    def agent_command(self, args, cwd=None, check=True, **kwargs):
        if "exec" in args and "--json" in args:
            prompt = kwargs["input"]
            output = prompt.split("Artifact output path: ", 1)[1].split(
                ". The job folder is read-only.", 1
            )[0]
            artifact = "VERDICT: PASS\n\nNo findings.\n" if "review-" in Path(output).name else (
                "STATUS: READY\n\n### Round 1\n"
            )
            Path(output).write_text(artifact)
            return self.result()
        return subprocess.CompletedProcess(args, 0, "", "")

    def test_builder_resume_and_publication_contract(self):
        with patch.object(self.runner, "command", side_effect=self.agent_command) as command:
            self.runner.role(self.job, "builder")
            prompt = command.call_args.kwargs["input"]
            self.assertIn("Do not create or update a PR", prompt)
            self.assertNotIn("gh pr create --draft", prompt)
            args = command.call_args.args[0]
            self.assertIn('shell_environment_policy.inherit="core"', args)
            self.assertIn('shell_environment_policy.ignore_default_excludes=false', args)
            self.assertIn('shell_environment_policy.filters.GITHUB_TOKEN="exclude"', args)
            self.assertIn('shell_environment_policy.filters.OPENAI_API_KEY="exclude"', args)
            self.assertTrue(any(arg.startswith("shell_environment_policy.set.HOME=") for arg in args))
            self.assertIn("--ignore-user-config", args)
            self.assertIn('default_permissions="codex_factory"', args)
            self.assertTrue(any(arg.startswith("permissions.codex_factory.filesystem=") for arg in args))
            self.assertIn("permissions.codex_factory.network.enabled=false", args)
            filesystem_config = next(
                arg for arg in args if arg.startswith("permissions.codex_factory.filesystem=")
            )
            self.assertIn(json.dumps(":minimal") + "=\"read\"", filesystem_config)
            self.assertIn(json.dumps(str(self.worktree)) + "=\"write\"", filesystem_config)
            self.assertIn(json.dumps(str(self.folder)) + "=\"read\"", filesystem_config)
            self.assertIn(json.dumps(str(self.worktree / ".git")) + "=\"read\"", filesystem_config)
            self.assertIn(json.dumps(str(self.git_dir)) + "=\"read\"", filesystem_config)
            self.assertIn(json.dumps(str(self.git_common)) + "=\"read\"", filesystem_config)
            self.assertNotIn('sandbox_workspace_write.writable_roots=', args)
            self.runner.role(self.job, "builder")
            self.assertIn("resume", command.call_args.args[0])
            self.assertIn("session-1", command.call_args.args[0])
            self.assertEqual(command.call_args.kwargs["cwd"], self.worktree)
        log = json.loads((self.folder / "codex/builder-1.json").read_text())
        self.assertEqual(log["events"][-1]["usage"]["input_tokens"], 10)
        self.assertEqual(log["thread_id"], "session-1")
        self.assertEqual((self.folder / "build.md").read_text(), "STATUS: READY\n\n### Round 1\n")
        self.assertEqual((self.folder / "job.json").read_text(), "{}\n")

    def test_missing_worktree_fails_closed(self):
        self.job["worktree"] = str(self.root / "missing-worktree")
        with patch.object(self.runner, "command") as command:
            with self.assertRaisesRegex(RuntimeError, "Job worktree does not exist"):
                self.runner.role(self.job, "builder")
            command.assert_not_called()

    def test_dependency_bootstrap_handles_fresh_worktree_without_user_cache(self):
        self.assertFalse((self.worktree / "node_modules").exists())
        with patch.dict("os.environ", {"BUN_INSTALL_CACHE_DIR": "/home/user/.bun/install/cache"}), \
             patch.object(self.runner, "bootstrap_dependency_cache") as bootstrap, \
             patch.object(module, "run_sandboxed", return_value=subprocess.CompletedProcess([], 0, "", "")) as sandbox:
            self.runner.prepare_dependencies(self.job)

        cache = self.folder / "codex/bun-cache"
        bootstrap.assert_called_once_with(self.job, cache)
        args, kwargs = sandbox.call_args.args[0], sandbox.call_args.kwargs
        self.assertEqual(args[:3], ["bun", "install", "--frozen-lockfile"])
        self.assertIn("--ignore-scripts", args)
        self.assertIn("--backend", args)
        self.assertIn("copyfile", args)
        self.assertIn("--registry=https://registry.npmjs.org", args)
        self.assertEqual(kwargs["cwd"], self.worktree.resolve())
        self.assertEqual(kwargs["writable_roots"], [self.worktree.resolve()])
        self.assertEqual(kwargs["bun_cache_dir"], cache)
        self.assertTrue(kwargs["copy_bun_cache"])
        self.assertNotEqual(kwargs["bun_cache_dir"], "/home/user/.bun/install/cache")

    @unittest.skipUnless(module.shutil.which("codex") and module.shutil.which("bun"),
                         "requires local Bun and Codex sandbox CLIs")
    def test_fresh_worktree_dependencies_install_inside_sandbox(self):
        self.create_registry_dependency_project()
        self.assertFalse((self.worktree / "node_modules").exists())
        cache = self.folder / "codex/bun-cache"
        bootstrapped = {}
        original_bootstrap = self.runner.bootstrap_dependency_cache

        def bootstrap_and_snapshot(job, cache_dir):
            original_bootstrap(job, cache_dir)
            bootstrapped["digest"] = self.directory_digest(cache_dir)

        with patch.dict("os.environ", {"BUN_INSTALL_CACHE_DIR": str(self.root / "empty-user-cache")}):
            with patch.object(self.runner, "bootstrap_dependency_cache", side_effect=bootstrap_and_snapshot):
                self.runner.prepare_dependencies(self.job)

        installed = self.worktree / "node_modules/factory-fixture-package"
        self.assertTrue(installed.exists())
        self.assertEqual(installed.resolve(), (self.worktree / "packages/factory-fixture-package").resolve())
        self.assertTrue((self.worktree / "node_modules/is-number/index.js").is_file())
        self.assertEqual(self.directory_digest(cache), bootstrapped["digest"])
        usable = module.run_sandboxed(
            ["bun", "-e", 'const isNumber = require("is-number"); if (!isNumber("7")) process.exit(1)'],
            cwd=self.worktree, writable_roots=[self.worktree],
            git_common_dir=self.runner.git_common_dir(), bun_cache_dir=cache,
        )
        self.assertEqual(usable.returncode, 0, usable.stderr)

    @unittest.skipUnless(module.shutil.which("codex") and module.shutil.which("bun"),
                         "requires local Bun and Codex sandbox CLIs")
    def test_missing_cached_registry_package_fails_without_network(self):
        self.create_registry_dependency_project()
        cache = self.folder / "codex/bun-cache"
        cache.mkdir(parents=True, exist_ok=True)
        with patch.object(self.runner, "bootstrap_dependency_cache"):
            with self.assertRaisesRegex(RuntimeError, "Sandboxed Bun dependency install failed"):
                self.runner.prepare_dependencies(self.job)
        self.assertFalse((self.worktree / "node_modules/is-number").exists())

    def test_dependency_install_failure_stops_before_builder(self):
        with patch.object(self.runner, "bootstrap_dependency_cache"), \
             patch.object(module, "run_sandboxed", return_value=subprocess.CompletedProcess([], 1, "", "install failed")):
            with self.assertRaisesRegex(RuntimeError, "Sandboxed Bun dependency install failed"):
                self.runner.prepare_dependencies(self.job)
        self.assertEqual((self.folder / "codex/bun-worktree-install.log").read_text(), "install failed")

    def test_cache_bootstrap_uses_trusted_manifests_without_user_environment(self):
        (self.worktree / "package.json").write_text(json.dumps({"workspaces": ["packages/*"]}))
        (self.worktree / "bun.lock").write_text("trusted lock\n")
        workspace = self.worktree / "packages/demo"
        workspace.mkdir(parents=True)
        (workspace / "package.json").write_text(json.dumps({"name": "demo", "version": "1.0.0"}))
        cache = self.folder / "codex/bun-cache"
        cache.mkdir(parents=True, exist_ok=True)
        captured = {}

        def fake_run(args, cwd=None, env=None, **kwargs):
            captured["args"] = args
            captured["cwd"] = Path(cwd)
            captured["env"] = env
            captured["root_package"] = json.loads((Path(cwd) / "package.json").read_text())
            captured["workspace_package"] = json.loads(
                (Path(cwd) / "packages/demo/package.json").read_text()
            )
            return subprocess.CompletedProcess(args, 0, "cache ready", "")

        with patch.dict("os.environ", {"BUN_INSTALL_CACHE_DIR": "/home/user/.bun/install/cache",
                                      "GITHUB_TOKEN": "must-not-inherit"}), \
             patch.object(module.shutil, "which", side_effect=lambda name: "/usr/bin/bun" if name == "bun" else None), \
             patch.object(module.subprocess, "run", side_effect=fake_run):
            self.runner.bootstrap_dependency_cache(self.job, cache)

        self.assertIn("codex-bun-manifests-", str(captured["cwd"]))
        self.assertEqual(captured["root_package"]["workspaces"], ["packages/*"])
        self.assertEqual(captured["workspace_package"]["name"], "demo")
        self.assertIn("--ignore-scripts", captured["args"])
        self.assertIn("--registry=https://registry.npmjs.org", captured["args"])
        self.assertEqual(captured["env"]["BUN_INSTALL_CACHE_DIR"], str(cache))
        self.assertNotIn("GITHUB_TOKEN", captured["env"])
        self.assertNotEqual(captured["env"]["BUN_INSTALL_CACHE_DIR"], "/home/user/.bun/install/cache")

    def test_cache_bootstrap_bounds_workspace_manifest_bytes(self):
        cache = self.folder / "codex/bun-cache"
        cache.mkdir(parents=True, exist_ok=True)
        package = self.worktree / "package.json"

        package.write_text(json.dumps({"workspaces": ["packages/*"]}))
        (self.worktree / "bun.lock").write_text("trusted lock\n")
        oversized = self.worktree / "packages/oversized/package.json"
        oversized.parent.mkdir(parents=True)
        oversized.write_text("x" * (module.MAX_WORKSPACE_MANIFEST_BYTES + 1))
        with patch.object(module.subprocess, "run") as run:
            with self.assertRaisesRegex(RuntimeError, "Workspace package manifest exceeds"):
                self.runner.bootstrap_dependency_cache(self.job, cache)
            run.assert_not_called()

        oversized.unlink()
        for index in range(11):
            manifest = self.worktree / f"packages/package-{index}/package.json"
            manifest.parent.mkdir(parents=True)
            manifest.write_text(json.dumps({"name": f"package-{index}",
                                            "description": "x" * 970_000}))
        with patch.object(module.subprocess, "run") as run:
            with self.assertRaisesRegex(RuntimeError, "aggregate factory bootstrap size limit"):
                self.runner.bootstrap_dependency_cache(self.job, cache)
            run.assert_not_called()

    def test_cache_bootstrap_rejects_external_lockfile_sources(self):
        (self.worktree / "package.json").write_text(json.dumps({"workspaces": []}))
        (self.worktree / "bun.lock").write_text('{"source":"https://attacker.example/package.tgz"}\n')
        cache = self.folder / "codex/bun-cache"
        cache.mkdir(parents=True, exist_ok=True)
        with patch.object(module.subprocess, "run") as run:
            with self.assertRaisesRegex(RuntimeError, "Only HTTPS packages from registry.npmjs.org"):
                self.runner.bootstrap_dependency_cache(self.job, cache)
            run.assert_not_called()

    def test_cache_bootstrap_decodes_and_rejects_escaped_external_sources(self):
        (self.worktree / "package.json").write_text(json.dumps({"workspaces": []}))
        cache = self.folder / "codex/bun-cache"
        cache.mkdir(parents=True, exist_ok=True)
        invalid_sources = (
            "https://attacker.example/package.tgz",
            "ftp://attacker.example/package.tgz",
            "file:../local-package",
            "git+ssh://attacker.example/repository.git",
        )
        for source in invalid_sources:
            with self.subTest(source=source):
                lock = json.dumps({"source": source}).replace("/", r"\/")
                (self.worktree / "bun.lock").write_text(lock + "\n")
                with patch.object(module.subprocess, "run") as run:
                    with self.assertRaises(RuntimeError):
                        self.runner.bootstrap_dependency_cache(self.job, cache)
                    run.assert_not_called()

    def test_cache_bootstrap_scans_decoded_jsonc_after_quoted_comments(self):
        (self.worktree / "package.json").write_text(json.dumps({"workspaces": []}))
        (self.worktree / "bun.lock").write_text(
            '/*"*/\n{\n  "source": "https:\\/\\/attacker.example/package.tgz",\n}\n'
        )
        cache = self.folder / "codex/bun-cache"
        cache.mkdir(parents=True, exist_ok=True)
        with patch.object(module.subprocess, "run") as run:
            with self.assertRaisesRegex(RuntimeError, "Only HTTPS packages from registry.npmjs.org"):
                self.runner.bootstrap_dependency_cache(self.job, cache)
            run.assert_not_called()

    def test_cache_bootstrap_accepts_decoded_npm_registry_source(self):
        source = "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz"
        (self.worktree / "package.json").write_text(json.dumps({
            "workspaces": [], "dependencies": {"is-number": source},
        }))
        (self.worktree / "bun.lock").write_text(
            json.dumps({"packages": {"is-number": [f"is-number@{source}"]}}) + "\n"
        )
        cache = self.folder / "codex/bun-cache"
        cache.mkdir(parents=True, exist_ok=True)
        expected = subprocess.CompletedProcess([], 0, "cache ready", "")
        with patch.object(module.subprocess, "run", return_value=expected) as run:
            self.runner.bootstrap_dependency_cache(self.job, cache)
        self.assertEqual(run.call_count, 1)

    def test_cache_bootstrap_rejects_external_manifest_sources(self):
        cache = self.folder / "codex/bun-cache"
        cache.mkdir(parents=True, exist_ok=True)
        (self.worktree / "bun.lock").write_text('{"lockfileVersion":1}\n')
        for source in ("https://attacker.example/package.tgz", "workspace:*"):
            with self.subTest(source=source):
                (self.worktree / "package.json").write_text(json.dumps({
                    "workspaces": [], "dependencies": {"unknown-package": source},
                }))
                with patch.object(module.subprocess, "run") as run:
                    with self.assertRaises(RuntimeError):
                        self.runner.bootstrap_dependency_cache(self.job, cache)
                    run.assert_not_called()

    def test_fallow_audit_uses_a_disposable_checkout_with_working_changes(self):
        source = self.root / ".worktrees/audit-source"
        source.mkdir(parents=True)

        def git(*args):
            return subprocess.run(["git", "-C", str(source), *args], check=True,
                                  capture_output=True, text=True)

        subprocess.run(["git", "init", "-b", "factory/001-test", str(source)], check=True,
                       capture_output=True, text=True)
        git("config", "user.name", "Factory Test")
        git("config", "user.email", "factory-test@example.com")
        (source / ".gitignore").write_text("node_modules/\n")
        (source / "tracked.ts").write_text("export const value = 1;\n")
        modules = source / "node_modules"
        modules.mkdir()
        (modules / "fallow-fixture.txt").write_text("prepared\n")
        git("add", ".gitignore", "tracked.ts")
        git("commit", "-m", "base")
        base_sha = git("rev-parse", "HEAD").stdout.strip()
        git("checkout", "-b", "staging")
        (source / "base-only.ts").write_text("base ahead of job branch\n")
        git("add", "base-only.ts")
        git("commit", "-m", "remote tracking base")
        remote_base_sha = git("rev-parse", "HEAD").stdout.strip()
        git("update-ref", "refs/remotes/origin/staging", remote_base_sha)
        git("checkout", "factory/001-test")
        (source / "tracked.ts").write_text("export const value = 2;\n")
        (source / "untracked.ts").write_text("export const fresh = true;\n")
        captured = {}

        def fake_sandbox(command, cwd, **kwargs):
            checkout = Path(cwd)
            captured["command"] = command
            captured["kwargs"] = kwargs
            captured["checkout"] = checkout
            captured["tracked"] = (checkout / "tracked.ts").read_text()
            captured["untracked"] = (checkout / "untracked.ts").read_text()
            captured["modules"] = (checkout / "node_modules/fallow-fixture.txt").read_text()
            captured["git_dir"] = (checkout / ".git").is_dir()
            captured["base"] = git_from(checkout, "rev-parse", "origin/staging")
            captured["status"] = git_from(checkout, "status", "--porcelain")
            report = captured.get("report", '{"verdict":"pass"}')
            return subprocess.CompletedProcess(command, 0, report, "")

        def git_from(checkout, *args):
            return subprocess.run(["git", "-C", str(checkout), *args], check=True,
                                  capture_output=True, text=True).stdout.strip()

        job = dict(self.job, worktree=str(source), base="staging")
        with patch.object(module, "run_sandboxed", side_effect=fake_sandbox):
            self.runner.fallow_audit(job, source, [("tracked.ts", True), ("untracked.ts", True)],
                                     "pre-commit", self.folder / "codex")

        self.assertIn("--base", captured["command"])
        self.assertIn("origin/staging", captured["command"])
        self.assertEqual(captured["base"], remote_base_sha)
        self.assertNotEqual(captured["base"], base_sha)
        self.assertEqual(captured["tracked"], "export const value = 2;\n")
        self.assertEqual(captured["untracked"], "export const fresh = true;\n")
        self.assertEqual(captured["modules"], "prepared\n")
        self.assertTrue(captured["git_dir"])
        self.assertIn("M tracked.ts", captured["status"])
        self.assertIn("?? untracked.ts", captured["status"])
        self.assertTrue(captured["kwargs"]["writable_git_metadata"])
        self.assertEqual(captured["kwargs"]["git_common_dir"], captured["checkout"] / ".git")
        self.assertEqual(captured["kwargs"]["writable_roots"], [captured["checkout"]])
        captured["report"] = '{"verdict":"fail"}'
        with self.assertRaisesRegex(RuntimeError, "Fallow pre-commit audit failed"):
            self.runner.fallow_audit(job, source, [("tracked.ts", True)],
                                     "pre-commit", self.folder / "codex")

    def test_audit_snapshot_handles_file_directory_replacements(self):
        source = self.root / ".worktrees/replacement-source"
        audit = self.root / ".worktrees/replacement-audit"
        source.mkdir(parents=True)
        audit.mkdir(parents=True)

        (audit / "tools/old.py").parent.mkdir(parents=True)
        (audit / "tools/old.py").write_text("old file\n")
        (source / "tools").write_text("new single file\n")
        module.Runner.copy_audit_changes(
            source, audit, [("tools/old.py", False), ("tools", True)]
        )
        self.assertEqual((audit / "tools").read_text(), "new single file\n")

        (source / "tools").unlink()
        (source / "tools/new.py").parent.mkdir(parents=True)
        (source / "tools/new.py").write_text("new nested file\n")
        module.Runner.copy_audit_changes(
            source, audit, [("tools", False), ("tools/new.py", True)]
        )
        self.assertEqual((audit / "tools/new.py").read_text(), "new nested file\n")

    def test_gate_fallow_evidence_is_bound_to_head_and_base(self):
        worktree = self.root / ".worktrees/gate-evidence"
        worktree.mkdir(parents=True)

        def git(*args):
            return subprocess.run(["git", "-C", str(worktree), *args], check=True,
                                  capture_output=True, text=True).stdout.strip()

        subprocess.run(["git", "init", "-b", "factory/001-test", str(worktree)], check=True,
                       capture_output=True, text=True)
        git("config", "user.name", "Factory Test")
        git("config", "user.email", "factory-test@example.com")
        (worktree / "tracked.ts").write_text("export const value = 1;\n")
        git("add", "tracked.ts")
        git("commit", "-m", "initial")
        git("update-ref", "refs/remotes/origin/staging", "HEAD")
        job = dict(self.job, id="001-test", base="staging", worktree=str(worktree))
        log_dir = self.folder / "codex"
        evidence_path = log_dir / "fallow-prechecked.json"

        with patch.object(self.runner, "fallow_audit") as audit:
            self.runner.ensure_fallow_prechecked(job, worktree, log_dir)
            audit.assert_called_once()
            audit.reset_mock()
            self.runner.ensure_fallow_prechecked(job, worktree, log_dir)
            audit.assert_not_called()

            (worktree / "tracked.ts").write_text("export const value = 2;\n")
            git("add", "tracked.ts")
            git("commit", "-m", "head changed")
            self.runner.ensure_fallow_prechecked(job, worktree, log_dir)
            audit.assert_called_once()
            audit.reset_mock()

            (worktree / "base-only.ts").write_text("new base\n")
            git("add", "base-only.ts")
            git("commit", "-m", "advance base ref")
            git("update-ref", "refs/remotes/origin/staging", "HEAD")
            self.runner.ensure_fallow_prechecked(job, worktree, log_dir)
            audit.assert_called_once()

        self.assertEqual(json.loads(evidence_path.read_text()),
                         self.runner.current_fallow_inputs(job, worktree))

    @unittest.skipUnless(
        module.shutil.which("codex") and module.shutil.which("bun")
        and (Path(__file__).resolve().parents[2] / "node_modules/fallow").exists(),
        "requires local Codex sandbox, Bun, and the installed Fallow package",
    )
    def test_sandboxed_fallow_audit_rejects_an_introduced_complexity_finding(self):
        repo = Path(__file__).resolve().parents[2]
        worktrees = repo / ".worktrees"
        worktrees.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="fallow-integration-", dir=worktrees) as temp:
            source = Path(temp)

            def git(*args):
                return subprocess.run(["git", "-C", str(source), *args], check=True,
                                      capture_output=True, text=True)

            subprocess.run(["git", "init", "-b", "factory/fallow-test", str(source)], check=True,
                           capture_output=True, text=True)
            git("config", "user.name", "Factory Test")
            git("config", "user.email", "factory-test@example.com")
            (source / ".gitignore").write_text("node_modules/\n")
            (source / "package.json").write_text(json.dumps({"name": "fallow-fixture", "private": True}))
            source_code = source / "src/complexity.ts"
            source_code.parent.mkdir()
            source_code.write_text("export function branchCount(value: number) { return value; }\n")
            os.symlink(repo / "node_modules", source / "node_modules", target_is_directory=True)
            git("add", ".gitignore", "package.json", "src/complexity.ts")
            git("commit", "-m", "base")
            base_sha = git("rev-parse", "HEAD").stdout.strip()
            git("update-ref", "refs/remotes/origin/staging", base_sha)
            branches = "\n".join(
                f"  if (value === {index}) result += {index + 1};"
                for index in range(25)
            )
            source_code.write_text(
                "export function branchCount(value: number) {\n  let result = 0;\n"
                + branches + "\n  return result;\n}\n"
            )
            runner = module.Runner(repo)
            job = dict(self.job, id="fallow-integration", worktree=str(source), base="staging")
            log_dir = source / ".factory-test-logs"
            with self.assertRaisesRegex(RuntimeError, "Fallow integration audit failed"):
                runner.fallow_audit(job, source, ["src/complexity.ts"], "integration", log_dir)

            raw_report = (log_dir / "fallow-integration.log").read_text()
            report, _ = json.JSONDecoder().raw_decode(raw_report, raw_report.index("{"))
            self.assertEqual(report["verdict"], "fail")
            self.assertTrue(report["complexity"]["findings"])

    def test_linked_runner_checkout_resolves_shared_git_directory(self):
        source = self.root / "source"
        runner_checkout = self.root / "runner-checkout"
        job_checkout = self.root / "job-checkout"
        standalone = self.root / "standalone-checkout"
        subprocess.run(["git", "init", str(source)], check=True, capture_output=True, text=True)
        subprocess.run(["git", "-C", str(source), "config", "user.name", "Factory Test"], check=True)
        subprocess.run(["git", "-C", str(source), "config", "user.email", "factory-test@example.com"], check=True)
        (source / "README.md").write_text("base\n")
        subprocess.run(["git", "-C", str(source), "add", "README.md"], check=True)
        subprocess.run(["git", "-C", str(source), "commit", "-m", "base"], check=True,
                       capture_output=True, text=True)
        subprocess.run(["git", "-C", str(source), "worktree", "add", "--detach",
                        str(runner_checkout), "HEAD"], check=True, capture_output=True, text=True)
        subprocess.run(["git", "-C", str(source), "worktree", "add", "--detach",
                        str(job_checkout), "HEAD"], check=True, capture_output=True, text=True)
        subprocess.run(["git", "clone", str(source), str(standalone)], check=True,
                       capture_output=True, text=True)

        common_dir = module.resolve_git_common_dir(runner_checkout)

        self.assertEqual(common_dir, source / ".git")
        self.assertTrue(module.git_metadata_roots(job_checkout, common_dir))
        self.assertEqual(
            module.resolve_git_common_dir(standalone), (standalone / ".git").resolve()
        )
        self.assertEqual(
            module.git_metadata_roots(standalone, standalone / ".git"),
            [standalone / ".git"] * 3,
        )
        with self.assertRaisesRegex(RuntimeError, "outside the checkout Git directory"):
            module.git_metadata_roots(job_checkout, runner_checkout / ".git")

    def test_sandbox_uses_prepared_job_cache_without_network(self):
        sandbox_spec = importlib.util.spec_from_file_location(
            "codex_sandbox_test", Path(__file__).parents[1] / "bin/codex_sandbox.py"
        )
        sandbox = importlib.util.module_from_spec(sandbox_spec)
        sandbox_spec.loader.exec_module(sandbox)
        cache = self.folder / "codex/bun-cache"
        cache.mkdir(parents=True, exist_ok=True)
        (cache / "package").write_text("seeded")
        captured = {"configs": []}
        real_run = subprocess.run

        def fake_run(args, cwd=None, env=None, **kwargs):
            if args[0] == "cp":
                return real_run(args, **kwargs)
            captured["args"] = args
            captured["env"] = env
            captured["configs"].append((Path(env["CODEX_HOME"]) / "config.toml").read_text())
            if args[-1] == "install":
                install_cache = Path(env["BUN_INSTALL_CACHE_DIR"])
                captured["install_cache"] = install_cache
                self.assertEqual(install_cache.parent, Path(env["BUN_TMPDIR"]))
                self.assertEqual((install_cache / "package").read_text(), "seeded")
                (install_cache / "package").write_text("changed")
            return subprocess.CompletedProcess(args, 0, "", "")

        with patch.object(sandbox.shutil, "which", return_value="/usr/bin/codex"), \
             patch.object(sandbox.subprocess, "run", side_effect=fake_run):
            sandbox.run_sandboxed(
                ["bun", "install"], cwd=self.worktree,
                writable_roots=[self.worktree], git_common_dir=self.git_common,
                bun_cache_dir=cache, copy_bun_cache=True,
            )
            sandbox.run_sandboxed(
                ["bun", "fallow"], cwd=self.worktree,
                writable_roots=[self.worktree], git_common_dir=self.git_common,
                bun_cache_dir=cache, writable_git_metadata=True, fallow_prechecked=True,
            )

        self.assertEqual(captured["env"]["BUN_INSTALL_CACHE_DIR"], str(cache.resolve()))
        self.assertFalse(captured["install_cache"].exists())
        self.assertEqual((cache / "package").read_text(), "seeded")
        self.assertEqual(captured["env"]["NPM_CONFIG_IGNORE_SCRIPTS"], "true")
        self.assertEqual(captured["env"]["GIT_CONFIG_VALUE_0"], "/dev/null")
        self.assertEqual(captured["env"]["CODEX_FACTORY_FALLOW_PRECHECKED"], "1")
        self.assertIn(json.dumps(str(cache.resolve())) + ' = "read"', captured["configs"][0])
        self.assertIn(json.dumps(str(self.git_common.resolve())) + ' = "read"', captured["configs"][0])
        self.assertIn(json.dumps(str(self.git_common.resolve())) + ' = "write"', captured["configs"][1])
        self.assertIn('network = { enabled = false }', captured["configs"][0])

    def test_intake_uses_read_only_snapshot_before_job_worktree_exists(self):
        self.job.update(stage="intake", worktree=str(self.root / ".worktrees/001-intake"))
        calls = []

        def command(args, cwd=None, check=True, **kwargs):
            calls.append((args, cwd, kwargs))
            if args[:3] == ["git", "worktree", "add"]:
                snapshot = Path(args[4])
                snapshot.mkdir(parents=True)
                private_git = self.git_common / "worktrees/001-intake-snapshot"
                private_git.mkdir(parents=True)
                (private_git / "commondir").write_text("../..\n")
                (snapshot / ".git").write_text(f"gitdir: {private_git}\n")
            if Path(args[0]).name == "codex":
                return self.agent_command(args, cwd, check, **kwargs)
            return subprocess.CompletedProcess(args, 0, "", "")

        with patch.object(self.runner, "command", side_effect=command):
            self.runner.role(self.job, "intake")

        codex_args, codex_cwd, kwargs = next(
            call for call in calls if Path(call[0][0]).name == "codex"
        )
        self.assertNotEqual(codex_cwd, self.root)
        self.assertIn("Agent workspace:", kwargs["input"])
        filesystem = next(
            arg for arg in codex_args if arg.startswith("permissions.codex_factory.filesystem=")
        )
        self.assertIn(json.dumps(str(codex_cwd)) + "=\"read\"", filesystem)
        self.assertIn(json.dumps(str(self.folder)) + "=\"read\"", filesystem)
        self.assertIn("Artifact output path:", kwargs["input"])
        self.assertTrue(any(call[0][:3] == ["git", "worktree", "add"] for call in calls))
        self.assertTrue(any(call[0][:3] == ["git", "worktree", "remove"] for call in calls))
        self.assertFalse(Path(codex_cwd).exists())
        self.assertTrue((self.folder / "intake.md").is_file())

    def test_reviewer_gets_read_only_worktree_and_separate_artifact(self):
        with patch.object(self.runner, "command", side_effect=self.agent_command) as command:
            self.runner.role(self.job, "reviewer-code")

        args = command.call_args.args[0]
        filesystem = next(
            arg for arg in args if arg.startswith("permissions.codex_factory.filesystem=")
        )
        self.assertIn(json.dumps(str(self.worktree)) + "=\"read\"", filesystem)
        self.assertIn(json.dumps(str(self.folder)) + "=\"read\"", filesystem)
        self.assertIn("Artifact output path:", command.call_args.kwargs["input"])
        self.assertTrue((self.folder / "round-1/review-code.md").is_file())

    def test_invalid_review_artifacts_are_rerun_and_overwritten(self):
        round_dir = self.folder / "round-1"
        round_dir.mkdir()
        (round_dir / "review-code.md").write_text("")
        (round_dir / "review-ux.md").write_text("Review did not produce a verdict\n")
        (round_dir / "review-lifecycle.md").write_bytes(b"\xff")
        (round_dir / "review-ui.md").write_text("VERDICT: PASS\n\nNo findings.\n")
        self.assertEqual(module.pending_reviewers(["code", "ux", "lifecycle", "ui"], round_dir),
                         ["code", "ux", "lifecycle"])

        with patch.object(self.runner, "command", side_effect=self.agent_command):
            self.runner.role(self.job, "reviewer-code")
        self.assertTrue((round_dir / "review-code.md").read_text().startswith("VERDICT: PASS"))

    def test_success_without_isolated_artifact_fails_closed(self):
        with patch.object(self.runner, "command", return_value=self.result()):
            with self.assertRaisesRegex(RuntimeError, "did not write its artifact"):
                self.runner.role(self.job, "builder")
        self.assertFalse((self.folder / "build.md").exists())

    def test_publication_does_not_run_worktree_hooks(self):
        worktree = self.root / ".worktrees/hook-test"
        worktree.mkdir(parents=True)
        remote = self.root / "origin.git"
        subprocess.run(["git", "init", "--bare", str(remote)], check=True,
                       capture_output=True, text=True)

        def git(*args):
            return subprocess.run(["git", "-C", str(worktree), *args], check=True,
                                  capture_output=True, text=True)

        git("init", "-b", "factory/001-test")
        git("config", "user.name", "Factory Test")
        git("config", "user.email", "factory-test@example.com")
        git("remote", "add", "origin", str(remote))
        (worktree / "README.md").write_text("trusted baseline\n")
        git("add", "README.md")
        git("commit", "-m", "✨ feat(factory): baseline")
        git("update-ref", "refs/remotes/origin/staging", "HEAD")

        hooks = worktree / ".husky/_"
        hooks.mkdir(parents=True)
        for name in ("pre-commit", "pre-push", "post-index-change"):
            hook = hooks / name
            hook.write_text("#!/bin/sh\nprintf ran >> hook-ran\n")
            hook.chmod(0o755)
        git("config", "core.hooksPath", ".husky/_")
        (worktree / ".husky/_/pre-commit").write_text("#!/bin/sh\nprintf ran >> hook-ran\n")
        (worktree / "README.md").write_text("agent change\n")
        nested_new_file = worktree / "new-package/src/deep/fresh.ts"
        nested_new_file.parent.mkdir(parents=True)
        nested_new_file.write_text("export const fresh = true;\n")

        with patch.object(self.runner, "prepare_dependencies"), \
             patch.object(self.runner, "fallow_audit") as audit:
            self.runner.publish_builder_changes({
                "id": "001-test", "issue": 12, "round": 1,
                "branch": "factory/001-test", "base": "staging", "worktree": str(worktree),
            })

        self.assertFalse((worktree / "hook-ran").exists())
        self.assertEqual([call.args[3] for call in audit.call_args_list], ["pre-commit", "pre-push"])
        self.assertIn(("new-package/src/deep/fresh.ts", True), audit.call_args_list[0].args[2])
        self.assertNotEqual(
            subprocess.run(["git", "--git-dir", str(remote), "rev-parse",
                            "refs/heads/factory/001-test"], check=True,
                           capture_output=True, text=True).stdout.strip(),
            "",
        )

    def test_agent_failure_is_recorded_and_raised(self):
        with patch.object(self.runner, "command", return_value=self.result(1)):
            with self.assertRaisesRegex(RuntimeError, "builder failed"):
                self.runner.role(self.job, "builder")
        self.assertEqual(json.loads((self.folder / "codex/builder-1.json").read_text())["exit_code"], 1)

    def test_missing_completion_is_failure(self):
        result = subprocess.CompletedProcess([], 0, '{"type":"turn.failed"}', "")
        with patch.object(self.runner, "command", return_value=result):
            with self.assertRaises(RuntimeError):
                self.runner.role(self.job, "intake")

    def test_waiting_issue_is_not_created_or_resumed(self):
        with patch.object(self.runner, "job_command", return_value="wait\t12\t001-test\tneeds-human\tNeeds approval") as command:
            with self.assertRaisesRegex(RuntimeError, "Needs approval"):
                self.runner.run(12)
            command.assert_called_once_with("queue")

    def test_runner_syncs_stacked_base_before_intake(self):
        self.job.update(stage="intake", base="factory/015-parent")

        class StopAtIntake(Exception):
            pass

        def job_command(*args):
            if args[0] == "queue":
                return "resume\t12\t001-test\tintake\tReady"
            if args[0] == "sync":
                self.job["base"] = "staging"
            return ""

        def role(job, name, task=""):
            self.assertEqual(job["base"], "staging")
            raise StopAtIntake()

        with patch.object(self.runner, "job_command", side_effect=job_command), \
             patch.object(self.runner, "load", side_effect=lambda _: self.job.copy()), \
             patch.object(self.runner, "role", side_effect=role):
            with self.assertRaises(StopAtIntake):
                self.runner.run(12)

    def test_round_limit_escalates(self):
        with patch.object(self.runner, "advance") as advance:
            self.runner.retry(self.job)
            advance.assert_called_with(self.job, "build")
            self.job["round"] = 3
            self.runner.retry(self.job)
            advance.assert_called_with(self.job, "needs-human")

    def test_successful_pipeline_reviews_before_publication(self):
        self.job.update(stage="intake", agents={"reviewers": {"code": "haiku"}}, reviews={"code": "PASS"})
        actions = []

        def role(job, name, task=""):
            actions.append(name)
            if name == "intake":
                (self.folder / "intake.md").write_text("DECISION: ACCEPT")
            if name == "builder":
                (self.folder / "build.md").write_text("STATUS: READY")
            if name == "approver":
                self.assertEqual(job["pr"], 99)

        def job_command(*args):
            if args[0] == "queue":
                return "resume\t12\t001-test\tintake\tReady"
            if args[0] == "sync" and self.job["stage"] == "approve":
                self.job["pr"] = 99
            return ""

        def command(args, **kwargs):
            if "create" in args:
                actions.append("publish")
            return subprocess.CompletedProcess(args, 0, "", "")

        with patch.object(self.runner, "job_command", side_effect=job_command), \
             patch.object(self.runner, "load", side_effect=lambda _: self.job.copy()), \
             patch.object(self.runner, "role", side_effect=role), \
             patch.object(self.runner, "prepare_dependencies"), \
             patch.object(self.runner, "command", side_effect=command), \
             patch.object(module, "run_sandboxed", return_value=subprocess.CompletedProcess([], 0, '{"verdict":"pass"}', "")), \
             patch.object(self.runner, "advance", side_effect=lambda job, stage: self.job.update(stage=stage)):
            (self.folder / "codex").mkdir()
            self.assertEqual(self.runner.run(12), "001-test")
        self.assertEqual(actions, ["intake", "spec-writer", "builder", "reviewer-code", "publish", "approver"])
        self.assertEqual(self.job["stage"], "needs-human")

    def test_new_pr_is_labeled_before_approver_failure(self):
        self.job.update(stage="approve", pr=None)
        (self.folder / "build.md").write_text("STATUS: READY\n")
        (self.folder / "codex").mkdir()
        protected = []

        def job_command(*args):
            if args[0] == "queue":
                return "resume\t12\t001-test\tapprove\tReady"
            return ""

        def command(args, **kwargs):
            if args[:3] == ["gh", "pr", "create"]:
                self.assertIn("--label", args)
                self.assertIn("factory:needs-human", args)
                protected.append(True)
                self.job["pr"] = 99
            return subprocess.CompletedProcess(args, 0, "", "")

        def role(job, name, task=""):
            self.assertEqual(name, "approver")
            self.assertEqual(protected, [True])
            raise RuntimeError("simulated approver failure")

        with patch.object(self.runner, "job_command", side_effect=job_command), \
             patch.object(self.runner, "load", side_effect=lambda _: self.job.copy()), \
             patch.object(self.runner, "command", side_effect=command), \
             patch.object(self.runner, "role", side_effect=role):
            with self.assertRaisesRegex(RuntimeError, "simulated approver failure"):
                self.runner.run(12)

    def test_rediscovered_pr_is_labeled_before_approver_failure(self):
        self.job.update(stage="approve", pr=99)
        calls = []

        def command(args, **kwargs):
            calls.append(args)
            return subprocess.CompletedProcess(args, 0, "", "")

        def role(job, name, task=""):
            self.assertEqual(name, "approver")
            self.assertEqual(calls[0], ["gh", "pr", "edit", "99", "--add-label", "factory:needs-human"])
            raise RuntimeError("simulated approver failure")

        with patch.object(self.runner, "job_command", side_effect=lambda *args: (
                 "resume\t12\t001-test\tapprove\tReady" if args[0] == "queue" else "")), \
             patch.object(self.runner, "load", side_effect=lambda _: self.job.copy()), \
             patch.object(self.runner, "command", side_effect=command), \
             patch.object(self.runner, "role", side_effect=role):
            with self.assertRaisesRegex(RuntimeError, "simulated approver failure"):
                self.runner.run(12)

    def test_existing_pr_is_protected_before_resumed_builder(self):
        self.job.update(stage="build", pr=99)
        calls = []

        def command(args, **kwargs):
            calls.append(args)
            return subprocess.CompletedProcess(args, 0, "", "")

        class StopAtBuilder(Exception):
            pass

        def role(job, name, task=""):
            self.assertEqual(name, "builder")
            self.assertEqual(calls[0], ["gh", "pr", "edit", "99", "--add-label", "factory:needs-human"])
            raise StopAtBuilder()

        with patch.object(self.runner, "job_command", side_effect=lambda *args: (
                 "resume\t12\t001-test\tbuild\tReady" if args[0] == "queue" else "")), \
             patch.object(self.runner, "load", side_effect=lambda _: self.job.copy()), \
             patch.object(self.runner, "command", side_effect=command), \
             patch.object(self.runner, "prepare_dependencies"), \
             patch.object(self.runner, "role", side_effect=role):
            with self.assertRaises(StopAtBuilder):
                self.runner.run(12)

    def test_gate_error_does_not_consume_round(self):
        self.job["stage"] = "gate"
        gate_calls = []

        def command(args, **kwargs):
            if Path(args[0]) == self.root / "factory/bin/gate":
                gate_calls.append(args)
            return subprocess.CompletedProcess([], 2, "", "broken gate")

        with patch.object(self.runner, "job_command", return_value="resume\t12\t001-test\tgate\tReady"), \
             patch.object(self.runner, "load", return_value=self.job), \
             patch.object(self.runner, "prepare_dependencies"), \
             patch.object(self.runner, "ensure_fallow_prechecked") as prechecked, \
             patch.object(self.runner, "command", side_effect=command), \
             patch.object(self.runner, "advance") as advance:
            with self.assertRaisesRegex(RuntimeError, "broken gate"):
                self.runner.run(12)
            prechecked.assert_called_once()
            self.assertEqual(len(gate_calls), 1)
            self.assertEqual(gate_calls[0], [self.root / "factory/bin/gate", self.job["id"],
                                             "--codex-sandbox", "--fallow-prechecked"])
            advance.assert_not_called()


if __name__ == "__main__":
    unittest.main()
