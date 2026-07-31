import type {
  AudioOverviewContent,
  AudioOverviewPlayback,
  AudioOverviewSpeaker,
  AudioOverviewTimelineSegment,
} from "@/types";
import { buildWordTimings } from "@/lib/studio/audio-overview-sync";

const BYTES_PER_SAMPLE = 2;
const SPEAKER_GAP_MS = 400;
const DEFAULT_SAMPLE_RATE = 24_000;

type ScriptLine = {
  speaker: AudioOverviewSpeaker;
  text: string;
  lineIndex: number;
};

type SynthesizedTrack = {
  speaker: AudioOverviewSpeaker;
  pcm: Buffer;
  sampleRate: number;
  lines: ScriptLine[];
};

function getScriptLines(content: AudioOverviewContent): ScriptLine[] {
  return content.lines
    .map((line, lineIndex) => ({ ...line, text: line.text.trim(), lineIndex }))
    .filter((line) => line.text.length > 0);
}

function joinLines(lines: ScriptLine[]): string {
  return lines.map((line) => line.text).join("\n\n");
}

export function buildTtsRequests(content: AudioOverviewContent) {
  const lines = getScriptLines(content);

  if (lines.length === 0) {
    return [];
  }

  if (content.format === "overview") {
    return [{ speaker: "narrator" as const, text: joinLines(lines), lines }];
  }

  return (["host", "cohost"] as const).flatMap((speaker) => {
    const speakerLines = lines.filter((line) => line.speaker === speaker);

    return speakerLines.length > 0
      ? [{ speaker, text: joinLines(speakerLines), lines: speakerLines }]
      : [];
  });
}

function createTimelineSegment(
  line: ScriptLine,
  pcm: Buffer,
  sampleRate: number,
  startMs: number,
): AudioOverviewTimelineSegment {
  const durationMs = pcmDurationMs(pcm, sampleRate);

  return {
    speaker: line.speaker,
    text: line.text,
    startMs,
    durationMs,
    lineStartIndex: line.lineIndex,
    lineEndIndex: line.lineIndex,
    words: buildWordTimings(line.text, startMs, durationMs),
  };
}

function buildLineTimeline(
  lines: ScriptLine[],
  slices: Buffer[],
  sampleRate: number,
): AudioOverviewTimelineSegment[] {
  const timeline: AudioOverviewTimelineSegment[] = [];
  let cursorMs = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const segment = createTimelineSegment(
      lines[index]!,
      slices[index] ?? Buffer.alloc(0),
      sampleRate,
      cursorMs,
    );
    timeline.push(segment);
    cursorMs += segment.durationMs;
  }

  return timeline;
}

export function assembleAudio(
  content: AudioOverviewContent,
  tracks: SynthesizedTrack[],
): { pcm: Buffer; playback: AudioOverviewPlayback; sampleRate: number } {
  const sampleRate = tracks[0]?.sampleRate ?? DEFAULT_SAMPLE_RATE;

  if (content.format === "overview") {
    const track = tracks[0];
    const slices = splitPcmTrackIntoLines(
      track.pcm,
      sampleRate,
      track.lines.map((line) => line.text.length),
    );

    return {
      pcm: track.pcm,
      sampleRate,
      playback: {
        durationMs: pcmDurationMs(track.pcm, sampleRate),
        timeline: buildLineTimeline(track.lines, slices, sampleRate),
      },
    };
  }

  const slicesBySpeaker = new Map(
    tracks.map((track) => [
      track.speaker,
      splitPcmTrackIntoLines(
        track.pcm,
        sampleRate,
        track.lines.map((line) => line.text.length),
      ),
    ]),
  );

  const sliceCursor: Record<"host" | "cohost", number> = { host: 0, cohost: 0 };
  const parts: Buffer[] = [];
  const timeline: AudioOverviewTimelineSegment[] = [];
  let cursorMs = 0;
  let previousSpeaker: AudioOverviewSpeaker | null = null;

  for (const line of getScriptLines(content).filter(
    (entry) => entry.speaker === "host" || entry.speaker === "cohost",
  )) {
    if (previousSpeaker && previousSpeaker !== line.speaker) {
      parts.push(createSilence(SPEAKER_GAP_MS, sampleRate));
      cursorMs += SPEAKER_GAP_MS;
    }

    const speaker = line.speaker as "host" | "cohost";
    const pcm =
      slicesBySpeaker.get(speaker)?.[sliceCursor[speaker]++] ?? Buffer.alloc(0);
    parts.push(pcm);

    const segment = createTimelineSegment(line, pcm, sampleRate, cursorMs);
    timeline.push(segment);
    cursorMs += segment.durationMs;
    previousSpeaker = line.speaker;
  }

  return {
    pcm: Buffer.concat(parts),
    playback: { durationMs: cursorMs, timeline },
    sampleRate,
  };
}

function splitPcmTrackIntoLines(
  pcm: Buffer,
  sampleRate: number,
  weights: number[],
): Buffer[] {
  const totalSamples = pcm.length / BYTES_PER_SAMPLE;
  const totalDurationMs = Math.round((totalSamples / sampleRate) * 1000);

  if (weights.length <= 1 || totalSamples === 0) {
    return [pcm];
  }

  // 1. Compute average absolute energy profile in sequential 10ms blocks
  const blockSamples = Math.round(0.01 * sampleRate);
  const blockBytes = blockSamples * BYTES_PER_SAMPLE;
  const energies: number[] = [];

  for (let offset = 0; offset < pcm.length; offset += blockBytes) {
    const end = Math.min(offset + blockBytes, pcm.length);
    let sum = 0;
    let count = 0;
    for (let i = offset; i < end; i += 2) {
      sum += Math.abs(pcm.readInt16LE(i));
      count++;
    }
    energies.push(count > 0 ? sum / count : 0);
  }

  // Determine silence threshold dynamically (20th percentile)
  const sortedEnergies = [...energies].sort((a, b) => a - b);
  const silenceThreshold = Math.max(
    10,
    sortedEnergies[Math.floor(energies.length * 0.2)] ?? 100,
  );

  // 2. Identify contiguous silence gaps of at least 100ms
  type SilenceGap = { midMs: number; durationMs: number };
  const gaps: SilenceGap[] = [];
  let inSilence = false;
  let silenceStartMs = 0;

  for (let i = 0; i < energies.length; i++) {
    const isSilent = energies[i] < silenceThreshold;
    if (isSilent && !inSilence) {
      inSilence = true;
      silenceStartMs = i * 10;
    } else if (!isSilent && inSilence) {
      inSilence = false;
      const durationMs = i * 10 - silenceStartMs;
      if (durationMs >= 100) {
        gaps.push({
          midMs: silenceStartMs + Math.round(durationMs / 2),
          durationMs,
        });
      }
    }
  }

  // 3. Expected split times based on relative segment weights
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const expectedSplitsMs: number[] = [];
  let cumWeight = 0;
  for (let i = 0; i < weights.length - 1; i++) {
    cumWeight += weights[i];
    expectedSplitsMs.push(
      Math.round((cumWeight / totalWeight) * totalDurationMs),
    );
  }

  const N = expectedSplitsMs.length;
  const M = gaps.length;

  // Fallback to proportional split if not enough gaps found
  if (M < N) {
    const slices: Buffer[] = [];
    let sampleOffset = 0;
    for (let i = 0; i < weights.length; i++) {
      const isLast = i === weights.length - 1;
      const samples = isLast
        ? totalSamples - sampleOffset
        : Math.round((weights[i] / totalWeight) * totalSamples);
      slices.push(
        Buffer.from(
          pcm.subarray(
            sampleOffset * BYTES_PER_SAMPLE,
            (sampleOffset + samples) * BYTES_PER_SAMPLE,
          ),
        ),
      );
      sampleOffset += samples;
    }
    return slices;
  }

  // 4. Viterbi DP sequence alignment (O(N * M) flat loops)
  const dp: number[][] = Array.from({ length: N }, () =>
    Array(M).fill(Number.MAX_VALUE),
  );
  const parent: number[][] = Array.from({ length: N }, () => Array(M).fill(-1));

  // Initialize base case
  for (let j = 0; j < M; j++) {
    const diff = Math.abs(gaps[j].midMs - expectedSplitsMs[0]);
    dp[0][j] = diff * diff - gaps[j].durationMs * 2;
  }

  // DP transitions with running minimum tracking (eliminates the 3rd nested loop)
  for (let i = 1; i < N; i++) {
    let minPrevCost = Number.MAX_VALUE;
    let bestParent = -1;

    for (let j = i; j < M; j++) {
      const prevIdx = j - 1;
      if (dp[i - 1][prevIdx] < minPrevCost) {
        minPrevCost = dp[i - 1][prevIdx];
        bestParent = prevIdx;
      }

      if (minPrevCost !== Number.MAX_VALUE) {
        const diff = Math.abs(gaps[j].midMs - expectedSplitsMs[i]);
        dp[i][j] = minPrevCost + diff * diff - gaps[j].durationMs * 2;
        parent[i][j] = bestParent;
      }
    }
  }

  // Find ending state with the lowest cost
  let minTotalCost = Number.MAX_VALUE;
  let bestEndIdx = -1;
  for (let j = N - 1; j < M; j++) {
    if (dp[N - 1][j] < minTotalCost) {
      minTotalCost = dp[N - 1][j];
      bestEndIdx = j;
    }
  }

  // Reconstruct optimal gap sequence backward
  const optimalGapIndices: number[] = [];
  let currIdx = bestEndIdx;
  for (let i = N - 1; i >= 0; i--) {
    optimalGapIndices.push(currIdx);
    currIdx = parent[i][currIdx];
  }
  optimalGapIndices.reverse();

  // Slice original PCM buffer at optimal split points
  const slices: Buffer[] = [];
  let lastSplit = 0;

  for (let i = 0; i <= optimalGapIndices.length; i++) {
    const end =
      i === optimalGapIndices.length
        ? totalSamples
        : Math.round((gaps[optimalGapIndices[i]].midMs / 1000) * sampleRate);
    const byteOffset = lastSplit * BYTES_PER_SAMPLE;
    const byteLength = (end - lastSplit) * BYTES_PER_SAMPLE;
    slices.push(Buffer.from(pcm.subarray(byteOffset, byteOffset + byteLength)));
    lastSplit = end;
  }

  return slices;
}

function pcmDurationMs(pcm: Buffer, sampleRate: number): number {
  return Math.round((pcm.length / BYTES_PER_SAMPLE / sampleRate) * 1000);
}

function createSilence(durationMs: number, sampleRate: number): Buffer {
  const samples = Math.round((durationMs / 1000) * sampleRate);
  return Buffer.alloc(samples * BYTES_PER_SAMPLE);
}

export function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}
