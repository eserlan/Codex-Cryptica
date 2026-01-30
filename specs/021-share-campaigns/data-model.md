# Data Model: Campaign Sharing

## Entities

### Campaign (Extension)

The `Campaign` (or `Vault`) metadata entity needs extension to support sharing.

```typescript
interface CampaignMetadata {
  id: string;
  name: string;
  // ... existing fields
  
  /**
   * Google Drive File ID for the sync file.
   * Required for generating the share link.
   */
  gdriveFileId?: string;

  /**
   * The sharing status of the campaign.
   * - 'private': Only accessible by owner.
   * - 'public': Accessible via link (read-only).
   */
  shareStatus: 'private' | 'public';

  /**
   * The generated public link (cached).
   */
  shareLink?: string;
}
```

### Guest Session (Client-Side Only)

Transient state for a visitor.

```typescript
interface GuestSession {
  /**
   * The visitor's temporary username.
   */
  username: string;

  /**
   * The ID of the file being viewed.
   */
  fileId: string;

  /**
   * Timestamp when the session started.
   */
  connectedAt: number;
}
```
