import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  goto: vi.fn(),
  fragment: null as string | null,
  join: vi.fn(),
  notify: vi.fn(),
  storedName: undefined as string | undefined,
}));

vi.mock("$app/navigation", () => ({ goto: mocks.goto }));
vi.mock("$app/paths", () => ({
  resolve: (path: string) => (path === "/(app)" ? "/" : path),
}));
vi.mock("#lib/utils/join-fragment.js", () => ({
  takeJoinFragment: () => mocks.fragment,
}));
vi.mock("#lib/stores/shared-vault-identity.js", () => ({
  sharedVaultIdentity: { displayName: () => mocks.storedName },
}));
vi.mock("#lib/app/init/cloud-backup-config.js", () => ({
  createSharedVaultJoin: () => ({ join: mocks.join }),
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { switchVault: vi.fn() },
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify: mocks.notify },
}));

import JoinPage from "./+page.svelte";

const BACKUP = "11111111-1111-1111-1111-111111111111";
const TOKEN = "ab".repeat(32);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storedName = undefined;
  mocks.fragment = `#${BACKUP}:${TOKEN}`;
  localStorage.clear();
});

describe("join page", () => {
  it("shows the whole disclosure and asks for a name before anything is sent", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(JoinPage);
    await screen.findByText("Join a shared vault");
    for (const label of [
      "Who can see and change it:",
      "What gets stored:",
      "Where:",
      "What we can see:",
      "Your copy stays yours:",
      "Stopping:",
      "Your name:",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    const input = screen.getByLabelText("Your name") as HTMLInputElement;
    expect(input.maxLength).toBe(40);
    const button = screen.getByRole("button", {
      name: /I understand and join/,
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText("Type a name so the group can see who made a change."),
    ).toBeTruthy();

    await fireEvent.input(input, { target: { value: "   " } });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.input(input, { target: { value: " Zed " } });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mocks.join).not.toHaveBeenCalled();
  });

  it("prefills the stored name", async () => {
    mocks.storedName = "Zed";
    render(JoinPage);
    const input = (await screen.findByLabelText(
      "Your name",
    )) as HTMLInputElement;
    expect(input.value).toBe("Zed");
  });

  it("leaving with Not now makes no request and writes nothing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(JoinPage);
    await fireEvent.click(
      await screen.findByRole("button", { name: "Not now" }),
    );
    expect(mocks.goto).toHaveBeenCalledWith("/");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mocks.join).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it.each([null, "", "#nonsense", "#a:b:c"])(
    "shows only the incomplete-link message for %j",
    async (fragment) => {
      mocks.fragment = fragment;
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      render(JoinPage);
      await screen.findByText("This link does not work");
      expect(
        screen.getByText(
          "This link is not complete. Ask the owner to send the group link again.",
        ),
      ).toBeTruthy();
      expect(screen.queryByLabelText("Your name")).toBeNull();
      expect(
        screen
          .getByRole("link", { name: "Go to my vaults" })
          .getAttribute("href"),
      ).toBe("/");
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mocks.join).not.toHaveBeenCalled();
    },
  );

  it("joins with the trimmed name, then notifies and goes home", async () => {
    mocks.join.mockResolvedValue({
      kind: "joined",
      vaultId: "v",
      message: "You joined X as Zed.",
    });
    render(JoinPage);
    await fireEvent.input(await screen.findByLabelText("Your name"), {
      target: { value: " Zed " },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /I understand and join/ }),
    );
    await waitFor(() => expect(mocks.goto).toHaveBeenCalledWith("/"));
    expect(mocks.join).toHaveBeenCalledWith(
      { backupId: BACKUP, editorToken: TOKEN },
      "Zed",
    );
    expect(mocks.notify).toHaveBeenCalledWith(
      "You joined X as Zed.",
      "success",
    );
  });

  it("keeps the form filled in and shows the message when joining fails", async () => {
    mocks.join.mockResolvedValue({
      kind: "failed",
      message:
        "This group link no longer works. Ask the owner for the new link.",
    });
    render(JoinPage);
    const input = (await screen.findByLabelText(
      "Your name",
    )) as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Zed" } });
    await fireEvent.click(
      screen.getByRole("button", { name: /I understand and join/ }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "This group link no longer works.",
    );
    expect(input.value).toBe("Zed");
    expect(mocks.goto).not.toHaveBeenCalled();
  });

  it("offers to open a vault the member already owns", async () => {
    mocks.join.mockResolvedValue({ kind: "owned", vaultId: "mine" });
    render(JoinPage);
    await fireEvent.input(await screen.findByLabelText("Your name"), {
      target: { value: "Zed" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /I understand and join/ }),
    );
    expect(
      await screen.findByText(
        "You own this vault, and it is already on this device.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open vault" })).toBeTruthy();
  });
});
