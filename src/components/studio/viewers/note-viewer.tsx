"use client";

import { Download, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadNoteAsText } from "@/lib/studio/note-content.utils";
import { useUpdateStudioNote } from "@/tanstack/queries/studio.query";
import type { NoteContent, StudioArtifactViewMode } from "@/types";
import { NoteEditor } from "./note-editor";
import { Icon } from "@iconify/react";

export function NoteViewer({
  artifactId,
  notebookId,
  content,
  mode = "studio",
}: {
  artifactId: string;
  notebookId: string;
  content: NoteContent;
  mode?: StudioArtifactViewMode;
}) {
  const { mutate: saveNote, isPending: isSaving } =
    useUpdateStudioNote(notebookId);
  const [title, setTitle] = useState(content.title);
  const [body, setBody] = useState(content.body);
  const isEditable = mode === "studio";
  const isDirty = title !== content.title || body !== content.body;

  useEffect(() => {
    setTitle(content.title);
    setBody(content.body);
  }, [content.title, content.body]);

  const handleSave = () => {
    if (!isDirty || isSaving) {
      return;
    }

    saveNote(
      { artifactId, title, body },
      {
        onSuccess: () => {
          toast.success("Note saved");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to save note",
          );
        },
      },
    );
  };

  const handleExport = () => {
    downloadNoteAsText(title, body);
    toast.success("Note exported as text");
  };

  return (
    <div className="flex min-h-[70vh] flex-col ">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {isEditable ? (
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="New Note"
            className="min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <h1 className="min-w-0 flex-1 text-lg font-medium">{title}</h1>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {isEditable ? (
            <Button
              type="button"
              size="icon"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? (
                <Icon icon={"svg-spinners:ring-resize"} className="size-4" />
              ) : (
                <Icon icon={"hugeicons:save-all"} className="size-4" />
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleExport}
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      <NoteEditor
        key={artifactId}
        content={body}
        editable={isEditable}
        onChange={isEditable ? setBody : undefined}
      />
    </div>
  );
}
