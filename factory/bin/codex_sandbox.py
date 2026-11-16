"""Run factory commands in Codex's filesystem and network sandbox."""
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path


def resolve_git_common_dir(checkout):
    """Resolve the shared Git directory, including when checkout is a worktree."""
    checkout = Path(checkout).resolve()
    result = subprocess.run(
        ["git", "-c", "core.hooksPath=/dev/null", "rev-parse", "--git-common-dir"],
        cwd=checkout,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"Could not resolve Git common directory for {checkout}: {detail}")
    common_dir = Path(result.stdout.strip())
    if not common_dir.is_absolute():
        common_dir = checkout / common_dir
    return common_dir.resolve()


def git_metadata_roots(worktree, expected_common_dir=None):
    """Return the linked-worktree pointer, private Git directory and common dir."""
    dot_git = worktree / ".git"
    if not dot_git.exists():
        if expected_common_dir is not None:
            raise RuntimeError(f"Missing linked-worktree Git pointer: {dot_git}")
        return []
    if dot_git.is_symlink():
        raise RuntimeError(f"Linked-worktree Git pointer must not be a symlink: {dot_git}")
    if dot_git.is_file():
        first = dot_git.read_text().strip()
        if not first.startswith("gitdir:"):
            raise RuntimeError(f"Invalid worktree Git pointer: {dot_git}")
        git_dir = Path(first.partition(":")[2].strip())
        if not git_dir.is_absolute():
            git_dir = worktree / git_dir
    elif dot_git.is_dir():
        git_dir = dot_git
    else:
        raise RuntimeError(f"Unsupported worktree Git metadata path: {dot_git}")
    git_dir = git_dir.resolve()
    common_file = git_dir / "commondir"
    if common_file.is_file():
        common_dir = Path(common_file.read_text().strip())
        if not common_dir.is_absolute():
            common_dir = git_dir / common_dir
    else:
        common_dir = git_dir
    common_dir = common_dir.resolve()
    if expected_common_dir is not None:
        expected = Path(expected_common_dir).resolve()
        linked_metadata = dot_git.is_file() and git_dir.is_relative_to(expected / "worktrees")
        standalone_metadata = dot_git.is_dir() and git_dir == expected
        if common_dir != expected or not (linked_metadata or standalone_metadata):
            raise RuntimeError(
                f"Worktree Git metadata points outside the checkout Git directory: {dot_git}"
            )
    return [dot_git.resolve(), git_dir, common_dir]


def run_sandboxed(command, cwd, *, writable_roots=(), readable_roots=(),
                  git_common_dir=None, bun_cache_dir=None, writable_git_metadata=False,
                  fallow_prechecked=False, timeout=None):
    """Run a command with no inherited credentials, network or user Codex config.

    The worktree is read-only by default. Callers can grant write access to the
    isolated job worktree for validation commands; linked Git metadata always
    remains read-only so the sandbox cannot stage, commit, push or rewrite refs.
    """
    codex = shutil.which("codex")
    if not codex:
        raise RuntimeError("Codex CLI is required to run a factory sandbox")
    cwd = Path(cwd).resolve()
    codex = Path(codex).resolve()

    with tempfile.TemporaryDirectory(prefix="codex-factory-sandbox-") as temp_name:
        temp_dir = Path(temp_name).resolve()
        home = temp_dir / "home"
        home.mkdir()

        filesystem = {":minimal": "read", str(cwd): "read", str(temp_dir): "write"}
        for root in readable_roots:
            filesystem[str(Path(root).resolve())] = "read"
        cache_dir = Path(bun_cache_dir).resolve() if bun_cache_dir else temp_dir / "bun-cache"
        if bun_cache_dir:
            filesystem[str(cache_dir)] = "read"
        for root in writable_roots:
            filesystem[str(Path(root).resolve())] = "write"
        for root in git_metadata_roots(cwd, git_common_dir):
            filesystem[str(root)] = "write" if writable_git_metadata else "read"
        filesystem[str(codex.parent)] = "read"

        path_entries = ["/usr/local/bin", "/usr/bin", "/bin"]
        for executable in ("bun", "bunx", "git", "python3", "bash"):
            resolved = shutil.which(executable)
            if resolved:
                path_entries.append(str(Path(resolved).resolve().parent))
                filesystem[str(Path(resolved).resolve().parent)] = "read"
        shell_path = os.pathsep.join(dict.fromkeys(path_entries))

        (home / "config.toml").write_text(
            "[permissions.codex_factory]\n"
            + "filesystem = { "
            + ", ".join(
                f"{json.dumps(path)} = {json.dumps(access)}"
                for path, access in filesystem.items()
            )
            + " }\nnetwork = { enabled = false }\n"
        )
        (home / ".npmrc").write_text("")
        env = {
            "PATH": shell_path,
            "HOME": str(home),
            "CODEX_HOME": str(home),
            "XDG_CONFIG_HOME": str(home / ".config"),
            "XDG_CACHE_HOME": str(home / ".cache"),
            "TMPDIR": str(temp_dir),
            "TMP": str(temp_dir),
            "TEMP": str(temp_dir),
            "BUN_INSTALL_CACHE_DIR": str(cache_dir),
            "NPM_CONFIG_IGNORE_SCRIPTS": "true",
            "NPM_CONFIG_USERCONFIG": str(home / ".npmrc"),
            "NPM_CONFIG_GLOBALCONFIG": "/dev/null",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_COUNT": "1",
            "GIT_CONFIG_KEY_0": "core.hooksPath",
            "GIT_CONFIG_VALUE_0": "/dev/null",
            "GIT_TERMINAL_PROMPT": "0",
            "LANG": os.environ.get("LANG", "C.UTF-8"),
        }
        if fallow_prechecked:
            env["CODEX_FACTORY_FALLOW_PRECHECKED"] = "1"
        args = [str(codex), "sandbox", "-P", "codex_factory", "-C", str(cwd), "--"]
        args.extend(str(part) for part in command)
        return subprocess.run(
            args, cwd=cwd, env=env, text=True, capture_output=True, timeout=timeout
        )
