import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Link from "@tiptap/extension-link";

const editor = new Editor({
  extensions: [StarterKit, Markdown.configure({ html: true }), Link],
  content:
    '<p>Here is a <a href="entity:123">Corum</a> link and a <strong>Corum</strong> bold text.</p>',
});

console.log(editor.storage.markdown.getMarkdown());
