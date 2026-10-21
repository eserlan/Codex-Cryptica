/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import { UIPersistence } from "$lib/stores/ui/persistence";
import { hubContext } from "$lib/stores/hub-context.svelte";
import GeneratorPageContent from "./GeneratorPageContent.svelte";

const generateBusiness = vi.hoisted(() => vi.fn());
vi.mock("./SEOGeneratorLayout.svelte", async () => ({
  default: (await import("./test-fixtures/GeneratorPageLayoutHarness.svelte"))
    .default,
}));
vi.mock("$lib/services/seo/generator-engine", () => ({
  generatorEngine: { generateBusiness },
}));
vi.mock("$lib/stores/session-hub.svelte", () => ({
  sessionHubStore: { entities: [] },
}));
vi.mock("$app/state", () => ({
  page: { url: new URL("https://example.com/generators/business") },
}));
vi.mock("$app/navigation", () => ({ afterNavigate: vi.fn(), goto: vi.fn() }));

const draft = {
  type: "note",
  title: "Custom initial draft",
  content: "Draft",
} as GeneratorOutput;
const persistence = new UIPersistence({
  storage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
});

function renderBusiness() {
  return render(GeneratorPageContent, {
    props: {
      slug: "business",
      persistence,
      initialDraftOverride: draft,
      metaOverrides: { pageTitle: "Alternative business page" },
    },
  });
}

describe("generator page composition", () => {
  beforeEach(() => {
    hubContext.set(null);
    generateBusiness
      .mockReset()
      .mockResolvedValue({ ...draft, title: "Generated business" });
  });

  it("preserves overrides and forwards edited reactive form state to generation", async () => {
    renderBusiness();
    expect(
      screen.getByRole("heading", { name: "Alternative business page" }),
    ).toBeTruthy();
    expect(screen.getByTestId("initial-draft").textContent).toBe(draft.title);
    await fireEvent.input(screen.getByLabelText(/Location \(optional\)/), {
      target: { value: "The old harbour" },
    });
    await fireEvent.click(
      screen.getByRole("checkbox", { name: /Players own this business/ }),
    );
    await fireEvent.change(
      screen.getByRole("combobox", { name: "Genre / Setting" }),
      { target: { value: "Sci-Fi / Space Opera" } },
    );
    expect(screen.getByTestId("page-theme").textContent).toBe(
      "Sci-Fi / Space Opera",
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Generate from harness" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Generated business"),
    );
    expect(generateBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "The old harbour",
        playersOwn: true,
        genre: "Sci-Fi / Space Opera",
        useAI: false,
      }),
    );
  });

  it("keeps edited fields available after a failed generation and retries them", async () => {
    generateBusiness.mockRejectedValueOnce(new Error("offline"));
    renderBusiness();
    const location = screen.getByLabelText(
      /Location \(optional\)/,
    ) as HTMLInputElement;
    await fireEvent.input(location, { target: { value: "The market" } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Generate from harness" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Generation failed"),
    );
    expect(location.value).toBe("The market");
    await fireEvent.click(
      screen.getByRole("button", { name: "Generate from harness" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Generated business"),
    );
    expect(generateBusiness).toHaveBeenLastCalledWith(
      expect.objectContaining({ location: "The market" }),
    );
  });
});
