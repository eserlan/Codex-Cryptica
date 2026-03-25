# Blog Screenshot Generator

Automated screenshot generation for blog posts using Playwright.

## Purpose

This script generates consistent, high-quality screenshots of the Codex Cryptica UI for use in blog posts and documentation. The screenshots are saved locally and should be manually uploaded to the CDN.

## Directory Structure

```
scripts/blog-screenshots/
├── README.md                              # This file
├── oracle-capabilities.spec.ts            # Screenshot script for Oracle blog post
└── output/                                # Generated screenshots (gitignored)
```

## Usage

### Generate Screenshots

```bash
cd apps/web
npm run test:e2e -- --grep "Blog Screenshots" --timeout=120000
```

Screenshots are saved to `blogPics/<blog-name>/` at the project root.

### Upload to CDN

After generating screenshots, upload them to Cloudflare R2:

```bash
# Example for oracle-capabilities blog
rclone copy blogPics/oracle-capabilities/ cloudflare:codex-cryptica-statics/images/blog/oracle-capabilities/
```

Or use the Cloudflare dashboard to upload manually.

### Update Blog Post

Update image references in your blog post:

```markdown
![Description](https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-roll-command.png)
```

## Creating New Screenshot Scripts

1. **Create a new spec file** in `scripts/blog-screenshots/`:

```typescript
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.describe("Blog Screenshots: <Your Blog Title>", () => {
  const outputDir = path.join(
    process.cwd(),
    "../../blogPics/<your-blog-folder>",
  );

  test.beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Skip onboarding and set up clean state
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-test-key";
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("http://localhost:5173/");

    // Wait for vault to be ready
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });
  });

  test("01 - Your Feature Screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    // Your automation code here
    // ...

    // Capture screenshot
    const panel = page.locator('[data-testid="your-component"]');
    await panel.screenshot({
      path: path.join(outputDir, "your-screenshot-name.png"),
    });
  });
});
```

2. **Run the script** to generate screenshots

3. **Upload to CDN** and update blog post references

## Tips

### Dismiss Modals

Many UI elements show onboarding modals. Dismiss them in `beforeEach`:

```typescript
const gotItButton = page.getByRole("button", { name: "GOT IT" });
if (await gotItButton.isVisible()) {
  await gotItButton.click();
  await page.waitForTimeout(500);
}
```

### Wait for Dynamic Content

For AI-powered features, add appropriate wait times:

```typescript
// For quick operations
await page.waitForTimeout(2000);

// For AI operations (may need manual screenshots)
await page.waitForTimeout(10000);
```

### Consistent Viewport

Always set viewport for consistent screenshots:

```typescript
await page.setViewportSize({ width: 1200, height: 800 });
```

### Target Specific Elements

Use `data-testid` attributes when available:

```typescript
const oraclePanel = page.locator('[data-testid="oracle-sidebar-panel"]');
await oraclePanel.screenshot({ path: ... });
```

## AI-Powered Features

For features requiring AI (like `/plot`, `/draw`, natural language chat):

1. **Automated**: The script will show the "Consulting archives..." loading state
2. **Manual**: For actual AI responses, take screenshots manually with a real API key configured

Recommended approach: Use automated screenshots for deterministic commands (`/roll`, `/create`, `/connect`) and manual screenshots for AI-dependent features.

## Troubleshooting

### Test Fails with Timeout

Increase the timeout:

```bash
npm run test:e2e -- --grep "Blog Screenshots" --timeout=180000
```

### Element Not Found

Check if the component has the correct `data-testid` attribute. Search for it:

```bash
grep -r "data-testid" apps/web/src/lib/components/
```

### Modal Appears

Add modal dismissal logic in `beforeEach` (see Tips above).

### Screenshots Look Different

Ensure consistent state by:

- Clearing vault state between tests
- Setting fixed viewport size
- Waiting for animations to complete
- Using `await page.waitForLoadState("networkidle")`
