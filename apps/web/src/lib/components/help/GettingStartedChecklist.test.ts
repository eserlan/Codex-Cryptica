/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const mockCompleted = vi.fn<() => string[]>();

vi.mock("$lib/app/onboarding/onboarding-funnel", () => ({
  onboardingFunnel: {
    completed: () => mockCompleted(),
  },
}));

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
});
