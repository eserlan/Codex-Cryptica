import { test, expect } from "@playwright/test";

// Guards the documented ~65-75 characters per line (#4462).
const PAGES = [
  ["/blog/lore-oracle-not-the-author", ".blog-content p"],
  [
    "/answers/how-do-i-get-my-friends-interested-in-playing-dnd",
    "article section p",
  ],
] as const;

for (const [path, selector] of PAGES) {
  for (const width of [1024, 1440, 1920]) {
    test(`${path} keeps prose near 70 characters per line at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);

      const average = await page.evaluate((sel) => {
        const counts: number[] = [];
        for (const el of document.querySelectorAll(sel)) {
          const node = el.firstChild;
          if (!node || node.nodeType !== 3 || el.textContent!.length < 250)
            continue;
          const range = document.createRange();
          const lines: Record<number, number> = {};
          const text = node.textContent!;
          for (let i = 0; i < text.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const rect = range.getClientRects()[0];
            if (!rect) continue;
            const key = Math.round(rect.top);
            lines[key] = (lines[key] ?? 0) + 1;
          }
          const full = Object.values(lines);
          if (full.length < 3) continue;
          full.pop(); // the last line is a remainder
          counts.push(full.reduce((a, b) => a + b, 0) / full.length);
        }
        return counts.reduce((a, b) => a + b, 0) / counts.length;
      }, selector);

      expect(average).toBeGreaterThan(60);
      expect(average).toBeLessThan(78);
    });
  }
}
