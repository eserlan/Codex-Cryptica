import fs from "node:fs";
import {
  assertValidPerformanceBudgetManifest,
  type PerformanceBudgetCheckV1,
  type PerformanceBudgetManifestV1,
  type PerformanceOperation,
  type PerformanceResultV1,
} from "@codex/performance-observability";
import {
  LARGE_VAULT_SCENARIOS,
  type LargeVaultScenario,
} from "./large-vault-results";

const REQUIRED_OPERATIONS: Record<
  LargeVaultScenario,
  readonly PerformanceOperation[]
> = {
  "cold-open-index": ["vault_open_cold", "search_index_persist"],
  "warm-open": ["vault_open_warm"],
  "rendered-node-selection": ["graph_select"],
  "focus-depth-change": ["graph_focus_depth_change"],
  "explorer-workflow": ["explorer_open", "explorer_filter"],
  "table-workflow": ["table_open", "table_sort", "table_filter"],
  "entity-save": ["entity_save"],
};

type LargeVaultArtifact = {
  schemaVersion: number;
  fixture: { version: string; checksum: string };
  environment: Record<string, unknown>;
  results: PerformanceResultV1;
  scenarios: Record<string, PerformanceResultV1>;
};

export class LargeVaultBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LargeVaultBudgetError";
  }
}

function assertArtifact(value: unknown): asserts value is LargeVaultArtifact {
  if (!value || typeof value !== "object") {
    throw new LargeVaultBudgetError("result artifact must be an object");
  }
  const artifact = value as Partial<LargeVaultArtifact>;
  if (artifact.schemaVersion !== 1) {
    throw new LargeVaultBudgetError("result schema version is unsupported");
  }
  if (!artifact.fixture?.version || !artifact.fixture.checksum) {
    throw new LargeVaultBudgetError("result fixture provenance is missing");
  }
  if (!artifact.environment || !artifact.results || !artifact.scenarios) {
    throw new LargeVaultBudgetError("result artifact is incomplete");
  }
}

function assertScenarioManifest(manifest: PerformanceBudgetManifestV1): void {
  const expectedScenarios = new Set<string>(LARGE_VAULT_SCENARIOS);
  const covered = new Map<LargeVaultScenario, Set<PerformanceOperation>>();
  for (const entry of manifest.entries) {
    if (!expectedScenarios.has(entry.scenario)) {
      throw new LargeVaultBudgetError(
        `budget scenario is unknown: ${entry.scenario}`,
      );
    }
    const scenario = entry.scenario as LargeVaultScenario;
    if (!REQUIRED_OPERATIONS[scenario].includes(entry.operation)) {
      throw new LargeVaultBudgetError(
        `operation ${entry.operation} is not valid for scenario ${scenario}`,
      );
    }
    const operations = covered.get(scenario) ?? new Set<PerformanceOperation>();
    operations.add(entry.operation);
    covered.set(scenario, operations);
  }
  for (const scenario of LARGE_VAULT_SCENARIOS) {
    const missing = REQUIRED_OPERATIONS[scenario].filter(
      (operation) => !covered.get(scenario)?.has(operation),
    );
    if (missing.length > 0) {
      throw new LargeVaultBudgetError(
        `manifest is missing ${scenario} operations: ${missing.join(", ")}`,
      );
    }
  }
}

function assertArtifactMatchesManifest(
  manifest: PerformanceBudgetManifestV1,
  artifact: LargeVaultArtifact,
): void {
  if (artifact.fixture.version !== manifest.fixtureVersion) {
    throw new LargeVaultBudgetError(
      "result fixture version does not match manifest",
    );
  }
  if (artifact.fixture.checksum !== manifest.fixtureChecksum) {
    throw new LargeVaultBudgetError(
      "result fixture checksum does not match manifest",
    );
  }
  const actualScenarios = Object.keys(artifact.scenarios);
  const unknown = actualScenarios.filter(
    (scenario) =>
      !LARGE_VAULT_SCENARIOS.includes(scenario as LargeVaultScenario),
  );
  if (unknown.length > 0) {
    throw new LargeVaultBudgetError(
      `result has unknown scenarios: ${unknown.join(", ")}`,
    );
  }
  const missing = LARGE_VAULT_SCENARIOS.filter(
    (scenario) => !artifact.scenarios[scenario],
  );
  if (missing.length > 0) {
    throw new LargeVaultBudgetError(
      `result is missing scenarios: ${missing.join(", ")}`,
    );
  }
}

/** Validates and evaluates budget entries against their own scenario result. */
export function evaluateLargeVaultBudgets(
  manifest: PerformanceBudgetManifestV1,
  input: unknown,
): PerformanceBudgetCheckV1[] {
  assertValidPerformanceBudgetManifest(manifest);
  assertScenarioManifest(manifest);
  assertArtifact(input);
  assertArtifactMatchesManifest(manifest, input);

  return manifest.entries.map((entry) => {
    const scenario = input.scenarios[entry.scenario];
    if (scenario.schemaVersion !== manifest.schemaVersion) {
      throw new LargeVaultBudgetError(
        `scenario ${entry.scenario} schema version does not match manifest`,
      );
    }
    const summary = scenario.summaries.find(
      (candidate) => candidate.operation === entry.operation,
    );
    const observedMs = summary?.[entry.statistic];
    if (
      !summary ||
      observedMs === undefined ||
      summary.count < entry.sampleCount
    ) {
      return { entry, observedMs, status: "missing" };
    }
    if (observedMs <= entry.blockingLimitMs) {
      return { entry, observedMs, status: "pass" };
    }
    return {
      entry,
      observedMs,
      status: manifest.mode === "blocking" ? "fail" : "report",
    };
  });
}

export function formatLargeVaultBudgetSummary(
  checks: readonly PerformanceBudgetCheckV1[],
): string {
  const lines = [
    "## Large-vault performance budgets (report-only)",
    "",
    "| Scenario | Signal | Observed | Target | Ceiling | Status |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...checks.map((check) => {
      const { entry } = check;
      const observed =
        check.observedMs === undefined
          ? "missing"
          : `${check.observedMs.toFixed(1)} ms`;
      return `| ${entry.scenario} | ${entry.operation} ${entry.statistic} | ${observed} | ${entry.targetMs} ms | ${entry.blockingLimitMs} ms | ${check.status} |`;
    }),
    "",
    "Report-only ceilings do not fail on a regression. Missing evidence and malformed artifacts always fail.",
  ];
  return `${lines.join("\n")}\n`;
}

export function readLargeVaultBudgetManifest(
  path: string,
): PerformanceBudgetManifestV1 {
  return JSON.parse(
    fs.readFileSync(path, "utf8"),
  ) as PerformanceBudgetManifestV1;
}

if (import.meta.main) {
  const [resultPath, manifestPath] = process.argv.slice(2);
  if (!resultPath || !manifestPath) {
    throw new Error(
      "Usage: bun large-vault-budget.ts <result.json> <manifest.json>",
    );
  }
  const manifest = readLargeVaultBudgetManifest(manifestPath);
  const artifact = JSON.parse(fs.readFileSync(resultPath, "utf8")) as unknown;
  const checks = evaluateLargeVaultBudgets(manifest, artifact);
  const summary = formatLargeVaultBudgetSummary(checks);
  const outputPath = process.env.GITHUB_STEP_SUMMARY;
  if (outputPath) fs.appendFileSync(outputPath, summary);
  else process.stdout.write(summary);
  if (
    checks.some(
      (check) => check.status === "missing" || check.status === "fail",
    )
  ) {
    process.exitCode = 1;
  }
}
