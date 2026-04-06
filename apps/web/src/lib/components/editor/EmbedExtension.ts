import { Node, mergeAttributes } from "@tiptap/core";
import { SvelteNodeViewRenderer } from "svelte-tiptap";
import EmbedWidget from "./EmbedWidget.svelte";

export const EmbedExtension = Node.create({
  name: "embedWidget",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "embed-widget",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["embed-widget", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    // Cast to any to bypass strict Svelte 5 type checks in this integration layer
    return SvelteNodeViewRenderer(EmbedWidget as any);
  },
});
