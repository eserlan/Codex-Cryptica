# Tasks: Legal Compliance & Deployment Preparation

**Feature**: Legal and Deployment (015-legal-and-deployment-prep)

## 1. Documentation
- [x] Create `apps/web/static/PRIVACY.md` with GCP-compliant language. <!-- id: 0 -->
- [x] Create `apps/web/static/TERMS.md`. <!-- id: 1 -->
- [x] Create a "Deployment Guide" in the spec folder for Cloud Run/Firebase. <!-- id: 2 -->

## 2. Implementation
- [x] Create `apps/web/src/routes/privacy/+page.svelte` to render the privacy policy. <!-- id: 3 -->
- [x] Create `apps/web/src/routes/terms/+page.svelte` to render the terms of service. <!-- id: 4 -->
- [x] Add links to Privacy/Terms in the `VaultControls.svelte` or a new Footer component. <!-- id: 5 -->

## 3. Configuration
- [x] Update `.env.example` with placeholders for `PUBLIC_APP_URL`. <!-- id: 6 -->
- [x] Document the required Redirect URIs for the GCP OAuth Console. <!-- id: 7 -->
