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

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isGuest: false,
    resolveImageUrl: vi.fn().mockResolvedValue(""),
    saveImageToVault: vi
      .fn()
      .mockResolvedValue({ image: "images/entity.png", thumbnail: "" }),
    updateEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("#lib/stores/oracle.svelte.js", () => ({
  oracle: mockOracle,
}));

vi.mock("#lib/stores/debug.svelte.js", () => ({
  debugStore: {
    error: vi.fn(),
  },
}));

vi.mock("#lib/stores/theme.svelte.js", () => ({
  themeStore: {
    activeTheme: { id: "fantasy" },
  },
}));

vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: {
    openLightbox: vi.fn(),
    openSilhouettePicker: vi.fn(),
  },
}));

vi.mock("#lib/stores/ui/discovery-policy.svelte.js", () => ({
  discoveryPolicyStore: {
    aiDisabled: false,
  },
}));

vi.mock("#lib/cloud-bridge/p2p/host-service.svelte.js", () => ({
  p2pHost: {
    isHosting: false,
  },
}));

vi.mock("#lib/stores/map-session.svelte.js", () => ({
  mapSession: {
    showImageToPlayers: vi.fn(),
  },
}));

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
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

  it("should show GENERATE AI ART when on default cloudflare provider and apiKey is absent", () => {
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

    expect(getByText("GENERATE AI ART")).toBeTruthy();
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

  it("should show GENERATE AI ART when on gemini provider and apiKey is present", () => {
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

    expect(getByText("GENERATE AI ART")).toBeTruthy();
  });

  it("should show GENERATE AI ART when on custom provider and custom apiKey is present", () => {
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

    expect(getByText("GENERATE AI ART")).toBeTruthy();
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

  it("saves an image chosen in edit mode and updates the edit field", async () => {
    const { container, getByRole, getByLabelText } = render(DetailImage, {
      entity: mockEntity,
      isEditing: true,
      editImage: "old.png",
    });
    const input = container.querySelector('input[type="file"]');
    const image = new File(["image"], "portrait.png", { type: "image/png" });

    expect(getByRole("button", { name: "Change image" })).toBeTruthy();
    expect(getByRole("button", { name: "Choose silhouette" })).toBeTruthy();
    expect(input).toBeTruthy();

    await fireEvent.change(input!, { target: { files: [image] } });

    const { vault } = await import("#lib/stores/vault.svelte.js");
    await waitFor(() => {
      expect(vault.saveImageToVault).toHaveBeenCalledWith(image, "entity-1");
      expect(vault.updateEntity).toHaveBeenCalledWith("entity-1", {
        image: "images/entity.png",
        thumbnail: "",
      });
      expect((getByLabelText("IMAGE URL") as HTMLInputElement).value).toBe(
        "images/entity.png",
      );
    });
  });

  it("opens the silhouette picker from edit mode", async () => {
    const { getByRole } = render(DetailImage, {
      entity: mockEntity,
      isEditing: true,
      editImage: "",
    });
    await fireEvent.click(getByRole("button", { name: "Choose silhouette" }));
    const { modalUIStore } = await import("#lib/stores/ui/modal-ui.svelte.js");
    expect(modalUIStore.openSilhouettePicker).toHaveBeenCalledWith(mockEntity);
  });

  it("has no Choose image or Replace image button in view mode", () => {
    const { queryByRole } = render(DetailImage, {
      entity: mockEntity,
      isEditing: false,
      editImage: "",
    });
    expect(queryByRole("button", { name: "Choose image" })).toBeNull();
    expect(queryByRole("button", { name: "Replace image" })).toBeNull();
    expect(queryByRole("button", { name: "Change image" })).toBeNull();
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

    const { vault } = await import("#lib/stores/vault.svelte.js");
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
      isEditing: true,
      editImage: "",
    });
    const input = container.querySelector('input[type="file"]');
    const file = new File(["not an image"], "notes.txt", {
      type: "text/plain",
    });

    await fireEvent.change(input!, { target: { files: [file] } });

    const { vault } = await import("#lib/stores/vault.svelte.js");
    expect(getByRole("alert").textContent).toContain(
      "Choose an image file to upload.",
    );
    expect(vault.saveImageToVault).not.toHaveBeenCalled();
    expect(vault.updateEntity).not.toHaveBeenCalled();
  });
});
