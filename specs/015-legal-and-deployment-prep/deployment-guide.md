# Deployment Guide: GitHub Pages & Google Cloud

This guide outlines the steps to deploy **Codex Arcana** to GitHub Pages and configure the Google Cloud Project (GCP) for public access.

## 1. Prerequisites
- A Google Cloud Project (GCP).
- Deployment URL: `https://eserlan.github.io/Codex-Arcana/`

## 2. GCP OAuth Configuration (CRITICAL)
To allow public users to sync with Google Drive, you must configure the OAuth Consent Screen:

1.  **User Type**: Set to `External`.
2.  **App Information**: Provide the App Name and User Support Email.
3.  **App Domain**:
    - **Homepage**: `https://eserlan.github.io/Codex-Arcana/`
    - **Privacy Policy**: `https://eserlan.github.io/Codex-Arcana/privacy`
    - **Terms of Service**: `https://eserlan.github.io/Codex-Arcana/terms`
4.  **Scopes**: Add `https://www.googleapis.com/auth/drive.file`.
5.  **Authorized Domains**: Add `github.io`.

### Credentials
Update your OAuth 2.0 Client ID:
- **Authorized JavaScript Origins**: Add `https://eserlan.github.io`.
- **Authorized Redirect URIs**: Add `https://eserlan.github.io/Codex-Arcana/`.

## 3. Deployment Steps (GitHub Pages)
The app is configured for GitHub Pages using `adapter-static` and a base path of `/Codex-Arcana`.

1.  **Build**:
    ```bash
    cd apps/web
    npm run build
    ```
2.  **Deploy**: Push the `build` folder content to the `gh-pages` branch or use the existing GitHub Action.

## 4. Environment Variables
Ensure your GitHub Actions secrets or `.env.production` has:
- `VITE_GOOGLE_CLIENT_ID`: Your GCP Client ID.
- `VITE_PUBLIC_APP_URL`: `https://eserlan.github.io/Codex-Arcana`
- `VITE_SHARED_GEMINI_KEY`: (Optional) Restricted to the domain.

## 5. Security Note
Always restrict your Google API Keys in the GCP Console to only allow requests from your production domain to prevent quota theft.
