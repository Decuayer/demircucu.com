"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Pilcrow
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-violet-500 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full my-4 border border-border/50',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "İçeriğinizi buraya yazın...",
      }),
    ],
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL girin', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('Görsel URL si girin');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-background/50 flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border/50 bg-muted/20">
        <Button
          type="button" variant="ghost" size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent text-accent-foreground' : ''}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button" variant="ghost" size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent text-accent-foreground' : ''}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button" variant="ghost" size="icon"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-accent text-accent-foreground' : ''}
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button" variant="ghost" size="icon"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={editor.isActive('paragraph') ? 'bg-accent text-accent-foreground' : ''}
          title="Paragraf"
        >
          <Pilcrow className="w-4 h-4" />
        </Button>
        <Button
          type="button" variant="ghost" size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-accent text-accent-foreground' : ''}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          type="button" variant="ghost" size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-accent text-accent-foreground' : ''}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          type="button" variant="ghost" size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-accent text-accent-foreground' : ''}
        >
          <Heading3 className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button" variant="ghost" size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button" variant="ghost" size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : ''}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button" variant="ghost" size="icon"
          onClick={addLink}
          className={editor.isActive('link') ? 'bg-accent text-accent-foreground' : ''}
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={addImage}>
          <ImageIcon className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor Content Area */}
      <div className="p-4 min-h-[300px] cursor-text prose dark:prose-invert max-w-none focus:outline-none">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ProseMirror {
          min-height: 300px;
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 {
          font-size: 2.25em !important;
          font-weight: 800 !important;
          line-height: 1.1 !important;
          margin-top: 1.5em !important;
          margin-bottom: 0.5em !important;
        }
        .ProseMirror h2 {
          font-size: 1.5em !important;
          font-weight: 700 !important;
          line-height: 1.3 !important;
          margin-top: 1.5em !important;
          margin-bottom: 0.5em !important;
        }
        .ProseMirror h3 {
          font-size: 1.25em !important;
          font-weight: 600 !important;
          line-height: 1.4 !important;
          margin-top: 1.5em !important;
          margin-bottom: 0.5em !important;
        }
        .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 1.5em !important;
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
        }
        .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 1.5em !important;
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
        }
        .ProseMirror li {
          margin-top: 0.25em !important;
          margin-bottom: 0.25em !important;
        }
        .ProseMirror li p {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }
        .ProseMirror p {
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
          line-height: 1.7 !important;
        }
        .ProseMirror a {
          color: #8b5cf6 !important;
          text-decoration: underline !important;
        }
        .ProseMirror strong {
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  );
}
