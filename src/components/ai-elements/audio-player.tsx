"use client";

import type { Experimental_SpeechResult as SpeechResult } from "ai";
import {
  MediaControlBar,
  MediaController,
  MediaDurationDisplay,
  MediaMuteButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from "media-chrome/react";
import type { ComponentProps, CSSProperties, ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const audioPlayerTheme = {
  "--media-background-color": "transparent",
  "--media-button-icon-height": "1rem",
  "--media-button-icon-width": "1rem",
  "--media-control-background": "transparent",
  "--media-control-hover-background": "var(--muted)",
  "--media-control-padding": "0",
  "--media-font": "var(--font-sans)",
  "--media-font-size": "12px",
  "--media-icon-color": "currentColor",
  "--media-preview-time-background": "var(--background)",
  "--media-preview-time-border-radius": "var(--radius-md)",
  "--media-preview-time-text-shadow": "none",
  "--media-primary-color": "var(--foreground)",
  "--media-range-bar-color": "var(--foreground)",
  "--media-range-padding": "0",
  "--media-range-thumb-border": "none",
  "--media-range-thumb-border-radius": "9999px",
  "--media-range-thumb-height": "12px",
  "--media-range-thumb-width": "12px",
  "--media-range-track-background": "var(--border)",
  "--media-range-track-height": "3px",
  "--media-range-track-border-radius": "9999px",
  "--media-secondary-color": "var(--border)",
  "--media-text-color": "var(--foreground)",
  "--media-tooltip-display": "none",
  "--media-tooltip-arrow-display": "none",
  "--media-tooltip-background": "var(--background)",
  "--media-tooltip-border-radius": "var(--radius-md)",
} as CSSProperties;

export type AudioPlayerProps = Omit<
  ComponentProps<typeof MediaController>,
  "audio"
>;

export const AudioPlayer = ({
  children,
  className,
  style,
  ...props
}: AudioPlayerProps) => (
  <MediaController
    audio
    data-slot="audio-player"
    className={cn(
      "overflow-visible rounded-xl border border-border bg-background px-5 py-5",
      className,
    )}
    style={{ ...audioPlayerTheme, ...style }}
    {...props}
  >
    {children}
  </MediaController>
);

export type AudioPlayerElementProps = Omit<ComponentProps<"audio">, "src"> &
  (
    | {
        data: SpeechResult["audio"];
      }
    | {
        src: string;
      }
  );

export const AudioPlayerElement = ({ ...props }: AudioPlayerElementProps) => (
  // oxlint-disable-next-line eslint-plugin-jsx-a11y(media-has-caption) -- audio player captions are provided by consumer
  <audio
    data-slot="audio-player-element"
    slot="media"
    src={
      "src" in props
        ? props.src
        : `data:${props.data.mediaType};base64,${props.data.base64}`
    }
    {...props}
  />
);

export type AudioPlayerControlBarProps = ComponentProps<typeof MediaControlBar>;

export const AudioPlayerControlBar = ({
  children,
  className,
  ...props
}: AudioPlayerControlBarProps) => (
  <MediaControlBar
    data-slot="audio-player-control-bar"
    className={cn(
      "mx-auto flex w-full max-w-md flex-col items-center gap-4",
      className,
    )}
    {...props}
  >
    {children}
  </MediaControlBar>
);

export type AudioPlayerTransportProps = ComponentProps<"div">;

export const AudioPlayerTransport = ({
  children,
  className,
  ...props
}: AudioPlayerTransportProps) => (
  <div
    data-slot="audio-player-transport"
    className={cn("flex items-center justify-center gap-4", className)}
    {...props}
  >
    {children}
  </div>
);

export type AudioPlayerTimelineProps = ComponentProps<"div">;

export const AudioPlayerTimeline = ({
  children,
  className,
  ...props
}: AudioPlayerTimelineProps) => (
  <div
    data-slot="audio-player-timeline"
    className={cn("flex w-full min-w-0 items-center gap-2 sm:gap-3", className)}
    {...props}
  >
    {children}
  </div>
);

export type AudioPlayerVolumeProps = ComponentProps<"div">;

export const AudioPlayerVolume = ({
  children,
  className,
  ...props
}: AudioPlayerVolumeProps) => (
  <div
    data-slot="audio-player-volume"
    className={cn(
      "flex shrink-0 items-center gap-1.5 border-border border-l pl-2 sm:gap-2 sm:pl-3",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

function TransportButton({ render }: { render: ReactElement }) {
  return (
    <Button
      size="icon-lg"
      variant="outline"
      className="size-10"
      render={render}
    />
  );
}

export type AudioPlayerPlayButtonProps = ComponentProps<typeof MediaPlayButton>;

export const AudioPlayerPlayButton = ({
  className,
  ...props
}: AudioPlayerPlayButtonProps) => (
  <Button
    size="icon-lg"
    className="size-12"
    render={
      <MediaPlayButton
        noTooltip
        className={cn(className)}
        data-slot="audio-player-play-button"
        {...props}
      />
    }
  />
);

export type AudioPlayerSeekBackwardButtonProps = ComponentProps<
  typeof MediaSeekBackwardButton
>;

export const AudioPlayerSeekBackwardButton = ({
  seekOffset = 10,
  ...props
}: AudioPlayerSeekBackwardButtonProps) => (
  <TransportButton
    render={
      <MediaSeekBackwardButton
        noTooltip
        data-slot="audio-player-seek-backward-button"
        seekOffset={seekOffset}
        {...props}
      />
    }
  />
);

export type AudioPlayerSeekForwardButtonProps = ComponentProps<
  typeof MediaSeekForwardButton
>;

export const AudioPlayerSeekForwardButton = ({
  seekOffset = 10,
  ...props
}: AudioPlayerSeekForwardButtonProps) => (
  <TransportButton
    render={
      <MediaSeekForwardButton
        noTooltip
        data-slot="audio-player-seek-forward-button"
        seekOffset={seekOffset}
        {...props}
      />
    }
  />
);

export type AudioPlayerTimeDisplayProps = ComponentProps<
  typeof MediaTimeDisplay
>;

export const AudioPlayerTimeDisplay = ({
  className,
  ...props
}: AudioPlayerTimeDisplayProps) => (
  <MediaTimeDisplay
    className={cn("shrink-0 text-xs tabular-nums text-foreground", className)}
    data-slot="audio-player-time-display"
    {...props}
  />
);

export type AudioPlayerTimeRangeProps = ComponentProps<typeof MediaTimeRange>;

export const AudioPlayerTimeRange = ({
  className,
  ...props
}: AudioPlayerTimeRangeProps) => (
  <MediaTimeRange
    className={cn(
      "min-h-4 min-w-0 px-2 bg-transparent! rounded-full flex-1",
      className,
    )}
    data-slot="audio-player-time-range"
    {...props}
  />
);

export type AudioPlayerDurationDisplayProps = ComponentProps<
  typeof MediaDurationDisplay
>;

export const AudioPlayerDurationDisplay = ({
  className,
  ...props
}: AudioPlayerDurationDisplayProps) => (
  <MediaDurationDisplay
    className={cn("shrink-0 text-xs tabular-nums text-foreground", className)}
    data-slot="audio-player-duration-display"
    {...props}
  />
);

export type AudioPlayerMuteButtonProps = ComponentProps<typeof MediaMuteButton>;

export const AudioPlayerMuteButton = ({
  className,
  ...props
}: AudioPlayerMuteButtonProps) => (
  <MediaMuteButton
    noTooltip
    className={cn(
      "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-transparent p-0 text-foreground hover:bg-muted",
      className,
    )}
    data-slot="audio-player-mute-button"
    {...props}
  />
);

export type AudioPlayerVolumeRangeProps = ComponentProps<
  typeof MediaVolumeRange
>;

export const AudioPlayerVolumeRange = ({
  className,
  ...props
}: AudioPlayerVolumeRangeProps) => (
  <MediaVolumeRange
    className={cn("h-4 w-14 min-w-14 bg-transparent! sm:w-20", className)}
    data-slot="audio-player-volume-range"
    {...props}
  />
);

export type AudioPlayerDefaultControlsProps = {
  className?: string;
} & AudioPlayerElementProps;

export function AudioPlayerDefaultControls({
  className,
  ...audioProps
}: AudioPlayerDefaultControlsProps) {
  return (
    <AudioPlayer className={className}>
      <AudioPlayerElement {...audioProps} />
      <AudioPlayerControlBar>
        <AudioPlayerTransport>
          <AudioPlayerSeekBackwardButton />
          <AudioPlayerPlayButton />
          <AudioPlayerSeekForwardButton />
        </AudioPlayerTransport>
        <AudioPlayerTimeline>
          <AudioPlayerTimeDisplay />
          <AudioPlayerTimeRange />
          <AudioPlayerDurationDisplay />
          <AudioPlayerVolume>
            <AudioPlayerMuteButton />
            <AudioPlayerVolumeRange />
          </AudioPlayerVolume>
        </AudioPlayerTimeline>
      </AudioPlayerControlBar>
    </AudioPlayer>
  );
}
