# Quickstart: Comprehensive Help Guide Blog Post

## How to Verify Implementation

### 1. Development Server

1. Start the development server: `npm run dev` in `apps/web/`.
2. Navigate to `http://localhost:5173/blog/comprehensive-help-guide`.
3. Verify the title, table of contents, and all sections are rendered correctly.
4. Check the blog index page `http://localhost:5173/blog` to ensure the new post is listed.

### 2. Table of Contents

1. Click each anchor link in the Table of Contents.
2. Verify that the page scrolls to the correct section.

### 3. SEO Check

1. Open DevTools and check the `<title>` and `<meta name="description">` in the `<head>` section.
2. Ensure they match the frontmatter provided in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`.

### 4. Accessibility & Readability Check

1. Use an accessibility tool (like Axe or Chrome DevTools A11y panel) to verify heading structure and image alt tags.
2. Note: Placeholder images SHOULD have descriptive `alt` text.
3. Paste the article text into a readability checker (e.g., Hemingway Editor or a Flesch-Kincaid tool).
4. Verify the grade level is between 8 and 10.
