"use client";

import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";
import {
  STUDIO_GENERATE_FORMS,
  type StudioGenerateFormHandle,
} from "@/components/studio/studio-generate-dialog-forms";
import { StudioSourcePicker } from "@/components/studio/studio-source-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  NotebookSourceListItem,
  StudioArtifactSlug,
  StudioGenerateOptions,
} from "@/types";
import { STUDIO_ARTIFACT_SLUG_TO_TYPE } from "@/types";
import { getStudioArtifactIcon } from "@/components/studio/studio-config";

function getInitialSourceIds(sources: NotebookSourceListItem[]) {
  const selected = sources
    .filter((source) => source.isSelected)
    .map((source) => source.id);

  return selected.length > 0 ? selected : sources.map((source) => source.id);
}

export function StudioGenerateDialog({
  open,
  onOpenChange,
  artifactSlug,
  sources,
  onGenerate,
  isGenerating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifactSlug: StudioArtifactSlug | null;
  sources: NotebookSourceListItem[];
  onGenerate: (payload: {
    options: StudioGenerateOptions;
    sourceIds: string[];
  }) => void;
  isGenerating?: boolean;
}) {
  const formRef = useRef<StudioGenerateFormHandle>(null);
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const entry =
    artifactSlug && artifactSlug !== "note"
      ? STUDIO_GENERATE_FORMS[artifactSlug]
      : null;
  const Form = entry?.Form;

  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
      setSelectedSourceIds([]);
      return;
    }

    setSelectedSourceIds(getInitialSourceIds(sourcesRef.current));
  }, [open]);

  if (!artifactSlug || !entry || !Form) {
    return null;
  }

  const handleGenerate = () => {
    if (!formRef.current?.isValid() || selectedSourceIds.length === 0) {
      return;
    }

    onGenerate({
      options: formRef.current.getOptions(),
      sourceIds: selectedSourceIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:min-w-3xl bg-linear-to-br from-card via-sidebar-accent to-card",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon
              icon={getStudioArtifactIcon(
                STUDIO_ARTIFACT_SLUG_TO_TYPE[artifactSlug],
              )}
              className="size-6 text-primary shrink-0"
            />
            Generate {entry.title}
          </DialogTitle>
          <DialogDescription>{entry.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-2">
          <StudioSourcePicker
            sources={sources}
            selectedSourceIds={selectedSourceIds}
            onSelectedSourceIdsChange={setSelectedSourceIds}
            disabled={isGenerating}
          />

          <Form ref={formRef} disabled={isGenerating} />
        </div>

        <DialogFooter className="bg-card">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedSourceIds.length === 0}
          >
            {isGenerating ? (
              <>
                <Icon icon="svg-spinners:ring-resize" className="size-4" />
                Starting...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
