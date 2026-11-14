import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import CloudBackupSharingSettings from "./CloudBackupSharingSettings.svelte";

const LINK = "https://app.test/join#b-1:abc123";
const ON = { linkVersion: 1, enabledAt: "2026-09-01T00:00:00.000Z" };

function setup(over: Record<string, unknown> = {}) {
  const props = {
    vaultId: "v1",
    backupOn: true,
    sharing: null,
    enable: vi.fn(async () => ({ ok: true as const, link: LINK })),
    replace: vi.fn(async () => ({ ok: true as const, link: LINK })),
    disable: vi.fn(async () => ({ ok: true as const })),
    confirm: vi.fn(async (_o: any) => true),
    ...over,
  };
  render(CloudBackupSharingSettings, { props: props as any });
  return props;
}

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("CloudBackupSharingSettings", () => {
  afterEach(() => vi.restoreAllMocks());

  it("asks for Cloud Backup first when it is off", () => {
    setup({ backupOn: false });
    expect(screen.getByText(/Turn Cloud Backup on first/)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Share with group" }),
    ).toBeNull();
  });

  it("blocks sharing until the consent screen is accepted", async () => {
    const p = setup();
    await click("Share with group");
    const dialog = screen.getByRole("dialog");
    for (const phrase of [
      "hidden",
      "Cloudflare",
      "not end-to-end encrypted",
      "keeps",
      "sync automatically",
      "vault title, size, entry count, last backup time",
    ]) {
      expect(dialog.textContent).toContain(phrase);
    }
    expect(p.enable).not.toHaveBeenCalled();
  });

  it("calls nothing on Not now, Escape or the backdrop", async () => {
    const p = setup();
    await click("Share with group");
    await click("Not now");
    expect(screen.queryByRole("dialog")).toBeNull();
    await click("Share with group");
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await click("Share with group");
    await click("Cancel sharing setup");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(p.enable).not.toHaveBeenCalled();
  });

  it("shows the link once and copies it", async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    const p = setup();
    await click("Share with group");
    await click(/I understand/);
    expect(p.enable).toHaveBeenCalledOnce();
    const field = (await screen.findByDisplayValue(LINK)) as HTMLInputElement;
    expect(field.value).toMatch(/\/join#[^:]+:[0-9a-f]+$/);
    expect(document.activeElement).toBe(field);
    expect(field.closest("[role=status]")).toBeTruthy();
    await click("Copy link");
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(await screen.findByText("Link copied.")).toBeTruthy();
    expect(screen.getByText(/Sharing is on/)).toBeTruthy();
  });

  it("keeps the link visible when the clipboard refuses", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => Promise.reject(new Error("no"))),
      },
    });
    setup();
    await click("Share with group");
    await click(/I understand/);
    await screen.findByDisplayValue(LINK);
    await click("Copy link");
    expect(
      (await screen.findByText(/copy it by hand/)).getAttribute("role"),
    ).toBe("alert");
    expect(screen.queryByText("Link copied.")).toBeNull();
    expect(screen.getByDisplayValue(LINK)).toBeTruthy();
  });

  it("confirms before replacing, then shows the new link", async () => {
    const p = setup({ sharing: ON, confirm: vi.fn(async () => false) });
    await click("Replace link");
    expect(p.confirm).toHaveBeenCalledOnce();
    expect(p.confirm.mock.calls[0][0]).toMatchObject({
      title: "Replace the group link?",
      isDangerous: true,
    });
    expect(p.replace).not.toHaveBeenCalled();
    p.confirm.mockResolvedValueOnce(true);
    await click("Replace link");
    expect(p.replace).toHaveBeenCalledOnce();
    expect(await screen.findByDisplayValue(LINK)).toBeTruthy();
  });

  it("confirms before turning off, then hides the link and shows off", async () => {
    const p = setup({ sharing: ON, confirm: vi.fn(async () => false) });
    await click("Turn off sharing");
    expect(p.confirm.mock.calls[0][0].isDangerous).toBe(true);
    expect(p.disable).not.toHaveBeenCalled();
    p.confirm.mockResolvedValueOnce(true);
    await click("Turn off sharing");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Share with group" }),
      ).toBeTruthy(),
    );
    expect(p.disable).toHaveBeenCalledOnce();
    expect(screen.queryByDisplayValue(LINK)).toBeNull();
  });

  it("keeps the state and shows the error when enable fails", async () => {
    setup({
      enable: vi.fn(async () => ({ ok: false as const, error: "Boom" })),
    });
    await click("Share with group");
    await click(/I understand/);
    expect((await screen.findByRole("alert")).textContent).toBe("Boom");
    expect(
      screen.getByRole("button", { name: "Share with group" }),
    ).toBeTruthy();
    expect(screen.queryByText("Copy link")).toBeNull();
  });

  it("keeps the state and shows the error when replace fails", async () => {
    setup({
      sharing: ON,
      replace: vi.fn(async () => ({ ok: false as const, error: "Nope" })),
    });
    await click("Replace link");
    expect((await screen.findByRole("alert")).textContent).toBe("Nope");
    expect(screen.getByText(/Sharing is on/)).toBeTruthy();
  });

  it("keeps the state and shows the error when disable fails", async () => {
    setup({
      sharing: ON,
      disable: vi.fn(async () => ({ ok: false as const, error: "Nope" })),
    });
    await click("Turn off sharing");
    expect((await screen.findByRole("alert")).textContent).toBe("Nope");
    expect(
      screen.getByRole("button", { name: "Turn off sharing" }),
    ).toBeTruthy();
  });

  it("moves focus to the new link after replace", async () => {
    setup({ sharing: ON });
    await click("Replace link");
    const field = await screen.findByDisplayValue(LINK);
    await waitFor(() => expect(document.activeElement).toBe(field));
  });

  it("shows a working status while a request runs", async () => {
    let finish!: (v: { ok: true }) => void;
    const disable = vi.fn(() => new Promise<{ ok: true }>((r) => (finish = r)));
    const p = setup({ sharing: ON, disable });
    await click("Turn off sharing");
    expect(
      (await screen.findByText(/Turning off sharing…/)).getAttribute("role"),
    ).toBe("status");
    expect(
      (
        screen.getByRole("button", {
          name: "Replace link",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    finish({ ok: true });
    await waitFor(() =>
      expect(screen.queryByText(/Turning off sharing…/)).toBeNull(),
    );
    expect(p.confirm).toHaveBeenCalled();
  });

  it("tells the owner members keep their copy when turning off", async () => {
    const p = setup({ sharing: ON });
    await click("Turn off sharing");
    expect(p.confirm.mock.calls[0][0].message).toContain(
      "Members keep the copy they already have",
    );
  });

  it("clears a shown link when turn off succeeds", async () => {
    const p = setup({ sharing: ON });
    await click("Replace link");
    await screen.findByDisplayValue(LINK);
    await click("Turn off sharing");
    await waitFor(() => expect(screen.queryByDisplayValue(LINK)).toBeNull());
    expect(p.disable).toHaveBeenCalled();
  });
});
