"use client";

import {
  Copy,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Check,
} from "lucide-react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useZoomPan } from "@/hooks/use-zoom-pan";
import type { VisualFlowContent } from "@/types";
import { ClipboardButton } from "@/components/notebook/chat/clipboard-button";

class DiagramDebouncer {
  private timeoutId: NodeJS.Timeout | null = null;
  constructor(private delay: number) { }

  debounce(fn: () => void): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      fn();
      this.timeoutId = null;
    }, this.delay);
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export function VisualFlowViewer({ content }: { content: VisualFlowContent }) {
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [svgCode, setSvgCode] = useState("");

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
    maxZoom: 10,
  });

  const boundaryRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const refreshDebouncer = useRef(new DiagramDebouncer(150));
  const lastRenderedKey = useRef<string | null>(null);

  const mermaidTheme = resolvedTheme === "light" ? "default" : "dark";

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
    cleanCode = cleanCode
      .replace(/^```mermaid\s*/i, "")
      .replace(/```$/, "")
      .trim();

    if (cleanCode === "") return;

    const renderKey = `${mermaidTheme}:${cleanCode}`;
    if (renderKey === lastRenderedKey.current) {
      return;
    }

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: mermaidTheme,
        securityLevel: "strict",
      });

      const errorContainers = document.querySelectorAll(
        "[id^='dmermaid-'], .mermaidTooltip",
      );
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
        lastRenderedKey.current = renderKey;

        if (boundaryRef.current) {
          const boundaryWidth = boundaryRef.current.clientWidth;
          const boundaryHeight = boundaryRef.current.clientHeight;
          if (size.width > 0 && size.height > 0) {
            const fitScale = Math.min(
              (boundaryWidth * 0.9) / size.width,
              (boundaryHeight * 0.9) / size.height,
              1.2,
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
  }, [content.code, getSvgElementSize, mermaidTheme, setZoom, setPan]);

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

  return (
    <div className="flex h-full min-h-[24rem] w-full flex-col p-4 gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-1 border-b border-border px-1 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {content.title}
          </h2>
          {content.diagramType ? (
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold capitalize text-primary">
              {content.diagramType}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {content.description}
        </p>
      </div>

      <div
        ref={boundaryRef}
        role="application"
        aria-label="Diagram canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="relative flex flex-1 cursor-grab items-center justify-center overflow-hidden select-none active:cursor-grabbing"
      >
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 p-1.5 shadow-md backdrop-blur-md">
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
            className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-foreground/80 hover:bg-muted"
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
          <div className="mx-0.5 h-4 w-px bg-border/80" />
          <ClipboardButton
            text={content.code || ""}
            beforeCopy={<Copy className="size-4 text-foreground/80" />}
            afterCopy={<Check className="size-4 text-primary" />}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={exportAsSVG}
            title="Export SVG"
            disabled={!svgCode}
            className="size-8 rounded-lg hover:bg-muted"
          >
            <Download className="size-4 text-foreground/80" />
          </Button>
        </div>

        {error ? (
          <div className="z-10 max-w-2xl space-y-3 p-6 text-center select-text">
            <p className="text-sm font-medium text-destructive">
              Failed to render diagram. Check Mermaid syntax.
            </p>
            <pre className="max-h-[300px] overflow-auto rounded-xl border border-border bg-muted/60 p-4 text-left font-mono text-xs text-muted-foreground">
              {error}
            </pre>
          </div>
        ) : null}

        {!error && !isInitialized ? (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary" />
            <span>Rendering diagram...</span>
          </div>
        ) : null}

        <div
          ref={imageRef}
          style={{
            display: error ? "none" : "flex",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
            opacity: isInitialized && !error ? 1 : 0,
          }}
          className="flex items-center justify-center [&_svg]:h-auto [&_svg]:max-w-none"
        />
      </div>
    </div>
  );
}
