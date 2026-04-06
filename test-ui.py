from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:5173/?demo=fantasy")
    page.wait_for_timeout(3000)

    # Print the page's HTML to figure out what to click
    print("Page HTML loaded. Using keyboard shortcut Cmd+K to open search")
    page.keyboard.press("Meta+k")
    page.wait_for_timeout(1000)

    print("Typing search query")
    page.keyboard.type("Eldrin")
    page.wait_for_timeout(1000)

    print("Pressing enter to select the first result")
    page.keyboard.press("Enter")
    page.wait_for_timeout(2000)

    # Enter Zen Mode
    print("Entering Zen Mode")
    page.get_by_test_id("enter-zen-mode-button").click(force=True)
    page.wait_for_timeout(1000)

    # Click edit using the new aria-label!
    print("Clicking Edit button via aria-label")
    page.locator("button[aria-label='Edit']").click(force=True)
    page.wait_for_timeout(1000)

    # Click save using the new aria-label!
    print("Clicking Save button via aria-label")
    page.locator("button[aria-label='Save changes']").click(force=True)
    page.wait_for_timeout(1000)

    # Exit Zen Mode
    print("Exiting Zen mode")
    page.locator("button[aria-label='Close']").click(force=True)
    page.wait_for_timeout(1000)

    # Click edit in Detail Footer
    print("Clicking EDIT in detail footer")
    page.get_by_text("EDIT", exact=True).click(force=True)
    page.wait_for_timeout(1000)

    # Click save in Detail Footer. We added aria-busy={isSaving} to the save button
    # Let's locate the save button via the button text matching 'CHANGES'
    print("Clicking Save changes button in footer")
    page.locator("button:has-text('CHANGES')").first.click(force=True)
    page.wait_for_timeout(1000)

    page.screenshot(path="/home/jules/verification/screenshots/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={"width": 375, "height": 812}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
