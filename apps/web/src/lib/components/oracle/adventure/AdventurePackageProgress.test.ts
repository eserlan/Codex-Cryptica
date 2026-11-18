import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
import { referencePackage } from "../../../stores/oracle/tests/adventure-fixtures";
import {
  buildLedger,
  packageManager,
} from "../../../stores/oracle/tests/package-progress-ledger";
import AdventurePackageProgress from "./AdventurePackageProgress.svelte";

const pkg = referencePackage;
const sceneTitle = (id: string) =>
  pkg.scenes.find((s: { id: string }) => s.id === id)!.title;
const clueText = pkg.clues[0]!.text;
const LANDING = "ros-scene-1-landing";
const YARD = "ros-scene-2-yard";
const SHRINE = "ros-branch-shrine";
const WHEEL = "ros-scene-3-wheel-room";

describe("AdventurePackageProgress", () => {
  it("is absent without a source package", async () => {
    render(AdventurePackageProgress, {
      manager: packageManager(null, { sceneId: LANDING }, false),
    });
    await Promise.resolve();
    expect(screen.queryByTestId("adventure-package-progress")).toBeNull();
  });

  it("shows a calm empty state with no events", async () => {
    render(AdventurePackageProgress, {
      manager: packageManager(pkg, { sceneId: LANDING }),
    });
    expect(await screen.findByText("Nothing discovered yet.")).toBeTruthy();
  });

  it("shows confirmed records and hides claimed, superseded and unvisited ones", async () => {
    const progress = buildLedger(
      pkg,
      [
        [
          { recordId: LANDING, to: "active" },
          { recordId: YARD, to: "active" },
          { recordId: YARD, to: "skipped", supersedes: "t1:pkg:2" },
          { recordId: CLUEID(), to: "resolved" },
          { recordId: "secret-filed-pin", to: "resolved" },
          { recordId: WHEEL, to: "active", certainty: "claimed" },
          { recordId: SHRINE, to: "available" },
        ],
      ],
      LANDING,
    );
    render(AdventurePackageProgress, {
      manager: packageManager(pkg, progress),
    });
    const root = await screen.findByTestId("adventure-package-progress");
    const text = root.textContent ?? "";
    expect(text).toContain(sceneTitle(LANDING));
    expect(text).toContain("Current scene");
    expect(text).toContain(clueText);
    expect(text).not.toContain(sceneTitle(YARD));
    expect(text).not.toContain(sceneTitle(WHEEL));
    expect(text).not.toContain(sceneTitle(SHRINE));
    expect(text).not.toContain(pkg.secrets[0]!.text);
    expect(text).not.toContain("note ");
    expect(screen.queryByText("Nothing discovered yet.")).toBeNull();
  });

  it("has no progress bar, count or percentage", async () => {
    const progress = buildLedger(
      pkg,
      [
        [
          { recordId: LANDING, to: "active" },
          { recordId: CLUEID(), to: "resolved" },
        ],
      ],
      LANDING,
    );
    const { container } = render(AdventurePackageProgress, {
      manager: packageManager(pkg, progress),
    });
    await screen.findByText("Current scene");
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(container.querySelector("progress")).toBeNull();
    await waitFor(() =>
      expect(container.textContent).not.toMatch(/\d+\s*(of|\/)\s*\d+|%/),
    );
  });

  it("ignores stale package loads when the session or hash changes", async () => {
    let resolveFirst!: (value: typeof pkg | null) => void;
    const first = packageManager(pkg, { sceneId: LANDING });
    first.loadSourcePackage = () =>
      new Promise((resolve) => {
        resolveFirst = resolve;
      });
    const { rerender } = render(AdventurePackageProgress, { manager: first });

    const second = packageManager(null, { sceneId: LANDING }, false);
    await rerender({ manager: second });
    resolveFirst(pkg);
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByTestId("adventure-package-progress")).toBeNull();
  });
});

function CLUEID() {
  return pkg.clues[0]!.id;
}
