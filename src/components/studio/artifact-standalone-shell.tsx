"use client";

import Link from "next/link";
import { ArrowLeft, Link2, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatStudioArtifactType } from "@/components/studio/studio-config";
import { Button } from "@/components/ui/button";
import {
  copyArtifactShareUrl,
  getArtifactPagePath,
} from "@/lib/studio/artifact-share";
import type { StudioArtifactItem } from "@/types";

export function ArtifactStandaloneShell({
  artifact,
  children,
}: {
  artifact: StudioArtifactItem;
  children: React.ReactNode;
}) {
  const handleCopyLink = async () => {
    try {
      const url = await copyArtifactShareUrl(artifact.id);
      toast.success("Link copied to clipboard", { description: url });
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="min-h-dvh bg-[#111522] text-white">
      <header className="sticky top-0 z-20 border-white/10 border-b bg-[#111522]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href={`/notebook/${artifact.notebookId}`}
            className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Notebook
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{artifact.title}</p>
            <p className="truncate text-white/45 text-xs capitalize">
              {formatStudioArtifactType(artifact.type)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {artifact.type === "report" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(getArtifactPagePath(artifact.id, true), "_blank")
                }
                className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Printer className="size-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <Link2 className="size-4" />
              <span className="hidden sm:inline">Copy link</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
