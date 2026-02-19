/**
 * Google Drive API Configuration
 */
export const GOOGLE_DRIVE_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  SCOPES: "https://www.googleapis.com/auth/drive.file",
  DISCOVERY_DOC: "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
  API_BASE: "https://www.googleapis.com/drive/v3/files",
  UPLOAD_BASE: "https://www.googleapis.com/upload/drive/v3/files",
} as const;
