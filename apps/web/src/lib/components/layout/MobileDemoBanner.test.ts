/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileDemoBanner from "./MobileDemoBanner.svelte";

const mockConvertToWorld = vi.fn();
const mockExitDemo = vi.fn();

vi.mock("$lib/services/demo", () => ({
  demoService: {
    convertToWorld: () => mockConvertToWorld(),
    exitDemo: () => mockExitDemo(),
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    jargon: {
      vault: "campaign",
    },
  },
}));

const mockNotify = vi.fn();
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: (...args: any[]) => mockNotify(...args),
  },
}));

describe("MobileDemoBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with DEMO tag, Save and Exit buttons", () => {
    render(MobileDemoBanner);

    expect(screen.getByText("DEMO")).toBeTruthy();
    expect(screen.getByTestId("mobile-save-as-campaign-button")).toBeTruthy();
    expect(screen.getByTestId("mobile-exit-demo-button")).toBeTruthy();
  });

  it("calls convertToWorld when save button is clicked", async () => {
    mockConvertToWorld.mockResolvedValue(undefined);
    render(MobileDemoBanner);

    const saveBtn = screen.getByTestId("mobile-save-as-campaign-button");
    await fireEvent.click(saveBtn);

    expect(mockConvertToWorld).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons and sets aria-busy during conversion", async () => {
    let resolveConversion: () => void = () => {};
    const promise = new Promise<void>((resolve) => {
      resolveConversion = resolve;
    });
    mockConvertToWorld.mockReturnValue(promise);

    render(MobileDemoBanner);

    const saveBtn = screen.getByTestId(
      "mobile-save-as-campaign-button",
    ) as HTMLButtonElement;
    const exitBtn = screen.getByTestId(
      "mobile-exit-demo-button",
    ) as HTMLButtonElement;

    await fireEvent.click(saveBtn);

    // Buttons should be disabled and aria-busy should be set
    expect(saveBtn.disabled).toBe(true);
    expect(saveBtn.getAttribute("aria-busy")).toBe("true");
    expect(exitBtn.disabled).toBe(true);

    // Resolve conversion
    resolveConversion();
    await waitFor(() => {
      expect(saveBtn.disabled).toBe(false);
    });
  });

  it("calls exitDemo when exit button is clicked", async () => {
    render(MobileDemoBanner);

    const exitBtn = screen.getByTestId("mobile-exit-demo-button");
    await fireEvent.click(exitBtn);

    expect(mockExitDemo).toHaveBeenCalledTimes(1);
  });
});
