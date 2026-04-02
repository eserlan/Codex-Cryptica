# Contract: CampaignService

The `CampaignService` and `ActivityService` MUST be implemented as **classes** that accept their dependencies via the constructor, allowing for unit tests to pass in mock databases or other mocked services.

```typescript
export interface CampaignMetadata {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
}

export interface RecentActivity {
  id: string;
  title: string;
  path: string;
  excerpt: string;
  tags: string[];
  lastModified: number;
}

/**
 * Interface definition for CampaignService.
 * Implementation class must be exported alongside a default singleton instance.
 */
export interface CampaignService {
  /**
   * Fetches the primary metadata for the campaign.
   */
  getMetadata(vaultId: string): Promise<CampaignMetadata>;

  /**
   * Updates vault-level metadata (description, cover image).
   */
  updateMetadata(
    vaultId: string,
    metadata: Partial<CampaignMetadata>,
  ): Promise<void>;

  /**
   * Searches for the entity designated as the front page via the "frontpage" tag.
   * Returns null if no such entity exists.
   */
  getFrontPageEntity(
    vaultId: string,
  ): Promise<{ id: string; content: string } | null>;

  /**
   * Retrieves a list of recently modified entities as summary "cards".
   */
  getRecentActivity(vaultId: string, limit: number): Promise<RecentActivity[]>;

  /**
   * Generates a campaign cover image via the Oracle.
   */
  generateCoverImage(vaultId: string, promptBase: string): Promise<string>;
}
```

## Implementation Example (with DI)

```typescript
export class CampaignServiceImplementation implements CampaignService {
  constructor(private db: EntityDb = entityDb) {}

  async getMetadata(vaultId: string): Promise<CampaignMetadata> {
    const record = await this.db.vaultMetadata.get(vaultId);
    // ... logic
  }
}

export const campaignService = new CampaignServiceImplementation();
```
