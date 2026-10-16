/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { Milestone } from "onboarding-journey-engine";
import {
  JourneyStore,
  type JourneyStoreDeps,
} from "$lib/app/onboarding/journey/journey-store.svelte";
import JourneyCard from "./JourneyCard.svelte";

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

function setup(
  over: Partial<JourneyStoreDeps> = {},
  goal: "world" | "story" | "campaign" = "world",
) {
  let now = 1000;
  const deps: JourneyStoreDeps = {
    storage: memory(),
    sessionStorage: memory(),
    clock: { now: () => now },
    area: () => "other",
    runGuide: vi.fn(async () => true),
    categoryIds: () => ["character", "location", "note"],
    askCifAvailable: () => true,
    askCif: vi.fn(),
    tour: { activeTour: null, skipTour: vi.fn() },
    ...over,
  };
  const store = new JourneyStore(deps);
  store.load("v1");
  store.start(goal);
  const apply = (m: DistributiveOmit<Milestone, "at">) => {
    now += 10;
    store.apply({ ...m, at: now } as Milestone);
    flushSync();
  };
  return { store, deps, apply };
}

type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

const created = (category: string) =>
  ({ kind: "entry-created", category }) as const;

describe("JourneyCard", () => {
  it("shows the journey, its position and the instruction", () => {
    const { store } = setup();
    const { container } = render(JourneyCard, { store });
    expect(screen.getByRole("heading", { name: "Build a world" })).toBeTruthy();
    expect(screen.getByText(/Step 1 of 4/)).toBeTruthy();
    const badge = screen.getByText("Cif · Guide");
    expect(badge?.className).toContain("text-theme-text");
    expect(badge?.className).toContain("bg-theme-primary/15");
    expect(badge?.querySelector(".icon-\\[lucide--sparkles\\]")).toBeTruthy();
    const dots = container.querySelector(
      '[aria-hidden="true"].flex.items-center',
    );
    expect(dots?.children).toHaveLength(4);
    expect(dots?.firstElementChild?.className).toContain("bg-theme-primary");
    expect(
      screen
        .getByTestId("journey-collapse")
        .querySelector(".icon-\\[lucide--minus\\]"),
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("journey-show-me")
        .querySelector(".icon-\\[lucide--sparkles\\]"),
    ).toBeTruthy();
    expect(screen.getByTestId("journey-step-instruction").textContent).toMatch(
      /Add a place/,
    );
    expect(
      (screen.getByTestId("journey-back") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByTestId("journey-exit").textContent).toMatch(
      /Stop guided setup/,
    );
  });

  it("Show me runs the guide; on failure the written instructions show", async () => {
    const { store, deps } = setup({ runGuide: vi.fn(async () => false) });
    render(JourneyCard, { store });
    await fireEvent.click(screen.getByTestId("journey-show-me"));
    await vi.waitFor(() =>
      expect(
        screen.getByTestId("journey-step-instruction").textContent,
      ).toMatch(/Create button/),
    );
    expect(deps.runGuide).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("journey-show-me")).toBeNull();
  });

  it("offers Ask Cif only for steps with a quick prompt and AI on", async () => {
    const { store, apply, deps } = setup();
    render(JourneyCard, { store });
    expect(screen.queryByTestId("journey-ask-cif")).toBeNull();
    apply(created("location"));
    apply(created("character"));
    expect(
      screen
        .getByTestId("journey-ask-cif")
        .querySelector(".icon-\\[lucide--message-square\\]"),
    ).toBeTruthy();
    await fireEvent.click(screen.getByTestId("journey-ask-cif"));
    expect(deps.askCif).toHaveBeenCalledWith("Where do I add a connection?");

    const off = setup({ askCifAvailable: () => false });
    off.apply(created("location"));
    off.apply(created("character"));
    const { container } = render(JourneyCard, { store: off.store });
    expect(
      container.querySelector('[data-testid="journey-ask-cif"]'),
    ).toBeNull();
  });

  it("Back shows an earlier step, Back to current returns, and Skip hides on a done step", async () => {
    const { store, apply } = setup();
    render(JourneyCard, { store });
    apply(created("location"));
    await fireEvent.click(screen.getByTestId("journey-back"));
    expect(screen.getByText(/Step 1 of 4/)).toBeTruthy();
    expect(screen.queryByTestId("journey-skip")).toBeNull();
    await fireEvent.click(screen.getByTestId("journey-return-current"));
    expect(screen.getByText(/Step 2 of 4/)).toBeTruthy();
    await fireEvent.click(screen.getByTestId("journey-skip"));
    expect(screen.getByText(/Step 3 of 4/)).toBeTruthy();
  });

  it("Exit stops guidance", async () => {
    const { store } = setup();
    const { container } = render(JourneyCard, { store });
    await fireEvent.click(screen.getByTestId("journey-exit"));
    expect(store.active).toBe(false);
    expect(store.progress?.outcome).toBe("exited");
    expect(container.querySelector('[data-testid="journey-card"]')).toBeNull();
  });

  it("finishes with one suggestion and Done", async () => {
    const { store, apply } = setup({}, "campaign");
    render(JourneyCard, { store });
    apply(created("character"));
    apply({ kind: "generator-saved" });
    apply(created("location"));
    expect(screen.getByTestId("journey-finish")).toBeTruthy();
    expect(screen.getAllByTestId("journey-next")).toHaveLength(1);
    await fireEvent.click(screen.getByTestId("journey-done"));
    expect(store.active).toBe(false);
  });

  it("Escape inside the card collapses it to a pill and never exits", async () => {
    const { store } = setup();
    render(JourneyCard, { store });
    screen.getByTestId("journey-skip").focus();
    await fireEvent.keyDown(screen.getByTestId("journey-skip"), {
      key: "Escape",
    });
    expect(store.active).toBe(true);
    const pill = screen.getByTestId("journey-collapse");
    expect(pill.textContent).toMatch(/Guided setup · 1\/4/);
    await vi.waitFor(() => expect(document.activeElement).toBe(pill));
    await fireEvent.click(pill);
    expect(screen.getByTestId("journey-step-instruction")).toBeTruthy();
  });

  it("ignores Escape pressed elsewhere", async () => {
    const { store } = setup();
    render(JourneyCard, { store });
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(store.collapsed).toBe(false);
  });

  it("announces completions politely without moving focus", () => {
    const { store, apply } = setup();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const { container } = render(JourneyCard, { store });
    apply(created("location"));
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toMatch(/Step done/);
    expect(document.activeElement).toBe(input);
    input.remove();
  });

  it("moves to the top when a highlight sits in the lower half", () => {
    const { store } = setup();
    render(JourneyCard, {
      store,
      highlightRect: () => ({ top: 700, left: 300, width: 56, height: 56 }),
      viewportHeight: () => 800,
    });
    expect(screen.getByTestId("journey-card").dataset.placement).toBe("top");
  });

  it("stays at the bottom with no highlight or one near the top", () => {
    const { store } = setup();
    render(JourneyCard, {
      store,
      highlightRect: () => ({ top: 20, left: 300, width: 80, height: 32 }),
      viewportHeight: () => 800,
    });
    expect(screen.getByTestId("journey-card").dataset.placement).toBe("bottom");
  });

  it("keeps the journey card inset on mobile and anchored to the desktop right edge", () => {
    const { store } = setup();
    render(JourneyCard, { store });
    const card = screen.getByTestId("journey-card");
    expect(card.className).toContain("inset-x-2");
    expect(card.className).toContain("sm:inset-x-auto");
    expect(card.className).toContain("sm:right-6");
    expect(card.className).toContain("sm:w-[22rem]");
    expect(card.className).toContain(
      "bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
    );
    expect(card.className).toContain("md:bottom-14");
  });

  it("uses 44px targets and no backdrop", () => {
    const { store } = setup();
    const { container } = render(JourneyCard, { store });
    for (const b of container.querySelectorAll("button")) {
      expect(b.className).toContain("min-h-11");
    }
    expect(
      container.querySelector(".bg-black\\/40, [class*='backdrop-blur-[1px]']"),
    ).toBeNull();
  });
});
