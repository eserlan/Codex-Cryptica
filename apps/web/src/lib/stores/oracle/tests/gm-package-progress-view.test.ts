import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { projectPlayerPackageProgress } from "@codex/adventure-engine";
import AdventurePackageProgress from "#lib/components/oracle/adventure/AdventurePackageProgress.svelte";
import { canaryReferencePackage } from "./gm-canary-fixture";
import { assertNoGmLeak, collectGmOnlyStrings } from "./gm-leak-harness";
import { buildLedger, packageManager } from "./package-progress-ledger";

const NOTE_TOKEN = "GMCANARY-NOTE-0f1e";
const guarded = collectGmOnlyStrings(canaryReferencePackage);
const progress = buildLedger(
  canaryReferencePackage,
  [
    [
      { recordId: "canary-scene", to: "active", note: NOTE_TOKEN },
      { recordId: "canary-clue", to: "resolved", note: NOTE_TOKEN },
      { recordId: "canary-reveal-clue", to: "resolved", note: NOTE_TOKEN },
      { recordId: "canary-encounter", to: "resolved", note: NOTE_TOKEN },
      { recordId: "canary-secret", to: "resolved", note: NOTE_TOKEN },
    ],
    [
      {
        recordId: "ros-scene-2-yard",
        to: "active",
        certainty: "claimed",
        note: NOTE_TOKEN,
      },
    ],
  ],
  "canary-scene",
);

describe("package progress view GM secrecy", () => {
  it("keeps GM-only text out of the player projection", () => {
    const view = projectPlayerPackageProgress(canaryReferencePackage, progress);
    const output = JSON.stringify(view);
    assertNoGmLeak(guarded, output, "player projection");
    expect(output).toContain("A scratch marks the lintel.");
    expect(output).not.toContain(NOTE_TOKEN);
  });

  it("keeps GM-only text out of the rendered player view", async () => {
    render(AdventurePackageProgress, {
      manager: packageManager(canaryReferencePackage, progress),
    });
    const root = await screen.findByTestId("adventure-package-progress");
    const output = root.textContent ?? "";
    assertNoGmLeak(guarded, output, "rendered player view");
    expect(output).toContain("A scratch marks the lintel.");
    expect(output).not.toContain(NOTE_TOKEN);
  });
});
