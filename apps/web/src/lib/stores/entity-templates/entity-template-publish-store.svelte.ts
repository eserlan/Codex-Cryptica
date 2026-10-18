import {
  exportTemplatePackage,
  type EntityTemplate,
} from "entity-template-engine";
import {
  toPublicEntityPackage,
  validateEntityTemplatePublishMetadata,
  type EntityTemplateListing,
} from "schema";
import {
  EntityTemplateDirectoryError,
  publicEntityTemplateDirectoryService,
  type PublicEntityTemplateDirectoryService,
} from "$lib/services/publishing/PublicEntityTemplateDirectoryService";
import {
  entityTemplatePublishRegistry,
  type EntityTemplatePublishRegistry,
  type PublishLink,
} from "$lib/stores/publishing/entity-template-publish-registry";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
import { entityTemplateStore } from "./entity-template-store.svelte";

export interface PublishMetadata {
  description: string;
  labels: string[];
  ownerDisplayName?: string;
}

export interface EntityTemplatePublishDeps {
  service: Pick<
    PublicEntityTemplateDirectoryService,
    | "publishEntityTemplate"
    | "updateEntityTemplate"
    | "unpublishEntityTemplate"
    | "deleteEntityTemplate"
    | "verifyOwner"
  >;
  registry: Pick<
    EntityTemplatePublishRegistry,
    | "getLink"
    | "linksForVault"
    | "link"
    | "setStatus"
    | "unlink"
    | "getOwnerToken"
    | "saveOwnerToken"
    | "forgetOwnerToken"
  >;
  templates: {
    readonly list: EntityTemplate[];
    readonly canEdit: boolean;
    create(draft: {
      name: string;
      entityType: string;
      markdown: string;
    }): Promise<EntityTemplate>;
  };
  getVaultId: () => string | null;
}

export type RecoverResult =
  | { status: "linked"; templateId: string; listing: EntityTemplateListing }
  | {
      status: "choose";
      candidates: EntityTemplate[];
      listing: EntityTemplateListing;
    }
  | { status: "none"; listing: EntityTemplateListing };

const READ_ONLY = "Templates can't be published or changed from this vault.";
const invalid = (message: string) =>
  new EntityTemplateDirectoryError(message, "validation");
const norm = (s: string) => s.trim().toLowerCase();

/**
 * Publishing state for the vault's own templates: which are published from this
 * device, and the publish, update, unpublish, delete and recover actions. The
 * link and owner token live in device storage only (see the registry).
 */
export class EntityTemplatePublishStore {
  links = $state<Record<string, PublishLink>>({});

  constructor(private deps: EntityTemplatePublishDeps) {}

  private vaultId(): string {
    const id = this.deps.getVaultId();
    if (!id) throw invalid("Open a vault first.");
    return id;
  }

  private requireEditable() {
    if (!this.deps.templates.canEdit) throw invalid(READ_ONLY);
  }

  private userTemplate(templateId: string): EntityTemplate {
    const found = this.deps.templates.list.find((t) => t.id === templateId);
    if (!found) throw invalid("That template no longer exists.");
    if (found.source !== "user") {
      throw invalid("Duplicate this template first, then publish your copy.");
    }
    return found;
  }

  async loadLinks(): Promise<void> {
    const vault = this.deps.getVaultId();
    if (!vault) {
      this.links = {};
      return;
    }
    this.links = Object.fromEntries(
      await this.deps.registry.linksForVault(vault),
    );
  }

  linkFor(templateId: string): PublishLink | undefined {
    return this.links[templateId];
  }

  /** What the row should offer for a template. */
  publishState(
    t: EntityTemplate,
  ):
    | { kind: "duplicate-first" }
    | { kind: "unavailable" }
    | { kind: "publish" }
    | { kind: "published"; link: PublishLink } {
    if (t.source !== "user") return { kind: "duplicate-first" };
    if (!this.deps.templates.canEdit) return { kind: "unavailable" };
    const link = this.links[t.id];
    return link ? { kind: "published", link } : { kind: "publish" };
  }

  private buildPackage(t: EntityTemplate) {
    const result = toPublicEntityPackage(
      exportTemplatePackage({
        name: t.name,
        entityType: t.entityType,
        markdown: t.markdown,
      }),
    );
    if (!result.ok) throw invalid(result.error);
    return result.package;
  }

  private checkMetadata(meta: PublishMetadata) {
    const issues = validateEntityTemplatePublishMetadata(meta);
    if (issues.length) throw invalid(issues[0].message);
  }

  private async token(listingId: string): Promise<string> {
    const token = await this.deps.registry.getOwnerToken(listingId);
    if (!token) {
      throw new EntityTemplateDirectoryError(
        "This device doesn't have the owner token for that listing. Use Recover owner controls and enter it.",
        "unauthorized",
      );
    }
    return token;
  }

  /** Publishes a user template. The link is saved only after the server confirms. */
  async publish(
    templateId: string,
    meta: PublishMetadata,
  ): Promise<{
    listing: EntityTemplateListing;
    ownerToken: string;
    linkSaved: boolean;
  }> {
    this.requireEditable();
    const vault = this.vaultId();
    const template = this.userTemplate(templateId);
    if (this.links[templateId]) {
      throw invalid("This template is already published. Update it instead.");
    }
    this.checkMetadata(meta);
    const pkg = this.buildPackage(template);

    const { listing, ownerToken } =
      await this.deps.service.publishEntityTemplate({ package: pkg, ...meta });

    const link: PublishLink = {
      listingId: listing.listingId,
      status: "active",
      publishedAt: listing.listingUpdatedAt,
    };
    let linkSaved = true;
    try {
      await this.deps.registry.link(vault, templateId, link, ownerToken);
      this.links = { ...this.links, [templateId]: link };
    } catch {
      // The listing exists; the modal still shows the token so it isn't lost.
      linkSaved = false;
    }
    return { listing, ownerToken, linkSaved };
  }

  /** Metadata of a published template, to prefill the update form. */
  async loadOwnerMeta(templateId: string): Promise<PublishMetadata> {
    const link = this.requireLink(templateId);
    const { listing } = await this.deps.service.verifyOwner(
      link.listingId,
      await this.token(link.listingId),
    );
    return {
      description: listing.description,
      labels: listing.labels,
      ownerDisplayName: listing.ownerDisplayName,
    };
  }

  private requireLink(templateId: string): PublishLink {
    const link = this.links[templateId];
    if (!link) throw invalid("This template isn't published from this device.");
    return link;
  }

  /** Sends the current template text and metadata. Also republishes. */
  async update(
    templateId: string,
    meta: PublishMetadata,
  ): Promise<EntityTemplateListing> {
    this.requireEditable();
    const vault = this.vaultId();
    const template = this.userTemplate(templateId);
    const link = this.requireLink(templateId);
    this.checkMetadata(meta);
    const listing = await this.deps.service.updateEntityTemplate(
      link.listingId,
      { package: this.buildPackage(template), ...meta },
      await this.token(link.listingId),
    );
    await this.setStatus(vault, templateId, "active");
    return listing;
  }

  async unpublish(templateId: string): Promise<void> {
    await this.unpublishListing(this.requireLink(templateId).listingId);
  }

  /** Permanently deletes the listing. Local state is cleared only on success. */
  async remove(templateId: string): Promise<void> {
    await this.deleteListing(this.requireLink(templateId).listingId);
  }

  private templatesLinkedTo(listingId: string): string[] {
    return Object.entries(this.links)
      .filter(([, l]) => l.listingId === listingId)
      .map(([id]) => id);
  }

  /** Whether this device holds the owner token for a listing. */
  async hasOwnerToken(listingId: string): Promise<boolean> {
    return Boolean(await this.deps.registry.getOwnerToken(listingId));
  }

  /** Current status of a listing this device owns (works while it is unpublished). */
  async ownerStatus(listingId: string): Promise<"active" | "unpublished"> {
    const { listing } = await this.deps.service.verifyOwner(
      listingId,
      await this.token(listingId),
    );
    return listing.status;
  }

  async unpublishListing(listingId: string): Promise<void> {
    this.requireEditable();
    const vault = this.vaultId();
    await this.deps.service.unpublishEntityTemplate(
      listingId,
      await this.token(listingId),
    );
    for (const id of this.templatesLinkedTo(listingId)) {
      await this.setStatus(vault, id, "unpublished");
    }
  }

  /** Puts an unpublished listing back, using the text and details it already has. */
  async republishListing(listingId: string): Promise<EntityTemplateListing> {
    this.requireEditable();
    const vault = this.vaultId();
    const token = await this.token(listingId);
    const { listing, package: pkg } = await this.deps.service.verifyOwner(
      listingId,
      token,
    );
    const updated = await this.deps.service.updateEntityTemplate(
      listingId,
      {
        package: pkg,
        description: listing.description,
        labels: listing.labels,
        ownerDisplayName: listing.ownerDisplayName,
      },
      token,
    );
    for (const id of this.templatesLinkedTo(listingId)) {
      await this.setStatus(vault, id, "active");
    }
    return updated;
  }

  async deleteListing(listingId: string): Promise<void> {
    this.requireEditable();
    const vault = this.vaultId();
    await this.deps.service.deleteEntityTemplate(
      listingId,
      await this.token(listingId),
    );
    const linked = this.templatesLinkedTo(listingId);
    for (const id of linked) {
      await this.deps.registry.unlink(vault, id, { forgetToken: true });
    }
    await this.deps.registry.forgetOwnerToken(listingId);
    const next = { ...this.links };
    for (const id of linked) delete next[id];
    this.links = next;
  }

  private async setStatus(
    vault: string,
    templateId: string,
    status: PublishLink["status"],
  ) {
    await this.deps.registry.setStatus(vault, templateId, status);
    const current = this.links[templateId];
    if (current)
      this.links = { ...this.links, [templateId]: { ...current, status } };
  }

  /**
   * Restores owner controls from a saved token. Nothing is saved or linked when
   * the token is wrong or the operator removed the listing.
   */
  async recover(listingId: string, token: string): Promise<RecoverResult> {
    this.requireEditable();
    const vault = this.vaultId();
    const { listing, package: pkg } = await this.deps.service.verifyOwner(
      listingId,
      token.trim(),
    );

    const users = this.deps.templates.list.filter((t) => t.source === "user");
    const matches = users.filter(
      (t) =>
        norm(t.name) === norm(pkg.template.name) &&
        norm(t.entityType) === norm(pkg.template.entityType),
    );
    if (matches.length === 1) {
      await this.linkTemplate(vault, matches[0].id, listing, token.trim());
      return { status: "linked", templateId: matches[0].id, listing };
    }
    await this.deps.registry.saveOwnerToken(listingId, token.trim());
    return matches.length > 1
      ? { status: "choose", candidates: matches, listing }
      : { status: "none", listing };
  }

  /** Links a chosen local template to a recovered listing. */
  async relink(listingId: string, templateId: string): Promise<void> {
    this.requireEditable();
    const vault = this.vaultId();
    this.userTemplate(templateId);
    const token = await this.token(listingId);
    const { listing } = await this.deps.service.verifyOwner(listingId, token);
    await this.linkTemplate(vault, templateId, listing, token);
  }

  /** For a recovered listing with no matching local template: install its text as one. */
  async installCopyAndLink(listingId: string): Promise<EntityTemplate> {
    this.requireEditable();
    const vault = this.vaultId();
    const token = await this.token(listingId);
    const { listing, package: pkg } = await this.deps.service.verifyOwner(
      listingId,
      token,
    );
    const created = await this.deps.templates.create({
      name: pkg.template.name,
      entityType: pkg.template.entityType,
      markdown: pkg.template.markdown,
    });
    await this.linkTemplate(vault, created.id, listing, token);
    return created;
  }

  private async linkTemplate(
    vault: string,
    templateId: string,
    listing: EntityTemplateListing,
    token: string,
  ) {
    const link: PublishLink = {
      listingId: listing.listingId,
      status: listing.status,
      publishedAt: listing.listingUpdatedAt,
    };
    await this.deps.registry.link(vault, templateId, link, token);
    // A listing is linked from one template per vault.
    const others = Object.entries(this.links).filter(
      ([id, l]) => id !== templateId && l.listingId === link.listingId,
    );
    const next = { ...this.links, [templateId]: link };
    for (const [id] of others) delete next[id];
    this.links = next;
  }
}

export const entityTemplatePublishStore = new EntityTemplatePublishStore({
  service: publicEntityTemplateDirectoryService,
  registry: entityTemplatePublishRegistry,
  templates: entityTemplateStore,
  getVaultId: () => vaultRegistry.activeVaultId,
});
