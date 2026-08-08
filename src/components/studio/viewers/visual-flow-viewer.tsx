"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, RotateCcw, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotebookSourceRef, StudioArtifactViewMode, VisualFlowContent } from "@/types";
import { useZoomPan } from "@/hooks/use-zoom-pan";

// Simple helper class for debouncing diagram re-renders
class DiagramDebouncer {
  private timeoutId: NodeJS.Timeout | null = null;
  constructor(private delay: number) {}

  public debounce(fn: () => void): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      fn();
      this.timeoutId = null;
    }, this.delay);
  }

  public cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export function VisualFlowViewer({
  content,
  sources = [],
  mode = "studio",
}: {
  content: VisualFlowContent;
  sources?: NotebookSourceRef[];
  mode?: StudioArtifactViewMode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [svgCode, setSvgCode] = useState<string>("");

  const {
    zoom,
    setZoom,
    pan,
    setPan,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    reset: resetZoomPan,
  } = useZoomPan({
    initialZoom: 1,
    minZoom: 0.2,
    maxZoom: 5,
  });

  const boundaryRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const refreshDebouncer = useRef(new DiagramDebouncer(150));
  const lastRenderedCode = useRef<string | null>(null);

  // Initialize Mermaid once on mount
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      themeVariables: {
        background: "#0f172a",
        primaryColor: "#c6f661",
        primaryTextColor: "#f8fafc",
        lineColor: "#475569",
      },
    });
  }, []);

  const getSvgElementSize = useCallback(async (container: HTMLDivElement) => {
    const svg = container.querySelector("svg");
    if (!svg) return { width: 0, height: 0 };
    return new Promise<{ width: number; height: number }>((resolve) => {
      requestAnimationFrame(() => {
        const bbox = svg.getBBox();
        resolve({ width: bbox.width, height: bbox.height });
      });
    });
  }, []);

  const updateMermaidGraph = useCallback(async () => {
    if (!content.code || !imageRef.current) return;

    let cleanCode = content.code.trim();
    // Strip markdown codeblock wrappers if present
    cleanCode = cleanCode.replace(/^```mermaid\s*/i, "").replace(/```$/, "").trim();

    if (cleanCode === lastRenderedCode.current) {
      return;
    }

    try {
      // Clean up previous renderings to prevent id collisions
      const errorContainers = document.querySelectorAll("[id^='dmermaid-'], .mermaidTooltip");
      for (const el of errorContainers) {
        el.remove();
      }

      const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
      const { svg } = await mermaid.render(id, cleanCode);

      if (imageRef.current) {
        imageRef.current.innerHTML = svg;
        const size = await getSvgElementSize(imageRef.current);
        
        setError(null);
        setSvgCode(svg);
        setIsInitialized(true);
        lastRenderedCode.current = cleanCode;

        // Auto-fit or center logic
        if (boundaryRef.current) {
          const boundaryWidth = boundaryRef.current.clientWidth;
          const boundaryHeight = boundaryRef.current.clientHeight;
          if (size.width > 0 && size.height > 0) {
            const fitScale = Math.min(
              (boundaryWidth * 0.9) / size.width,
              (boundaryHeight * 0.9) / size.height,
              1.2
            );
            setZoom(Math.max(0.4, fitScale));
          } else {
            setZoom(1);
          }
          setPan({ x: 0, y: 0 });
        }
      }
    } catch (err) {
      console.error("Mermaid Render Error:", err);
      setError(err instanceof Error ? err.message : "Failed to render diagram");
      setIsInitialized(false);
    }
  }, [content.code, getSvgElementSize, setZoom, setPan]);

  useEffect(() => {
    refreshDebouncer.current.debounce(updateMermaidGraph);
    return () => {
      refreshDebouncer.current.cancel();
    };
  }, [updateMermaidGraph]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.2, 5));
  }, [setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.2, 0.2));
  }, [setZoom]);

  const exportAsSVG = useCallback(() => {
    if (!svgCode) return;
    try {
      const blob = new Blob([svgCode], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${content.title || "diagram"}.svg`;
      link.href = url;
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export SVG", err);
    }
  }, [svgCode, content.title]);

  const copyToClipboard = useCallback(async () => {
    if (!svgCode) return;
    try {
      await navigator.clipboard.writeText(content.code);
    } catch (err) {
      console.error("Failed to copy code to clipboard", err);
    }
  }, [svgCode, content.code]);

  return (
    <div className="flex flex-col w-full h-[calc(100vh-8rem)] gap-4 overflow-hidden">
      {/* Header Info */}
      <div className="flex flex-col gap-1 border-b border-border pb-3 px-1 shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{content.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{content.description}</p>
      </div>

      {/* Visual Canvas */}
      <div
        ref={boundaryRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="relative flex-1 rounded-2xl border border-border bg-card/40 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      >
        {/* Float Controls */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-md p-1.5 rounded-xl border border-border/80 shadow-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="size-8 rounded-lg hover:bg-muted"
          >
            <ZoomOut className="size-4 text-foreground/80" />
          </Button>
          <Button
            variant="ghost"
            onClick={resetZoomPan}
            title="Reset Zoom"
            className="h-8 px-2.5 text-xs font-semibold rounded-lg hover:bg-muted text-foreground/80 flex items-center gap-1"
          >
            <RotateCcw className="size-3" />
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            title="Zoom In"
            className="size-8 rounded-lg hover:bg-muted"
          >
            <ZoomIn className="size-4 text-foreground/80" />
          </Button>
          <div className="w-[1px] h-4 bg-border/80 mx-0.5" />
          <Button
            variant="ghost"
            size="icon"
            onClick={copyToClipboard}
            title="Copy Mermaid Code"
            className="size-8 rounded-lg hover:bg-muted"
          >
            <Copy className="size-4 text-foreground/80" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={exportAsSVG}
            title="Export SVG"
            className="size-8 rounded-lg hover:bg-muted"
          >
            <Download className="size-4 text-foreground/80" />
          </Button>
        </div>

        {error && (
          <div className="text-center space-y-3 p-6 max-w-2xl w-full z-10 select-text">
            <p className="text-destructive font-medium text-sm">Failed to render diagram. Check Mermaid syntax.</p>
            <pre className="text-xs text-muted-foreground bg-muted/60 p-4 rounded-xl overflow-auto text-left font-mono max-h-[300px] border border-border">
              {error}
            </pre>
          </div>
        )}

        {!error && !isInitialized && (
          <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            <span>Rendering diagram...</span>
          </div>
        )}

        <div
          ref={imageRef}
          style={{
            display: error ? "none" : "flex",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
            opacity: isInitialized && !error ? 1 : 0,
          }}
          className="flex items-center justify-center [&_svg]:max-w-none [&_svg]:h-auto"
        />
      </div>
    </div>
  );
}

