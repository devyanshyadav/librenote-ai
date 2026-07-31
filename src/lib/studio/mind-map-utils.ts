import Dagre from "@dagrejs/dagre";
import { type Edge, type Node, Position } from "@xyflow/react";
import type { MindMapContent, MindMapEdgeKind } from "@/types";

export const MIND_MAP_NODE_WIDTH = 220;
export const MIND_MAP_NODE_HEIGHT = 44;

const SOURCE_COLORS = [
  "hsl(var(--primary))",
  "#7dd3a0",
  "#fbbf24",
  "#60a5fa",
  "#f472b6",
  "#fb923c",
];

export interface MindMapNodeData extends Record<string, unknown> {
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

export interface MindMapSourceRef {
  id: string;
  title: string;
}

export function getEdgeKind(edge: { kind?: MindMapEdgeKind }): MindMapEdgeKind {
  return edge.kind ?? "hierarchy";
}

export function resolveRootId(
  nodes: { id: string }[],
  edges: { source: string; target: string }[],
): string {
  const targets = new Set(edges.map((edge) => edge.target));

  return (
    nodes.find((node) => node.id === "root")?.id ??
    nodes.find((node) => !targets.has(node.id))?.id ??
    nodes[0]?.id ??
    "root"
  );
}

export function buildTreeEdges(
  nodes: { id: string }[],
  edges: MindMapContent["edges"],
  rootId: string,
): MindMapContent["edges"] {
  const hierarchyEdges = edges
    .filter((edge) => getEdgeKind(edge) === "hierarchy")
    .map((edge) => ({ ...edge, kind: "hierarchy" as const }));

  const parentsByChild = new Map<string, string[]>();

  for (const edge of hierarchyEdges) {
    const parents = parentsByChild.get(edge.target) ?? [];
    parents.push(edge.source);
    parentsByChild.set(edge.target, parents);
  }

  const depth = new Map<string, number>([[rootId, 0]]);
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const edge of hierarchyEdges) {
      if (edge.source === current && !depth.has(edge.target)) {
        depth.set(edge.target, depth.get(current)! + 1);
        queue.push(edge.target);
      }
    }
  }

  const treeEdges: MindMapContent["edges"] = [];
  const assignedChildren = new Set<string>();

  for (const node of nodes) {
    if (node.id === rootId) {
      continue;
    }

    const parents = parentsByChild.get(node.id) ?? [];
    const parent = parents
      .filter((candidate) => depth.has(candidate) && candidate !== node.id)
      .sort(
        (left, right) => (depth.get(left) ?? 0) - (depth.get(right) ?? 0),
      )[0];

    if (parent) {
      treeEdges.push({
        source: parent,
        target: node.id,
        kind: "hierarchy",
      });
      assignedChildren.add(node.id);
    }
  }

  for (const node of nodes) {
    if (node.id === rootId || assignedChildren.has(node.id)) {
      continue;
    }

    treeEdges.push({
      source: rootId,
      target: node.id,
      kind: "hierarchy",
    });
  }

  return treeEdges;
}

export function getRelationEdges(
  edges: MindMapContent["edges"],
  treeEdges: MindMapContent["edges"],
): MindMapContent["edges"] {
  const treePairs = new Set(
    treeEdges.map((edge) => `${edge.source}->${edge.target}`),
  );

  return edges.filter((edge) => {
    if (getEdgeKind(edge) !== "hierarchy") {
      return true;
    }

    return !treePairs.has(`${edge.source}->${edge.target}`);
  });
}

function getSourceColor(
  sourceId: string,
  sources: MindMapSourceRef[],
): string | undefined {
  const index = sources.findIndex((source) => source.id === sourceId);
  if (index === -1) {
    return undefined;
  }

  return SOURCE_COLORS[index % SOURCE_COLORS.length];
}

function getEdgeVisuals(kind: MindMapEdgeKind) {
  switch (kind) {
    case "supports":
      return {
        style: { stroke: "#10b981", strokeWidth: 2 },
        zIndex: 2,
      };
    case "contradicts":
      return {
        style: {
          stroke: "var(--destructive)",
          strokeWidth: 2,
          strokeDasharray: "6 4",
        },
        zIndex: 2,
      };
    case "relates":
      return {
        style: {
          stroke: "var(--muted-foreground)",
          strokeWidth: 1.5,
          strokeDasharray: "3 3",
        },
        zIndex: 1,
      };
    default:
      return {
        style: { stroke: "var(--border)", strokeWidth: 2 },
        zIndex: 0,
      };
  }
}

function getChildMap(treeEdges: MindMapContent["edges"]) {
  const childMap = new Map<string, string[]>();

  for (const edge of treeEdges) {
    const children = childMap.get(edge.source) ?? [];
    children.push(edge.target);
    childMap.set(edge.source, children);
  }

  return childMap;
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

export function getBranchLabels(
  nodeId: string,
  treeEdges: MindMapContent["edges"],
  nodes: MindMapContent["nodes"],
): string[] {
  const childMap = getChildMap(treeEdges);
  const labels: string[] = [];
  const stack = [...(childMap.get(nodeId) ?? [])];

  while (stack.length > 0) {
    const id = stack.pop();
    if (!id) {
      continue;
    }

    const node = nodes.find((entry) => entry.id === id);
    if (node) {
      labels.push(node.label);
    }

    stack.push(...(childMap.get(id) ?? []));
  }

  return labels;
}

export function buildBranchPrompt(
  nodeId: string,
  content: MindMapContent,
  treeEdges: MindMapContent["edges"],
): string {
  const node = content.nodes.find((entry) => entry.id === nodeId);
  if (!node) {
    return "Explain this mind map branch based on my selected sources.";
  }

  const branchLabels = getBranchLabels(nodeId, treeEdges, content.nodes);
  const branchContext =
    branchLabels.length > 0
      ? ` Include its subtopics: ${branchLabels.join(", ")}.`
      : "";

  const summaryContext = node.summary ? ` ${node.summary}` : "";

  return `Explain "${node.label}" based on my selected sources.${branchContext}${summaryContext}`;
}

export function buildMindMapElements(
  content: MindMapContent,
  sources: MindMapSourceRef[] = [],
): {
  nodes: Node<MindMapNodeData>[];
  edges: Edge[];
  treeEdges: MindMapContent["edges"];
} {
  const rootId = resolveRootId(content.nodes, content.edges);
  const treeEdges = buildTreeEdges(content.nodes, content.edges, rootId);
  const relationEdges = getRelationEdges(content.edges, treeEdges);
  const childMap = getChildMap(treeEdges);

  const nodes = content.nodes.map((node) => {
    const sourceTitle = node.sourceId
      ? sources.find((source) => source.id === node.sourceId)?.title
      : undefined;

    return {
      id: node.id,
      type: "mindMap",
      position: { x: 0, y: 0 },
      data: {
        label: node.label,
        summary: node.summary ?? "",
        sourceId: node.sourceId,
        sourceTitle,
        sourceColor: node.sourceId
          ? getSourceColor(node.sourceId, sources)
          : undefined,
        isRoot: node.id === rootId,
        hasChildren: (childMap.get(node.id)?.length ?? 0) > 0,
        collapsed: false,
        isSelected: false,
      },
    };
  });

  const edges = [...treeEdges, ...relationEdges].map((edge) => {
    const kind = getEdgeKind(edge);
    const visuals = getEdgeVisuals(kind);

    return {
      id: `${kind}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: "default",
      ...visuals,
      data: { kind },
    };
  });

  return { nodes, edges, treeEdges };
}

/** Dagre layout — tree edges only to avoid crossing clutter. */
export function layoutMindMap(
  nodes: Node<MindMapNodeData>[],
  edges: Edge[],
  treeEdges: MindMapContent["edges"],
  collapsedIds: ReadonlySet<string>,
  selectedNodeId: string | null,
): { nodes: Node<MindMapNodeData>[]; edges: Edge[] } {
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
      marginx: 24,
      marginy: 24,
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
        (collapsedIds.has(edge.source) &&
          getEdgeKind(
            (edge.data as { kind?: MindMapEdgeKind } | undefined) ?? {},
          ) !== "hierarchy"),
    })),
  };
}
