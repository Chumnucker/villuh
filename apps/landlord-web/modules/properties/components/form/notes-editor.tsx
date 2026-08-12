"use client"

import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Button, PlatformIcon, cn, type PlatformIconName } from "@villuh/ui"

function ToolbarButton({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: PlatformIconName
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <PlatformIcon icon={icon} size={16} />
    </Button>
  )
}

/**
 * TipTap wrapper locked to the D-14 toolbar subset: bold, italic, bullet/numbered
 * lists, link, and H2/H3 headings only. Output is a sanitized-on-write HTML string
 * (server strips anything outside the allowlist — see `sanitize-notes.ts`).
 */
export function NotesEditor({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
}) {
  const editor = useEditor({
    // Pitfall 4: SSR hydration mismatch — defer first render to the client.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
          HTMLAttributes: { rel: "noopener noreferrer nofollow" },
        },
      }),
      Placeholder.configure({ placeholder: "Enter notes for this property…" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "rich-text-content min-h-32 focus:outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML()
      onChange(html === "<p></p>" ? "" : html)
    },
  })

  // Sync external resets (e.g. form.reset() after a successful save) back into the
  // editor — TipTap otherwise owns its own internal document state.
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const next = value || ""
    if (editor.getHTML() === (next || "<p></p>")) return
    editor.commands.setContent(next, { emitUpdate: false })
  }, [value, editor])

  if (!editor) return null

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-input p-2 space-y-2.5",
        "ring-offset-background focus-within:ring-1 focus-within:ring-ring/35 focus-within:ring-offset-1",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
      )}
      data-disabled={disabled || undefined}
    >
      <div className="flex items-center gap-1 bg-muted dark:bg-input p-1 rounded-xl">
        <ToolbarButton
          icon="IconBold"
          label="Bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon="IconItalic"
          label="Italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon="IconListBullets"
          label="Bullet list"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon="IconNumberedList"
          label="Numbered list"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          icon="IconChainLink1"
          label="Link"
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run()
              return
            }
            const url = window.prompt("Link URL")
            if (!url) return
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
          }}
        />
        <ToolbarButton
          icon="IconH2"
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          icon="IconH3"
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          "px-0.75",
          "[&_.ProseMirror]:min-h-32 [&_.ProseMirror]:outline-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
        )}
      />
    </div>
  )
}
