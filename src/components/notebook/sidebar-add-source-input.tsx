"use client";

import { ChevronDown, Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FetchLoader } from "@/components/ui/fetch-loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useImportLinkSource } from "@/tanstack/queries/source.query";
import { detectLinkSourceType } from "@/utils/sources/source-url";
import { SourceTypeIcon } from "./source-type-icon";

interface SidebarAddSourceInputProps {
  notebookId: string;
}

export function SidebarAddSourceInput({
  notebookId,
}: SidebarAddSourceInputProps) {
  const importLinkSource = useImportLinkSource(notebookId);
  const [webSearchQuery, setWebSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<
    "web" | "youtube" | "pdf" | "arxiv" | null
  >(null);

  const detectedLinkType = useMemo(() => {
    const trimmed = webSearchQuery.trim();
    if (!trimmed) return null;
    return detectLinkSourceType(trimmed);
  }, [webSearchQuery]);

  const activeLinkType = selectedType || detectedLinkType;

  const linkInputIcon = useMemo(() => {
    if (!activeLinkType) {
      return <Link2 className="text-muted-foreground size-4" />;
    }
    return <SourceTypeIcon type={activeLinkType} className="size-5" />;
  }, [activeLinkType]);

  const handleImport = async () => {
    const url = webSearchQuery.trim();
    if (!url) return;

    try {
      await importLinkSource.mutateAsync({ url });
      setWebSearchQuery("");
      setSelectedType(null);
      toast.success("Source added successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import link.",
      );
    }
  };

  const getDropdownLabel = () => {
    if (selectedType === "web") return "Web";
    if (selectedType === "youtube") return "YouTube";
    if (selectedType === "pdf") return "PDF";
    if (selectedType === "arxiv") return "arXiv";
    return "Source Type";
  };

  return (
    <div className="mt-3 p-3 rounded-3xl relative bg-muted dark:bg-sidebar-accent! flex flex-col gap-2 mx-1 group-data-[collapsible=icon]:hidden">
      <Input
        type="url"
        placeholder="Paste link to add source..."
        className="h-8 text-xs bg-background! w-full"
        value={webSearchQuery}
        onChange={(e) => {
          setWebSearchQuery(e.target.value);
          if (selectedType) setSelectedType(null);
        }}
        leftIcon={linkInputIcon}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleImport();
          }
        }}
        disabled={importLinkSource.isPending}
      />
      <div className="flex items-center justify-between gap-2 mt-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="h-7 px-2.5 flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            disabled={importLinkSource.isPending}
          >
            <span>{getDropdownLabel()}</span>
            <ChevronDown className="size-3 text-muted-foreground/80" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            <DropdownMenuItem onClick={() => setSelectedType("web")}>
              <SourceTypeIcon type="web" className="mr-2 size-3.5" />
              <span>Web</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedType("youtube")}>
              <SourceTypeIcon type="youtube" className="mr-2 size-3.5" />
              <span>YouTube</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedType("pdf")}>
              <SourceTypeIcon type="pdf" className="mr-2 size-3.5" />
              <span>PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedType("arxiv")}>
              <SourceTypeIcon type="arxiv" className="mr-2 size-3.5" />
              <span>arXiv</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="inverted1 bg-muted dark:bg-sidebar-accent! absolute bottom-0 right-0 z-10"></div>
        <div className="bg-background absolute bottom-0 right-0 pt-4 pl-4 ">
          <Button
            className="px-5 text-xs z-20 w-16 relative rounded-md!"
            disabled={!webSearchQuery.trim() || importLinkSource.isPending}
            onClick={() => void handleImport()}
          >
            {importLinkSource.isPending ? <FetchLoader size="xs" /> : <>Add</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
