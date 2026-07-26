/** @vitest-environment jsdom */
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ZenSidebar from "./ZenSidebar.svelte";

const { mockVault } = vi.hoisted(() => ({
  mockVault: {
    isGuest: false,
    allEntities: [],
    entities: {},
    inboundConnections: {},
    labelIndex: [],
    saveImageToVault: vi
      .fn()
      .mockResolvedValue({ image: "images/entity.png", thumbnail: "" }),
    updateEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({ vault: mockVault }));
vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    messages: [],
    apiKey: null,
    activeStyleTitle: null,
    isVisualizingEntity: vi.fn().mockReturnValue(false),
    drawEntity: vi.fn(),
  },
}));
vi.mock("$lib/services/RevisionService.svelte", () => ({
  revisionService: { isRevising: false },
}));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: { activeTheme: { id: "fantasy" } },
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openRevisionDialog: vi.fn() },
}));
vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: { aiDisabled: false },
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: vi.fn() },
}));
vi.mock("$lib/stores/debug.svelte", () => ({ debugStore: { error: vi.fn() } }));
vi.mock("$lib/stores/guest-chat.svelte", () => ({
  guestChatStore: { openChat: vi.fn() },
}));
vi.mock("$lib/components/labels/LabelBadge.svelte", () => ({ default: vi.fn() }));
vi.mock("$lib/components/labels/LabelInput.svelte", () => ({ default: vi.fn() }));
vi.mock("$lib/components/connections/ConnectionEditor.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("$lib/components/connections/ConnectionCreator.svelte", () => ({
  default: vi.fn(),
}));

const baseEntity = {
  id: "entity-1",
  title: "Test Entity",
  type: "npc",
  labels: [],
  aliases: [],
  connections: [],
  artDirection: "",
};

function renderSidebar(image = "") {
  return render(ZenSidebar, {
    entity: { ...baseEntity, image } as any,
    editState: { isEditing: false, aliases: [] },
    resolvedImageUrl: image ? "blob:image" : "",
    onShowLightbox: () => {},
    onNavigate: () => {},
    onDelete: async () => {},
  });
}

describe("ZenSidebar image file picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVault.isGuest = false;
  });

  it("saves an image selected from the mobile-friendly file picker", async () => {
    const { container, getByRole } = renderSidebar();
    const input = container.querySelector('input[type="file"]');
    const image = new File(["image"], "portrait.png", { type: "image/png" });

    expect(getByRole("button", { name: "Choose image" })).toBeTruthy();
    await fireEvent.change(input!, { target: { files: [image] } });

    await waitFor(() => {
      expect(mockVault.saveImageToVault).toHaveBeenCalledWith(image, "entity-1");
      expect(mockVault.updateEntity).toHaveBeenCalledWith("entity-1", {
        image: "images/entity.png",
        thumbnail: "",
      });
    });
  });

  it("shows a replacement control for an entity that already has an image", () => {
    const { getByRole } = renderSidebar("images/current.png");

    expect(getByRole("button", { name: "Replace image" })).toBeTruthy();
  });

  it("rejects a non-image without changing the entity", async () => {
    const { container, getByRole } = renderSidebar("images/current.png");
    const input = container.querySelector('input[type="file"]');
    const file = new File(["not an image"], "notes.txt", { type: "text/plain" });

    await fireEvent.change(input!, { target: { files: [file] } });

    expect(getByRole("alert").textContent).toContain(
      "Choose an image file to upload.",
    );
    expect(mockVault.saveImageToVault).not.toHaveBeenCalled();
    expect(mockVault.updateEntity).not.toHaveBeenCalled();
  });
});
