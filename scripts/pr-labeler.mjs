import fs from "node:fs/promises";

const MANAGED_LABELS = [
  "bug",
  "enhancement",
  "documentation",
  "improvement",
  "dependencies",
  "github_actions",
];

function normalize(text) {
  return text.trim().toLowerCase();
}

function titleLabel(title) {
  const normalized = normalize(title);

  if (
    normalized.startsWith("build(deps)") ||
    normalized.startsWith("build(deps-dev)") ||
    normalized.startsWith("dependabot") ||
    normalized.includes("dependency")
  ) {
    return "dependencies";
  }

  if (
    normalized.includes("docs") ||
    normalized.includes("documentation") ||
    normalized.includes("📚")
  ) {
    return "documentation";
  }

  if (
    normalized.includes("fix") ||
    normalized.includes("bug") ||
    normalized.includes("🐛") ||
    normalized.includes("🩹") ||
    normalized.includes("🔒")
  ) {
    return "bug";
  }

  if (
    normalized.includes("feat") ||
    normalized.includes("feature") ||
    normalized.includes("✨") ||
    normalized.includes("🚀")
  ) {
    return "enhancement";
  }

  if (
    normalized.includes("perf") ||
    normalized.includes("performance") ||
    normalized.includes("optimiz") ||
    normalized.includes("⚡") ||
    normalized.includes("refactor") ||
    normalized.includes("chore") ||
    normalized.includes("style") ||
    normalized.includes("ux") ||
    normalized.includes("a11y") ||
    normalized.includes("improve") ||
    normalized.includes("🎨") ||
    normalized.includes("🧹") ||
    normalized.includes("🔧") ||
    normalized.includes("♻️") ||
    normalized.includes("✅")
  ) {
    return "improvement";
  }

  return "";
}

function filesLabel(files) {
  const paths = files.map((file) => normalize(file));

  if (paths.some((path) => path.startsWith(".github/"))) {
    return "github_actions";
  }

  if (
    paths.some(
      (path) =>
        path === "package.json" ||
        path === "package-lock.json" ||
        path.endsWith("/package.json") ||
        path.endsWith("/package-lock.json") ||
        path.includes("pnpm-lock.yaml") ||
        path.includes("bun.lock") ||
        path.includes("npm-shrinkwrap.json"),
    )
  ) {
    return "dependencies";
  }

  return "";
}

export function labelsForPullRequest({ title, files }) {
  const primary = titleLabel(title);
  const secondary = filesLabel(files);

  if (primary && primary !== "improvement") {
    return [primary];
  }

  if (secondary) {
    return [secondary];
  }

  if (primary) {
    return [primary];
  }

  return [];
}

function isRetryableStatus(status, text = "") {
  if (status >= 500 && status <= 599) return true;
  if (status === 429) return true;
  if (status === 422 && text.includes("Could not resolve to a node")) return true;
  return false;
}

export async function githubRequest(method, url, token, body, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.ok) {
        if (response.status === 204) {
          return null;
        }
        return await response.json();
      }

      const text = await response.text();
      const error = new Error(`GitHub API request failed (${response.status}): ${text}`);
      error.status = response.status;
      lastError = error;

      if (attempt < maxRetries && isRetryableStatus(response.status, text)) {
        const delayMs = Math.min(500 * Math.pow(2, attempt), 4000);
        console.warn(`GitHub API returned ${response.status}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw error;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && (!err.status || isRetryableStatus(err.status, err.message))) {
        const delayMs = Math.min(500 * Math.pow(2, attempt), 4000);
        console.warn(`GitHub API request failed: ${err.message}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function isLabelWritePermissionError(error) {
  return (
    error instanceof Error &&
    (error.message.includes("Resource not accessible by integration") ||
      error.message.includes("(403)") ||
      error.message.includes("(401)"))
  );
}

async function listPullRequestFiles(repo, pullNumber, token) {
  const files = [];
  let page = 1;

  while (true) {
    const url = new URL(`https://api.github.com/repos/${repo}/pulls/${pullNumber}/files`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const batch = await githubRequest("GET", url, token);
    files.push(...batch.map((item) => item.filename));
    if (batch.length < 100) {
      return files;
    }
    page += 1;
  }
}

async function listIssueLabels(repo, issueNumber, token) {
  const url = new URL(`https://api.github.com/repos/${repo}/issues/${issueNumber}/labels`);
  url.searchParams.set("per_page", "100");
  const labels = await githubRequest("GET", url, token);
  return labels.map((label) => label.name);
}

async function removeLabel(repo, issueNumber, label, token) {
  const encoded = encodeURIComponent(label);
  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/labels/${encoded}`;
  try {
    await githubRequest("DELETE", url, token);
    return true;
  } catch (error) {
    if (isLabelWritePermissionError(error)) {
      console.warn(`Skipping label removal for #${issueNumber} (${label}): ${error.message}`);
      return false;
    }

    throw error;
  }
}

async function addLabels(repo, issueNumber, labels, token) {
  if (labels.length === 0) {
    return true;
  }

  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/labels`;
  try {
    await githubRequest("POST", url, token, { labels });
    return true;
  } catch (error) {
    if (isLabelWritePermissionError(error)) {
      console.warn(`Skipping label add for #${issueNumber} (${labels.join(", ")}): ${error.message}`);
      return false;
    }

    throw error;
  }
}

export async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token) {
    console.warn("GITHUB_TOKEN or GH_TOKEN is required. Skipping label sync.");
    return;
  }

  if (!eventPath) {
    console.warn("GITHUB_EVENT_PATH is required. Skipping label sync.");
    return;
  }

  if (!repo) {
    console.warn("GITHUB_REPOSITORY is required. Skipping label sync.");
    return;
  }

  const event = JSON.parse(await fs.readFile(eventPath, "utf8"));
  const pullRequest = event.pull_request;

  if (!pullRequest) {
    console.log("No pull request payload found. Skipping label sync.");
    return;
  }

  try {
    const files = await listPullRequestFiles(repo, pullRequest.number, token);
    const desiredLabels = labelsForPullRequest({
      title: pullRequest.title || "",
      files,
    });

    const currentLabels = await listIssueLabels(repo, pullRequest.number, token);
    const managedCurrentLabels = currentLabels.filter((label) => MANAGED_LABELS.includes(label));
    const currentSet = new Set(currentLabels);
    let labelWritesSkipped = false;

    for (const label of managedCurrentLabels) {
      if (!desiredLabels.includes(label)) {
        const removed = await removeLabel(repo, pullRequest.number, label, token);
        labelWritesSkipped ||= !removed;
      }
    }

    const labelsToAdd = desiredLabels.filter((label) => !currentSet.has(label));
    const added = await addLabels(repo, pullRequest.number, labelsToAdd, token);
    labelWritesSkipped ||= !added;

    if (labelWritesSkipped) {
      console.warn(
        `Label sync skipped for #${pullRequest.number} because the workflow token cannot mutate labels.`,
      );
      return;
    }

    console.log(
      desiredLabels.length > 0
        ? `Applied labels to #${pullRequest.number}: ${desiredLabels.join(", ")}`
        : `No managed labels matched PR #${pullRequest.number}`,
    );
  } catch (error) {
    console.warn(`Label sync skipped for #${pullRequest.number} due to GitHub API error: ${error.message}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.warn(`Skipping labeler due to unexpected error: ${error?.message || error}`);
    process.exit(0);
  });
}
