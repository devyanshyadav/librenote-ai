"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { ChevronLeft, ChevronRight, MessageSquareQuote, X } from "lucide-react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildBranchPrompt,
  buildMindMapElements,
  layoutMindMap,
  MIND_MAP_NODE_HEIGHT,
  MIND_MAP_NODE_WIDTH,
  type MindMapNodeData,
  type MindMapSourceRef,
} from "@/lib/studio/mind-map-utils";
import { useCitationStore } from "@/stores/citation.store";
import { useNotebookChatStore } from "@/stores/notebook-chat.store";
import type { MindMapContent, StudioArtifactViewMode } from "@/types";

import "@xyflow/react/dist/style.css";

const INTERACTIVE_CLASS = "nodrag nopan nowheel";
const MindMapToggleContext = createContext<(nodeId: string) => void>(() => {});
const MindMapSelectContext = createContext<(nodeId: string) => void>(() => {});

const MindMapNode = memo(function MindMapNode({
  id,
  data,
}: NodeProps<Node<MindMapNodeData>>) {
  const onToggle = useContext(MindMapToggleContext);
  const onSelect = useContext(MindMapSelectContext);

  return (
    <div style={{ width: MIND_MAP_NODE_WIDTH, height: MIND_MAP_NODE_HEIGHT }}>
      {!data.isRoot ? (
        <Handle
          type="target"
          position={Position.Left}
          style={{ backgroundColor: "var(--primary)" }}
          className="!size-2.5 !border-none"
        />
      ) : null}

      <div
        className={cn(
          "flex h-full cursor-grab items-center gap-2 rounded-full border px-4 shadow-md active:cursor-grabbing",
          data.isRoot
            ? "border-primary bg-primary text-primary-foreground font-semibold"
            : "border-border bg-card font-medium text-foreground",
          data.isSelected &&
            "ring-2 ring-primary ring-offset-2 ring-offset-background",
          data.sourceColor && !data.isRoot && "border-l-4",
        )}
        style={
          data.sourceColor && !data.isRoot
            ? { borderLeftColor: data.sourceColor }
            : undefined
        }
        onClick={(event) => {
          event.stopPropagation();
          onSelect(id);
        }}
      >
        <span className="line-clamp-2 flex-1 text-left text-[13px] leading-tight select-none">
          {data.label}
        </span>

        {data.hasChildren ? (
          <button
            type="button"
            aria-label={data.collapsed ? "Expand branch" : "Collapse branch"}
            className={cn(
              INTERACTIVE_CLASS,
              "flex size-7 shrink-0 items-center justify-center rounded-full cursor-pointer",
              data.isRoot
                ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(id);
            }}
          >
            {data.collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronLeft className="size-3.5" />
            )}
          </button>
        ) : null}
      </div>

      {data.hasChildren ? (
        <Handle
          type="source"
          position={Position.Right}
          style={{ backgroundColor: "var(--primary)" }}
          className="!size-2.5 !border-none"
        />
      ) : null}
    </div>
  );
});

const nodeTypes = { mindMap: MindMapNode };

function MindMapLegend({ sources }: { sources: MindMapSourceRef[] }) {
  const sourcedNodes = sources.filter(Boolean);

  return (
    <div className="absolute bottom-3 left-14 z-10 flex max-w-[calc(100%-5rem)] flex-wrap gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-sm">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-4 rounded bg-primary" />
        Hierarchy
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-4 rounded bg-emerald-500" />
        Supports
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-4 border-t border-dashed border-destructive" />
        Contradicts
      </span>
      {sourcedNodes.slice(0, 4).map((source, index) => (
        <span key={source.id} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{
              backgroundColor: [
                "hsl(var(--primary))",
                "#7dd3a0",
                "#fbbf24",
                "#60a5fa",
              ][index % 4],
            }}
          />
          <span className="max-w-24 truncate">{source.title}</span>
        </span>
      ))}
    </div>
  );
}

function MindMapDetailPanel({
  node,
  onClose,
  onAskBranch,
  onOpenSource,
  showNotebookActions,
}: {
  node: MindMapNodeData;
  onClose: () => void;
  onAskBranch: () => void;
  onOpenSource: () => void;
  showNotebookActions: boolean;
}) {
  return (
    <div className="absolute top-3 right-3 z-10 w-72 rounded-xl border border-border bg-card/95 p-4 text-card-foreground shadow-xl backdrop-blur-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight">{node.label}</p>
          {node.sourceTitle ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Source: {node.sourceTitle}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Close details"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>

      {node.summary ? (
        <p className="mb-4 text-sm leading-relaxed text-foreground/90">
          {node.summary}
        </p>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground/60">
          No summary available for this node.
        </p>
      )}

      {showNotebookActions ? (
        <div className="flex flex-col gap-2">
          {node.sourceId && node.sourceTitle ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 justify-start"
              onClick={onOpenSource}
            >
              View source
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-8 justify-start gap-2"
            onClick={onAskBranch}
          >
            <MessageSquareQuote className="size-3.5" />
            Ask about this branch
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function MindMapViewer({
  content,
  sources = [],
  mode = "studio",
}: {
  content: MindMapContent;
  sources?: MindMapSourceRef[];
  mode?: StudioArtifactViewMode;
}) {
  const sourceRefs = useMemo(
    () => sources.map((source) => ({ id: source.id, title: source.title })),
    [sources],
  );
  const base = useMemo(
    () => buildMindMapElements(content, sourceRefs),
    [content, sourceRefs],
  );
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const openSource = useCitationStore((state) => state.openSource);
  const handleSubmit = useNotebookChatStore((state) => state.handleSubmit);
  const chatStatus = useNotebookChatStore((state) => state.chatStatus);

  const layout = useMemo(
    () =>
      layoutMindMap(
        base.nodes,
        base.edges,
        base.treeEdges,
        collapsedIds,
        selectedNodeId,
      ),
    [base, collapsedIds, selectedNodeId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }

    return (
      layout.nodes.find((node) => node.id === selectedNodeId)?.data ?? null
    );
  }, [layout.nodes, selectedNodeId]);

  const legendSources = useMemo(() => {
    const sourceIds = new Set(
      content.nodes
        .map((node) => node.sourceId)
        .filter((sourceId): sourceId is string => Boolean(sourceId)),
    );

    return sourceRefs.filter((source) => sourceIds.has(source.id));
  }, [content.nodes, sourceRefs]);

  useEffect(() => {
    setCollapsedIds(new Set());
    setSelectedNodeId(null);
  }, [base]);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout, setNodes, setEdges]);

  const onToggle = useCallback((nodeId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
      // biome-ignore lint/correctness/useExhaustiveDependencies: layout needs current state updates
    });
  }, []);

  const onSelect = useCallback((nodeId: string) => {
    setSelectedNodeId((current) => (current === nodeId ? null : nodeId));
  }, []);

  const onAskBranch = useCallback(async () => {
    if (!selectedNodeId) {
      return;
    }

    if (chatStatus === "streaming" || chatStatus === "submitted") {
      toast.error("Wait for the current response to finish.");
      return;
    }

    const prompt = buildBranchPrompt(selectedNodeId, content, base.treeEdges);

    try {
      await handleSubmit({ text: prompt, files: [] });
      toast.success("Question sent to chat");
    } catch {
      toast.error("Failed to send question to chat.");
    }
  }, [selectedNodeId, chatStatus, content, base.treeEdges, handleSubmit]);

  const onOpenSource = useCallback(() => {
    if (!selectedNode?.sourceId || !selectedNode.sourceTitle) {
      return;
    }

    openSource(selectedNode.sourceId, selectedNode.sourceTitle);
  }, [openSource, selectedNode]);

  return (
    <MindMapToggleContext.Provider value={onToggle}>
      <MindMapSelectContext.Provider value={onSelect}>
        <div
          className="relative h-[calc(100vh-10rem)]"
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.35}
            maxZoom={1.75}
            panOnScroll
            zoomOnScroll
            nodesConnectable={false}
            elementsSelectable={false}
            onlyRenderVisibleElements
            noDragClassName={INTERACTIVE_CLASS}
            noPanClassName={INTERACTIVE_CLASS}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(156, 163, 175, 0.6)" gap={24} size={2} />
            <Controls
              showInteractive={false}
              className="!border-border !bg-card !shadow-lg [&_button]:!border-border [&_button]:!bg-card [&_button_svg]:!fill-foreground [&_button:hover]:!bg-accent"
            />
          </ReactFlow>

          <MindMapLegend sources={legendSources} />

          {selectedNode ? (
            <MindMapDetailPanel
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onAskBranch={onAskBranch}
              onOpenSource={onOpenSource}
              showNotebookActions={mode === "studio"}
            />
          ) : null}
        </div>
      </MindMapSelectContext.Provider>
    </MindMapToggleContext.Provider>
  );
}
