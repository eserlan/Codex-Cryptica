# Feature Specification: Public Route Prerendering

**Feature Branch**: `055-prerender-marketing`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "prerender public marketing routes https://github.com/eserlan/Codex-Cryptica/issues/216"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - SEO Optimization for Marketing Content (Priority: P1)

As a search engine crawler, I want to see the full content of the marketing pages without executing JavaScript so that the site can be correctly indexed and discovered by potential users.

**Why this priority**: Essential for organic growth and discoverability. Without prerendering, single-page applications often suffer from poor indexing.

**Independent Test**: Can be verified by using `curl https://codexcryptica.com/features` to ensure HTML content is present in the initial response.

**Acceptance Scenarios**:

1. **Given** a crawler requests the root URL (`/`), **When** the server responds, **Then** the HTML body contains the landing page headline and feature descriptions.
2. **Given** a crawler requests `/privacy`, **When** the server responds, **Then** the HTML body contains the legal text.

---

### User Story 2 - Instant Visual Feedback for New Visitors (Priority: P2)

As a new visitor, I want the landing page to load its visual content immediately so that I don't see a blank screen or a loading spinner while the application logic initializes.

**Why this priority**: Improves user retention and perceived performance. First impressions are critical for marketing conversion.

**Independent Test**: Verified by disabling JavaScript in the browser and visiting public routes; content should still be readable.

**Acceptance Scenarios**:

1. **Given** JavaScript is disabled, **When** a user visits `/features`, **Then** the feature list is visible and formatted.

---

### User Story 3 - Social Media Metadata (Priority: P3)

As a user sharing the site on social media, I want the link preview to display the correct title and description so that the shared link looks professional and enticing.

**Why this priority**: Enhances social presence and click-through rates from external shares.

**Independent Test**: Use social media debugger tools (e.g., Facebook Sharing Debugger) to verify OpenGraph tags are parsed from the static HTML.

**Acceptance Scenarios**:

1. **Given** a link to `/` is pasted into a social platform, **When** the preview is generated, **Then** it shows the "Codex Cryptica" title and marketing blurb.

---

### User Story 4 - Crawl Essentials (Priority: P4)

As a crawler, I want to find a `sitemap.xml` and `robots.txt` so that I can efficiently discover all valid routes and follow indexing guidelines.

**Why this priority**: Standard SEO practice to ensure efficient crawling and avoid indexing irrelevant pages.

**Independent Test**: Verify that `https://codexcryptica.com/robots.txt` and `https://codexcryptica.com/sitemap.xml` are accessible and contain the correct entries.

**Acceptance Scenarios**:

1. **Given** a request for `/robots.txt`, **When** the server responds, **Then** it contains a link to the sitemap.
2. **Given** a request for `/sitemap.xml`, **When** the server responds, **Then** it lists `/`, `/features`, `/terms`, and `/privacy`.

---

### Edge Cases

- **Prerender Safety**: Use of browser-only globals (like `window`, `document`, or `localStorage`) during top-level execution will break the build. These must be guarded with environment checks.
- **Dynamic Content in Prerendered Pages**: If a marketing page includes dynamic dates or state, these must be handled during build time or hydrated correctly without layout shifts.
- **App Route Boundary**: Routes that strictly require a local vault (like `/oracle` or `/timeline`) must be excluded from mandatory prerendering to prevent serving a "state-less" shell that might confuse crawlers.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST prerender the root landing page (`/`) at build time.
- **FR-002**: System MUST prerender all static marketing routes: `/features`, `/privacy`, and `/terms`.
- **FR-003**: Prerendered pages MUST contain SEO metadata (Title, Description, Canonical tags) in the static HTML.
- **FR-004**: System MUST guard browser-only logic (globals like `window`) to ensure build-time safety.
- **FR-005**: System MUST provide a `robots.txt` file in the static directory that allows crawling and links to the sitemap.
- **FR-006**: System MUST provide a `sitemap.xml` file listing all prerendered marketing routes.
- **FR-007**: System MUST maintain the existing SPA fallback for non-prerendered routes.

### Key Entities _(include if feature involves data)_

- **Public Route**: A URI that serves marketing or legal information and does not require private user data to render.
- **SEO Metadata**: Data used by search engines and social platforms to understand and display page content.
- **Crawl Config**: The `robots.txt` and `sitemap.xml` files that guide search engine bots.

## Assumptions

- **Static Content**: Marketing content is primarily static and does not change frequently between builds.
- **SSG Support**: The deployment environment (GitHub Pages) correctly serves static HTML files alongside the SPA fallback.
- **SEO Priority**: Improving organic search ranking is the primary business driver.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `npm run build` outputs static HTML files for `/`, `/features`, `/terms`, and `/privacy`.
- **SC-002**: Lighthouse SEO score for all marketing routes is 90 or higher.
- **SC-003**: Initial server response for marketing routes contains >80% of the visible page content in the HTML body.
- **SC-004**: Largest Contentful Paint (LCP) for public routes is under 1.5 seconds using Lighthouse "Applied Mobile" throttling.
- **SC-005**: `curl` requests to marketing routes return full HTML content instead of a blank SPA shell.
- **SC-006**: `sitemap.xml` and `robots.txt` are valid and accessible.
