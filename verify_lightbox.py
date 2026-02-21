from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173")

    # Wait for vault idle
    page.wait_for_function("window.vault && window.vault.status === 'idle'")

    # Create entity
    page.evaluate("""
        window.vault.createEntity("character", "Hero", {
            content: "# Hero Content",
            image: "https://via.placeholder.com/300"
        })
    """)

    # Open Zen Mode
    page.evaluate("window.uiStore.openZenMode('hero')")

    # Wait for modal
    page.wait_for_selector('[data-testid="zen-mode-modal"]')

    # Click Image to Open Lightbox
    page.click('button:has(img)')

    # Wait for Lightbox (close button visible)
    page.wait_for_selector('[aria-label="Close image view"]', state='visible')

    # Wait for transition
    page.wait_for_timeout(1000)

    # Screenshot
    page.screenshot(path="lightbox_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
