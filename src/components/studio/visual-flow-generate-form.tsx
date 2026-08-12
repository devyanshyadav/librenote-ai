"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { StudioGenerateFormHandle } from "@/components/studio/studio-generate-form.types";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_VISUAL_FLOW_DIAGRAM_TYPE,
  type VisualFlowDiagramType,
} from "@/lib/studio/visual-flow.constants";
import type { StudioGenerateOptions } from "@/types";

const DIAGRAM_GROUPS = [
  {
    category: "Software Architecture & Design",
    options: [
      {
        value: "flowchart",
        label: "Flowchart",
        icon: "octicon:flowchart-24",
        description: "Processes, workflows, and algorithms.",
      },
      {
        value: "sequence",
        label: "Sequence Diagram",
        icon: "tdesign:sequence",
        description: "API calls, temporal messaging, and system interactions.",
      },
      {
        value: "class",
        label: "Class Diagram",
        icon: "carbon:data-class",
        description: "OOP models, interfaces, inheritance, and properties.",
      },
      {
        value: "er",
        label: "Entity Relationship Diagram",
        icon: "carbon:chart-relationship",
        description: "DB schemas, primary/foreign keys, and cardinality.",
      },
      {
        value: "c4",
        label: "C4 Diagrams",
        icon: "lucide:network",
        description: "C4 architecture modeling.",
      },
      {
        value: "packet",
        label: "Packet Diagram",
        icon: "mingcute:red-packet-open-line",
        description:
          "Network protocol byte headers, frame formats, and binary structure.",
      },
    ],
  },
  {
    category: "Processes, Workflows & Systems Engineering",
    options: [
      {
        value: "state",
        label: "State Diagram",
        icon: "lucide:git-commit",
        description: "Finite state machines and lifecycle transitions.",
      },
      {
        value: "journey",
        label: "User Journey",
        icon: "lucide:milestone",
        description:
          "Multi-step user workflows tagged with satisfaction scores.",
      },
      {
        value: "git",
        label: "Git Graph",
        icon: "lucide:git-branch",
        description: "Git branching, commits, merges, and tags.",
      },
      {
        value: "requirement",
        label: "Requirement Diagram",
        icon: "lucide:clipboard-check",
        description:
          "Requirements, risks, element specifications, and verification tests.",
      },
      {
        value: "kanban",
        label: "Kanban Board",
        icon: "lucide:kanban",
        description: "Column-based task tracking (To Do, In Progress, Done).",
      },
      {
        value: "eventmodeling",
        label: "Event Modeling",
        icon: "lucide:table-properties",
        description: "Domain events, commands, and read models over time.",
      },
    ],
  },
  {
    category: "Project Management & Timelines",
    options: [
      {
        value: "gantt",
        label: "Gantt Chart",
        icon: "lucide:gantt-chart",
        description: "Project schedules, task dependencies, and milestones.",
      },
      {
        value: "timeline",
        label: "Timeline",
        icon: "lucide:calendar-days",
        description:
          "Chronological events, historical milestones, and process stages.",
      },
    ],
  },
  {
    category: "Data Visualizations & Analytics",
    options: [
      {
        value: "pie",
        label: "Pie Chart",
        icon: "lucide:pie-chart",
        description: "Proportional percentage breakdowns.",
      },
      {
        value: "xychart",
        label: "XY Chart",
        icon: "lucide:bar-chart-3",
        description: "Combined line and bar charts.",
      },
      {
        value: "mindmap",
        label: "Mindmap",
        icon: "lucide:git-fork",
        description: "Hierarchical concept trees and brainstorming maps.",
      },
      {
        value: "sankey",
        label: "Sankey Diagram",
        icon: "lucide:git-merge",
        description:
          "Flow magnitudes between nodes (budgets, traffic, energy).",
      },
      {
        value: "quadrant",
        label: "Quadrant Chart",
        icon: "lucide:layout-grid",
        description: "2x2 matrices (risk vs. reward, priority grids).",
      },
      {
        value: "radar",
        label: "Radar Chart",
        icon: "lucide:radar",
        description: "Multi-axis spider/radar charts.",
      },
      {
        value: "treemap",
        label: "Treemap",
        icon: "lucide:grid-3x3",
        description: "Hierarchical nested rectangular data visualizers.",
      },
      {
        value: "venn",
        label: "Venn Diagram",
        icon: "lucide:circle-dot",
        description: "Overlapping set relationships.",
      },
      {
        value: "ishikawa",
        label: "Ishikawa / Fishbone",
        icon: "lucide:fish",
        description: "Root-cause analysis diagrams.",
      },
    ],
  },
];

const DIAGRAM_TYPE_OPTIONS = DIAGRAM_GROUPS.flatMap((group) => group.options);

export const VisualFlowGenerateForm = forwardRef<
  StudioGenerateFormHandle,
  { disabled?: boolean }
>(function VisualFlowGenerateForm({ disabled }, ref) {
  const [diagramType, setDiagramType] = useState<VisualFlowDiagramType>(
    DEFAULT_VISUAL_FLOW_DIAGRAM_TYPE,
  );
  const [topic, setTopic] = useState("");

  const selectedDiagram = DIAGRAM_TYPE_OPTIONS.find(
    (option) => option.value === diagramType,
  );

  useImperativeHandle(ref, () => ({
    getOptions: (): StudioGenerateOptions => {
      const options: StudioGenerateOptions = {
        visualFlowDiagramType: diagramType,
      };
      const topicText = topic.trim();

      if (topicText) {
        options.customPrompt = topicText;
      }

      return options;
    },
    isValid: () => true,
    reset: () => {
      setDiagramType(DEFAULT_VISUAL_FLOW_DIAGRAM_TYPE);
      setTopic("");
    },
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <Label>Diagram Type</Label>
        <div className="space-y-4">
          {DIAGRAM_GROUPS.map((group) => (
            <div key={group.category} className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
                {group.category}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {group.options.map((option) => {
                  const isSelected = diagramType === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setDiagramType(option.value as VisualFlowDiagramType)
                      }
                      disabled={disabled}
                      className="text-xs px-3 h-8 rounded-full w-fit transition-all flex items-center gap-1.5"
                    >
                      {option.icon && (
                        <Icon
                          icon={option.icon}
                          className="size-3.5 shrink-0"
                        />
                      )}
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDiagram ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {selectedDiagram.description}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="visual-flow-topic">What should the diagram map?</Label>
        <Textarea
          id="visual-flow-topic"
          placeholder="e.g. Map the authentication request lifecycle, or compare compiler pipeline stages."
          className="mt-2 min-h-24 resize-none bg-card!"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          disabled={disabled}
          maxLength={2000}
        />
      </div>
    </div>
  );
});
