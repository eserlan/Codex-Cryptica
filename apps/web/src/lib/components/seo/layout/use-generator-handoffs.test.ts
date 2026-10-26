/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const handoff = vi.hoisted(() => vi.fn());
const monsterLabs = vi.hoisted(() => ({
  start: vi.fn(),
  state: "idle",
}));

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/paths", () => ({ resolve: (p: string) => p }));
vi.mock("$app/environment", () => ({ dev: false, browser: true }));
vi.mock("$lib/utils/dev-service-worker", () => ({
  unregisterDevelopmentServiceWorkers: vi.fn(),
}));
vi.mock("$lib/components/seo/generator-canvas-handoff", () => ({
  handoffGeneratorToCanvas: handoff,
}));
vi.mock("$lib/services/seo/monsterlabs-handoff-flow.svelte", () => ({
  createMonsterLabsHandoffFlow: () => monsterLabs,
}));
vi.mock("$lib/services/analytics/zaraz-analytics", () => ({
  trackPublicGeneratorAction: vi.fn(),
}));

import { useGeneratorHandoffs } from "./use-generator-handoffs.svelte";

function setup() {
  const setError = vi.fn();
  const handoffs = useGeneratorHandoffs({
    getGeneratorType: () => "dungeon",
    getDocumentLayout: () => ({ content: "Body", lore: " " }) as never,
    setError,
  });
  return { handoffs, setError };
}

const output = { title: "Crypt", type: "dungeon" } as never;

describe("useGeneratorHandoffs", () => {
  beforeEach(() => {
    handoff.mockReset();
    monsterLabs.start.mockClear();
  });

  it("opens a delve on the canvas without raising an error", async () => {
    handoff.mockResolvedValue(undefined);
    const { handoffs, setError } = setup();

    await handoffs.handleBuildDelveCanvas(output);

    expect(handoff).toHaveBeenCalledOnce();
    expect(setError).not.toHaveBeenCalled();
  });

  it("explains a failed delve handoff", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    handoff.mockRejectedValue(new Error("nope"));
    const { handoffs, setError } = setup();

    await handoffs.handleBuildDelveCanvas(output);

    expect(setError).toHaveBeenCalledWith(
      expect.stringContaining("could not be opened"),
    );
  });

  it("explains a failed adventure handoff", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    handoff.mockRejectedValue(new Error("nope"));
    const { handoffs, setError } = setup();

    await handoffs.handleBuildAdventureCanvas(output);

    expect(setError).toHaveBeenCalledWith(
      "Failed to open Adventure Canvas for this scenario.",
    );
  });

  it("sends only non-blank sections to MonsterLabs", () => {
    const { handoffs } = setup();

    handoffs.handleSendToMonsterLabs(output);

    expect(monsterLabs.start).toHaveBeenCalledWith({
      name: "Crypt",
      type: "dungeon",
      description: "Body",
    });
  });
});
