#!/usr/bin/env bun
/**
 * Browser-automated Reddit poster using Playwright.
 *
 * Posts announcements to Reddit (e.g. r/codexcryptica) without requiring
 * Reddit Developer API registration, app approval, or OAuth tokens.
 *
 * Authentication options (in order of priority):
 * 1. Saved session in `.reddit-session/state.json`
 * 2. `reddit_session` cookie from `.reddit-session/cookie.txt` or `REDDIT_SESSION_COOKIE` env var
 * 3. Direct login via `--login --username <user> --password <pass>` (or interactive prompt)
 *
 * Usage:
 *   bun scripts/post-to-reddit.ts --title "New Feature" --file path/to/draft.md
 *   bun scripts/post-to-reddit.ts --title "New Feature" --body "Post body markdown"
 *   echo "Post body" | bun scripts/post-to-reddit.ts --title "New Feature"
 *   bun scripts/post-to-reddit.ts --login
 *   bun scripts/post-to-reddit.ts --cookie "..." --title "New Feature" --body "..."
 *   bun scripts/post-to-reddit.ts --dry-run --title "Preview" --body "..."
 */

import { chromium, type BrowserContext } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

const SESSION_DIR = path.join(process.cwd(), ".reddit-session");
const STATE_FILE = path.join(SESSION_DIR, "state.json");
const COOKIE_FILE = path.join(SESSION_DIR, "cookie.txt");

interface CliArgs {
  title?: string;
  body?: string;
  file?: string;
  subreddit: string;
  loginOnly: boolean;
  username?: string;
  password?: string;
  cookie?: string;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    subreddit: "codexcryptica",
    loginOnly: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--title" && args[i + 1]) {
      result.title = args[++i];
    } else if (arg === "--body" && args[i + 1]) {
      result.body = args[++i];
    } else if (arg === "--file" && args[i + 1]) {
      result.file = args[++i];
    } else if (arg === "--subreddit" && args[i + 1]) {
      result.subreddit = args[++i].replace(/^r\//, "");
    } else if (arg === "--login") {
      result.loginOnly = true;
    } else if (arg === "--username" && args[i + 1]) {
      result.username = args[++i];
    } else if (arg === "--password" && args[i + 1]) {
      result.password = args[++i];
    } else if (arg === "--cookie" && args[i + 1]) {
      result.cookie = args[++i];
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    }
  }

  return result;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}

function promptQuestion(query: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      process.stdout.write(query);
      let input = "";
      const onData = (char: Buffer) => {
        const str = char.toString("utf8");
        if (str === "\n" || str === "\r" || str === "\u0004") {
          process.stdin.removeListener("data", onData);
          console.log();
          rl.close();
          resolve(input);
        } else if (str === "\u0003") {
          process.exit(1);
        } else if (str === "\b" || str === "\x7f") {
          input = input.slice(0, -1);
        } else {
          input += str;
        }
      };
      process.stdin.on("data", onData);
    } else {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

async function getAuthenticatedContext(): Promise<{
  context: BrowserContext;
  browser: any;
}> {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
  });

  let context: BrowserContext;

  if (fs.existsSync(STATE_FILE)) {
    context = await browser.newContext({
      storageState: STATE_FILE,
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });
  } else {
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });
  }

  return { context, browser };
}

async function injectCookie(context: BrowserContext, cookieValue: string) {
  const cleanCookie = cookieValue.trim().replace(/^reddit_session=/, "");
  await context.addCookies([
    {
      name: "reddit_session",
      value: cleanCookie,
      domain: ".reddit.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
}

async function performLogin(
  context: BrowserContext,
  username?: string,
  password?: string,
): Promise<boolean> {
  const user = username || (await promptQuestion("Reddit Username: "));
  const pass = password || (await promptQuestion("Reddit Password: ", true));

  if (!user || !pass) {
    console.error("Username and password are required for login.");
    return false;
  }

  console.log(`Attempting login for u/${user}...`);
  const page = await context.newPage();

  try {
    await page.goto("https://www.reddit.com/login", {
      waitUntil: "networkidle",
    });

    const userInput = page.locator(
      'input[name="username"], input#login-username, input[autocomplete="username"]',
    );
    const passInput = page.locator(
      'input[name="password"], input#login-password, input[autocomplete="current-password"]',
    );

    await userInput.first().fill(user);
    await passInput.first().fill(pass);

    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Log In"), button:has-text("Log in")',
    );
    await submitBtn.first().click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 30000,
    });
    console.log("Login successful!");

    await context.storageState({ path: STATE_FILE });
    console.log(`Saved session to ${STATE_FILE}`);
    return true;
  } catch (err: any) {
    console.error(
      "Login failed or encountered CAPTCHA/2FA prompt:",
      err?.message || err,
    );
    console.log(
      "\nTip: You can alternatively copy your 'reddit_session' cookie from your browser and provide it with:",
    );
    console.log(
      '  bun scripts/post-to-reddit.ts --cookie "<reddit_session_value>" ...\n',
    );
    return false;
  } finally {
    await page.close();
  }
}

async function checkIsLoggedIn(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage();
  try {
    await page.goto("https://old.reddit.com/", {
      waitUntil: "domcontentloaded",
    });
    const userElement = await page.locator("span.user").count();
    const logoutForm = await page
      .locator('form.logout, a[href*="/logout"]')
      .count();
    return userElement > 0 || logoutForm > 0;
  } catch {
    return false;
  } finally {
    await page.close();
  }
}

async function submitPost(
  context: BrowserContext,
  subreddit: string,
  title: string,
  body: string,
  dryRun: boolean,
): Promise<{ success: boolean; url?: string; error?: string }> {
  const page = await context.newPage();

  try {
    const submitUrl = `https://old.reddit.com/r/${subreddit}/submit?selftext=true`;
    console.log(`Navigating to ${submitUrl}...`);
    await page.goto(submitUrl, { waitUntil: "domcontentloaded" });

    const userHeader = await page.locator("span.user").first().textContent();
    console.log(`Authenticated user: ${userHeader?.trim() || "Unknown"}`);

    const titleInput = page.locator(
      'textarea[name="title"], input[name="title"]',
    );
    await titleInput.first().fill(title);

    const bodyInput = page.locator('textarea[name="text"]');
    await bodyInput.first().fill(body);

    if (dryRun) {
      console.log("\n[DRY RUN] Submission form successfully filled.");
      console.log(`Subreddit: r/${subreddit}`);
      console.log(`Title: ${title}`);
      console.log(`Body character count: ${body.length} characters`);
      return { success: true, url: submitUrl };
    }

    console.log("Submitting post to Reddit...");
    const submitButton = page.locator(
      'button[name="submit"], input[name="submit"], button:has-text("submit")',
    );
    await submitButton.first().click();

    await page.waitForURL((url) => url.pathname.includes("/comments/"), {
      timeout: 30000,
    });
    const postUrl = page.url();
    console.log(`\nPost published successfully: ${postUrl}`);

    await context.storageState({ path: STATE_FILE });

    return { success: true, url: postUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  } finally {
    await page.close();
  }
}

async function main() {
  const args = parseArgs();

  let body = args.body || "";
  if (args.file) {
    if (!fs.existsSync(args.file)) {
      console.error(`Error: File not found: ${args.file}`);
      process.exit(1);
    }
    body = fs.readFileSync(args.file, "utf8");
  } else if (!body && !args.loginOnly) {
    body = await readStdin();
  }

  const { context, browser } = await getAuthenticatedContext();

  try {
    let cookieVal = args.cookie || process.env.REDDIT_SESSION_COOKIE;
    if (!cookieVal && fs.existsSync(COOKIE_FILE)) {
      cookieVal = fs.readFileSync(COOKIE_FILE, "utf8").trim();
    }

    if (cookieVal) {
      await injectCookie(context, cookieVal);
    }

    let loggedIn = await checkIsLoggedIn(context);

    if (args.loginOnly || !loggedIn) {
      if (!loggedIn && !args.loginOnly) {
        console.log(
          "No active Reddit session found. Initiating authentication...",
        );
      }

      if (cookieVal && !loggedIn) {
        console.log(
          "Provided cookie did not produce an authenticated session.",
        );
      }

      const loginSuccess = await performLogin(
        context,
        args.username,
        args.password,
      );
      if (!loginSuccess) {
        process.exit(1);
      }
      loggedIn = true;
      if (args.loginOnly) {
        console.log("Authentication complete.");
        return;
      }
    }

    if (!args.title) {
      console.error("Error: --title is required for creating a Reddit post.");
      console.log(
        'Usage: bun scripts/post-to-reddit.ts --title "..." --file <path> [--subreddit codexcryptica]',
      );
      process.exit(1);
    }

    if (!body) {
      console.error(
        "Error: Post body is required (provide --body, --file, or pipe via stdin).",
      );
      process.exit(1);
    }

    const res = await submitPost(
      context,
      args.subreddit,
      args.title,
      body,
      args.dryRun,
    );
    if (!res.success) {
      console.error(`Failed to submit post: ${res.error}`);
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
