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

async function githubRequest(method, url, token, body) {
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
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
  await githubRequest("DELETE", url, token);
}

async function addLabels(repo, issueNumber, labels, token) {
  if (labels.length === 0) {
    return;
  }

  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/labels`;
  await githubRequest("POST", url, token, { labels });
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token) {
    throw new Error("GITHUB_TOKEN or GH_TOKEN is required");
  }

  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH is required");
  }

  if (!repo) {
    throw new Error("GITHUB_REPOSITORY is required");
  }

  const event = JSON.parse(await fs.readFile(eventPath, "utf8"));
  const pullRequest = event.pull_request;

  if (!pullRequest) {
    console.log("No pull request payload found. Skipping label sync.");
    return;
  }

  const desiredLabels = labelsForPullRequest({
    title: pullRequest.title || "",
    files: await listPullRequestFiles(repo, pullRequest.number, token),
  });

  const currentLabels = await listIssueLabels(repo, pullRequest.number, token);
  const managedCurrentLabels = currentLabels.filter((label) => MANAGED_LABELS.includes(label));
  const currentSet = new Set(currentLabels);

  for (const label of managedCurrentLabels) {
    if (!desiredLabels.includes(label)) {
      await removeLabel(repo, pullRequest.number, label, token);
    }
  }

  const labelsToAdd = desiredLabels.filter((label) => !currentSet.has(label));
  await addLabels(repo, pullRequest.number, labelsToAdd, token);

  console.log(
    desiredLabels.length > 0
      ? `Applied labels to #${pullRequest.number}: ${desiredLabels.join(", ")}`
      : `No managed labels matched PR #${pullRequest.number}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

