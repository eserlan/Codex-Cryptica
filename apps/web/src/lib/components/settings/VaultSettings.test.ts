/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VaultSettings from "./VaultSettings.svelte";
import { calendarStore } from "$lib/stores/calendar.svelte";
import { DEFAULT_CALENDAR } from "chronology-engine";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", () => ({ page: { url: { pathname: "/" } } }));
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/environment", () => ({ browser: true }));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    defaultVisibility: "visible",
    setDefaultVisibility: vi.fn(),
    activeVaultId: "vault-1",
    entities: {},
  },
}));

vi.mock("$lib/services/demo", () => ({
  demoService: {
    isDemoVault: () => false,
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    theme: "default",
    setTheme: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    isSessionActive: false,
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    closeModal: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
    confirm: vi.fn(),
  },
}));

// Stub heavy child components
vi.mock("./CloudDestinationSettings.svelte", () => ({
  default: () => ({}),
}));
vi.mock("./VaultBackupSettings.svelte", () => ({
  default: () => ({}),
}));
vi.mock("./CalendarEraSettings.svelte", () => ({
  default: () => ({}),
}));

describe("VaultSettings - Default Year Suffix", () => {
  beforeEach(() => {
    calendarStore.config = {
      ...DEFAULT_CALENDAR,
      revision: 1,
      epochLabel: "AF",
      eras: [],
    };
    vi.spyOn(calendarStore, "setConfig").mockImplementation(
      async (newConfig) => {
        calendarStore.config = newConfig;
      },
    );
  });

  it("renders Default Year Suffix label without fallback note when no custom eras exist", () => {
    render(VaultSettings);

    expect(screen.getByLabelText(/Default Year Suffix/i)).toBeDefined();
    expect(screen.queryByText("Fallback")).toBeNull();
    expect(
      screen.queryByText(/Used as fallback for dates outside configured eras/i),
    ).toBeNull();
  });

  it("renders Fallback badge and note when custom eras exist", () => {
    calendarStore.config = {
      ...DEFAULT_CALENDAR,
      revision: 1,
      epochLabel: "AF",
      eras: [
        {
          id: "era-1",
          name: "After Conquest",
          label: "AC",
          startYear: 0,
          yearAtStart: 1,
          direction: "forward",
        },
      ],
    };

    render(VaultSettings);

    expect(screen.getByLabelText(/Default Year Suffix/i)).toBeDefined();
    expect(screen.getByText("Fallback")).toBeDefined();
    expect(
      screen.getByText(/Used as fallback for dates outside configured eras/i),
    ).toBeDefined();
  });

  it("updates epochLabel when Default Year Suffix input changes", async () => {
    render(VaultSettings);

    const input = screen.getByLabelText(/Default Year Suffix/i);
    await fireEvent.input(input, { target: { value: "BCE" } });

    expect(calendarStore.setConfig).toHaveBeenCalled();
    expect(calendarStore.config.epochLabel).toBe("BCE");
  });
});
