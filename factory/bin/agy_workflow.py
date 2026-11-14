#!/usr/bin/env python3
"""Antigravity (AGY) `run_workflow` orchestrator for the Codex Cryptica software factory.

Invoked via the AGY `run_workflow` tool:
  run_workflow(
      ScriptPath="<repo>/factory/bin/agy_workflow.py",
      Description="Run software factory queue",
      Args={"mode": "run"}  # or {"mode": "single", "issue": 4740, "on": "003-..."}
  )

Reuses `factory/bin/{job,route,gate}`, `factory/checks.sh`, `factory/config.json`,
and the canonical agent prompts in `.claude/agents/*.md`.
"""

import json
import os
import re
import subprocess
from pathlib import Path

TERMINAL_OR_WAITING = {"merged", "rejected", "needs-info", "needs-human"}

MODEL_MAP = {
    "opus": "pro",
    "sonnet": "inherit",
    "haiku": "flash",
    "pro": "pro",
    "inherit": "inherit",
    "flash": "flash",
    "flash_lite": "flash_lite",
}


def find_repo():
    candidates = []
    if "WORKSPACES" in globals() and WORKSPACES:  # noqa: F821
        candidates.extend(Path(w).resolve() for w in WORKSPACES)  # noqa: F821
    candidates.append(Path.cwd().resolve())
    if "__file__" in globals():
        candidates.append(Path(__file__).resolve().parents[2])
    for cand in candidates:
        if (cand / "factory" / "config.json").exists():
            return cand
    raise RuntimeError("Could not locate repository root containing factory/config.json")


REPO = find_repo()
FACTORY = REPO / "factory"
JOBS = FACTORY / "jobs"
BIN = FACTORY / "bin"
AGENTS_DIR = REPO / ".claude" / "agents"
CONFIG = json.loads((FACTORY / "config.json").read_text())


def wf_log(msg):
    if "log" in globals() and callable(globals()["log"]):
        globals()["log"](msg)
    else:
        print(msg)


def wf_phase(name):
    if "phase" in globals() and callable(globals()["phase"]):
        globals()["phase"](name)


def run_cmd(cmd, cwd=REPO, check=True, input_text=None):
    env = dict(os.environ)
    wf_args = globals().get("args") or {}
    if wf_args.get("queue_label"):
        env["FACTORY_QUEUE_LABEL"] = str(wf_args["queue_label"])
    res = subprocess.run(
        [str(c) for c in cmd],
        cwd=str(cwd),
        input=input_text,
        capture_output=True,
        text=True,
        env=env,
    )
    if check and res.returncode != 0:
        detail = (res.stderr or res.stdout).strip()
        raise RuntimeError(f"`{' '.join(str(c) for c in cmd)}` failed (exit {res.returncode}): {detail}")
    return res


def load_job(job_id):
    return json.loads((JOBS / job_id / "job.json").read_text())


def first_line(path):
    return path.read_text().split("\n", 1)[0].strip() if path.exists() else None


def strip_frontmatter(md_text):
    if md_text.startswith("---\n"):
        parts = md_text.split("\n---\n", 1)
        if len(parts) == 2:
            return parts[1].strip()
    return md_text.strip()


def load_role_instructions(role_name):
    path = AGENTS_DIR / f"{role_name}.md"
    if not path.exists():
        raise RuntimeError(f"Missing agent definition: {path}")
    body = strip_frontmatter(path.read_text())
    agy_footer = (
        "\n\n## Antigravity (AGY) Tool & Completion Contract\n"
        "- Tool mapping: use `read_file` for Read, `write_file` (with `Overwrite=True`) for Write, "
        "`edit_file` for Edit, and `run_command` for Bash, Grep, and Glob.\n"
        "- Start every `run_command` that operates on the branch with `cd <worktree> && `.\n"
        "- Never modify files in the main checkout outside `<job folder>`.\n"
        "- When your output file in `<job folder>` is written and verified, finish by calling "
        "your `finish` tool with the required one-line reply (or returning that one-line reply)."
    )
    return body + agy_footer


def map_model(model_name, override=None):
    if override:
        return MODEL_MAP.get(override, override)
    return MODEL_MAP.get(model_name or "sonnet", "inherit")


def job_ports(job_id):
    num_str = job_id.split("-", 1)[0]
    n = int(num_str) if num_str.isdigit() else 1
    base = CONFIG["ports"]["base"] + CONFIG["ports"]["step"] * n
    return {
        "builder": base,
        "ux": base + 1,
        "ui": base + 2,
    }


def job_header(job, agent_name, agy_model):
    job_id = job["id"]
    job_folder = JOBS / job_id
    return (
        f"Job: {job_id}. "
        f"Job folder: {job_folder}/. "
        f"Main checkout: {REPO}. "
        f"Worktree: {job['worktree']}. "
        f"Branch: {job['branch']}. "
        f"Base: origin/{job['base']}. "
        f"Issue: #{job['issue']}. "
        f"Agent: {agent_name}. "
        f"Model: {agy_model}."
    )


def parse_queue_output(stdout_text):
    rows = []
    for raw in stdout_text.splitlines():
        if not raw.strip():
            continue
        parts = raw.split("\t")
        if len(parts) >= 5:
            rows.append({
                "action": parts[0],
                "issue": int(parts[1]),
                "job": None if parts[2] == "-" else parts[2],
                "stage": None if parts[3] == "-" else parts[3],
                "note": parts[4],
            })
    return rows


def build_round_instruction(job):
    job_id = job["id"]
    d = JOBS / job_id
    r = job["round"]
    ports = job_ports(job_id)
    prefix = f"Build round {r}. Port: {ports['builder']}."
    if job.get("stacked_on"):
        prefix += f" Stacked on {job['stacked_on']}: merge origin/{job['base']} in before pushing when the parent has moved."

    feedbacks = sorted(d.glob("feedback-*.md"))
    decision_md = d / "decision.md"
    if feedbacks and (not decision_md.exists() or feedbacks[-1].stat().st_mtime > decision_md.stat().st_mtime):
        fb_name = feedbacks[-1].name
        return f"{prefix} The user gave feedback: read {fb_name} and address it, push, and update build.md for round {r}."

    if r > 1:
        prev_dir = d / f"round-{r - 1}"
        prev_checks = prev_dir / "checks.md"
        if prev_checks.exists() and (first_line(prev_checks) or "").startswith("GATE: FAIL"):
            return f"{prefix} The gate failed: read round-{r - 1}/checks.md and checks.log, fix it, push, and update build.md."
        if list(prev_dir.glob("review-*.md")):
            return (
                f"{prefix} Round {r - 1} reviews are in round-{r - 1}/. "
                f"Address every VERDICT: CHANGES, push, and update build.md for round {r}."
            )

    has_prior_work = (d / "build.md").exists()
    if not has_prior_work and job.get("worktree") and Path(job["worktree"]).exists():
        wt_commits = run_cmd(
            ["git", "rev-list", "--count", f"origin/{job['base']}..HEAD"],
            cwd=job["worktree"],
            check=False,
        ).stdout.strip()
        wt_dirty = run_cmd(["git", "status", "--porcelain"], cwd=job["worktree"], check=False).stdout.strip()
        has_prior_work = (wt_commits.isdigit() and int(wt_commits) > 0) or bool(wt_dirty)

    if has_prior_work:
        return (
            f"{prefix} Resuming build round {r}: read build.md and git log to see how far the last run got, "
            f"finish the build, push, and update build.md."
        )
    return f"{prefix} Implement spec.md, run factory/checks.sh, commit, push, open the draft PR, and write build.md."


async def run_single_turn_agent(role_name, job, extra_line="", claude_model="opus", model_override=None):
    agy_model = map_model(claude_model, override=model_override)
    hdr = job_header(job, role_name, agy_model)
    instructions = load_role_instructions(role_name)
    lead = f"{hdr} {extra_line}".strip()
    prompt = f"{lead}\n\n{instructions}"
    return await agent(  # noqa: F821
        prompt=prompt,
        schema={"type": "string"},
        role=f"{job['id']}: {role_name}",
        model=agy_model,
    )


async def drive_job(job_id, model_override=None):
    job = load_job(job_id)
    builder_instance = None

    try:
        while job["stage"] not in TERMINAL_OR_WAITING:
            stage = job["stage"]
            job = load_job(job_id)

            if stage == "intake":
                wf_phase(f"{job_id}: intake")
                await run_single_turn_agent("intake", job, claude_model="opus", model_override=model_override)
                intake_line = first_line(JOBS / job_id / "intake.md") or ""
                m = re.match(r"DECISION:\s*(ACCEPT|NEEDS-INFO|REJECT)", intake_line)
                if not m:
                    raise RuntimeError(f"{job_id}: invalid intake.md first line: {intake_line!r}")
                decision = m.group(1)
                if decision == "ACCEPT":
                    run_cmd([ROUTE_BIN, job_id])
                    run_cmd([JOB_BIN, "advance", job_id, "spec"])
                    job = load_job(job_id)
                    reviewers_str = ", ".join(job["agents"]["reviewers"].keys())
                    wf_log(f"{job_id} #{job['issue']}: intake ACCEPT → spec (reviewers: {reviewers_str})")
                elif decision == "NEEDS-INFO":
                    run_cmd([JOB_BIN, "advance", job_id, "needs-info"])
                    wf_log(f"{job_id} #{job['issue']}: intake NEEDS-INFO → parked for author reply")
                else:
                    run_cmd([JOB_BIN, "advance", job_id, "rejected"])
                    wf_log(f"{job_id} #{job['issue']}: intake REJECT → rejected")

            elif stage == "spec":
                wf_phase(f"{job_id}: spec")
                await run_single_turn_agent("spec-writer", job, claude_model="opus", model_override=model_override)
                run_cmd([JOB_BIN, "advance", job_id, "build"])
                wf_log(f"{job_id} #{job['issue']}: spec ready → build (round 1)")

            elif stage == "build":
                r = job["round"]
                wf_phase(f"{job_id}: build (round {r})")
                agy_model = map_model("sonnet", override=model_override)
                hdr = job_header(job, "builder", agy_model)
                round_task = build_round_instruction(job)
                if builder_instance is None:
                    standing = f"{hdr}\n\n{load_role_instructions('builder')}"
                    builder_instance = agent(  # noqa: F821
                        prompt=standing,
                        schema={"type": "string"},
                        role=f"builder-{job_id}",
                        model=agy_model,
                    )
                await builder_instance(f"{hdr} {round_task}")
                status_line = first_line(JOBS / job_id / "build.md") or ""
                if status_line == "STATUS: BLOCKED":
                    run_cmd([JOB_BIN, "advance", job_id, "needs-human"])
                    wf_log(f"{job_id} #{job['issue']}: build BLOCKED → needs-human")
                elif status_line == "STATUS: READY":
                    adv = run_cmd([JOB_BIN, "advance", job_id, "gate"], check=False)
                    if adv.returncode != 0:
                        refusal = (adv.stderr or adv.stdout).strip()
                        wf_log(f"{job_id} #{job['issue']}: advance to gate refused ({refusal}); resuming builder once")
                        await builder_instance(
                            f"{hdr} `factory/bin/job advance {job_id} gate` refused with: {refusal}. "
                            f"Fix the issue (commit clean tree, push branch, ensure open draft PR), update build.md, and finish."
                        )
                        run_cmd([JOB_BIN, "advance", job_id, "gate"])
                    wf_log(f"{job_id} #{job['issue']}: build round {r} READY → gate")
                else:
                    raise RuntimeError(f"{job_id}: build.md starts with {status_line!r}, expected STATUS: READY or STATUS: BLOCKED")

            elif stage == "gate":
                r = job["round"]
                wf_phase(f"{job_id}: gate (round {r})")
                gate_res = run_cmd([GATE_BIN, job_id], check=False)
                if gate_res.returncode == 0:
                    run_cmd([JOB_BIN, "advance", job_id, "review"])
                    job = load_job(job_id)
                    revs = ", ".join(job["agents"]["reviewers"].keys())
                    wf_log(f"{job_id} #{job['issue']}: gate PASS → reviewing ({revs})")
                else:
                    job = load_job(job_id)
                    target = "needs-human" if job["round"] >= job["round_limit"] else "build"
                    run_cmd([JOB_BIN, "advance", job_id, target])
                    wf_log(f"{job_id} #{job['issue']}: gate FAIL (round {r}) → {target}")

            elif stage == "review":
                r = job["round"]
                wf_phase(f"{job_id}: review (round {r})")
                rd = JOBS / job_id / f"round-{r}"
                revs_map = job["agents"]["reviewers"]
                pending = [lens for lens in revs_map if not (rd / f"review-{lens}.md").exists()]
                ports = job_ports(job_id)

                def make_reviewer(lens):
                    extra = f"Review round {r}."
                    if lens in ports:
                        extra += f" Port: {ports[lens]}."
                    if job.get("stacked_on"):
                        extra += f" Stacked job: judge only the diff from origin/{job['base']}."
                    return run_single_turn_agent(
                        f"reviewer-{lens}",
                        job,
                        extra_line=extra,
                        claude_model=revs_map[lens],
                        model_override=model_override,
                    )

                if pending:
                    await parallel(pending, make_reviewer)  # noqa: F821
                run_cmd([JOB_BIN, "sync", job_id])
                job = load_job(job_id)
                changes = [k for k, v in job["reviews"].items() if v == "CHANGES"]
                if not changes:
                    run_cmd([JOB_BIN, "advance", job_id, "approve"])
                    wf_log(f"{job_id} #{job['issue']}: all reviews PASS → approve")
                else:
                    target = "needs-human" if job["round"] >= job["round_limit"] else "build"
                    run_cmd([JOB_BIN, "advance", job_id, target])
                    wf_log(f"{job_id} #{job['issue']}: reviews requested CHANGES ({', '.join(changes)}) → {target}")

            elif stage == "approve":
                wf_phase(f"{job_id}: approve")
                extra = f"PR: #{job['pr']}. Final round: {job['round']}."
                if job.get("stacked_on"):
                    extra += f" Stacked job: judge only the diff from origin/{job['base']}."
                await run_single_turn_agent(
                    "approver",
                    job,
                    extra_line=extra,
                    claude_model="opus",
                    model_override=model_override,
                )
                decision = first_line(JOBS / job_id / "decision.md") or ""
                # Local repo policy: the factory never merges PRs automatically;
                # both APPROVE and ESCALATE advance to needs-human.
                run_cmd([JOB_BIN, "advance", job_id, "needs-human"])
                wf_log(f"{job_id} #{job['issue']}: approver {decision} → needs-human (PR #{job['pr']} ready)")

            elif stage == "merging":
                # Legacy stage recovery: check if PR is already merged, else needs-human.
                pr_state = run_cmd(
                    ["gh", "pr", "view", str(job["pr"]), "--json", "state", "--jq", ".state"],
                    check=False,
                ).stdout.strip()
                target = "merged" if pr_state == "MERGED" else "needs-human"
                run_cmd([JOB_BIN, "advance", job_id, target])
                wf_log(f"{job_id} #{job['issue']}: legacy merging → {target}")

            job = load_job(job_id)
    finally:
        if builder_instance is not None:
            del builder_instance

    return job["id"]


def prepare_next_batch(touched_ids):
    """Inspect `factory/bin/job queue` and return job_ids ready to run in this batch."""
    q_out = run_cmd([JOB_BIN, "queue"]).stdout
    rows = parse_queue_output(q_out)
    batch = []
    for row in rows:
        if row["action"] == "resume":
            job_id = row["job"]
            if row["stage"] == "needs-info":
                run_cmd([JOB_BIN, "advance", job_id, "intake"])
                wf_log(f"{job_id} #{row['issue']}: author replied → resuming at intake")
            batch.append(job_id)
            if job_id not in touched_ids:
                touched_ids.append(job_id)
        elif row["action"] == "new":
            issue_num = str(row["issue"])
            job_id = run_cmd([JOB_BIN, "create", issue_num]).stdout.strip()
            wf_log(f"{job_id} #{issue_num}: created new job → intake")
            batch.append(job_id)
            if job_id not in touched_ids:
                touched_ids.append(job_id)
    return batch, rows


async def run_factory_workflow():
    wf_args = globals().get("args") or {}
    mode = wf_args.get("mode", "run")
    model_override = wf_args.get("model")
    touched_ids = []

    if mode == "single":
        target = str(wf_args.get("issue") or wf_args.get("job") or "").strip()
        if not target:
            raise RuntimeError("Args for mode='single' must include 'issue' or 'job'")
        on_parent = wf_args.get("on")
        job_id = None
        if not target.isdigit():
            job_id = target
        else:
            q_rows = parse_queue_output(run_cmd([JOB_BIN, "queue"]).stdout)
            for r in q_rows:
                if r["issue"] == int(target):
                    if r["action"] not in {"resume", "new"}:
                        wf_log(f"Issue #{target} cannot run: {r['note']}")
                        return
                    if r["action"] == "resume":
                        job_id = r["job"]
                    if r["stage"] == "needs-info" and r["action"] == "resume":
                        run_cmd([JOB_BIN, "advance", job_id, "intake"])
                    elif r["action"] == "new":
                        job_id = None
                    break
            if not job_id:
                cmd = [JOB_BIN, "create", target]
                if on_parent:
                    cmd += ["--on", str(on_parent)]
                job_id = run_cmd(cmd).stdout.strip()
                wf_log(f"{job_id} #{target}: created job" + (f" stacked on {on_parent}" if on_parent else ""))
        touched_ids.append(job_id)
        await drive_job(job_id, model_override=model_override)
    else:
        while True:
            batch, _ = prepare_next_batch(touched_ids)
            if not batch:
                break
            if len(batch) == 1:
                await drive_job(batch[0], model_override=model_override)
            else:
                await parallel(batch, lambda jid: drive_job(jid, model_override=model_override))  # noqa: F821

    wf_phase("Summary")
    if touched_ids:
        summary_out = run_cmd([JOB_BIN, "summary", *touched_ids]).stdout.strip()
        costs_out = run_cmd([JOB_BIN, "costs", *touched_ids]).stdout.strip()
        print(summary_out)
        print()
        print(costs_out)
    else:
        print("No queued or running factory jobs.")

    final_rows = parse_queue_output(run_cmd([JOB_BIN, "queue"]).stdout)
    waiting = [r for r in final_rows if r["action"] == "wait"]
    if waiting:
        print("\nWaiting on a human:")
        for w in waiting:
            print(f"  - #{w['issue']} ({w['job']}, {w['stage']}): {w['note']}")


if "CONVERSATION_ID" in globals():
    await run_factory_workflow()  # noqa: F704
