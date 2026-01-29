# Plan: Legal Compliance & Deployment Preparation

**Feature**: Legal and Deployment (015-legal-and-deployment-prep)

## Phase 1: Document Drafting
1. **Draft Privacy Policy**: Create a comprehensive policy covering Local Storage, Google Drive Sync, and Gemini AI usage.
2. **Draft Terms of Service**: Create terms focusing on user ownership and service limitations.
3. **Draft Deployment Checklist**: Define steps for GCP project configuration.

## Phase 2: Implementation
1. **Host Documents**: Place Markdown/HTML versions of legal documents in `apps/web/src/routes/(legal)`.
2. **UI Integration**: Add a footer to the main layout or a link in the Settings panel for "Legal & Privacy".
3. **Configuration Update**: Ensure the app can handle a production URL for OAuth redirects.

## Phase 3: Verification
1. Verify routes `/privacy` and `/terms` load correctly.
2. Check that all mandatory Google Cloud "OAuth Verification" fields are addressed by the documents.
