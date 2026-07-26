/** @vitest-environment jsdom */
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DetailImage from "./DetailImage.svelte";

const { mockOracle } = vi.hoisted(() => {
  return {
    mockOracle: {
      tier: "advanced",
      apiKey: null as string | null,
      activeStyleTitle: null as string | null,
      isVisualizingEntity: vi.fn().mockReturnValue(false),
      drawEntity: vi.fn(),
      settings: {
        imageProvider: "cloudflare",
        customImageApiKey: "",
      },
    },
  };
});

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    resolveImageUrl: vi.fn().mockResolvedValue(""),
    saveImageToVault: vi
      .fn()
      .mockResolvedValue({ image: "images/entity.png", thumbnail: "" }),
    updateEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: mockOracle,
}));

vi.mock("$lib/stores/debug.svelte", () => ({
  debugStore: {
    error: vi.fn(),
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: { id: "fantasy" },
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openLightbox: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: {
    aiDisabled: false,
  },
}));

vi.mock("$lib/cloud-bridge/p2p/host-service.svelte", () => ({
  p2pHost: {
    isHosting: false,
  },
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {
    showImageToPlayers: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
  },
}));

describe("DetailImage Button Labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOracle.tier = "advanced";
    mockOracle.apiKey = null;
    mockOracle.activeStyleTitle = null;
    mockOracle.settings.imageProvider = "cloudflare";
    mockOracle.settings.customImageApiKey = "";
  });

  it("should show GENERATE IMAGE when on default cloudflare provider and apiKey is absent", () => {
    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      type: "npc",
      image: "",
      artDirection: "",
    } as any;

    const { getByText } = render(DetailImage, {
      entity: mockEntity,
      isEditing: false,
      editImage: "",
    });

    expect(getByText("GENERATE IMAGE")).toBeTruthy();
  });

  it("should show GENERATE PROMPT when on gemini provider and apiKey is absent", () => {
    mockOracle.settings.imageProvider = "gemini";
    mockOracle.apiKey = null;

    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      type: "npc",
      image: "",
      artDirection: "",
    } as any;

    const { getByText } = render(DetailImage, {
      entity: mockEntity,
      isEditing: false,
      editImage: "",
    });

    expect(getByText("GENERATE PROMPT")).toBeTruthy();
  });

  it("should show GENERATE IMAGE when on gemini provider and apiKey is present", () => {
    mockOracle.settings.imageProvider = "gemini";
    mockOracle.apiKey = "gemini-api-key";

    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      type: "npc",
      image: "",
      artDirection: "",
    } as any;

    const { getByText } = render(DetailImage, {
      entity: mockEntity,
      isEditing: false,
      editImage: "",
    });

    expect(getByText("GENERATE IMAGE")).toBeTruthy();
  });

  it("should show GENERATE IMAGE when on custom provider and custom apiKey is present", () => {
    mockOracle.settings.imageProvider = "custom";
    mockOracle.settings.customImageApiKey = "custom-api-key";

    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      type: "npc",
      image: "",
      artDirection: "",
    } as any;

    const { getByText } = render(DetailImage, {
      entity: mockEntity,
      isEditing: false,
      editImage: "",
    });

    expect(getByText("GENERATE IMAGE")).toBeTruthy();
  });
});

describe("DetailImage file picker", () => {
  const mockEntity = {
    id: "entity-1",
    title: "Test Entity",
    type: "npc",
    image: "",
    artDirection: "",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves an image selected with the file picker", async () => {
    const { container, getByRole } = render(DetailImage, {
      entity: mockEntity,
      isEditing: false,
      editImage: "",
    });
    const input = container.querySelector('input[type="file"]');
    const image = new File(["image"], "portrait.png", { type: "image/png" });

    expect(getByRole("button", { name: "Choose image" })).toBeTruthy();
    expect(input).toBeTruthy();

    await fireEvent.change(input!, { target: { files: [image] } });

    const { vault } = await import("$lib/stores/vault.svelte");
    await waitFor(() => {
      expect(vault.saveImageToVault).toHaveBeenCalledWith(image, "entity-1");
      expect(vault.updateEntity).toHaveBeenCalledWith("entity-1", {
        image: "images/entity.png",
        thumbnail: "",
      });
    });
  });

  it("continues to save an image dropped from a desktop", async () => {
    const { getByRole } = render(DetailImage, {
      entity: mockEntity,
      isEditing: false,
      editImage: "",
    });
    const image = new File(["image"], "portrait.png", { type: "image/png" });

    await fireEvent.drop(getByRole("region", { name: "Image drop zone" }), {
      dataTransfer: {
        files: [image],
        types: ["Files"],
        getData: () => "",
      },
    });

    const { vault } = await import("$lib/stores/vault.svelte");
    await waitFor(() => {
      expect(vault.saveImageToVault).toHaveBeenCalledWith(image, "entity-1");
      expect(vault.updateEntity).toHaveBeenCalledWith("entity-1", {
        image: "images/entity.png",
        thumbnail: "",
      });
    });
  });

  it("rejects a non-image selected with the file picker without changing the entity", async () => {
    const { container, getByRole } = render(DetailImage, {
      entity: mockEntity,
      isEditing: false,
      editImage: "",
    });
    const input = container.querySelector('input[type="file"]');
    const file = new File(["not an image"], "notes.txt", {
      type: "text/plain",
    });

    await fireEvent.change(input!, { target: { files: [file] } });

    const { vault } = await import("$lib/stores/vault.svelte");
    expect(getByRole("alert").textContent).toContain(
      "Choose an image file to upload.",
    );
    expect(vault.saveImageToVault).not.toHaveBeenCalled();
    expect(vault.updateEntity).not.toHaveBeenCalled();
  });
});
