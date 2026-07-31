import type {
  AudioOverviewTimelineSegment,
  AudioOverviewWordTiming,
} from "@/types";

export function tokenizeWords(text: string): string[] {
  return text.match(/\S+/g) ?? [];
}

export function buildWordTimings(
  text: string,
  segmentStartMs: number,
  durationMs: number,
): AudioOverviewWordTiming[] {
  const words = tokenizeWords(text);

  if (words.length === 0 || durationMs <= 0) {
    return [];
  }

  const totalChars = words.reduce((sum, word) => sum + word.length, 0);
  const segmentEndMs = segmentStartMs + durationMs;
  let cursor = segmentStartMs;

  return words.map((word, index) => {
    const remainingWords = words.length - index;
    const remainingDuration = segmentEndMs - cursor;
    const wordDuration =
      remainingWords === 1
        ? remainingDuration
        : Math.round((word.length / totalChars) * durationMs);
    const startMs = cursor;
    const endMs = Math.min(segmentEndMs, cursor + Math.max(wordDuration, 1));

    cursor = endMs;

    return { text: word, startMs, endMs };
  });
}

export function findActiveSegment(
  timeline: AudioOverviewTimelineSegment[] | undefined,
  timeMs: number,
): AudioOverviewTimelineSegment | null {
  if (!timeline?.length) {
    return null;
  }

  return (
    timeline.find((segment, index) => {
      const endMs = segment.startMs + segment.durationMs;
      const isLast = index === timeline.length - 1;
      return (
        timeMs >= segment.startMs && (isLast ? timeMs <= endMs : timeMs < endMs)
      );
    }) ?? null
  );
}

export function getActiveWordIndex(
  segment: AudioOverviewTimelineSegment,
  timeMs: number,
): number {
  const words =
    segment.words ??
    buildWordTimings(segment.text, segment.startMs, segment.durationMs);

  if (words.length === 0) {
    return -1;
  }

  if (timeMs < words[0]!.startMs) {
    return -1;
  }

  const lastWord = words.at(-1)!;

  if (timeMs >= lastWord.endMs) {
    return words.length - 1;
  }

  const index = words.findIndex(
    (word) => timeMs >= word.startMs && timeMs < word.endMs,
  );

  return index >= 0 ? index : -1;
}
