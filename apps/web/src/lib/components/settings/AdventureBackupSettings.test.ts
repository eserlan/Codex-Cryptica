import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureBackupSettings from "./AdventureBackupSettings.svelte";

describe("adventure backup consent", () => {
  it("requires disclosure confirmation before enabling expanded backup", async () => {
    const set = vi.fn(async () => true);
    const confirm = vi.fn(async (_options: { message: string }) => false);
    render(AdventureBackupSettings, {
      props: {
        vaultId: "v1",
        read: async () => ({ enabled: false, remoteRemovalPending: false }),
        set,
        confirm,
      },
    });
    await fireEvent.click(
      await screen.findByRole("button", { name: "Include adventures" }),
    );
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0][0].message).toContain("Cloudflare");
    expect(set).not.toHaveBeenCalled();
    confirm.mockResolvedValueOnce(true);
    await fireEvent.click(
      screen.getByRole("button", { name: "Include adventures" }),
    );
    expect(set).toHaveBeenCalledWith("v1", true, true);
  });
  it("shows pending removal and permits a retry", async () => {
    const set = vi.fn(async () => true);
    render(AdventureBackupSettings, {
      props: {
        vaultId: "v1",
        read: async () => ({
          enabled: false,
          remoteRemovalPending: true,
          removalId: "r1",
        }),
        set,
        confirm: async () => true,
      },
    });
    await waitFor(() =>
      expect(screen.getByText(/Removal from cloud is pending/)).toBeTruthy(),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Retry removal" }),
    );
    expect(set).toHaveBeenCalledWith("v1", false, true);
  });
});
