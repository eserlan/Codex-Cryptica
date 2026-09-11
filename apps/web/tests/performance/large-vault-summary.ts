import fs from "node:fs";

type ResultSummary = {
  operation: string;
  count: number;
  medianMs: number;
  p90Ms: number;
  maxMs: number;
};

type LargeVaultArtifact = {
  fixture?: { version?: string; checksum?: string };
  environment?: {
    browserVersion?: string;
    commitSha?: string;
    runnerImage?: string;
    attempt?: number;
  };
  results?: { summaries?: ResultSummary[]; outcomes?: Record<string, number> };
};

export function formatLargeVaultSummary(artifact: LargeVaultArtifact): string {
  const summaries = artifact.results?.summaries;
  if (!summaries?.length)
    throw new Error("Performance artifact has no summaries");
  const lines = [
    "## Large-vault performance baseline (report-only)",
    "",
    `Fixture: \`${artifact.fixture?.version ?? "unknown"}\` · checksum \`${artifact.fixture?.checksum ?? "unknown"}\``,
    `Commit: \`${artifact.environment?.commitSha ?? "unknown"}\` · Browser: ${artifact.environment?.browserVersion ?? "unknown"} · Runner: ${artifact.environment?.runnerImage ?? "unknown"} · Attempt: ${artifact.environment?.attempt ?? "unknown"}`,
    "",
    "| Operation | Samples | Median | p90 | Max |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...summaries.map(
      (summary) =>
        `| ${summary.operation} | ${summary.count} | ${summary.medianMs} ms | ${summary.p90Ms} ms | ${summary.maxMs} ms |`,
    ),
    "",
    `Outcomes: ${Object.entries(artifact.results?.outcomes ?? {})
      .map(([outcome, count]) => `${outcome}=${count}`)
      .join(", ")}`,
    "",
    "This is report-only baseline evidence. It does not enforce a performance budget.",
  ];
  return `${lines.join("\n")}\n`;
}

if (import.meta.main) {
  const [inputPath] = process.argv.slice(2);
  if (!inputPath)
    throw new Error("Usage: bun large-vault-summary.ts <result.json>");
  const artifact = JSON.parse(
    fs.readFileSync(inputPath, "utf8"),
  ) as LargeVaultArtifact;
  const summary = formatLargeVaultSummary(artifact);
  const outputPath = process.env.GITHUB_STEP_SUMMARY;
  if (outputPath) fs.appendFileSync(outputPath, summary);
  else process.stdout.write(summary);
}
