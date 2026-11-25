"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Pilcrow,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Accessible name of the editing area, usually the visible field label. */
  label?: string;
}

export function RichTextEditor({ content, onChange, placeholder, label }: RichTextEditorProps) {
  const t = useTranslations("editor");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [
      // The link extension is configured below; StarterKit would register a second one.
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-violet-500 underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-xl max-w-full my-4 border border-border/50",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || t("placeholder"),
      }),
    ],
    content: content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": label ?? t("content"),
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const openLinkDialog = () => {
    setLinkUrl((editor.getAttributes("link").href as string | undefined) ?? "");
  };

  const chain = () => editor.chain().focus();
  const groups: {
    label: string;
    icon: typeof Bold;
    run: () => void;
    active?: boolean;
    disabled?: boolean;
  }[][] = [
    [
      {
        label: t("bold"),
        icon: Bold,
        run: () => chain().toggleBold().run(),
        active: editor.isActive("bold"),
      },
      {
        label: t("italic"),
        icon: Italic,
        run: () => chain().toggleItalic().run(),
        active: editor.isActive("italic"),
      },
      {
        label: t("strike"),
        icon: Strikethrough,
        run: () => chain().toggleStrike().run(),
        active: editor.isActive("strike"),
      },
    ],
    [
      {
        label: t("paragraph"),
        icon: Pilcrow,
        run: () => chain().setParagraph().run(),
        active: editor.isActive("paragraph"),
      },
      ...([1, 2, 3] as const).map((level) => ({
        label: t("heading", { level }),
        icon: [Heading1, Heading2, Heading3][level - 1]!,
        run: () => chain().toggleHeading({ level }).run(),
        active: editor.isActive("heading", { level }),
      })),
    ],
    [
      {
        label: t("bulletList"),
        icon: List,
        run: () => chain().toggleBulletList().run(),
        active: editor.isActive("bulletList"),
      },
      {
        label: t("orderedList"),
        icon: ListOrdered,
        run: () => chain().toggleOrderedList().run(),
        active: editor.isActive("orderedList"),
      },
    ],
    [
      { label: t("link"), icon: LinkIcon, run: openLinkDialog, active: editor.isActive("link") },
      { label: t("image"), icon: ImageIcon, run: () => setPickerOpen(true) },
    ],
    [
      {
        label: t("undo"),
        icon: Undo,
        run: () => chain().undo().run(),
        disabled: !editor.can().undo(),
      },
      {
        label: t("redo"),
        icon: Redo,
        run: () => chain().redo().run(),
        disabled: !editor.can().redo(),
      },
    ],
  ];

  const applyLink = () => {
    const url = (linkUrl ?? "").trim();
    setLinkUrl(null);
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-background/50">
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label={t("toolbar")}
        className="flex flex-wrap items-center gap-1 border-b border-border/50 bg-muted/20 p-2"
      >
        {groups.map((group, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <div aria-hidden className="mx-1 h-6 w-px bg-border" />}
            {group.map((tool) => (
              <Button
                key={tool.label}
                type="button"
                variant="ghost"
                size="icon"
                onClick={tool.run}
                disabled={tool.disabled}
                aria-label={tool.label}
                title={tool.label}
                aria-pressed={tool.active === undefined ? undefined : tool.active}
                className={tool.active ? "bg-accent text-accent-foreground" : ""}
              >
                <tool.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        ))}
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(image) => editor.chain().focus().setImage(image).run()}
      />
      <Dialog open={linkUrl !== null} onOpenChange={(open) => !open && setLinkUrl(null)}>
        <DialogContent className="border-border/50 bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("link")}</DialogTitle>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyLink();
            }}
          >
            <Input
              type="url"
              value={linkUrl ?? ""}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
              aria-label={t("linkUrl")}
              autoFocus
            />
            <Button type="submit">{t("apply")}</Button>
          </form>
          <p className="text-xs text-muted-foreground">{t("linkHint")}</p>
        </DialogContent>
      </Dialog>

      {/* Editor Content Area */}
      <div className="prose min-h-[300px] max-w-none cursor-text p-4 focus:outline-none dark:prose-invert">
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
