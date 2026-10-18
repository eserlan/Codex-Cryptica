import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { setupVaultPage } from "./test-helpers";

/**
 * Getting a table back out, and back in (issue 2263).
 *
 * The round trip is the whole point: a table somebody built is real work, and
 * an export you cannot import is a one-way door.
 */

async function boot(page: Page, path: string) {
  await setupVaultPage(page);
  await page.goto(path);
}

async function newTable(page: Page, name: string, ...entries: string[]) {
  await page.getByTestId("new-table").click();
  await page.getByTestId("table-name").fill(name);
  await page.getByTestId("table-name").press("Enter");
  for (const [index, text] of entries.entries()) {
    await page.getByTestId("add-entry").click();
    await page.getByTestId("entry-text").nth(index).fill(text);
  }
}

/** Clicks Download and hands back the file the browser actually received. */
async function download(page: Page, format: string) {
  await page.getByTestId(`export-format-${format}`).click();
  const started = page.waitForEvent("download");
  await page.getByTestId("export-download").click();
  const downloaded = await started;
  const path = await downloaded.path();
  return {
    filename: downloaded.suggestedFilename(),
    content: await readFile(path, "utf8"),
  };
}

test.describe("Exporting a table", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await boot(page, "/tables");
    await expect(page.getByTestId("new-table")).toBeVisible({ timeout: 30000 });
  });

  test("cannot export before there is anything to export", async ({ page }) => {
    await expect(page.getByTestId("open-export")).toBeDisabled();

    await newTable(page, "export-omens", "A crow lands on the signpost.");

    await expect(page.getByTestId("open-export")).toBeEnabled();
  });

  test("downloads a Codex file and imports it straight back", async ({
    page,
  }) => {
    await newTable(page, "export-omens", "A crow lands on the signpost.");
    await expect(page.getByTestId("workspace-saving")).toBeHidden();

    await page.getByTestId("open-export").click();
    const file = await download(page, "codex");

    expect(file.filename).toBe("export-omens.md");
    expect(file.content).toContain("name: export-omens");
    expect(file.content).toContain("A crow lands on the signpost.");

    // ...and back in. The name is taken, so the copy is renamed rather than
    // quietly replacing what is already there.
    await page.getByTestId("open-import").click();
    await page.getByTestId("import-file").setInputFiles({
      name: file.filename,
      mimeType: "text/markdown",
      buffer: Buffer.from(file.content),
    });

    await expect(page.getByTestId("import-codex-summary")).toContainText(
      "export-omens",
    );
    await expect(page.getByTestId("import-codex-summary")).toContainText(
      "1 entry",
    );
    await expect(page.getByTestId("import-codex-renamed")).toContainText(
      "export-omens 2",
    );

    await page.getByTestId("import-codex-confirm").click();

    await expect(page.getByTestId("table-editor")).toBeVisible();
    await expect(page.getByTestId("entry-text").first()).toHaveValue(
      "A crow lands on the signpost.",
    );
    await expect(
      page.getByTestId("table-list-item").filter({ hasText: "export-omens 2" }),
    ).toBeVisible();
  });

  test("downloads a Markdown table for pasting elsewhere", async ({ page }) => {
    await newTable(page, "export-weather", "Clear.", "Storm.");

    await page.getByTestId("open-export").click();
    const file = await download(page, "markdown-table");

    expect(file.filename).toBe("export-weather.md");
    expect(file.content).toContain("| Weight | Result |");
    expect(file.content).toContain("| 1 | Clear. |");
    // The share formats carry no ids — that is the point of them.
    expect(file.content).not.toContain("id:");
  });

  /**
   * References bind by name, so a share format hands somebody something that
   * resolves to nothing. Saying so before the download is the point.
   */
  test("warns that a reference will not travel, and only for the lossy formats", async ({
    page,
  }) => {
    await newTable(page, "export-beast", "a troll");
    await newTable(page, "export-ambush", "A {export-beast} guards the ford.");

    await page.getByTestId("open-export").click();

    await page.getByTestId("export-format-codex").click();
    await expect(page.getByTestId("export-warning")).toBeHidden();

    await page.getByTestId("export-format-lines").click();
    await expect(page.getByTestId("export-warning-references")).toContainText(
      "export-beast",
    );
  });

  test("a file that is not ours falls through to the paste flow", async ({
    page,
  }) => {
    await page.getByTestId("open-import").click();
    await page.getByTestId("import-file").setInputFiles({
      name: "rumours.tsv",
      mimeType: "text/tab-separated-values",
      buffer: Buffer.from("1\tThe miller is missing.\n2\tThe chapel is lit.\n"),
    });

    await expect(page.getByTestId("import-codex-summary")).toBeHidden();
    await expect(page.getByTestId("import-paste")).toHaveValue(
      /The miller is missing/,
    );
    await expect(page.getByTestId("import-summary")).toContainText("2 ready");
  });

  test("says so rather than failing when the file is the wrong kind", async ({
    page,
  }) => {
    await page.getByTestId("open-import").click();
    await page.getByTestId("import-file").setInputFiles({
      name: "omens.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(
        "---\nid: d1\nname: Omens\nkind: deck\nlabels: []\n---\n\n| id | title | body | reversed | image |\n| --- | --- | --- | --- | --- |\n| c1 | The Tower | Ruin. |  |  |\n",
      ),
    });

    await expect(page.getByTestId("import-file-error")).toContainText("deck");
    await expect(page.getByTestId("import-codex-summary")).toBeHidden();
  });
});
