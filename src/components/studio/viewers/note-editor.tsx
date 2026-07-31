"use client";

import type { Editor } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  CodeXml,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Merge,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Split,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import "./note-editor.css";

const STATIC_NOTE_EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
    underline: false,
  }),
  Underline,
  Highlight.configure({ multicolor: false }),
  Subscript,
  Superscript,
  TaskItem.configure({ nested: true }),
  TaskList,
  TableKit.configure({
    table: {
      resizable: true,
      lastColumnResizable: true,
      renderWrapper: true,
      cellMinWidth: 72,
      HTMLAttributes: { class: "note-table" },
    },
    tableCell: {
      HTMLAttributes: { class: "note-table-cell" },
    },
    tableHeader: {
      HTMLAttributes: { class: "note-table-header" },
    },
  }),
  Placeholder.configure({
    placeholder: "Start writing...",
  }),
  TextAlign.configure({
    types: ["heading", "paragraph", "tableCell", "tableHeader"],
  }),
];

function NoteTableMenu({ editor }: { editor: Editor }) {
  const isTable = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor.isActive("table"),
  });

  const run = (command: () => boolean) => {
    command();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant={isTable ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Table"
          />
        }
      >
        <Table className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem
          onClick={() =>
            run(() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run(),
            )
          }
        >
          Insert 3×3 table
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const rows = Number(window.prompt("Number of rows", "3"));
            const cols = Number(window.prompt("Number of columns", "3"));
            if (!rows || !cols || rows < 1 || cols < 1) {
              return;
            }

            run(() =>
              editor
                .chain()
                .focus()
                .insertTable({
                  rows,
                  cols,
                  withHeaderRow: true,
                })
                .run(),
            );
          }}
        >
          Insert custom table…
        </DropdownMenuItem>

        {isTable ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().addRowBefore().run())
              }
            >
              Add row above
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().addRowAfter().run())
              }
            >
              Add row below
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().addColumnBefore().run())
              }
            >
              Add column left
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().addColumnAfter().run())
              }
            >
              Add column right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().toggleHeaderRow().run())
              }
            >
              Toggle header row
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().toggleHeaderColumn().run())
              }
            >
              Toggle header column
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().mergeCells().run())
              }
            >
              <Merge className="size-3.5" />
              Merge cells
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().splitCell().run())
              }
            >
              <Split className="size-3.5" />
              Split cell
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().deleteRow().run())
              }
            >
              Delete row
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run(() => editor.chain().focus().deleteColumn().run())
              }
            >
              Delete column
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                run(() => editor.chain().focus().deleteTable().run())
              }
            >
              <Trash2 className="size-3.5" />
              Delete table
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getHeadingValue(editor: Editor) {
  if (editor.isActive("heading", { level: 1 })) {
    return "h1";
  }
  if (editor.isActive("heading", { level: 2 })) {
    return "h2";
  }
  if (editor.isActive("heading", { level: 3 })) {
    return "h3";
  }

  return "paragraph";
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
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
      {children}
    </Button>
  );
}

function NoteToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      canUndo: currentEditor.can().chain().focus().undo().run(),
      canRedo: currentEditor.can().chain().focus().redo().run(),
      isBold: currentEditor.isActive("bold"),
      isItalic: currentEditor.isActive("italic"),
      isUnderline: currentEditor.isActive("underline"),
      isStrike: currentEditor.isActive("strike"),
      isHighlight: currentEditor.isActive("highlight"),
      isCode: currentEditor.isActive("code"),
      isCodeBlock: currentEditor.isActive("codeBlock"),
      isBulletList: currentEditor.isActive("bulletList"),
      isOrderedList: currentEditor.isActive("orderedList"),
      isTaskList: currentEditor.isActive("taskList"),
      isSubscript: currentEditor.isActive("subscript"),
      isSuperscript: currentEditor.isActive("superscript"),
      isBlockquote: currentEditor.isActive("blockquote"),
      isAlignLeft: currentEditor.isActive({ textAlign: "left" }),
      isAlignCenter: currentEditor.isActive({ textAlign: "center" }),
      isAlignRight: currentEditor.isActive({ textAlign: "right" }),
      heading: getHeadingValue(currentEditor),
    }),
  });

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previousUrl ?? "https://");

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-sidebar-accent z-10 sticky top-0 border-border px-2 py-2">
      <ToolbarButton
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Select
        value={state.heading}
        onValueChange={(value) => {
          const chain = editor.chain().focus();

          if (value === "paragraph") {
            chain.setParagraph().run();
            return;
          }

          const level = Number(value?.replace("h", "")) as 1 | 2 | 3;
          chain.toggleHeading({ level }).run();
        }}
      >
        <SelectTrigger size="sm" className="h-7 min-w-28 bg-card!">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Normal</SelectItem>
          <SelectItem value="h1">Heading 1</SelectItem>
          <SelectItem value="h2">Heading 2</SelectItem>
          <SelectItem value="h3">Heading 3</SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        label="Bold"
        active={state.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={state.isUnderline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.isStrike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Highlight"
        active={state.isHighlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Subscript"
        active={state.isSubscript}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      >
        <SubscriptIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Superscript"
        active={state.isSuperscript}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      >
        <SuperscriptIcon className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton label="Link" onClick={setLink}>
        <Link2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={state.isCode}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={state.isCodeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <CodeXml className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        label="Bullet list"
        active={state.isBulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.isOrderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Task list"
        active={state.isTaskList}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodo className="size-4" />
      </ToolbarButton>
      <NoteTableMenu editor={editor} />
      <ToolbarButton
        label="Blockquote"
        active={state.isBlockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        label="Align left"
        active={state.isAlignLeft}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Align center"
        active={state.isAlignCenter}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Align right"
        active={state.isAlignRight}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        label="Clear formatting"
        onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
        }
      >
        <RemoveFormatting className="size-4" />
      </ToolbarButton>
    </div>
  );
}

export function NoteEditor({
  content,
  editable,
  onChange,
  className,
}: {
  content: string;
  editable: boolean;
  onChange?: (html: string) => void;
  className?: string;
}) {
  const extensions = useMemo(
    () => [
      ...STATIC_NOTE_EDITOR_EXTENSIONS,
      Link.configure({
        openOnClick: !editable,
        autolink: true,
        defaultProtocol: "https",
      }),
    ],
    [editable],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content,
      editable,
      editorProps: {
        attributes: {
          class: "outline-none",
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        onChange?.(currentEditor.getHTML());
      },
    },
    [extensions],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getHTML();
    if (content === current) {
      return;
    }

    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  return (
    <div className={cn("note-editor flex min-h-0 flex-1 flex-col", className)}>
      {editable && editor ? <NoteToolbar editor={editor} /> : null}
      <EditorContent
        editor={editor}
        className="min-h-[60vh] flex-1 overflow-y-auto"
      />
    </div>
  );
}
