# Implementation Plan - Patreon Support Link

This plan outlines the steps to implement the Patreon support link in the application footer.

## Proposed Changes

### 1. Configuration

- Define the Patreon URL in a configuration file or constant.
- Location: `apps/web/src/lib/constants.ts` (or similar) or directly in the component if no central config exists.
  - *Note*: Checking for existing constants file first.

### 2. UI Implementation

- Update `apps/web/src/routes/+layout.svelte` to include the new link.
- Ensure the link is only rendered if `PATREON_URL` is a non-empty string.
- Use the existing styling classes to ensure consistency.
- Text: "Support on Patreon" (or just "Patreon" to fit the style).

### 3. Automated Testing

- Create a Playwright test to ensure the link is present in the DOM and has the correct `href` and `target="_blank"` attributes.

### 4. Verification

- Verify the link appears in the footer.
- Verify the link opens in a new tab.
- Verify the link matches the visual style of other footer links.

## Verification Plan

### Manual Verification
- Start the dev server (`npm run dev`).
- Scroll to the footer.
- Visual check: Does it look like "Privacy Policy"?
- Functional check: Click it, does it open the Patreon page?
