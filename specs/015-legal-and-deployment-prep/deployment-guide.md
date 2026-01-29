# Deployment Guide: Custom Domain & Google Cloud

This guide outlines the steps to deploy **Codex Cryptica** to GitHub Pages with a custom domain and configure the Google Cloud Project (GCP) for public access.

## 1. Prerequisites
- A Google Cloud Project (GCP).
- Deployment URL: `https://codexcryptica.com/`

## 2. GCP OAuth Configuration (CRITICAL)
To allow public users to sync with Google Drive, you must configure the OAuth Consent Screen:

1.  **User Type**: Set to `External`.
2.  **App Information**: Provide the App Name and User Support Email.
3.  **App Domain**:
    - **Homepage**: `https://codexcryptica.com/`
    - **Privacy Policy**: `https://codexcryptica.com/privacy`
    - **Terms of Service**: `https://codexcryptica.com/terms`
4.  **Scopes**: Add `https://www.googleapis.com/auth/drive.file`.
5.  **Authorized Domains**: Add `codexcryptica.com`.

### Credentials
Update your OAuth 2.0 Client ID:
- **Authorized JavaScript Origins**: Add `https://codexcryptica.com`.
- **Authorized Redirect URIs**: Add `https://codexcryptica.com/`.

## 3. Deployment Steps (GitHub Pages)
The app is configured for GitHub Pages with a custom domain at the root.

1.  **Build**:
    ```bash
    cd apps/web
    npm run build
    ```
2.  **Deploy**: Push the `build` folder content to the `gh-pages` branch. Ensure a `CNAME` file with `codexcryptica.com` is present in the `static` folder or the build output.

## 4. Environment Variables
Ensure your GitHub Actions secrets or `.env.production` has:
- `VITE_GOOGLE_CLIENT_ID`: Your GCP Client ID.
- `VITE_PUBLIC_APP_URL`: `https://codexcryptica.com`
- `VITE_SHARED_GEMINI_KEY`: (Optional) Restricted to the domain.

## 5. Security Note
Always restrict your Google API Keys in the GCP Console to only allow requests from your production domain to prevent quota theft.
