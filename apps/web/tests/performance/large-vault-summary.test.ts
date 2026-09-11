import { describe, expect, it } from "vitest";
import { formatLargeVaultSummary } from "./large-vault-summary";

describe("formatLargeVaultSummary", () => {
  it("renders aggregate-only, report-only evidence", () => {
    expect(
      formatLargeVaultSummary({
        fixture: { version: "large-vault.v1", checksum: "abc" },
        environment: {
          commitSha: "def",
          browserVersion: "Chromium",
          runnerImage: "ubuntu",
          attempt: 1,
        },
        results: {
          summaries: [
            {
              operation: "graph_select",
              count: 10,
              medianMs: 4,
              p90Ms: 8,
              maxMs: 9,
            },
          ],
          outcomes: { completed: 10, failed: 0 },
        },
      }),
    ).toContain("| graph_select | 10 | 4 ms | 8 ms | 9 ms |");
  });

  it("rejects artifacts with no measurements", () => {
    expect(() => formatLargeVaultSummary({ results: {} })).toThrow(
      "no summaries",
    );
  });
});
