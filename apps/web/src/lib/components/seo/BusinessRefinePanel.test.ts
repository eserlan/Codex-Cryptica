/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateBusinessLocal, type BusinessDocument } from "generator-engine";

const regenerate = vi.fn();
vi.mock("#lib/services/seo/generator-engine.js", () => ({
  generatorEngine: {
    regenerateBusinessSection: (...args: unknown[]) => regenerate(...args),
  },
}));

import BusinessRefinePanel from "./BusinessRefinePanel.svelte";

function doc(playersOwn = false): BusinessDocument {
  return generateBusinessLocal({
    genre: "Classic Fantasy",
    businessType: "Blacksmith",
    scale: "established",
    playersOwn,
  });
}

describe("BusinessRefinePanel", () => {
  beforeEach(() => regenerate.mockReset());

  it("offers each section, one per staff member, and hides management unless the players own it", () => {
    const d = doc(false);
    render(BusinessRefinePanel, {
      props: { business: d, useAI: false, onReplace: vi.fn() },
    });
    expect(
      screen.getByRole("button", { name: /Rewrite current pressure/i }),
    ).toBeTruthy();
    for (const person of d.staff) {
      expect(
        screen.getByRole("button", {
          name: new RegExp(
            `Rewrite ${person.name === d.leadership.name ? `${person.name} \\(staff\\)` : person.name}`,
          ),
        }),
      ).toBeTruthy();
    }
    expect(
      screen.queryByRole("button", { name: /Rewrite management/i }),
    ).toBeNull();
  });

  it("shows the management section when the players own the business", () => {
    render(BusinessRefinePanel, {
      props: { business: doc(true), useAI: false, onReplace: vi.fn() },
    });
    expect(
      screen.getByRole("button", { name: /Rewrite management/i }),
    ).toBeTruthy();
  });

  it("rewrites only the chosen section and says everything else is unchanged", async () => {
    const d = doc();
    const next = { ...d, pressure: "A new pressure." };
    regenerate.mockResolvedValue({ document: next, warnings: [] });
    const onReplace = vi.fn();
    render(BusinessRefinePanel, {
      props: { business: d, useAI: false, onReplace },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /Rewrite current pressure/i }),
    );
    await waitFor(() => expect(onReplace).toHaveBeenCalledWith(next));
    expect(regenerate).toHaveBeenCalledWith(
      d,
      "pressure",
      expect.objectContaining({ useAI: false }),
    );
    expect(
      screen.getByText(
        /Rewrote the current pressure\. Everything else is unchanged\./,
      ),
    ).toBeTruthy();
  });

  it("passes the steer to the engine when AI is on", async () => {
    const d = doc();
    regenerate.mockResolvedValue({ document: d, warnings: [] });
    render(BusinessRefinePanel, {
      props: { business: d, useAI: true, onReplace: vi.fn() },
    });
    const steer = screen.getByLabelText(/Steer/i) as HTMLTextAreaElement;
    await fireEvent.input(steer, {
      target: { value: "make it about the harbour" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /Rewrite current pressure/i }),
    );
    await waitFor(() =>
      expect(regenerate).toHaveBeenCalledWith(
        d,
        "pressure",
        expect.objectContaining({ instruction: "make it about the harbour" }),
      ),
    );
  });

  it("hides the steer when AI is off", () => {
    render(BusinessRefinePanel, {
      props: { business: doc(), useAI: false, onReplace: vi.fn() },
    });
    expect(screen.queryByLabelText(/Steer/i)).toBeNull();
  });

  it("reports a rename in the other sections", async () => {
    const d = doc();
    const renamed = {
      ...d,
      leadership: { ...d.leadership, name: "Iska Venn" },
    };
    regenerate.mockResolvedValue({
      document: renamed,
      renamed: { from: d.leadership.name, to: "Iska Venn" },
      warnings: [],
    });
    render(BusinessRefinePanel, {
      props: { business: d, useAI: false, onReplace: vi.fn() },
    });
    await fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`Rewrite ${d.leadership.name}`),
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Renamed .* to Iska Venn in other sections/),
      ).toBeTruthy(),
    );
  });

  it("says nothing changed when the rewrite fails", async () => {
    // An unusable result takes the same path as a failed call: nothing applied.
    regenerate.mockResolvedValue(undefined);
    const onReplace = vi.fn();
    render(BusinessRefinePanel, {
      props: { business: doc(), useAI: false, onReplace },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /Rewrite current pressure/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Nothing was changed\./)).toBeTruthy(),
    );
    expect(onReplace).not.toHaveBeenCalled();
  });

  it("ignores a second rewrite while one is running", async () => {
    let finish: (v: unknown) => void = () => {};
    regenerate.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const d = doc();
    render(BusinessRefinePanel, {
      props: { business: d, useAI: false, onReplace: vi.fn() },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /Rewrite current pressure/i }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: /Rewrite current pressure/i }),
    );
    expect(regenerate).toHaveBeenCalledTimes(1);
    finish({ document: d, warnings: [] });
  });
});
