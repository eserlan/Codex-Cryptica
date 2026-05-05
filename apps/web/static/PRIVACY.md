# Privacy Policy

Codex Cryptica is designed with a **privacy-first, local-first** philosophy. We believe your campaign data and creative work belong to you, not us.

## 1. Data Storage

By default, all data you create in Codex Cryptica (lore, chronicles, images, maps, and world configuration) is stored exclusively in your browser's **Origin Private File System (OPFS)**.

- **No Server Storage:** We do not host your campaign data on our servers.
- **User Control:** You have full control over your data. Clearing your browser cache or deleting the application storage will remove your data.

## 2. Local Folder Synchronization (Optional)

You may choose to synchronize your campaign with a folder on your computer.

- **Direct Access:** This mirrors your internal data to a directory you select using the Web File System Access API.
- **Third-Party Providers:** If you choose a folder managed by a third-party service (like Dropbox or iCloud) through your operating system, those providers handle the transmission according to their own privacy policies. Codex Cryptica does not communicate with these services.

## 3. Google Drive Cloud Sync (Optional)

You may connect a vault to your personal Google Drive account for cloud backup and multi-device access. This feature uses Google's OAuth 2.0 authorization and the Google Drive API.

**What data is accessed:**

- **`drive.file` scope:** Used for normal vault backup and restore. Codex Cryptica can only access files and folders it has itself created in your Google Drive. It cannot read any other files in your Drive.
- **`drive.readonly` scope:** Requested only when you use the "Join a Shared Vault" feature to access a Drive folder shared with you by another user. This grants read-only access and is requested incrementally — only when you explicitly initiate that flow.

**How your data is handled:**

- Vault files are transferred directly from your browser to your Google Drive account. **Codex Cryptica has no servers that receive, store, or process your vault data.**
- Your Google OAuth access token is held in browser memory only. It is never written to disk or sent to Codex Cryptica.
- Codex Cryptica does not share your Google user data with any third party.
- Your use of Google Drive remains subject to [Google's Privacy Policy](https://policies.google.com/privacy).

**Revoking access:**

You can disconnect Google Drive at any time in **Settings → Cloud Sync → Disconnect**. You can also revoke the app's access entirely from your [Google Account permissions page](https://myaccount.google.com/permissions).

Codex Cryptica's use of data obtained through Google APIs complies with the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## 4. AI Features (Optional)

If you use the AI features (Lore Oracle, Image Generation), your data is processed as follows:

- **Google Gemini:** Snippets of your current campaign context (entities and chronicles) are sent to Google's Gemini API to provide reasoning and generation.
- **Data Usage:** According to Google's standard API terms, data sent via their paid/tier-based APIs is typically not used to train their global models.
- **Opt-out:** You can disable all AI features by enabling "AI Disabled" in the settings.

## 5. Analytics and Telemetry

Codex Cryptica does **not** include tracking pixels, third-party analytics (like Google Analytics), or hidden telemetry. We do not track your creative process or monitor your usage.

## 6. Third-Party Services

- **Web Fonts:** We may load fonts from Google Fonts.
- **Icons:** We use icon sets which are bundled with the application.

## 7. Changes to this Policy

We may update this policy to reflect changes in our storage architecture or feature set. The principle of "Local-First" will remain our core commitment.

---

**Last Updated:** May 2026
