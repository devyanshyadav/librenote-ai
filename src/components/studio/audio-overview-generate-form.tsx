"use client";

import { Check } from "lucide-react";
import { Icon } from "@iconify/react";
import { forwardRef, useImperativeHandle, useState } from "react";
import type { StudioGenerateFormHandle } from "@/components/studio/studio-generate-form.types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_KOKORO_AUDIO_LANGUAGE } from "@/lib/constants/kokoro.constants";
import {
  AUDIO_LANGUAGE_OPTIONS,
  AUDIO_LENGTH_OPTIONS,
  AUDIO_PODCAST_STYLE_OPTIONS,
} from "@/lib/studio/audio-overview-options";
import { cn } from "@/lib/utils";
import type {
  AudioLanguage,
  AudioLength,
  AudioOverviewFormat,
  AudioPodcastStyle,
  StudioGenerateOptions,
} from "@/types";
import { Button } from "../ui/button";

const DELIVERY_OPTIONS: {
  value: AudioOverviewFormat;
  label: string;
  icon: string;
}[] = [
  { value: "overview", label: "Narrator", icon: "lucide:audio-lines" },
  { value: "podcast", label: "Podcast", icon: "iconoir:podcast-solid" },
];

export const AudioOverviewGenerateForm = forwardRef<
  StudioGenerateFormHandle,
  { disabled?: boolean }
>(function AudioOverviewGenerateForm({ disabled }, ref) {
  const [delivery, setDelivery] = useState<AudioOverviewFormat>("podcast");
  const [podcastStyle, setPodcastStyle] =
    useState<AudioPodcastStyle>("deep_dive");
  const [length, setLength] = useState<AudioLength>("default");
  const [language, setLanguage] = useState<AudioLanguage>(
    DEFAULT_KOKORO_AUDIO_LANGUAGE,
  );
  const [focus, setFocus] = useState("");

  useImperativeHandle(ref, () => ({
    getOptions: (): StudioGenerateOptions => {
      const options: StudioGenerateOptions = {
        audioOverviewFormat: delivery,
        audioLength: length,
        audioLanguage: language,
      };

      if (delivery === "podcast") {
        options.audioPodcastStyle = podcastStyle;
      }

      const focusText = focus.trim();
      if (focusText) {
        options.customPrompt = focusText;
      }

      return options;
    },
    isValid: () => true,
    reset: () => {
      setDelivery("podcast");
      setPodcastStyle("deep_dive");
      setLength("default");
      setLanguage(DEFAULT_KOKORO_AUDIO_LANGUAGE);
      setFocus("");
    },
  }));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Presentation</Label>
        <div className="grid grid-cols-2 gap-2">
          {DELIVERY_OPTIONS.map((option) => {
            const selected = delivery === option.value;

            return (
              <Button
                key={option.value}
                disabled={disabled}
                size={"lg"}
                variant={selected ? "default" : "secondary"}
                onClick={() => setDelivery(option.value)}
              >
                <Icon icon={option.icon} className="size-4 shrink-0" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {delivery === "podcast" ? (
        <div className="space-y-2">
          <Label>Conversation style</Label>
          <div className="grid grid-cols-4 gap-2.5 mt-2">
            {AUDIO_PODCAST_STYLE_OPTIONS.map((option) => {
              const selected = podcastStyle === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPodcastStyle(option.value)}
                  className={cn(
                    "relative rounded-xl border p-3 ring-3 text-left transition-colors",
                    selected
                      ? "border-primary/40 bg-primary/10 ring-primary/20"
                      : "border-border bg-card/50 hover:bg-card ring-muted/50",
                  )}
                >
                  <span className="block pr-5 font-medium text-sm">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-muted-foreground text-xs leading-relaxed">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="audio-language">Language</Label>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as AudioLanguage)}
            disabled={disabled}
          >
            <SelectTrigger
              id="audio-language"
              className="w-full bg-card! h-10! mt-2"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIO_LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Length</Label>
          <div className=" rounded-xl border border-border grid grid-cols-3 bg-card gap-2 p-1 mt-2">
            {AUDIO_LENGTH_OPTIONS.map((option) => {
              const selected = length === option.value;

              return (
                <Button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  variant={selected ? "default" : "secondary"}
                  onClick={() => setLength(option.value)}
                >
                  {selected ? <Check className="size-3.5" /> : null}
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audio-focus">
          {delivery === "podcast"
            ? "What should the presenters emphasize?"
            : "What should the narration emphasize?"}
        </Label>
        <Textarea
          id="audio-focus"
          placeholder="e.g. Compare the cost savings from automation against the setup effort."
          className="min-h-24 mt-2 resize-none bg-card!"
          value={focus}
          onChange={(event) => setFocus(event.target.value)}
          disabled={disabled}
          maxLength={2000}
        />
      </div>
    </div>
  );
});
