"use client";

import { Headphones } from "lucide-react";
import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  AudioPlayer,
  AudioPlayerControlBar,
  AudioPlayerDefaultControls,
  AudioPlayerDurationDisplay,
  AudioPlayerElement,
  AudioPlayerPlayButton,
  AudioPlayerSeekBackwardButton,
  AudioPlayerSeekForwardButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
} from "@/components/ai-elements/audio-player";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  findActiveSegment,
  getActiveWordIndex,
  tokenizeWords,
} from "@/lib/studio/audio-overview-sync";
import { cn } from "@/lib/utils";
import type {
  AudioOverviewContent,
  AudioOverviewSpeaker,
  AudioOverviewTimelineSegment,
} from "@/types";

function getSpeakerLabel(
  speaker: AudioOverviewSpeaker,
  content: AudioOverviewContent,
) {
  if (speaker === "narrator") return "Narrator";
  if (speaker === "host") return content.hosts?.host ?? "Host";
  return content.hosts?.cohost ?? "Co-host";
}

function getSpeakerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function speakerTone(speaker: AudioOverviewSpeaker) {
  return {
    text: "text-primary",
    soft: "bg-primary/10",
    ring: "ring-primary/30",
    ping: "bg-primary/25",
    dot: "bg-primary",
  };
}

function usePlaybackSync(
  audio: HTMLAudioElement | null,
  playback: AudioOverviewContent["playback"],
) {
  const [activeSegment, setActiveSegment] =
    useState<AudioOverviewTimelineSegment | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audio) return;

    let frameId = 0;

    const sync = () => {
      const timeMs = audio.currentTime * 1000;
      const segment = playback
        ? findActiveSegment(playback.timeline, timeMs)
        : null;

      setIsPlaying(!audio.paused && !audio.ended);
      if (segment) {
        setActiveSegment(segment);
        setActiveWordIndex(getActiveWordIndex(segment, timeMs));
      }
    };

    const tick = () => {
      sync();
      if (!audio.paused && !audio.ended) {
        frameId = requestAnimationFrame(tick);
      }
    };

    const onPlay = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(tick);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", sync);
    audio.addEventListener("ended", sync);
    audio.addEventListener("seeked", sync);

    if (!audio.paused && !audio.ended) {
      frameId = requestAnimationFrame(tick);
    } else {
      sync();
    }

    return () => {
      cancelAnimationFrame(frameId);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", sync);
      audio.removeEventListener("ended", sync);
      audio.removeEventListener("seeked", sync);
    };
  }, [audio, playback]);

  return { activeSegment, activeWordIndex, isPlaying };
}

function HighlightedWords({
  text,
  activeWordIndex,
}: {
  text: string;
  activeWordIndex: number;
}) {
  const words = tokenizeWords(text);

  return (
    <p className="text-base leading-relaxed flex flex-wrap">
      {words.map((word, index) => {
        const current = activeWordIndex >= 0 && index === activeWordIndex;
        const spoken = activeWordIndex >= 0 && index < activeWordIndex;

        return (
          <span
            key={`${word}-${index}`}
            className="relative mr-1.5 inline-block"
          >
            {current ? (
              <motion.span
                layoutId="activeWordHighlight"
                className="absolute inset-y-0 -inset-x-1 rounded-sm bg-primary/10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 transition-colors duration-200",
                current && "font-medium text-primary",
                spoken && "text-foreground",
                !spoken && !current && "text-muted-foreground/70",
              )}
            >
              {word}
            </span>
          </span>
        );
      })}
    </p>
  );
}

function SpeakingAvatar({
  speaker,
  name,
  role,
  active,
  speaking,
  align = "center",
}: {
  speaker: AudioOverviewSpeaker;
  name: string;
  role: string;
  active: boolean;
  speaking: boolean;
  align?: "left" | "center" | "right";
}) {
  const tone = speakerTone(speaker);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 transition-opacity duration-300",
        align === "left" && "items-start text-left",
        align === "right" && "items-end text-right",
        align === "center" && "items-center text-center",
        !active && "opacity-40",
      )}
    >
      <div className="relative">
        {speaking ? (
          <span className="absolute -top-0.6 right-0 z-30 flex size-3">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                tone.dot,
              )}
            />
            <span
              className={cn(
                "relative inline-flex size-3 rounded-full",
                tone.dot,
              )}
            />
          </span>
        ) : null}
        {active ? (
          <span
            className={cn(
              "absolute -inset-1 rounded-full ring-2",
              tone.soft,
              tone.ring,
            )}
          />
        ) : null}
        <Avatar
          className={cn(
            "relative size-14 sm:size-16 transition-all duration-300",
            speaking && "scale-105 shadow-md",
          )}
        >
          <AvatarImage
            src={
              speaker === "cohost"
                ? "https://img.icons8.com/comic/100/aef23f/person-female.png"
                : "https://img.icons8.com/comic/100/aef23f/user.png"
            }
            alt={name}
            className={cn(
              "object-cover",
              speaker === "cohost" && "-scale-x-100",
            )}
          />
          <AvatarFallback
            className={cn("font-medium text-base", tone.soft, tone.text)}
          >
            {getSpeakerInitials(name)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="space-y-0.5 mt-2 flex flex-col items-center gap-1  w-full text-center">
        <p className="truncate font-medium text-sm">{name}</p>
        <Badge variant={active ? "default" : "secondary"}>{role}</Badge>
      </div>
    </div>
  );
}

function SpeakerStage({
  content,
  activeSpeaker,
  isPlaying,
}: {
  content: AudioOverviewContent;
  activeSpeaker: AudioOverviewSpeaker | null;
  isPlaying: boolean;
}) {
  const panelClass = "p-4";

  if (content.format === "podcast" && content.hosts) {
    return (
      <div
        className={cn(
          panelClass,
          "flex items-start max-w-sm mx-auto justify-between gap-4",
        )}
      >
        <SpeakingAvatar
          speaker="host"
          name={content.hosts.host}
          role="Host"
          active={activeSpeaker === "host"}
          speaking={isPlaying && activeSpeaker === "host"}
          align="left"
        />
        <SpeakingAvatar
          speaker="cohost"
          name={content.hosts.cohost}
          role="Co-host"
          active={activeSpeaker === "cohost"}
          speaking={isPlaying && activeSpeaker === "cohost"}
          align="right"
        />
      </div>
    );
  }

  return (
    <div className={cn(panelClass, "flex justify-center")}>
      <SpeakingAvatar
        speaker="narrator"
        name={getSpeakerLabel("narrator", content)}
        role="Narrator"
        active
        speaking={isPlaying && activeSpeaker === "narrator"}
      />
    </div>
  );
}

function LiveCaption({
  content,
  activeSegment,
  activeWordIndex,
  isPlaying,
  audioElement,
}: {
  content: AudioOverviewContent;
  activeSegment: AudioOverviewTimelineSegment | null;
  activeWordIndex: number;
  isPlaying: boolean;
  audioElement: HTMLAudioElement | null;
}) {
  const hasStarted =
    audioElement && (audioElement.currentTime > 0 || isPlaying);

  if (!hasStarted) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-8 text-center text-muted-foreground text-sm">
        Press play to follow along.
      </div>
    );
  }

  if (!activeSegment) return null;

  const line = content.lines[activeSegment.lineStartIndex];
  if (!line) return null;

  const tone = speakerTone(line.speaker);

  return (
    <div>
      <p
        className={cn("font-medium text-xs uppercase tracking-wide", tone.text)}
      ></p>
      <HighlightedWords text={line.text} activeWordIndex={activeWordIndex} />
    </div>
  );
}

function FullTranscript({
  content,
  activeSegment,
}: {
  content: AudioOverviewContent;
  activeSegment: AudioOverviewTimelineSegment | null;
}) {
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!activeSegment) return;
    lineRefs.current[activeSegment.lineStartIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeSegment]);

  return (
    <div className="max-h-[min(50vh,24rem)] space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3">
      {content.lines.map((line, index) => {
        const isActive = activeSegment?.lineStartIndex === index;
        const tone = speakerTone(line.speaker);

        return (
          <div
            key={`${line.speaker}-${index}`}
            ref={(element) => {
              lineRefs.current[index] = element;
            }}
            className={cn(
              "rounded-lg border px-3 py-2.5 transition-colors",
              isActive
                ? "border-border bg-background"
                : "border-transparent text-muted-foreground",
            )}
          >
            <Badge variant={isActive ? "default" : "secondary"}>
              {getSpeakerLabel(line.speaker, content)}
            </Badge>
            <p className="text-sm leading-relaxed">{line.text}</p>
          </div>
        );
      })}
    </div>
  );
}

export function AudioOverviewViewer({
  content,
  fileUrl,
}: {
  content: AudioOverviewContent;
  fileUrl: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );
  const { activeSegment, activeWordIndex, isPlaying } = usePlaybackSync(
    audioElement,
    content.playback,
  );

  useEffect(() => {
    setAudioElement(
      containerRef.current?.querySelector(
        '[data-slot="audio-player-element"]',
      ) as HTMLAudioElement | null,
    );
  }, [fileUrl]);

  return (
    <div className="p-4">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex  gap-2 justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {content.format === "podcast" ? (
                  <Icon
                    icon="iconoir:podcast-solid"
                    className="size-6 text-primary shrink-0"
                  />
                ) : (
                  <Icon
                    icon="lucide:audio-lines"
                    className="size-5 text-primary shrink-0"
                  />
                )}
                {content.title}
              </div>
              {content.description ? (
                <p className="text-sm text-muted-foreground">
                  {content.description}
                </p>
              ) : null}
            </div>
            <Badge variant="secondary" className="capitalize">
              {content.format}
            </Badge>
          </div>
        </div>
      </div>
      <br />

      <div className="space-y-4">
        {fileUrl ? (
          <div ref={containerRef} className=" flex items-center justify-center">
            <AudioPlayerDefaultControls
              className="bg-linear-to-r from-muted/20 ring-3 ring-muted/50 via-muted/50 to-muted/20 w-full"
              src={fileUrl}
            />
          </div>
        ) : (
          <p className="text-destructive text-sm">
            Audio file is unavailable. Regenerate this artifact.
          </p>
        )}

        <Tabs defaultValue="listen">
          <TabsList className="w-full bg-transparent!">
            <TabsTrigger value="listen" className="flex-1">
              Now playing
            </TabsTrigger>
            <TabsTrigger value="transcript" className="flex-1">
              Transcript
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listen" className="space-y-4">
            <SpeakerStage
              content={content}
              activeSpeaker={activeSegment?.speaker ?? null}
              isPlaying={isPlaying}
            />
            <LiveCaption
              content={content}
              activeSegment={activeSegment}
              activeWordIndex={activeWordIndex}
              isPlaying={isPlaying}
              audioElement={audioElement}
            />
          </TabsContent>

          <TabsContent value="transcript">
            <FullTranscript content={content} activeSegment={activeSegment} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
