import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import type { Entity } from "schema";

export class ClipboardService {
  constructor() {}

  async copyEntity(
    entity: Entity,
    resolvedImageUrl?: string,
  ): Promise<boolean> {
    try {
      // Render Markdown
      const chronicleHtml = DOMPurify.sanitize(
        await marked.parse(entity.content || ""),
      );
      const loreHtml = entity.lore
        ? DOMPurify.sanitize(await marked.parse(entity.lore))
        : "";

      let imageHtml = "";
      let imageBlob: Blob | null = null;

      if (resolvedImageUrl) {
        try {
          const response = await fetch(resolvedImageUrl);
          const originalBlob = await response.blob();

          const img = new Image();
          img.src = URL.createObjectURL(originalBlob);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          const canvas = document.createElement("canvas");
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
          imageHtml = `<img src="entity-image.png" alt="${entity.title}" style="max-width: 100%;" /><br/>`;

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
                    <h1 style="font-family: serif;">${entity.title}</h1>
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
      let text = `${entity?.title || ""}\n\n`;
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

      await navigator.clipboard.write(data);
      return true;
    } catch (err) {
      console.error("[ClipboardService] Failed to copy", err);
      // Fallback to plain text
      try {
        await navigator.clipboard.writeText(
          `${entity?.title || ""}\n\n${entity?.content || ""}`,
        );
        return true;
      } catch (innerErr) {
        console.error("[ClipboardService] Total copy failure", innerErr);
        return false;
      }
    }
  }
}

export const clipboardService = new ClipboardService();
