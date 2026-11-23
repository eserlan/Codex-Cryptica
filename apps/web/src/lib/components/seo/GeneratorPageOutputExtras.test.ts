/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import {
  businessGeneratorOutput,
  generateBusinessLocal,
  generateOneShotLocal,
  generatePointCrawlLocal,
} from "generator-engine";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import GeneratorPageOutputExtras from "./GeneratorPageOutputExtras.svelte";

const regenerate = vi.hoisted(() => vi.fn());
const panelLoadAttempts = vi.hoisted(() => ({ oneShot: 0 }));
vi.mock("#lib/services/seo/generator-engine.js", () => ({
  generatorEngine: { regenerateBusinessSection: regenerate },
}));
vi.mock("./OneShotRefinePanel.svelte", async (importOriginal) => {
  if (panelLoadAttempts.oneShot++ === 0)
    throw new Error("refinement chunk unavailable");
  return importOriginal();
});

describe("generator output refinement selection", () => {
  it("renders the one-shot panel only for the one-shot slug", async () => {
    panelLoadAttempts.oneShot = 0;
    const output = generateOneShotLocal({
      durationHours: 3,
    }) as GeneratorOutput;
    const props = {
      slug: "one-shot-adventure-generator",
      output,
      useAI: false,
      onReplace: vi.fn(),
    };
    const { rerender } = render(GeneratorPageOutputExtras, { props });
    expect(await screen.findByRole("alert")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await vi.dynamicImportSettled();
    expect(await screen.findByTestId("one-shot-refine-panel")).toBeTruthy();
    await rerender({ ...props, slug: "npc" });
    expect(screen.queryByTestId("one-shot-refine-panel")).toBeNull();
  });

  it("preserves the current output before reload recovery after both chunk URLs fail", async () => {
    panelLoadAttempts.oneShot = 0;
    const output = generateOneShotLocal({
      durationHours: 3,
    }) as GeneratorOutput;
    const saveOutput = vi.fn().mockReturnValue(true);
    const reloadPage = vi.fn();
    const loadOneShotOverride = vi.fn().mockRejectedValue(new Error("failed"));
    render(GeneratorPageOutputExtras, {
      props: {
        slug: "one-shot-adventure-generator",
        output,
        useAI: false,
        onReplace: vi.fn(),
        saveOutput,
        reloadPage,
        loadOneShotOverride,
      },
    });
    await screen.findByRole("alert");
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("button", { name: "Reload to recover" });
    await fireEvent.click(
      screen.getByRole("button", { name: "Reload to recover" }),
    );
    expect(saveOutput).toHaveBeenCalledWith(
      "one-shot-adventure-generator",
      output,
    );
    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it("clears copy status when a different output replaces the failed one", async () => {
    panelLoadAttempts.oneShot = 0;
    const first = generateOneShotLocal({ durationHours: 3 }) as GeneratorOutput;
    const second = generateOneShotLocal({
      durationHours: 4,
    }) as GeneratorOutput;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const saveOutput = vi.fn().mockReturnValue(false);
    const reloadPage = vi.fn();
    const loadOneShotOverride = vi.fn().mockRejectedValue(new Error("failed"));
    const props = {
      slug: "one-shot-adventure-generator",
      output: first,
      useAI: false,
      onReplace: vi.fn(),
      saveOutput,
      reloadPage,
      loadOneShotOverride,
    };
    const { rerender } = render(GeneratorPageOutputExtras, { props });
    await screen.findByRole("alert");
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("button", { name: "Reload to recover" });
    await fireEvent.click(
      screen.getByRole("button", { name: "Reload to recover" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: /Copy result/ }));
    expect(await screen.findByText(/Result copied/)).toBeTruthy();
    const saveCallsAfterCopy = saveOutput.mock.calls.length;
    await fireEvent.click(screen.getByRole("button", { name: "Reload page" }));
    expect(reloadPage).toHaveBeenCalledOnce();
    expect(saveOutput).toHaveBeenCalledTimes(saveCallsAfterCopy);
    await rerender({ ...props, output: second });
    expect(screen.queryByText(/Result copied/)).toBeNull();
  });

  it("does not mark a replaced output as copied after a pending clipboard write", async () => {
    panelLoadAttempts.oneShot = 0;
    const first = generateOneShotLocal({ durationHours: 3 }) as GeneratorOutput;
    const second = generateOneShotLocal({
      durationHours: 4,
    }) as GeneratorOutput;
    let finishWrite!: () => void;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(
          () => new Promise<void>((resolve) => (finishWrite = resolve)),
        ),
      },
    });
    const loadOneShotOverride = vi.fn().mockRejectedValue(new Error("failed"));
    const props = {
      slug: "one-shot-adventure-generator",
      output: first,
      useAI: false,
      onReplace: vi.fn(),
      saveOutput: vi.fn().mockReturnValue(false),
      reloadPage: vi.fn(),
      loadOneShotOverride,
    };
    const { rerender } = render(GeneratorPageOutputExtras, { props });
    await screen.findByRole("alert");
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("button", { name: "Reload to recover" });
    await fireEvent.click(
      screen.getByRole("button", { name: "Reload to recover" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: /Copy result/ }));
    await rerender({ ...props, output: second });
    finishWrite();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(/Result copied/)).toBeNull();
  });

  it("renders point-crawl refinements for a crawl result", async () => {
    const output = generatePointCrawlLocal({}) as GeneratorOutput;
    render(GeneratorPageOutputExtras, {
      props: { slug: "point-crawl", output, useAI: false, onReplace: vi.fn() },
    });
    await vi.dynamicImportSettled();
    expect(await screen.findByTestId("point-crawl-refine-panel")).toBeTruthy();
    expect(screen.queryByTestId("one-shot-refine-panel")).toBeNull();
  });

  it("wraps a refined business document and forwards the AI choice", async () => {
    const business = generateBusinessLocal({ businessType: "Blacksmith" });
    business.fallbackSections = ["pressure"];
    business.warnings = ["A named stranger"];
    const next = { ...business, pressure: "A new pressure" };
    regenerate.mockResolvedValueOnce({ document: next, warnings: [] });
    const onReplace = vi.fn();
    render(GeneratorPageOutputExtras, {
      props: {
        slug: "business",
        output: businessGeneratorOutput(business) as GeneratorOutput,
        useAI: true,
        onReplace,
      },
    });
    expect(
      screen.getByText(/Some parts were written from the tables/),
    ).toBeTruthy();
    expect(screen.getByText(/A named stranger/)).toBeTruthy();
    await fireEvent.click(
      await screen.findByRole("button", { name: /Rewrite current pressure/i }),
    );
    await waitFor(() =>
      expect(onReplace).toHaveBeenCalledWith(businessGeneratorOutput(next)),
    );
    expect(regenerate).toHaveBeenCalledWith(
      business,
      "pressure",
      expect.objectContaining({ useAI: true }),
    );
  });

  it("renders no business controls without a business document", () => {
    const { container } = render(GeneratorPageOutputExtras, {
      props: {
        slug: "business",
        output: { type: "note", title: "Incomplete result" } as GeneratorOutput,
        useAI: false,
        onReplace: vi.fn(),
      },
    });
    expect(container.textContent).toBe("");
  });
});
