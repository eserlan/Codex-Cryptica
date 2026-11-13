/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import DetailGenerateArt from "./DetailGenerateArt.svelte";
import { vault } from "#lib/stores/vault.svelte.js";
import { oracle } from "#lib/stores/oracle.svelte.js";

vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: { isGuest: false } }));
vi.mock("#lib/stores/oracle.svelte.js", () => ({
  oracle: {
    apiKey: null,
    settings: { imageProvider: "cloudflare" },
    isVisualizingEntity: vi.fn(() => false),
    drawEntity: vi.fn(),
  },
}));
vi.mock("#lib/stores/ui/discovery-policy.svelte.js", () => ({
  discoveryPolicyStore: { aiDisabled: false },
}));

const entity = { id: "e1", title: "Hero", type: "character", content: "Text" };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  (vault as any).isGuest = false;
});

describe("DetailGenerateArt", () => {
  it("offers Generate AI art for an entity with text and no image", async () => {
    const { getByTestId } = render(DetailGenerateArt, {
      entity: entity as any,
    });
    await fireEvent.click(getByTestId("generate-art-button"));
    expect(oracle.drawEntity).toHaveBeenCalledWith("e1");
  });

  it("is hidden once the entity has an image", () => {
    const { queryByTestId } = render(DetailGenerateArt, {
      entity: { ...entity, image: "a.png" } as any,
    });
    expect(queryByTestId("generate-art-button")).toBeNull();
  });

  it("is hidden for a guest", () => {
    (vault as any).isGuest = true;
    const { queryByTestId } = render(DetailGenerateArt, {
      entity: entity as any,
    });
    expect(queryByTestId("generate-art-button")).toBeNull();
  });
});
