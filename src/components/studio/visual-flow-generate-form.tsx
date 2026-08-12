"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { StudioGenerateFormHandle } from "@/components/studio/studio-generate-form.types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StudioGenerateOptions } from "@/types";

const DIAGRAM_GROUPS = [
  {
    category: "Software Architecture & Design",
    options: [
      {
        value: "flowchart",
        label: "Flowchart",
        description: "Processes, workflows, and algorithms.",
      },
      {
        value: "sequence",
        label: "Sequence Diagram",
        description: "API calls, temporal messaging, and system interactions.",
      },
      {
        value: "class",
        label: "Class Diagram",
        description: "OOP models, interfaces, inheritance, and properties.",
      },
      {
        value: "er",
        label: "Entity Relationship Diagram",
        description: "DB schemas, primary/foreign keys, and cardinality.",
      },
      {
        value: "c4",
        label: "C4 Diagrams",
        description: "C4 architecture modeling.",
      },
      {
        value: "packet",
        label: "Packet Diagram",
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
        description: "Finite state machines and lifecycle transitions.",
      },
      {
        value: "journey",
        label: "User Journey",
        description:
          "Multi-step user workflows tagged with satisfaction scores.",
      },
      {
        value: "git",
        label: "Git Graph",
        description: "Git branching, commits, merges, and tags.",
      },
      {
        value: "requirement",
        label: "Requirement Diagram",
        description:
          "Requirements, risks, element specifications, and verification tests.",
      },
      {
        value: "kanban",
        label: "Kanban Board",
        description: "Column-based task tracking (To Do, In Progress, Done).",
      },
      {
        value: "eventmodeling",
        label: "Event Modeling",
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
        description: "Project schedules, task dependencies, and milestones.",
      },
      {
        value: "timeline",
        label: "Timeline",
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
        description: "Proportional percentage breakdowns.",
      },
      {
        value: "xychart",
        label: "XY Chart",
        description: "Combined line and bar charts.",
      },
      {
        value: "mindmap",
        label: "Mindmap",
        description: "Hierarchical concept trees and brainstorming maps.",
      },
      {
        value: "sankey",
        label: "Sankey Diagram",
        description:
          "Flow magnitudes between nodes (budgets, traffic, energy).",
      },
      {
        value: "quadrant",
        label: "Quadrant Chart",
        description: "2x2 matrices (risk vs. reward, priority grids).",
      },
      {
        value: "radar",
        label: "Radar Chart",
        description: "Multi-axis spider/radar charts.",
      },
      {
        value: "treemap",
        label: "Treemap",
        description: "Hierarchical nested rectangular data visualizers.",
      },
      {
        value: "venn",
        label: "Venn Diagram",
        description: "Overlapping set relationships.",
      },
      {
        value: "ishikawa",
        label: "Ishikawa / Fishbone",
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
  const [diagramType, setDiagramType] = useState("flowchart");
  const [topic, setTopic] = useState("");

  const selectedDiagram = DIAGRAM_TYPE_OPTIONS.find(
    (option) => option.value === diagramType,
  );

  useImperativeHandle(ref, () => ({
    getOptions: (): StudioGenerateOptions => {
      const options: StudioGenerateOptions = {
        visualFlowDiagramType: diagramType,
      };
      const typeDesc = selectedDiagram
        ? `Generate a Mermaid ${selectedDiagram.value} diagram.`
        : "";
      const topicText = topic.trim();

      if (topicText) {
        options.customPrompt = `${typeDesc}\n\nUser instructions:\n${topicText}`;
      } else if (typeDesc) {
        options.customPrompt = typeDesc;
      }

      return options;
    },
    isValid: () => true,
    reset: () => {
      setDiagramType("flowchart");
      setTopic("");
    },
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="diagram-type-select">Diagram Type</Label>
        <Select
          value={diagramType}
          onValueChange={(val) => setDiagramType(val || "flowchart")}
          disabled={disabled}
        >
          <SelectTrigger id="diagram-type-select" className="w-full bg-card!">
            <SelectValue placeholder="Select a diagram type" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            {DIAGRAM_GROUPS.map((group) => (
              <SelectGroup key={group.category}>
                <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">
                  {group.category}
                </SelectLabel>
                {group.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
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
