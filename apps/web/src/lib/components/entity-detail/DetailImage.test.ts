/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
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
