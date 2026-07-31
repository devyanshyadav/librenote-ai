"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function StudioSegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-border bg-card p-1">
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              disabled={disabled}
              variant={selected ? "default" : "secondary"}
              onClick={() => onChange(option.value)}
            >
              {selected ? <Check className="size-3.5" /> : null}
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
