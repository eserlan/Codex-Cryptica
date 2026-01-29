# Quickstart: Google Drive Cloud Bridge

**Feature**: Google Drive Cloud Bridge
**Branch**: `003-gdrive-mirroring`

## Prerequisites

1.  **Google Cloud Console Project**:
    - Go to [Google Cloud Console](https://console.cloud.google.com/).
    - Create a new project "Codex Cryptica".
    - Enable **Google Drive API**.
    - Configure **OAuth Consent Screen**:
      - User Type: External (or Internal for testing).
      - Scopes: `.../auth/drive.file`.
    - Create **Credentials**:
      - Type: **OAuth Client ID**.
      - Application Type: **Web application**.
      - Authorized JavaScript origins: `http://localhost:5173` (and production URL).

2.  **Environment Variables**:
    - Create/Edit `.env` in `apps/web`:
      ```bash
      VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
      ```

## Enabling the Feature

1.  **Start the App**:

    ```bash
    npm run dev
    ```

2.  **Access Settings**:
    - Open the application.
    - Navigate to **Settings** > **Cloud Bridge**.

3.  **Connect**:
    - Toggle "Enable Cloud Bridge".
    - A Google Popup will appear.
    - Sign in and authorize the application.

4.  **Verify**:
    - Check the console logs.
    - Create a new Lore Note.
    - Wait 5 minutes or trigger manual sync.
    - Check your Google Drive for a "Codex Cryptica" folder containing the file.

## Troubleshooting

- **Popup Blocked**: Ensure browser allows popups for localhost.
- **403/401 Errors**: Token might be expired. Toggle off/on to re-authenticate.
- **"Verified App" Warning**: Since the app is unverified by Google, you may see a warning screen. Click "Advanced" -> "Go to (unsafe)" for development.
