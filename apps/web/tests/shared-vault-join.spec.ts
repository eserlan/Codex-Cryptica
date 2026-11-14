import { test, expect, type Page, type Request } from "@playwright/test";

/**
 * A member joins a shared vault from the group link (shared vault slice 8).
 * The flag is switched on with the development switch, and the cloud backup
 * service is mocked, so nothing here reaches a real server.
 */

const BACKUP_ID = "11111111-1111-1111-1111-111111111111";
const TOKEN = "a".repeat(64);
const GONE_MESSAGE =
  "This group link no longer works. Ask the owner for the new link.";

async function openJoin(page: Page, hash: string, flagOn = true) {
  if (flagOn) {
    await page.addInitScript(() =>
      localStorage.setItem("codex_shared_vault", "true"),
    );
  }
  const requests: Request[] = [];
  await page.route("**/api/cloud-backup/**", async (route) => {
    requests.push(route.request());
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Backup not found" } }),
    });
  });
  await page.goto(`/join${hash}`, { waitUntil: "domcontentloaded" });
  return requests;
}

const cloudBackupKeys = (page: Page) =>
  page.evaluate(() =>
    Object.keys(localStorage).filter((key) =>
      key.startsWith("codex.cloud-backup."),
    ),
  );

test.describe("Join a shared vault", () => {
  // The first visit compiles the route in dev, which can take a while.
  test.setTimeout(120000);

  test("clears the link from the address bar and sends nothing before Join", async ({
    page,
  }) => {
    const requests = await openJoin(page, `#${BACKUP_ID}:${TOKEN}`);
    await expect(
      page.getByRole("heading", { name: "Join a shared vault" }),
    ).toBeVisible({ timeout: 45000 });

    expect(page.url()).not.toContain("#");
    expect(page.url()).not.toContain(TOKEN);
    expect(new URL(page.url()).pathname).toBe("/join");
    await expect(page.getByLabel("Your name")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "I understand and join" }),
    ).toBeDisabled();
    await page.waitForTimeout(500);
    expect(requests).toHaveLength(0);
  });

  test("shows the incomplete-link message and sends nothing for a malformed link", async ({
    page,
  }) => {
    const requests = await openJoin(page, "#a:b:c");
    await expect(
      page.getByRole("heading", { name: "This link does not work" }),
    ).toBeVisible({ timeout: 45000 });
    await expect(
      page.getByText(
        "This link is not complete. Ask the owner to send the group link again.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveCount(0);
    expect(requests).toHaveLength(0);
  });

  test("a dead link shows its message and creates no vault", async ({
    page,
  }) => {
    const requests = await openJoin(page, `#${BACKUP_ID}:${TOKEN}`);
    await page.getByLabel("Your name").fill("Zed");
    await page.getByRole("button", { name: "I understand and join" }).click();

    await expect(page.getByRole("alert")).toHaveText(GONE_MESSAGE);
    expect(new URL(page.url()).pathname).toBe("/join");
    await expect(page.getByLabel("Your name")).toHaveValue("Zed");
    expect(await cloudBackupKeys(page)).toEqual([]);

    expect(requests.length).toBeGreaterThan(0);
    for (const request of requests) {
      expect(request.url()).not.toContain(TOKEN);
      const headers = request.headers();
      expect(headers.authorization).toBe(`Bearer ${TOKEN}`);
      expect(headers["x-codex-device-id"]).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
      expect(request.postData() ?? "").not.toContain(TOKEN);
    }
  });

  test("shows the not-found page with the flag off, with the fragment still cleared", async ({
    page,
  }) => {
    const requests = await openJoin(page, `#${BACKUP_ID}:${TOKEN}`, false);
    await expect(
      page.getByRole("heading", { name: "Join a shared vault" }),
    ).toHaveCount(0, { timeout: 45000 });
    expect(page.url()).not.toContain("#");
    expect(requests).toHaveLength(0);
  });
});
