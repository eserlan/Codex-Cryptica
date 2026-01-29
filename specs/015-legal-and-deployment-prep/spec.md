# Specification: Legal Compliance & Deployment Preparation

**Feature**: Legal and Deployment (015-legal-and-deployment-prep)
**Status**: Draft
**Date**: 2026-01-29

## 1. Goal
Provide the necessary legal documentation (Privacy Policy, Terms of Service) and technical groundwork required to publish Codex Arcana as a public application on Google Cloud, ensuring compliance with Google Cloud Project (GCP) requirements for OAuth and AI usage.

## 2. User Stories
- **As a Developer**, I want to have a clear Privacy Policy so that I can complete the OAuth Consent Screen for Google Drive integration.
- **As a User**, I want to understand how my data is handled (local-first vs. cloud sync) before I use the app on a public URL.
- **As a Developer**, I want the app to be deployable to a public URL (e.g., Firebase Hosting or Cloud Run) to fulfill Google's requirement for a live homepage.

## 3. Requirements

### 3.1 Privacy Policy (PRIVACY.md)
- **Data Sovereignty**: Explicitly state that user vaults are stored locally (OPFS/IndexedDB).
- **Google Drive Integration**: Describe how the app interacts with the user's Google Drive (restricted scope for mirroring only).
- **AI Processing**: Disclose that content is sent to Google Gemini API for Lore Oracle and Image Generation.
- **No Third-Party Tracking**: State that the app does not use cookies or tracking scripts (other than GCP essential logs if applicable).

### 3.2 Terms of Service (TERMS.md)
- **User Ownership**: Users retain all rights to the lore and images generated.
- **Liability**: The app is provided "as is" with no guarantee of data persistence (users are responsible for vault backups).
- **AI Usage**: Users must comply with Google's Generative AI Prohibited Use Policy.

### 3.3 Technical Implementation
- **Static Asset Hosting**: Legal documents must be served at predictable URLs (e.g., `/privacy` and `/terms`).
- **Footer Links**: The application UI must include links to these documents.

## 4. Deployment Strategy
- **Platform**: Google Cloud (Cloud Run or Firebase Hosting).
- **Authentication**: Update GCP OAuth Consent Screen with the public domain.
- **CORS/Redirects**: Ensure redirect URIs match the production domain.

## 5. Success Criteria
- [ ] `PRIVACY.md` and `TERMS.md` are accessible via the app.
- [ ] UI contains visible links to legal documents.
- [ ] Deployment plan for Google Cloud is documented.
