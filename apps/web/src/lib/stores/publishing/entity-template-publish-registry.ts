import { getDB } from "$lib/utils/idb";
import {
  deleteTemplateOwnerToken,
  getTemplateOwnerToken,
  saveTemplateOwnerToken,
} from "./template-publish-registry";

/**
 * Remembers, on this device only, which local template was published as which
 * listing, and the owner token that controls it. Nothing here is written into
 * the vault, a template file, an export or a backup, so sharing or syncing a
 * vault never leaks publish credentials.
 */
export interface PublishLink {
  listingId: string;
  status: "active" | "unpublished";
  publishedAt: string;
}

export interface SettingsKv {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export interface EntityTemplatePublishRegistryDeps {
  kv: SettingsKv;
  saveToken: (listingId: string, token: string) => Promise<void>;
  getToken: (listingId: string) => Promise<string | undefined>;
  deleteToken: (listingId: string) => Promise<void>;
}

const LINK = "entityTemplatePublishLink:";
const REPORTED = "entityTemplateReported:";
const linkKey = (vaultId: string, templateId: string) =>
  `${LINK}${vaultId}:${templateId}`;

const idbKv: SettingsKv = {
  get: async (key) => (await getDB()).get("settings", key),
  put: async (key, value) => {
    await (await getDB()).put("settings", value, key);
  },
  delete: async (key) => (await getDB()).delete("settings", key),
  keys: async () => (await (await getDB()).getAllKeys("settings")).map(String),
};

export class EntityTemplatePublishRegistry {
  private readonly deps: EntityTemplatePublishRegistryDeps;

  constructor(deps: Partial<EntityTemplatePublishRegistryDeps> = {}) {
    this.deps = {
      kv: idbKv,
      saveToken: saveTemplateOwnerToken,
      getToken: getTemplateOwnerToken,
      deleteToken: deleteTemplateOwnerToken,
      ...deps,
    };
  }

  async getLink(
    vaultId: string,
    templateId: string,
  ): Promise<PublishLink | undefined> {
    const value = await this.deps.kv.get(linkKey(vaultId, templateId));
    return isLink(value) ? value : undefined;
  }

  /** Every link in a vault, keyed by template id. */
  async linksForVault(vaultId: string): Promise<Map<string, PublishLink>> {
    const prefix = `${LINK}${vaultId}:`;
    const out = new Map<string, PublishLink>();
    for (const key of await this.deps.kv.keys()) {
      if (!key.startsWith(prefix)) continue;
      const value = await this.deps.kv.get(key);
      if (isLink(value)) out.set(key.slice(prefix.length), value);
    }
    return out;
  }

  /**
   * Links a template to a listing and remembers the token. A listing can be
   * linked from only one template per vault, so any earlier link to the same
   * listing in this vault is replaced.
   */
  async link(
    vaultId: string,
    templateId: string,
    link: PublishLink,
    ownerToken?: string,
  ): Promise<void> {
    for (const [otherId, existing] of await this.linksForVault(vaultId)) {
      if (otherId !== templateId && existing.listingId === link.listingId) {
        await this.deps.kv.delete(linkKey(vaultId, otherId));
      }
    }
    if (ownerToken) await this.deps.saveToken(link.listingId, ownerToken);
    await this.deps.kv.put(linkKey(vaultId, templateId), link);
  }

  async setStatus(
    vaultId: string,
    templateId: string,
    status: PublishLink["status"],
  ): Promise<void> {
    const current = await this.getLink(vaultId, templateId);
    if (current)
      await this.deps.kv.put(linkKey(vaultId, templateId), {
        ...current,
        status,
      });
  }

  /** Removes the link and, when asked, the saved token as well. */
  async unlink(
    vaultId: string,
    templateId: string,
    options: { forgetToken?: boolean } = {},
  ): Promise<void> {
    const current = await this.getLink(vaultId, templateId);
    await this.deps.kv.delete(linkKey(vaultId, templateId));
    if (current && options.forgetToken) {
      await this.deps.deleteToken(current.listingId);
    }
  }

  /** Remembers a token without linking (used while recovery is in progress). */
  async saveOwnerToken(listingId: string, token: string): Promise<void> {
    await this.deps.saveToken(listingId, token);
  }

  async forgetOwnerToken(listingId: string): Promise<void> {
    await this.deps.deleteToken(listingId);
  }

  getOwnerToken(listingId: string): Promise<string | undefined> {
    return this.deps.getToken(listingId);
  }

  async markReported(listingId: string): Promise<void> {
    await this.deps.kv.put(`${REPORTED}${listingId}`, true);
  }

  async hasReported(listingId: string): Promise<boolean> {
    return (await this.deps.kv.get(`${REPORTED}${listingId}`)) === true;
  }
}

function isLink(value: unknown): value is PublishLink {
  const v = value as PublishLink | undefined;
  return (
    !!v &&
    typeof v.listingId === "string" &&
    (v.status === "active" || v.status === "unpublished") &&
    typeof v.publishedAt === "string"
  );
}

export const entityTemplatePublishRegistry =
  new EntityTemplatePublishRegistry();
