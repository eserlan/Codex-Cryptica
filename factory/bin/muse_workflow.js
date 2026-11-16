/* global args, log, phase */
/**
 * Muse (`muse.workflow`) orchestrator for the Codex Cryptica software factory.
 *
 * Invoked from a Muse session via the `factory-muse` skill:
 *   muse.workflow({
 *     name: "muse-factory",
 *     scriptPath: "<repo>/factory/bin/muse_workflow.js",
 *     args: { mode: "run", repo: "<repo>" }
 *     // or: { mode: "single", issue: 4740, repo: "<repo>", on: "003-..." }
 *     // optional: queue_label, model (tier name, muse-* model id, or effort override)
 *   })
 *
 * Reuses `factory/bin/{job,route,gate}`, `factory/checks.sh`, `factory/config.json`,
 * and the canonical agent prompts in `.claude/agents/*.md`. Specialist work runs
 * in workflow child agents; every deterministic state change still goes through
 * `factory/bin/job`, executed by a short-lived command-runner child so this
 * script never edits `job.json` itself.
 */

const TERMINAL_OR_WAITING = new Set(["merged", "rejected", "needs-info", "needs-human"]);

// Claude/AGY tier names (config.json `muse_models` + `.claude/agents`
// frontmatter) mapped to a Muse model and reasoning effort, mirroring the
// Claude factory's opus/sonnet/haiku model split.
const MODEL_MAP = {
  opus: { model: "muse-wonder-1.0", effort: "high" },
  pro: { model: "muse-wonder-1.0", effort: "high" },
  sonnet: { model: "muse-ember-1.0", effort: "medium" },
  inherit: { model: "muse-ember-1.0", effort: "medium" },
  haiku: { model: "muse-spark-1.3", effort: "low" },
  flash: { model: "muse-spark-1.3", effort: "low" },
  flash_lite: { model: "muse-spark-1.3", effort: "low" },
};
const EFFORT_TIERS = new Set(["minimal", "low", "medium", "high", "xhigh", "max"]);

const CMD_SCHEMA = {
  type: "object",
  required: ["exitCode", "stdout"],
  properties: {
    exitCode: { type: "number" },
    stdout: { type: "string" },
    stderr: { type: "string" },
  },
};

// fallow-ignore-next-line complexity -- Workflow entry point: queue drain, single-job, summary and waiting-report orchestration in one host-invoked function.
export default async function workflow(host) {
  const rawArgs =
    (typeof args !== "undefined" && args) || host.args || {};
  const wfArgs = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
  const repo = wfArgs.repo;
  if (!repo) {
    throw new Error("muse_workflow: args.repo (absolute checkout root) is required");
  }
  const factory = `${repo}/factory`;
  const jobsDir = `${factory}/jobs`;
  const jobBin = `${factory}/bin/job`;
  const routeBin = `${factory}/bin/route`;
  const gateBin = `${factory}/bin/gate`;
  const modelOverride = wfArgs.model || null;

  const wfLog = (msg) => {
    try {
      if (typeof log === "function") log(String(msg).slice(0, 512));
    } catch {
      /* logging is best-effort */
    }
  };
  const wfPhase = (name) => {
    try {
      if (typeof phase === "function") phase(String(name).slice(0, 128));
    } catch {
      /* phases are best-effort */
    }
  };

  // Resolve a tier to {model, effort}. `args.model` overrides every child:
  // a tier name (opus/sonnet/haiku/...) selects that tier's pair, a `muse-*`
  // model id pins the model at medium effort, and an effort name keeps the
  // tier's model at that effort.
  function tierBase(tier) {
    return MODEL_MAP[tier] || MODEL_MAP.sonnet;
  }

  function overrideSelection(tier) {
    if (MODEL_MAP[modelOverride]) return MODEL_MAP[modelOverride];
    if (modelOverride.startsWith("muse-")) return { model: modelOverride, effort: "medium" };
    const base = tierBase(tier);
    return EFFORT_TIERS.has(modelOverride)
      ? { model: base.model, effort: modelOverride }
      : base;
  }

  function selectionFor(tier) {
    return modelOverride ? overrideSelection(tier) : tierBase(tier);
  }

  function cmdPrompt(command) {
    return (
      `You are a deterministic command runner for the software factory. ` +
      `Run exactly this one shell command with muse.bash in the directory ${repo}, ` +
      `without changing anything else, then return its exit code and captured output verbatim:\n\n` +
      `${command}\n\n` +
      `Return exitCode as a number, stdout as the command's standard output, and stderr as its standard error. ` +
      `Do not summarise, fix, or retry anything.`
    );
  }

  function cmdData(result, command) {
    if (result === null || result.error_kind) {
      throw new Error(`factory command runner failed for: ${command}`);
    }
    return result.data || {};
  }

  function cmdResult(result, command) {
    const data = cmdData(result, command);
    return {
      exitCode: typeof data.exitCode === "number" ? data.exitCode : 1,
      stdout: data.stdout || "",
      stderr: data.stderr || "",
    };
  }

  // Run one deterministic factory command in the main checkout and return
  // its captured output. The runner child must not do anything else.
  async function runCmd(command, label) {
    const sel = selectionFor("haiku");
    const result = await host.agent({
      input: cmdPrompt(command),
      schema: CMD_SCHEMA,
      model: sel.model,
      effort: sel.effort,
      label: label || "factory-cmd",
    });
    return cmdResult(result, command);
  }

  async function runCmdChecked(command, label) {
    const res = await runCmd(command, label);
    if (res.exitCode !== 0) {
      throw new Error(
        `\`${command}\` failed (exit ${res.exitCode}): ${(res.stderr || res.stdout).trim()}`,
      );
    }
    return res;
  }

  async function loadJob(jobId) {
    const res = await runCmdChecked(`cat ${jobsDir}/${jobId}/job.json`, `load-${jobId}`);
    return JSON.parse(res.stdout);
  }

  async function firstLine(path) {
    const res = await runCmd(`head -1 ${path} 2>/dev/null || true`, "first-line");
    return res.stdout.split("\n", 1)[0].trim();
  }

  function jobPorts(jobId) {
    const n = parseInt(jobId.split("-", 1)[0], 10) || 1;
    const base = 5300 + 10 * n;
    return { builder: base, ux: base + 1, ui: base + 2 };
  }

  function jobHeader(job, agentName, model) {
    return (
      `Job: ${job.id}. ` +
      `Job folder: ${jobsDir}/${job.id}/. ` +
      `Main checkout: ${repo}. ` +
      `Worktree: ${job.worktree}. ` +
      `Branch: ${job.branch}. ` +
      `Base: origin/${job.base}. ` +
      `Issue: #${job.issue}. ` +
      `Agent: ${agentName}. ` +
      `Model: ${model}.`
    );
  }

  function rolePrompt(roleName, job, extraLine, tier) {
    const sel = selectionFor(tier);
    return (
      `${jobHeader(job, roleName, sel.model)} ${extraLine || ""}\n\n` +
      `Read ${repo}/.claude/agents/${roleName}.md in full with muse.read_file, ignore its YAML frontmatter, ` +
      `and follow it exactly as your instructions for this turn. Tool mapping: use muse.read_file for Read, ` +
      `muse.search for Grep/Glob, muse.bash for Bash, muse.edit_file for Edit, and muse.write_file for Write. ` +
      `Start every muse.bash command that operates on the branch with \`cd ${job.worktree} && \`. ` +
      `Never modify files in the main checkout outside your job folder. ` +
      `When your output file in the job folder is written and verified, reply with exactly its required one-line reply.`
    );
  }

  function roleErrorKind(result) {
    return result?.error_kind || "no result";
  }

  function roleResult(result, job, roleName) {
    if (result === null || result.error_kind) {
      throw new Error(`${job.id}: ${roleName} agent failed (${roleErrorKind(result)})`);
    }
    return (result.text || "").trim();
  }

  // Spawn one specialist child that follows its canonical role prompt.
  async function runRole(roleName, job, extraLine, tier) {
    const sel = selectionFor(tier);
    const result = await host.agent({
      input: rolePrompt(roleName, job, extraLine, tier),
      model: sel.model,
      effort: sel.effort,
      label: `${job.id}:${roleName}`,
    });
    return roleResult(result, job, roleName);
  }

  function buildRoundInstruction(job) {
    const ports = jobPorts(job.id);
    let text =
      `Build round ${job.round}. Port: ${ports.builder}. ` +
      `Implement spec.md, run factory/checks.sh, commit, push, open the draft PR, and write build.md.`;
    if (job.round > 1) {
      text =
        `Build round ${job.round}. Port: ${ports.builder}. ` +
        `First read build.md and \`git log\` to see how far the last run got. ` +
        `If the newest feedback-*.md is newer than decision.md, address it first. ` +
        `Otherwise, if round-${job.round - 1}/checks.md starts with GATE: FAIL, fix that failure; ` +
        `if round-${job.round - 1}/ holds review-*.md files, address every VERDICT: CHANGES. ` +
        `Then finish the build, push, and update build.md for round ${job.round}.`;
    }
    if (job.stacked_on) {
      text += ` Stacked on ${job.stacked_on}: merge origin/${job.base} in before pushing when the parent has moved.`;
    }
    return text;
  }

  // fallow-ignore-next-line complexity -- Stage coordinator: one branch per factory stage (intake/spec/build/gate/review/approve/merging), mirroring agy_workflow.py drive_job.
  async function driveJob(jobId) {
    let job = await loadJob(jobId);
    while (!TERMINAL_OR_WAITING.has(job.stage)) {
      const stage = job.stage;

      if (stage === "intake") {
        wfPhase(`${jobId}: intake`);
        await runRole("intake", job, "", "opus");
        const line = await firstLine(`${jobsDir}/${jobId}/intake.md`);
        const match = /^DECISION:\s*(ACCEPT|NEEDS-INFO|REJECT)/.exec(line);
        if (!match) throw new Error(`${jobId}: invalid intake.md first line: ${line}`);
        if (match[1] === "ACCEPT") {
          await runCmdChecked(`${routeBin} ${jobId}`, `route-${jobId}`);
          await runCmdChecked(`${jobBin} advance ${jobId} spec`, `advance-${jobId}-spec`);
          job = await loadJob(jobId);
          wfLog(`${jobId} #${job.issue}: intake ACCEPT -> spec`);
        } else if (match[1] === "NEEDS-INFO") {
          await runCmdChecked(`${jobBin} advance ${jobId} needs-info`, `advance-${jobId}-needs-info`);
          wfLog(`${jobId} #${job.issue}: intake NEEDS-INFO -> parked`);
        } else {
          await runCmdChecked(`${jobBin} advance ${jobId} rejected`, `advance-${jobId}-rejected`);
          wfLog(`${jobId} #${job.issue}: intake REJECT -> rejected`);
        }
      } else if (stage === "spec") {
        wfPhase(`${jobId}: spec`);
        await runRole("spec-writer", job, "", "opus");
        await runCmdChecked(`${jobBin} advance ${jobId} build`, `advance-${jobId}-build`);
        wfLog(`${jobId} #${job.issue}: spec ready -> build (round 1)`);
      } else if (stage === "build") {
        const round = job.round;
        wfPhase(`${jobId}: build (round ${round})`);
        // Muse workflow children are stateless, so the builder is
        // re-spawned each round and resumes from build.md + git log in the
        // worktree, exactly like a resumed Claude builder.
        await runRole("builder", job, buildRoundInstruction(job), "sonnet");
        const status = await firstLine(`${jobsDir}/${jobId}/build.md`);
        if (status === "STATUS: BLOCKED") {
          await runCmdChecked(`${jobBin} advance ${jobId} needs-human`, `advance-${jobId}-blocked`);
          wfLog(`${jobId} #${job.issue}: build BLOCKED -> needs-human`);
        } else if (status === "STATUS: READY") {
          const adv = await runCmd(`${jobBin} advance ${jobId} gate`, `advance-${jobId}-gate`);
          if (adv.exitCode !== 0) {
            const refusal = (adv.stderr || adv.stdout).trim();
            wfLog(`${jobId} #${job.issue}: advance to gate refused (${refusal}); resuming builder once`);
            await runRole(
              "builder",
              job,
              `Build round ${round}. \`factory/bin/job advance ${jobId} gate\` refused with: ${refusal}. ` +
                `Fix the issue (commit a clean tree, push the branch, ensure an open draft PR), update build.md, and finish.`,
              "sonnet",
            );
            await runCmdChecked(`${jobBin} advance ${jobId} gate`, `advance-${jobId}-gate-retry`);
          }
          wfLog(`${jobId} #${job.issue}: build round ${round} READY -> gate`);
        } else {
          throw new Error(`${jobId}: build.md starts with ${status}, expected STATUS: READY or STATUS: BLOCKED`);
        }
      } else if (stage === "gate") {
        const round = job.round;
        wfPhase(`${jobId}: gate (round ${round})`);
        const gate = await runCmd(`${gateBin} ${jobId}`, `gate-${jobId}`);
        if (gate.exitCode === 0) {
          await runCmdChecked(`${jobBin} advance ${jobId} review`, `advance-${jobId}-review`);
          wfLog(`${jobId} #${job.issue}: gate PASS -> review`);
        } else {
          job = await loadJob(jobId);
          const target = job.round >= job.round_limit ? "needs-human" : "build";
          await runCmdChecked(`${jobBin} advance ${jobId} ${target}`, `advance-${jobId}-${target}`);
          wfLog(`${jobId} #${job.issue}: gate FAIL (round ${round}) -> ${target}`);
        }
      } else if (stage === "review") {
        const round = job.round;
        wfPhase(`${jobId}: review (round ${round})`);
        const reviewers = job.agents?.reviewers || {};
        const ports = jobPorts(jobId);
        const pending = [];
        for (const lens of Object.keys(reviewers)) {
          const exists = await runCmd(
            `test -f ${jobsDir}/${jobId}/round-${round}/review-${lens}.md && echo yes || echo no`,
            `review-check-${lens}`,
          );
          if (!exists.stdout.includes("yes")) pending.push(lens);
        }
        if (pending.length) {
          const requests = pending.map((lens) => {
            let extra = `Review round ${round}.`;
            if (lens === "ux") extra += ` Port: ${ports.ux}.`;
            if (lens === "ui") extra += ` Port: ${ports.ui}.`;
            if (job.stacked_on) extra += ` Stacked job: judge only the diff from origin/${job.base}.`;
            const sel = selectionFor(reviewers[lens]);
            return {
              input: rolePrompt(`reviewer-${lens}`, job, extra, reviewers[lens]),
              model: sel.model,
              effort: sel.effort,
              label: `${jobId}:reviewer-${lens}`,
            };
          });
          const results = await host.parallel(requests);
          for (let i = 0; i < results.length; i++) {
            roleResult(results[i], job, `reviewer-${pending[i]}`);
          }
        }
        await runCmdChecked(`${jobBin} sync ${jobId}`, `sync-${jobId}`);
        job = await loadJob(jobId);
        const reviews = job.reviews || {};
        const changes = Object.keys(reviews).filter((k) => reviews[k] === "CHANGES");
        if (!changes.length) {
          await runCmdChecked(`${jobBin} advance ${jobId} approve`, `advance-${jobId}-approve`);
          wfLog(`${jobId} #${job.issue}: all reviews PASS -> approve`);
        } else {
          const target = job.round >= job.round_limit ? "needs-human" : "build";
          await runCmdChecked(`${jobBin} advance ${jobId} ${target}`, `advance-${jobId}-${target}`);
          wfLog(`${jobId} #${job.issue}: reviews CHANGES (${changes.join(", ")}) -> ${target}`);
        }
      } else if (stage === "approve") {
        wfPhase(`${jobId}: approve`);
        let extra = `PR: #${job.pr}. Final round: ${job.round}.`;
        if (job.stacked_on) extra += ` Stacked job: judge only the diff from origin/${job.base}.`;
        await runRole("approver", job, extra, "opus");
        const decision = await firstLine(`${jobsDir}/${jobId}/decision.md`);
        // Repo policy: the factory never merges; APPROVE and ESCALATE both
        // hand the ready PR to a human via needs-human.
        await runCmdChecked(`${jobBin} advance ${jobId} needs-human`, `advance-${jobId}-needs-human`);
        wfLog(`${jobId} #${job.issue}: approver ${decision} -> needs-human (PR #${job.pr} ready)`);
      } else if (stage === "merging") {
        const pr = await runCmd(
          `gh pr view ${job.pr} --json state --jq .state`,
          `pr-state-${jobId}`,
        );
        const target = pr.stdout.trim() === "MERGED" ? "merged" : "needs-human";
        await runCmdChecked(`${jobBin} advance ${jobId} ${target}`, `advance-${jobId}-${target}`);
        wfLog(`${jobId} #${job.issue}: legacy merging -> ${target}`);
      } else {
        throw new Error(`${jobId}: unknown stage ${stage}`);
      }
      job = await loadJob(jobId);
    }
    return job.id;
  }

  function parseQueueRow(parts) {
    return {
      action: parts[0],
      issue: parseInt(parts[1], 10),
      job: parts[2] === "-" ? null : parts[2],
      stage: parts[3] === "-" ? null : parts[3],
      note: parts[4],
    };
  }

  function parseQueue(stdout) {
    return stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => line.split("\t"))
      .filter((parts) => parts.length >= 5)
      .map(parseQueueRow);
  }

  function track(touched, batch, jobId) {
    batch.push(jobId);
    if (!touched.includes(jobId)) touched.push(jobId);
  }

  async function resumeRow(row, touched, batch) {
    if (row.stage === "needs-info") {
      await runCmdChecked(`${jobBin} advance ${row.job} intake`, `advance-${row.job}-intake`);
      wfLog(`${row.job} #${row.issue}: author replied -> resuming at intake`);
    }
    track(touched, batch, row.job);
  }

  async function newRow(row, touched, batch) {
    const created = await runCmdChecked(`${jobBin} create ${row.issue}`, `create-${row.issue}`);
    const jobId = created.stdout.trim().split("\n").pop();
    wfLog(`${jobId} #${row.issue}: created new job -> intake`);
    track(touched, batch, jobId);
  }

  function queueCommand() {
    const prefix = wfArgs.queue_label ? `FACTORY_QUEUE_LABEL=${wfArgs.queue_label} ` : "";
    return `${prefix}${jobBin} queue`;
  }

  async function dispatchRow(row, touched, batch) {
    if (row.action === "resume") await resumeRow(row, touched, batch);
    else if (row.action === "new") await newRow(row, touched, batch);
  }

  async function prepareNextBatch(touched) {
    const out = await runCmdChecked(queueCommand(), "job-queue");
    const batch = [];
    for (const row of parseQueue(out.stdout)) await dispatchRow(row, touched, batch);
    return batch;
  }

  const touched = [];
  const mode = wfArgs.mode || "run";
  if (mode === "single") {
    const target = String(wfArgs.issue || wfArgs.job || "").trim();
    if (!target) throw new Error("mode 'single' requires args.issue or args.job");
    let jobId = null;
    if (!/^\d+$/.test(target)) {
      jobId = target;
    } else {
      const out = await runCmdChecked(`${jobBin} queue`, "job-queue-single");
      const row = parseQueue(out.stdout).find((r) => r.issue === parseInt(target, 10));
      if (row && !["resume", "new"].includes(row.action)) {
        return { status: "blocked", touched: [], notes: [`Issue #${target} cannot run: ${row.note}`] };
      }
      if (row?.action === "resume") {
        jobId = row.job;
        if (row.stage === "needs-info") {
          await runCmdChecked(`${jobBin} advance ${jobId} intake`, `advance-${jobId}-intake`);
        }
      }
      if (!jobId) {
        const cmd = wfArgs.on
          ? `${jobBin} create ${target} --on ${wfArgs.on}`
          : `${jobBin} create ${target}`;
        const created = await runCmdChecked(cmd, `create-${target}`);
        jobId = created.stdout.trim().split("\n").pop();
      }
    }
    touched.push(jobId);
    await driveJob(jobId);
  } else {
    // Muse workflows run one job at a time here; `factory/bin/job queue`
    // still enforces the shared concurrency slots across concurrent sessions.
    for (;;) {
      const batch = await prepareNextBatch(touched);
      if (!batch.length) break;
      for (const jobId of batch) await driveJob(jobId);
    }
  }

  wfPhase("Summary");
  let summary = "";
  let costs = "";
  if (touched.length) {
    summary = (await runCmd(`${jobBin} summary ${touched.join(" ")}`, "job-summary")).stdout.trim();
    costs = (await runCmd(`${jobBin} costs ${touched.join(" ")}`, "job-costs")).stdout.trim();
  }
  const finalQueue = parseQueue(
    (await runCmdChecked(`${jobBin} queue`, "job-queue-final")).stdout,
  );
  const waiting = finalQueue
    .filter((r) => r.action === "wait")
    .map((r) => `#${r.issue} (${r.job}, ${r.stage}): ${r.note}`);
  return {
    status: waiting.length ? "waiting" : "complete",
    touched,
    summary: summary || "No queued or running factory jobs.",
    costs,
    waiting,
    notes: touched.length
      ? []
      : ["No queued or running factory jobs."],
  };
}
