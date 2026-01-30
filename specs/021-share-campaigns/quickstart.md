# Quickstart: Campaign Sharing

## Prerequisites

- A Google Cloud Project with the Drive API enabled.
- An **API Key** created in the Google Cloud Console.
  - *Recommended*: Restrict this key to the HTTP Referrer of your development (localhost) or production URL.
- Set `VITE_GOOGLE_API_KEY` in your `.env` file.

## Testing the Share Flow (Owner)

1. **Enable Cloud Bridge**:
   - Go to Settings -> Cloud.
   - Connect Google Drive.
2. **Share a Campaign**:
   - Open a Campaign.
   - Go to Settings -> Share.
   - Click "Generate Share Link".
   - Copy the link (e.g., `http://localhost:5173/?shareId=...`).

## Testing the View Flow (Guest)

1. **Open Incognito Window**:
   - To simulate a non-authenticated user.
2. **Paste Link**:
   - Navigate to the copied link.
3. **Guest Login**:
   - Enter a "Temporary Username" (e.g., "Bard_Guest").
4. **Verify**:
   - The campaign loads.
   - You can navigate the graph.
   - You **cannot** edit text or move nodes (UI should be locked).
