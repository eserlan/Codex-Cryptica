import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, it, expect, vi } from "vitest";
import LabelSettings from "./LabelSettings.svelte";

const vaultMock = vi.hoisted(() => ({
  labelIndex: ["npc", "quest"],
  entities: {
    a: { id: "a", labels: ["npc", "quest"] },
    b: { id: "b", labels: ["NPC"] },
    c: { id: "c", labels: ["place"] },
    d: { id: "d" },
  } as Record<string, { id: string; labels?: string[] }>,
  isGuest: false,
  renameLabel: vi.fn(),
  deleteLabel: vi.fn(),
}));

const notificationMock = vi.hoisted(() => ({
  confirm: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({ vault: vaultMock }));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: notificationMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vaultMock.isGuest = false;
  vaultMock.labelIndex = ["npc", "quest"];
  vaultMock.renameLabel.mockResolvedValue(2);
  vaultMock.deleteLabel.mockResolvedValue(2);
  notificationMock.confirm.mockResolvedValue(true);
});

const startRename = async (label = "npc") => {
  await fireEvent.click(
    screen.getByRole("button", { name: `Rename ${label} label` }),
  );
  return screen.getByRole("textbox", {
    name: `New name for the ${label} label`,
  }) as HTMLInputElement;
};

describe("LabelSettings", () => {
  it("renders Save and Cancel buttons with explicit type='button' when renaming", async () => {
    render(LabelSettings);
    await startRename();

    expect(
      screen.getByRole("button", { name: "Save" }).getAttribute("type"),
    ).toBe("button");
    expect(
      screen.getByRole("button", { name: "Cancel" }).getAttribute("type"),
    ).toBe("button");
  });

  describe("rename", () => {
    it("renames the label on every entry and says how many changed", async () => {
      render(LabelSettings);
      const input = await startRename();
      await fireEvent.input(input, { target: { value: "Character" } });
      await fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(vaultMock.renameLabel).toHaveBeenCalledWith("npc", "character"),
      );
      expect(notificationMock.notify).toHaveBeenCalledWith(
        'Renamed "npc" to "character" on 2 entries.',
        "success",
      );
      // The editor closes.
      expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("says '1 entry' for a single change", async () => {
      vaultMock.renameLabel.mockResolvedValue(1);
      render(LabelSettings);
      const input = await startRename("quest");
      await fireEvent.input(input, { target: { value: "mission" } });
      await fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(notificationMock.notify).toHaveBeenCalledWith(
          'Renamed "quest" to "mission" on 1 entry.',
          "success",
        ),
      );
    });

    it("also saves on Enter", async () => {
      render(LabelSettings);
      const input = await startRename();
      await fireEvent.input(input, { target: { value: "hero" } });
      await fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() =>
        expect(vaultMock.renameLabel).toHaveBeenCalledWith("npc", "hero"),
      );
    });

    it("does nothing on Cancel", async () => {
      render(LabelSettings);
      const input = await startRename();
      await fireEvent.input(input, { target: { value: "hero" } });
      await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(vaultMock.renameLabel).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("cannot be saved while the new name is empty", async () => {
      render(LabelSettings);
      const input = await startRename();
      await fireEvent.input(input, { target: { value: "   " } });

      const save = screen.getByRole("button", {
        name: "Save",
      }) as HTMLButtonElement;
      expect(save.disabled).toBe(true);
      await fireEvent.keyDown(input, { key: "Enter" });
      expect(vaultMock.renameLabel).not.toHaveBeenCalled();
      // Still editing, so nothing is lost.
      expect(screen.getByRole("textbox")).toBeTruthy();
    });

    it("just closes when only the case or spacing changed", async () => {
      render(LabelSettings);
      const input = await startRename();
      await fireEvent.input(input, { target: { value: "  NPC " } });
      await fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(vaultMock.renameLabel).not.toHaveBeenCalled();
      expect(notificationMock.notify).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("asks before merging into a label that already exists, and merges if confirmed", async () => {
      render(LabelSettings);
      const input = await startRename("npc");
      await fireEvent.input(input, { target: { value: "quest" } });
      await fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(notificationMock.confirm).toHaveBeenCalled());
      const asked = notificationMock.confirm.mock.calls[0][0];
      expect(asked.title).toBe("Merge Labels");
      expect(asked.message).toContain('A label named "quest" already exists');
      expect(asked.message).toContain("2 entries");
      await waitFor(() =>
        expect(vaultMock.renameLabel).toHaveBeenCalledWith("npc", "quest"),
      );
    });

    it("keeps everything as it was when the merge is declined", async () => {
      notificationMock.confirm.mockResolvedValue(false);
      render(LabelSettings);
      const input = await startRename("npc");
      await fireEvent.input(input, { target: { value: "quest" } });
      await fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(notificationMock.confirm).toHaveBeenCalled());
      expect(vaultMock.renameLabel).not.toHaveBeenCalled();
      // The edit box stays open so the person can choose another name.
      expect(screen.getByRole("textbox")).toBeTruthy();
    });

    it("reports a failure instead of claiming success", async () => {
      vaultMock.renameLabel.mockRejectedValue(new Error("disk full"));
      render(LabelSettings);
      const input = await startRename();
      await fireEvent.input(input, { target: { value: "hero" } });
      await fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(notificationMock.notify).toHaveBeenCalledWith(
          "Could not rename the label: disk full",
          "error",
        ),
      );
      expect(notificationMock.notify).not.toHaveBeenCalledWith(
        expect.stringContaining("Renamed"),
        "success",
      );
    });

    it("ignores repeated saves while the rename is still running", async () => {
      let finishRename!: (count: number) => void;
      vaultMock.renameLabel.mockReturnValue(
        new Promise<number>((resolve) => {
          finishRename = resolve;
        }),
      );
      render(LabelSettings);
      const input = await startRename();
      await fireEvent.input(input, { target: { value: "hero" } });
      const save = screen.getByRole("button", { name: "Save" });
      await fireEvent.click(save);
      await fireEvent.click(save);

      expect(vaultMock.renameLabel).toHaveBeenCalledTimes(1);
      expect(
        (
          screen.getByRole("button", {
            name: "Rename npc label",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
      finishRename(2);
      await waitFor(() =>
        expect(notificationMock.notify).toHaveBeenCalledWith(
          'Renamed "npc" to "hero" on 2 entries.',
          "success",
        ),
      );
    });

    it("does nothing in a read-only guest session", async () => {
      vaultMock.isGuest = true;
      render(LabelSettings);
      const input = await startRename();
      await fireEvent.input(input, { target: { value: "hero" } });
      await fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(vaultMock.renameLabel).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("asks how many entries lose the label, and says the entries stay", async () => {
      render(LabelSettings);
      await fireEvent.click(
        screen.getByRole("button", { name: "Delete npc label project-wide" }),
      );

      await waitFor(() => expect(notificationMock.confirm).toHaveBeenCalled());
      const asked = notificationMock.confirm.mock.calls[0][0];
      expect(asked.title).toBe("Delete Label");
      // "npc" is on entries a and b (matched without regard to case).
      expect(asked.message).toBe(
        'Remove the label "npc" from 2 entries? The entries themselves are not deleted.',
      );
      expect(asked.isDangerous).toBe(true);
    });

    it("removes the label vault-wide when confirmed and reports the count", async () => {
      render(LabelSettings);
      await fireEvent.click(
        screen.getByRole("button", { name: "Delete npc label project-wide" }),
      );

      await waitFor(() =>
        expect(vaultMock.deleteLabel).toHaveBeenCalledWith("npc"),
      );
      expect(notificationMock.notify).toHaveBeenCalledWith(
        'Removed "npc" from 2 entries.',
        "success",
      );
    });

    it("changes nothing when the confirmation is declined", async () => {
      notificationMock.confirm.mockResolvedValue(false);
      render(LabelSettings);
      await fireEvent.click(
        screen.getByRole("button", { name: "Delete npc label project-wide" }),
      );

      await waitFor(() => expect(notificationMock.confirm).toHaveBeenCalled());
      expect(vaultMock.deleteLabel).not.toHaveBeenCalled();
      expect(notificationMock.notify).not.toHaveBeenCalled();
    });

    it("reports a failure instead of claiming success", async () => {
      vaultMock.deleteLabel.mockRejectedValue(new Error("disk full"));
      render(LabelSettings);
      await fireEvent.click(
        screen.getByRole("button", { name: "Delete quest label project-wide" }),
      );

      await waitFor(() =>
        expect(notificationMock.notify).toHaveBeenCalledWith(
          "Could not delete the label: disk full",
          "error",
        ),
      );
    });

    it("opens only one confirmation while a delete is pending", async () => {
      let finishConfirm!: (confirmed: boolean) => void;
      notificationMock.confirm.mockReturnValue(
        new Promise<boolean>((resolve) => {
          finishConfirm = resolve;
        }),
      );
      render(LabelSettings);
      const remove = screen.getByRole("button", {
        name: "Delete npc label project-wide",
      });
      await fireEvent.click(remove);
      await fireEvent.click(remove);

      expect(notificationMock.confirm).toHaveBeenCalledTimes(1);
      finishConfirm(true);
      await waitFor(() =>
        expect(vaultMock.deleteLabel).toHaveBeenCalledWith("npc"),
      );
      expect(vaultMock.deleteLabel).toHaveBeenCalledTimes(1);
    });

    it("does nothing in a read-only guest session", async () => {
      vaultMock.isGuest = true;
      render(LabelSettings);
      await fireEvent.click(
        screen.getByRole("button", { name: "Delete npc label project-wide" }),
      );

      expect(notificationMock.confirm).not.toHaveBeenCalled();
      expect(vaultMock.deleteLabel).not.toHaveBeenCalled();
    });
  });
});
