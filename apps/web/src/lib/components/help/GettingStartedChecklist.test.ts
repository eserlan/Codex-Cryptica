/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const mockCompleted = vi.fn<() => string[]>();

vi.mock("$lib/app/onboarding/onboarding-funnel", () => ({
  onboardingFunnel: {
    completed: () => mockCompleted(),
  },
}));

const journey = vi.hoisted(() => ({
  store: {
    definition: null as null | { goal: string; title: string },
    canContinue: false,
    start: vi.fn(),
    resume: vi.fn(),
    startOver: vi.fn(),
  },
  closeSettings: vi.fn(),
}));

vi.mock("$lib/app/onboarding/journey/journey-runtime", () => ({
  journeyStore: journey.store,
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { closeSettings: journey.closeSettings },
}));

import { fireEvent } from "@testing-library/svelte";
import GettingStartedChecklist from "./GettingStartedChecklist.svelte";

describe("GettingStartedChecklist", () => {
  it("shows all 4 items unchecked for a brand-new user", () => {
    mockCompleted.mockReturnValue([]);
    render(GettingStartedChecklist);

    expect(screen.getByText("Start a campaign")).toBeTruthy();
    expect(screen.getByText("Create your first character")).toBeTruthy();
    expect(screen.getByText("Connect two entities")).toBeTruthy();
    expect(screen.getByText("Open the Graph")).toBeTruthy();
    expect(screen.queryByText(/done the core loop/i)).toBeNull();
  });

  it("checks off 'Start a campaign' when either demo_started or vault_created fired", () => {
    mockCompleted.mockReturnValue(["vault_created"]);
    render(GettingStartedChecklist);

    const item = screen.getByText("Start a campaign");
    expect(item.className).toContain("line-through");
  });

  it("checks off 'Start a campaign' from demo_started alone (no vault_created)", () => {
    mockCompleted.mockReturnValue(["demo_started"]);
    render(GettingStartedChecklist);

    const item = screen.getByText("Start a campaign");
    expect(item.className).toContain("line-through");
  });

  it("shows the completion message once all 4 milestones fired", () => {
    mockCompleted.mockReturnValue([
      "vault_created",
      "first_entity",
      "first_link",
      "graph_opened",
    ]);
    render(GettingStartedChecklist);

    expect(screen.getByText(/done the core loop/i)).toBeTruthy();
    expect(screen.queryByText("Start a campaign")).toBeNull();
  });

  it("does not render a duplicate replay-tour button (HelpHeader already has one)", () => {
    mockCompleted.mockReturnValue([]);
    render(GettingStartedChecklist);

    expect(screen.queryByText(/replay tour/i)).toBeNull();
  });

  describe("Guided setup (spec 175)", () => {
    const reset = () => {
      mockCompleted.mockReturnValue([]);
      journey.store.definition = null;
      journey.store.canContinue = false;
      vi.clearAllMocks();
    };

    it("offers the three journeys and starts one, closing Help", async () => {
      reset();
      render(GettingStartedChecklist);
      expect(screen.getByTestId("guided-setup")).toBeTruthy();
      await fireEvent.click(screen.getByTestId("guided-setup-story"));
      expect(journey.store.start).toHaveBeenCalledWith("story");
      expect(journey.closeSettings).toHaveBeenCalled();
      expect(screen.getByTestId("guided-setup-world")).toBeTruthy();
      expect(screen.getByTestId("guided-setup-campaign")).toBeTruthy();
    });

    it("offers Continue only for an exited, unfinished journey", async () => {
      reset();
      const first = render(GettingStartedChecklist);
      expect(screen.queryByTestId("guided-setup-continue")).toBeNull();
      first.unmount();

      journey.store.definition = { goal: "story", title: "Write a story" };
      journey.store.canContinue = true;
      render(GettingStartedChecklist);
      await fireEvent.click(screen.getByTestId("guided-setup-continue"));
      expect(journey.store.resume).toHaveBeenCalled();
      expect(journey.closeSettings).toHaveBeenCalled();
    });

    it("Start over restarts the vault's journey", async () => {
      reset();
      journey.store.definition = { goal: "world", title: "Build a world" };
      render(GettingStartedChecklist);
      await fireEvent.click(screen.getByTestId("guided-setup-start-over"));
      expect(journey.store.startOver).toHaveBeenCalledWith();
    });

    it("is hidden in the standalone Help window", () => {
      reset();
      render(GettingStartedChecklist, { isStandalone: true });
      expect(screen.queryByTestId("guided-setup")).toBeNull();
      expect(screen.getByText("Start a campaign")).toBeTruthy();
    });
  });
});
