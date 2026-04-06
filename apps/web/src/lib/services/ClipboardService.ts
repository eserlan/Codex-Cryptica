import { marked as defaultMarked } from "marked";
import defaultDOMPurify from "dompurify";
import type { Entity } from "schema";
import { browser } from "$app/environment";

export interface ClipboardDependencies {
  clipboard?: Clipboard;
  fetch?: typeof fetch;
  document?: Document;
  marked?: typeof defaultMarked;
  domPurify?: typeof defaultDOMPurify;
}

export class ClipboardService {
  private clipboard: Clipboard;
  private fetch: typeof fetch;
  private document: Document;
  private marked: typeof defaultMarked;
  private domPurify: typeof defaultDOMPurify;

  constructor(deps: ClipboardDependencies = {}) {
    this.clipboard =
      deps.clipboard ??
      (typeof navigator !== "undefined"
        ? navigator.clipboard
        : ({} as Clipboard));
    this.fetch =
      deps.fetch ??
      (typeof fetch !== "undefined" ? fetch.bind(window) : ({} as any));
    this.document =
      deps.document ??
      (typeof document !== "undefined" ? document : ({} as Document));
    this.marked = deps.marked ?? defaultMarked;
    this.domPurify = deps.domPurify ?? defaultDOMPurify;
  }

  async copyEntity(
    entity: Entity,
    resolvedImageUrl?: string,
  ): Promise<boolean> {
    try {
      const title = entity.title || "Untitled";
      // Simple escape for HTML attributes and content
      const escapedTitle = title
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

      // Render Markdown
      const rawChronicle = await this.marked.parse(entity.content || "");
      const chronicleHtml = browser
        ? this.domPurify.sanitize(rawChronicle, {
            ALLOWED_URI_REGEXP:
              /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i,
          })
        : rawChronicle;

      let rawLore = "";
      if (entity.lore) {
        rawLore = await this.marked.parse(entity.lore);
      }
      const loreHtml = entity.lore
        ? browser
          ? this.domPurify.sanitize(rawLore, {
              ALLOWED_URI_REGEXP:
                /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i,
            })
          : rawLore
        : "";

      let imageHtml = "";
      let imageBlob: Blob | null = null;

      if (resolvedImageUrl) {
        try {
          const response = await this.fetch(resolvedImageUrl);
          const originalBlob = await response.blob();

          const img = new Image();
          img.src = URL.createObjectURL(originalBlob);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          const canvas = this.document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);

          // Get PNG as Blob for direct clipboard inclusion
          imageBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png"),
          );

          // Use a placeholder src in HTML; browsers/Doc editors will resolve it
          // from the image/png blob in the same ClipboardItem
          imageHtml = `<img src="entity-image.png" alt="${escapedTitle}" style="max-width: 100%;" /><br/>`;

          URL.revokeObjectURL(img.src);
        } catch (e) {
          console.warn(
            "[ClipboardService] Could not process image for copy",
            e,
          );
        }
      }

      // Construct HTML Document
      const html = `
                <html>
                <body>
                    <h1 style="font-family: serif;">${escapedTitle}</h1>
                    ${imageHtml}
                    <h2 style="font-family: serif; color: #166534;">Chronicle</h2>
                    <div style="font-family: sans-serif; line-height: 1.6;">${chronicleHtml}</div>
                    ${
                      loreHtml
                        ? `<h2 style="font-family: serif; color: #92400e;">Deep Lore</h2>
                               <div style="font-family: sans-serif; line-height: 1.6; font-style: italic;">${loreHtml}</div>`
                        : ""
                    }
                </body>
                </html>
            `;

      // Construct Plain Text
      let text = `${title}\n\n`;
      text += `CHRONICLE:\n${entity?.content || ""}\n\n`;
      if (entity?.lore) {
        text += `DEEP LORE:\n${entity.lore}\n`;
      }

      const clipboardData: Record<string, Blob> = {
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      };

      if (imageBlob) {
        clipboardData["image/png"] = imageBlob;
      }

      const data = [new ClipboardItem(clipboardData)];

      await this.clipboard.write(data);
      return true;
    } catch (err) {
      console.error("[ClipboardService] Failed to copy", err);
      // Fallback to plain text
      try {
        await this.clipboard.writeText(
          `${entity?.title || ""}\n\n${entity?.content || ""}`,
        );
        return true;
      } catch (innerErr) {
        console.error("[ClipboardService] Total copy failure", innerErr);
        return false;
      }
    }
  }

  async copyHtmlAndText(html: string, text: string): Promise<boolean> {
    try {
      const data = [
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ];

      await this.clipboard.write(data);
      return true;
    } catch (err) {
      console.error("[ClipboardService] Failed to copy rich text", err);

      try {
        await this.clipboard.writeText(text);
        return true;
      } catch (innerErr) {
        console.error("[ClipboardService] Total copy failure", innerErr);
        return false;
      }
    }
  }
}

export const clipboardService = new ClipboardService();
