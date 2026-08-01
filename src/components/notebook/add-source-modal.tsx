"use client";

import {
  ArrowLeft,
  Clipboard,
  Globe,
  Link2,
  Loader2,
  Music2,
  Plus,
  Upload,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  SOURCE_AUDIO_ACCEPT,
  SOURCE_AUDIO_FORMATS_LABEL,
  SOURCE_DOCUMENT_ACCEPT,
  SOURCE_MAX_AUDIO_FILE_MB,
  SOURCE_MAX_AUDIO_FILES,
  SOURCE_MAX_BULK_URLS,
  SOURCE_MAX_DOCUMENT_FILE_MB,
  SOURCE_MAX_DOCUMENT_FILES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  useImportBulkLinks,
  useImportLinkSource,
  useImportTextSource,
  useUploadSource,
} from "@/tanstack/queries/source.query";
import {
  getUnsupportedAudioMessage,
  getUnsupportedDocumentMessage,
  partitionAudioFiles,
  partitionDocumentFiles,
} from "@/utils/sources/source-file";
import {
  detectLinkSourceType,
  getLinkSourceTypeLabel,
  parseLinkUrls,
} from "@/utils/sources/source-url";

interface AddSourceModalProps {
  notebookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AddSourceView = "main" | "paste-text" | "bulk-import" | "import-audio";

export function AddSourceModal({
  notebookId,
  open,
  onOpenChange,
}: AddSourceModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<AddSourceView>("main");
  const [pastedText, setPastedText] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAudioDragging, setIsAudioDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  const uploadSource = useUploadSource(notebookId);
  const importTextSource = useImportTextSource(notebookId);
  const importLinkSource = useImportLinkSource(notebookId);
  const importBulkLinks = useImportBulkLinks(notebookId);

  const detectedLinkType = useMemo(() => {
    const trimmed = linkUrl.trim();
    if (!trimmed) return null;
    return detectLinkSourceType(trimmed);
  }, [linkUrl]);

  const linkInputIcon = useMemo(() => {
    if (detectedLinkType === "youtube") {
      return (
        <Icon icon="tabler:brand-youtube" className="text-destructive size-4" />
      );
    }
    if (detectedLinkType === "pdf") {
      return (
        <Icon icon="tabler:file-type-pdf" className="text-destructive size-4" />
      );
    }
    if (detectedLinkType === "web") {
      return <Globe className="text-primary size-4" />;
    }
    return <Link2 className="text-muted-foreground size-4" />;
  }, [detectedLinkType]);

  const parsedBulkUrls = useMemo(() => parseLinkUrls(bulkUrls), [bulkUrls]);

  const isImporting =
    importTextSource.isPending ||
    importLinkSource.isPending ||
    importBulkLinks.isPending;

  const isUploading =
    uploadProgress.total > 0 && uploadProgress.done < uploadProgress.total;

  const isBusy = isUploading || isImporting;

  const [activeProgress, setActiveProgress] = useState(0);

  // Simulate progress for the currently uploading file
  useEffect(() => {
    setActiveProgress(0);

    if (!isUploading) {
      return;
    }

    const interval = setInterval(() => {
      setActiveProgress((prev) => {
        const maxSlice = (1 / uploadProgress.total) * 100 * 0.9;
        if (prev >= maxSlice) return prev;
        return prev + Math.min(1.5, maxSlice - prev);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isUploading, uploadProgress.total, uploadProgress.done]);

  const progressPercentage = useMemo(() => {
    if (uploadProgress.total === 0) return 0;
    const basePercent = (uploadProgress.done / uploadProgress.total) * 100;
    return Math.min(100, Math.round(basePercent + activeProgress));
  }, [uploadProgress.done, uploadProgress.total, activeProgress]);

  useEffect(() => {
    if (!open) {
      setView("main");
      setPastedText("");
      setTextTitle("");
      setLinkUrl("");
      setBulkUrls("");
      setAudioTitle("");
      setIsDragging(false);
      setIsAudioDragging(false);
      setUploadProgress({ done: 0, total: 0 });
    }
  }, [open]);

  const uploadDocumentFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const limitedFiles = files.slice(0, SOURCE_MAX_DOCUMENT_FILES);
      if (files.length > SOURCE_MAX_DOCUMENT_FILES) {
        toast.error(
          `Only the first ${SOURCE_MAX_DOCUMENT_FILES} files will be uploaded.`,
        );
      }

      const { supported, unsupported } = partitionDocumentFiles(limitedFiles);

      for (const file of unsupported) {
        toast.error(getUnsupportedDocumentMessage(file));
      }

      if (supported.length === 0) return;

      setUploadProgress({ done: 0, total: supported.length });

      let successCount = 0;

      for (let index = 0; index < supported.length; index += 1) {
        const file = supported[index];
        try {
          await uploadSource.mutateAsync({ file });
          successCount += 1;
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : `Failed to upload ${file.name}.`,
          );
        } finally {
          setUploadProgress({ done: index + 1, total: supported.length });
        }
      }

      setUploadProgress({ done: 0, total: 0 });

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "Source uploaded. Indexing in background."
            : `${successCount} sources uploaded. Indexing in background.`,
        );
        onOpenChange(false);
      }
    },
    [onOpenChange, uploadSource],
  );

  const uploadAudioFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const limitedFiles = files.slice(0, SOURCE_MAX_AUDIO_FILES);
      if (files.length > SOURCE_MAX_AUDIO_FILES) {
        toast.error(
          `Only ${SOURCE_MAX_AUDIO_FILES} audio file can be added at a time.`,
        );
      }

      const { supported, unsupported } = partitionAudioFiles(limitedFiles);

      for (const file of unsupported) {
        toast.error(getUnsupportedAudioMessage(file));
      }

      if (supported.length === 0) return;

      const file = supported[0];
      const title = audioTitle.trim() || undefined;

      try {
        await uploadSource.mutateAsync({ file, title });
        toast.success(
          "Audio uploaded. Transcription and indexing in background.",
        );
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to upload ${file.name}.`,
        );
      }
    },
    [audioTitle, onOpenChange, uploadSource],
  );

  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await uploadDocumentFiles(files);
  };

  const handleAudioSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await uploadAudioFiles(files);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await uploadDocumentFiles(Array.from(event.dataTransfer.files));
  };

  const handleAudioDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsAudioDragging(false);
    await uploadAudioFiles(Array.from(event.dataTransfer.files));
  };

  const handleInsertText = async () => {
    const text = pastedText.trim();

    if (!text) {
      toast.error("Please paste some text first.");
      return;
    }

    try {
      await importTextSource.mutateAsync({
        text,
        title: textTitle.trim() || undefined,
      });
      toast.success("Source added successfully.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add pasted text.",
      );
    }
  };

  const handleImportLink = async () => {
    const url = linkUrl.trim();

    if (!url) {
      toast.error("Please enter a URL.");
      return;
    }

    try {
      await importLinkSource.mutateAsync({ url });
      toast.success("Link imported successfully.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import link.",
      );
    }
  };

  const handleBulkImport = async () => {
    if (parsedBulkUrls.length === 0) {
      toast.error("Add at least one URL.");
      return;
    }

    if (parsedBulkUrls.length > SOURCE_MAX_BULK_URLS) {
      toast.error(
        `You can import up to ${SOURCE_MAX_BULK_URLS} URLs at a time.`,
      );
      return;
    }

    try {
      const result = await importBulkLinks.mutateAsync(parsedBulkUrls);
      const data = result.data;

      if (!data) {
        throw new Error("Bulk import failed.");
      }

      const { succeeded, failed } = data;

      if (succeeded.length > 0 && failed.length === 0) {
        toast.success(
          succeeded.length === 1
            ? "Link imported successfully."
            : `${succeeded.length} links imported successfully.`,
        );
        onOpenChange(false);
        return;
      }

      if (succeeded.length > 0) {
        toast.warning(
          `${succeeded.length} imported, ${failed.length} failed. Check URLs and try again.`,
        );
        onOpenChange(false);
        return;
      }

      toast.error(failed[0]?.error ?? "No links could be imported.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import links.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:min-w-2xl rounded-4xl p-2 bg-card gap-0 flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden"
      >
        {view === "main" && (
          <>
            <div className="relative rounded-3xl bg-linear-to-br from-background/50 to-muted/50 border border-border overflow-hidden">
              {/* Aurora gradient glow */}
              <div className="absolute inset-x-0 top-0 h-[100px] bg-linear-to-bl rounded-b-full from-primary/30 via-primary/10 to-transparent blur-xl pointer-events-none" />

              <DialogHeader className="gap-1 p-6 relative z-10">
                <DialogTitle>Add sources</DialogTitle>
                <DialogDescription>
                  Paste a link, drop files, or choose another option.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 p-6 relative z-10">
                <div className="space-y-2.5">
                  <Label
                    htmlFor="link-input"
                    className="flex items-center gap-1.5"
                  >
                    Link URL
                    <span className="flex items-center gap-1.5 ml-1">
                      <Globe className="size-3.5 text-primary" />
                      <Icon
                        icon="tabler:brand-youtube"
                        className="size-3.5 text-red-600 dark:text-red-500"
                      />
                      <Icon
                        icon="tabler:file-type-pdf"
                        className="size-3.5 text-destructive"
                      />
                    </span>
                  </Label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      id="link-input"
                      type="url"
                      leftIcon={linkInputIcon}
                      className="bg-background!"
                      placeholder="Paste a website, YouTube, arXiv, or PDF URL"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      disabled={isBusy}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleImportLink();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size={"lg"}
                      onClick={() => void handleImportLink()}
                      disabled={!linkUrl.trim() || isBusy}
                    >
                      {importLinkSource.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Import"
                      )}
                    </Button>
                  </div>
                  {detectedLinkType && (
                    <p className="text-muted-foreground text-xs">
                      Detected link type:{" "}
                      <span className="font-semibold text-foreground">
                        {getLinkSourceTypeLabel(detectedLinkType)}
                      </span>
                    </p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-muted/30 px-2 text-muted-foreground">
                      Or upload files
                    </span>
                  </div>
                </div>

                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border border-dashed bg-background/40 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-background/30",
                  )}
                >
                  <Upload className="size-8 text-muted-foreground mb-2" />
                  <p className="font-semibold text-sm">
                    Drop document files here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, Excel, TXT, MD, JSON, HTML up to{" "}
                    {SOURCE_MAX_DOCUMENT_FILE_MB}MB each
                  </p>
                  {isUploading && (
                    <div className="w-full mt-4 space-y-1.5 text-left max-w-xs mx-auto">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-primary animate-pulse">
                          Uploading source {uploadProgress.done + 1} of{" "}
                          {uploadProgress.total}...
                        </span>
                        <span className="text-muted-foreground">
                          {progressPercentage}%
                        </span>
                      </div>
                      <Progress
                        value={progressPercentage}
                        className="w-full [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-primary! [&_[data-slot=progress-indicator]]:to-primary/20!"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 *:h-11 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => setView("bulk-import")}
                    disabled={isBusy}
                    className="gap-2"
                  >
                    <Globe className="size-4" />
                    Bulk links
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => setView("import-audio")}
                    disabled={isBusy}
                    className="gap-2"
                  >
                    <Music2 className="size-4" />
                    Audio
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => setView("paste-text")}
                    disabled={isBusy}
                    className="gap-2"
                  >
                    <Clipboard className="size-4" />
                    Paste text
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={SOURCE_DOCUMENT_ACCEPT}
                  className="hidden"
                  onChange={handleFileSelection}
                />
              </div>
            </div>

            <DialogFooter className="p-5 bg-transparent border-0">
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={isBusy}
              >
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {view === "paste-text" && (
          <>
            <DialogHeader className="shrink-0 gap-1 p-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setView("main")}
                  disabled={isBusy}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <DialogTitle>Paste text</DialogTitle>
              </div>
              <DialogDescription>
                Add manual text as a source in your notebook.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-1">
                <Label htmlFor="text-title">Title (Optional)</Label>
                <Input
                  id="text-title"
                  placeholder="Enter a title for this source"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  disabled={isBusy}
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col space-y-1">
                <Label htmlFor="text-content">Content</Label>
                <Textarea
                  id="text-content"
                  placeholder="Paste your source text here..."
                  className="min-h-56 max-h-[min(24rem,50vh)] resize-none overflow-y-auto [field-sizing:fixed]"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  disabled={isBusy}
                />
              </div>
            </div>

            <DialogFooter className="shrink-0 bg-transparent p-4 border-0">
              <Button
                variant="outline"
                onClick={() => setView("main")}
                disabled={isBusy}
              >
                Back
              </Button>
              <Button
                onClick={() => void handleInsertText()}
                disabled={!pastedText.trim() || isBusy}
              >
                {importTextSource.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving
                  </>
                ) : (
                  "Add text source"
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {view === "bulk-import" && (
          <>
            <DialogHeader className="shrink-0 gap-1 p-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setView("main")}
                  disabled={isBusy}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <DialogTitle>Bulk import links</DialogTitle>
              </div>
              <DialogDescription>
                Paste up to {SOURCE_MAX_BULK_URLS} URLs (one per line).
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex min-h-0 flex-1 flex-col space-y-1">
                <Label htmlFor="urls-content">URLs</Label>
                <Textarea
                  id="urls-content"
                  placeholder="https://example.com&#10;https://youtube.com/watch?v=..."
                  className="min-h-56 max-h-[min(24rem,50vh)] resize-none overflow-y-auto font-mono text-sm [field-sizing:fixed]"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  disabled={isBusy}
                />
              </div>
              {parsedBulkUrls.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Detected {parsedBulkUrls.length} unique URL
                  {parsedBulkUrls.length === 1 ? "" : "s"}
                </p>
              )}
            </div>

            <DialogFooter className="shrink-0 bg-transparent p-4 border-0">
              <Button
                variant="outline"
                onClick={() => setView("main")}
                disabled={isBusy}
              >
                Back
              </Button>
              <Button
                onClick={() => void handleBulkImport()}
                disabled={
                  parsedBulkUrls.length === 0 ||
                  parsedBulkUrls.length > SOURCE_MAX_BULK_URLS ||
                  isBusy
                }
              >
                {importBulkLinks.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Importing
                  </>
                ) : (
                  "Import all links"
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {view === "import-audio" && (
          <>
            <DialogHeader className="shrink-0 gap-1 p-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setView("main")}
                  disabled={isBusy}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <DialogTitle>Upload audio</DialogTitle>
              </div>
              <DialogDescription>
                Upload an audio file. We will transcribe it automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-1">
                <Label htmlFor="audio-title">Title (Optional)</Label>
                <Input
                  id="audio-title"
                  placeholder="Enter a title for this audio file"
                  value={audioTitle}
                  onChange={(e) => setAudioTitle(e.target.value)}
                  disabled={isBusy}
                />
              </div>

              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsAudioDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsAudioDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsAudioDragging(false);
                }}
                onDrop={handleAudioDrop}
                onClick={() => audioInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed bg-linear-to-br from-background/50 via-muted/30 to-background/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-48",
                  isAudioDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <Music2 className="size-8 text-muted-foreground mb-2" />
                <p className="font-semibold text-sm">Drop audio file here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports {SOURCE_AUDIO_FORMATS_LABEL} up to{" "}
                  {SOURCE_MAX_AUDIO_FILE_MB}MB
                </p>
                {uploadSource.isPending && (
                  <p className="text-xs text-primary font-semibold mt-3 animate-pulse">
                    Transcribing audio file...
                  </p>
                )}
              </div>

              <input
                ref={audioInputRef}
                type="file"
                accept={SOURCE_AUDIO_ACCEPT}
                className="hidden"
                onChange={handleAudioSelection}
              />
            </div>

            <DialogFooter className="shrink-0 bg-transparent p-4 border-0">
              <Button
                variant="outline"
                onClick={() => setView("main")}
                disabled={isBusy}
              >
                Back
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AddSourceModalHost({ notebookId }: { notebookId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("addSource") === "true";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      router.replace(`/notebook/${notebookId}`, { scroll: false });
    }
  };

  return (
    <AddSourceModal
      notebookId={notebookId}
      open={open}
      onOpenChange={handleOpenChange}
    />
  );
}
