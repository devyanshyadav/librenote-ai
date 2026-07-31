import Dagre from "@dagrejs/dagre";
import { type Edge, type Node, Position } from "@xyflow/react";
import type { MindMapContent, NotebookSourceRef } from "@/types";

export const MIND_MAP_NODE_WIDTH = 220;
export const MIND_MAP_NODE_HEIGHT = 44;

export const MIND_MAP_SOURCE_COLORS = [
  "hsl(var(--primary))",
  "#7dd3a0",
  "#fbbf24",
  "#60a5fa",
];

export interface MindMapFlowNodeData extends Record<string, unknown> {
  label: string;
  summary: string;
  sourceId?: string;
  sourceTitle?: string;
  sourceColor?: string;
  isRoot: boolean;
  hasChildren: boolean;
  collapsed: boolean;
  isSelected: boolean;
}

function getSourceColor(
  sourceId: string,
  sources: NotebookSourceRef[],
): string | undefined {
  const index = sources.findIndex((source) => source.id === sourceId);
  if (index === -1) {
    return undefined;
  }

  return MIND_MAP_SOURCE_COLORS[index % MIND_MAP_SOURCE_COLORS.length];
}

function resolveRootId(
  nodes: { id: string }[],
  edges: { target: string }[],
): string {
  const targets = new Set(edges.map((edge) => edge.target));

  return (
    nodes.find((node) => node.id === "root")?.id ??
    nodes.find((node) => !targets.has(node.id))?.id ??
    nodes[0]?.id ??
    "root"
  );
}

/** Attach orphan nodes to root when the model omits a parent edge. */
function normalizeTreeEdges(
  nodes: { id: string }[],
  edges: MindMapContent["edges"],
  rootId: string,
): MindMapContent["edges"] {
  const targets = new Set(edges.map((edge) => edge.target));
  const normalized = [...edges];

  for (const node of nodes) {
    if (node.id === rootId || targets.has(node.id)) {
      continue;
    }

    normalized.push({
      id: `${rootId}-${node.id}`,
      source: rootId,
      target: node.id,
    });
  }

  return normalized;
}

function getChildMap(edges: MindMapContent["edges"]) {
  const childMap = new Map<string, string[]>();

  for (const edge of edges) {
    const children = childMap.get(edge.source) ?? [];
    children.push(edge.target);
    childMap.set(edge.source, children);
  }

  return childMap;
}

export function getDefaultCollapsedIds(
  edges: MindMapContent["edges"],
  rootId: string,
): Set<string> {
  const childMap = getChildMap(edges);
  const collapsed = new Set<string>();

  for (const [nodeId, children] of childMap) {
    if (nodeId !== rootId && children.length > 0) {
      collapsed.add(nodeId);
    }
  }

  return collapsed;
}

function getHiddenDescendants(
  collapsedIds: ReadonlySet<string>,
  childMap: Map<string, string[]>,
) {
  const hidden = new Set<string>();

  for (const nodeId of collapsedIds) {
    const stack = [...(childMap.get(nodeId) ?? [])];

    while (stack.length > 0) {
      const id = stack.pop();
      if (!id || hidden.has(id)) {
        continue;
      }

      hidden.add(id);
      stack.push(...(childMap.get(id) ?? []));
    }
  }

  return hidden;
}

export function buildBranchPrompt(
  nodeId: string,
  content: MindMapContent,
  edges: MindMapContent["edges"],
): string {
  const node = content.nodes.find((entry) => entry.id === nodeId);
  if (!node) {
    return "Explain this mind map branch based on my selected sources.";
  }

  const childMap = getChildMap(edges);
  const branchLabels: string[] = [];
  const stack = [...(childMap.get(nodeId) ?? [])];

  while (stack.length > 0) {
    const id = stack.pop();
    if (!id) {
      continue;
    }

    const child = content.nodes.find((entry) => entry.id === id);
    if (child) {
      branchLabels.push(child.data.label);
    }

    stack.push(...(childMap.get(id) ?? []));
  }

  const branchContext =
    branchLabels.length > 0
      ? ` Include its subtopics: ${branchLabels.join(", ")}.`
      : "";
  const summaryContext = node.data.summary ? ` ${node.data.summary}` : "";

  return `Explain "${node.data.label}" based on my selected sources.${branchContext}${summaryContext}`;
}

export function buildMindMapElements(
  content: MindMapContent,
  sources: NotebookSourceRef[] = [],
) {
  const rootId = resolveRootId(content.nodes, content.edges);
  const treeEdges = normalizeTreeEdges(content.nodes, content.edges, rootId);
  const childMap = getChildMap(treeEdges);

  const nodes: Node<MindMapFlowNodeData>[] = content.nodes.map((node) => {
    const sourceId = node.data.sourceId;
    const sourceTitle = sourceId
      ? sources.find((source) => source.id === sourceId)?.title
      : undefined;

    return {
      id: node.id,
      type: "mindMap",
      position: { x: 0, y: 0 },
      data: {
        label: node.data.label,
        summary: node.data.summary,
        sourceId,
        sourceTitle,
        sourceColor: sourceId ? getSourceColor(sourceId, sources) : undefined,
        isRoot: node.id === rootId,
        hasChildren: (childMap.get(node.id)?.length ?? 0) > 0,
        collapsed: false,
        isSelected: false,
      },
    };
  });

  const edges: Edge[] = treeEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    style: { stroke: "var(--border)", strokeWidth: 2 },
  }));

  return { nodes, edges, treeEdges, rootId };
}

export function layoutMindMap(
  nodes: Node<MindMapFlowNodeData>[],
  edges: Edge[],
  treeEdges: MindMapContent["edges"],
  collapsedIds: ReadonlySet<string>,
  selectedNodeId: string | null,
) {
  const childMap = getChildMap(treeEdges);
  const hidden = getHiddenDescendants(collapsedIds, childMap);

  const visibleNodes = nodes.filter((node) => !hidden.has(node.id));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleTreeEdges = treeEdges.filter(
    (edge) =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  );

  const dagreGraph = new Dagre.graphlib.Graph()
    .setDefaultEdgeLabel(() => ({}))
    .setGraph({
      rankdir: "LR",
      nodesep: 52,
      ranksep: 120,
      edgesep: 36,
      marginx: 80,
      marginy: 120,
    });

  for (const node of visibleNodes) {
    dagreGraph.setNode(node.id, {
      width: MIND_MAP_NODE_WIDTH,
      height: MIND_MAP_NODE_HEIGHT,
    });
  }

  for (const edge of visibleTreeEdges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  Dagre.layout(dagreGraph);

  const positions = new Map(
    visibleNodes.map((node) => {
      const { x, y } = dagreGraph.node(node.id);
      return [
        node.id,
        {
          x: x - MIND_MAP_NODE_WIDTH / 2,
          y: y - MIND_MAP_NODE_HEIGHT / 2,
        },
      ];
    }),
  );

  return {
    nodes: nodes.map((node) => ({
      ...node,
      hidden: hidden.has(node.id),
      position: positions.get(node.id) ?? node.position,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        ...node.data,
        collapsed: collapsedIds.has(node.id),
        isSelected: node.id === selectedNodeId,
      },
    })),
    edges: edges.map((edge) => ({
      ...edge,
      hidden:
        hidden.has(edge.source) ||
        hidden.has(edge.target) ||
        collapsedIds.has(edge.source),
    })),
  };
}
