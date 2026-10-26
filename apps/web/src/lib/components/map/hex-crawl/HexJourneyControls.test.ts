/** @vitest-environment jsdom */
/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HexJourneyControls from "./HexJourneyControls.svelte";
import { HexJourneyStore } from "$lib/stores/hex-crawl/hex-journey.svelte";

const APP_CSS = readFileSync(resolve(process.cwd(), "src/app.css"), "utf8");

function cssRuleContaining(selector: string): string {
  const selectorStart = APP_CSS.indexOf(selector);
  expect(selectorStart, `CSS selector not found: ${selector}`).toBeGreaterThan(
    -1,
  );
  const openBrace = APP_CSS.indexOf("{", selectorStart);
  let depth = 0;
  for (let index = openBrace; index < APP_CSS.length; index += 1) {
    if (APP_CSS[index] === "{") depth += 1;
    else if (APP_CSS[index] === "}") {
      depth -= 1;
      if (depth === 0) return APP_CSS.slice(selectorStart, index + 1);
    }
  }
  throw new Error(`Unclosed CSS rule for selector: ${selector}`);
}

describe("HexJourneyControls", () => {
  it("offers a labelled estimate field and dismisses a preview", async () => {
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 5,
        gridUnit: "miles",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [],
      onStart: vi.fn(),
      onStep: vi.fn(),
    });
    store.setOrigin({ q: 0, r: 0 });
    store.preview({ q: 2, r: 0 });
    render(HexJourneyControls, { store });
    expect(screen.getByLabelText("Hours per hex")).toBeTruthy();
    await fireEvent.input(screen.getByLabelText("Hours per hex"), {
      target: { value: "0" },
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "greater than zero",
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Dismiss journey preview" }),
    );
    expect(store.route).toBeNull();
  });

  it("allows an explicit token choice before preview and disables a zero-step start", async () => {
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [
        { id: "a", label: "First party", hex: { q: 0, r: 0 } },
        { id: "b", label: "Second party", hex: { q: 1, r: 0 } },
      ],
      onStart: vi.fn(),
      onStep: vi.fn(),
    });
    render(HexJourneyControls, { store });
    await fireEvent.change(screen.getByLabelText("Party token"), {
      target: { value: "b" },
    });
    expect(store.selectedTokenId).toBe("b");
    store.preview({ q: 1, r: 0 });
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Start journey",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true),
    );
  });

  it("maps the primary action foreground for both Horror variants", () => {
    const horrorDarkRule = cssRuleContaining(
      '[data-theme="horror"][data-app-appearance="neutral-dark"]',
    );
    const horrorLightRule = cssRuleContaining('[data-theme="horror_light"]');

    expect(horrorDarkRule).toContain("--color-theme-on-primary: #fff");
    expect(APP_CSS).toContain(
      "--color-theme-on-primary: var(--color-bg-primary)",
    );
    expect(horrorLightRule).not.toContain("--color-theme-on-primary:");
  });

  it("maps the primary action foreground for Space Western Light", () => {
    const spaceWesternLightRule = cssRuleContaining(
      '[data-theme="space-western_light"]',
    );

    expect(spaceWesternLightRule).toContain("--color-theme-on-primary: #fff");
  });

  it("uses the primary action foreground token for journey actions", async () => {
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: () => true,
      onStep: vi.fn(),
    });
    store.setOrigin({ q: 0, r: 0 });
    store.preview({ q: 1, r: 0 });
    render(HexJourneyControls, { store });
    expect(
      screen.getByRole("button", { name: "Start journey" }).className,
    ).toContain("text-theme-on-primary");
    await fireEvent.click(
      screen.getByRole("button", { name: "Start journey" }),
    );
    expect(
      screen.getByRole("button", { name: "Next hex" }).className,
    ).toContain("text-theme-on-primary");
  });

  it("clears the route-specific hours input when a new route is previewed", async () => {
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [],
      onStart: vi.fn(),
      onStep: vi.fn(),
    });
    store.setOrigin({ q: 0, r: 0 });
    store.preview({ q: 2, r: 0 });
    render(HexJourneyControls, { store });
    await fireEvent.input(screen.getByLabelText("Hours per hex"), {
      target: { value: "2.5" },
    });
    expect(store.hoursPerHex).toBe(2.5);
    store.preview({ q: 3, r: 0 });
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Hours per hex") as HTMLInputElement).value,
      ).toBe(""),
    );
    expect(store.hoursPerHex).toBeNull();
  });
  it("does not offer controls to an unauthorised viewer", () => {
    const store = new HexJourneyStore({
      getIdentity: () => null,
      isAllowed: () => false,
      listEligibleTokens: () => [],
      onStart: vi.fn(),
      onStep: vi.fn(),
    });
    render(HexJourneyControls, { store, visible: false });
    expect(screen.queryByRole("region", { name: "Hex journey" })).toBeNull();
  });

  it("does not render an empty journey surface for a single token", () => {
    const store = new HexJourneyStore({
      getIdentity: () => null,
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: vi.fn(),
      onStep: vi.fn(),
    });
    render(HexJourneyControls, { store });
    expect(screen.queryByRole("region", { name: "Hex journey" })).toBeNull();
  });

  it("lets the GM stop a partial route and dismiss an arrived route", async () => {
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: () => true,
      onStep: () => true,
    });
    store.preview({ q: 2, r: 0 });
    await store.start();
    const view = render(HexJourneyControls, { store });
    await fireEvent.click(screen.getByRole("button", { name: "Stop journey" }));
    expect(store.route).toBeNull();
    view.unmount();
    store.preview({ q: 1, r: 0 });
    await store.start();
    await store.step();
    render(HexJourneyControls, { store });
    expect(screen.getByText("Arrived")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Dismiss journey" }),
    );
    expect(store.route).toBeNull();
  });

  it("exposes retry only when an arrival save is pending", async () => {
    const store = new HexJourneyStore({
      getIdentity: () => ({
        mapId: "m",
        vaultId: "v",
        gridDistance: 1,
        gridUnit: "m",
        gridSignature: "g",
      }),
      isAllowed: () => true,
      listEligibleTokens: () => [{ id: "party", hex: { q: 0, r: 0 } }],
      onStart: () => true,
      onStep: async () => ({
        moved: true,
        arrivalSaved: false,
        error: "save failed",
      }),
      onRetryArrival: async () => true,
    });
    store.preview({ q: 1, r: 0 });
    await store.start();
    await store.step();
    render(HexJourneyControls, { store });
    expect(
      screen.getByRole("button", { name: "Retry arrival save" }).className,
    ).toContain("text-theme-on-primary");
    await fireEvent.click(
      screen.getByRole("button", { name: "Retry arrival save" }),
    );
    expect(store.pendingArrival).toBeNull();
    expect(store.phase).toBe("arrived");
  });
});
