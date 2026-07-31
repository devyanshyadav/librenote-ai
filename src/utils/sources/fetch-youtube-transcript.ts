import {
  AgeRestricted,
  type FetchedTranscript,
  IpBlocked,
  NoTranscriptFound,
  RateLimitExceeded,
  RequestBlocked,
  TranscriptsDisabled,
  type VideoMetadata,
  VideoUnavailable,
  YouTubeTranscriptApi,
} from "youtube-transcript-api-js";
import { AppError, toUserFacingError } from "@/lib/app-error";
import type { YouTubeSourceMetadata } from "@/types";
import { assertYouTubeVideoUrl } from "@/utils/sources/validate-youtube-url";

const PREFERRED_LANGUAGES = ["en", "en-US", "en-GB"] as const;

const youtubeTranscriptApi = new YouTubeTranscriptApi();

export interface YouTubeVideoContent {
  title: string;
  text: string;
  url: string;
  metadata: YouTubeSourceMetadata;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function normalizeTranscriptText(text: string): string {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function getBestThumbnailUrl(
  videoId: string,
  metadata?: VideoMetadata,
): string {
  const thumbnails = metadata?.thumbnail?.thumbnails ?? [];
  const best = [...thumbnails].sort((a, b) => b.width - a.width)[0];

  return best?.url ?? getYouTubeThumbnailUrl(videoId);
}

function buildYouTubeMetadata(
  videoId: string,
  url: string,
  title: string,
  transcript: FetchedTranscript,
): YouTubeSourceMetadata {
  const metadata = transcript.metadata;

  return {
    videoId,
    url,
    title,
    description: metadata?.shortDescription?.trim() || null,
    channelName: metadata?.author?.trim() || null,
    channelId: metadata?.channelId || null,
    thumbnailUrl: getBestThumbnailUrl(videoId, metadata),
    durationSeconds: metadata?.lengthSeconds
      ? Number(metadata.lengthSeconds)
      : null,
    languageCode: transcript.languageCode || null,
    isGenerated: transcript.isGenerated,
  };
}

function mapYouTubeError(error: unknown): AppError {
  if (error instanceof TranscriptsDisabled) {
    return new AppError(
      "Captions are disabled for this video. Try another video or paste the transcript manually.",
    );
  }

  if (error instanceof NoTranscriptFound) {
    return new AppError(
      "No transcript is available for this video. Try another video or paste the transcript manually.",
    );
  }

  if (error instanceof VideoUnavailable) {
    return new AppError("This YouTube video is unavailable or private.");
  }

  if (error instanceof AgeRestricted) {
    return new AppError(
      "This video is age-restricted and cannot be imported automatically.",
    );
  }

  if (error instanceof IpBlocked || error instanceof RequestBlocked) {
    return new AppError(
      "YouTube blocked the import request. Please try again in a few minutes.",
    );
  }

  if (error instanceof RateLimitExceeded) {
    return new AppError(
      "YouTube rate limit reached. Please wait a moment and try again.",
    );
  }

  return toUserFacingError(error, "Failed to fetch YouTube transcript.");
}

async function fetchTranscriptWithFallback(
  videoId: string,
): Promise<FetchedTranscript> {
  try {
    return await youtubeTranscriptApi.fetch(videoId, [...PREFERRED_LANGUAGES]);
  } catch (error) {
    if (!(error instanceof NoTranscriptFound)) {
      throw error;
    }

    const transcriptList = await youtubeTranscriptApi.list(videoId);
    const availableTranscripts = transcriptList.getAllTranscripts();

    if (availableTranscripts.length === 0) {
      throw error;
    }

    const manualTranscript = availableTranscripts.find(
      (transcript) => !transcript.isGenerated,
    );

    return (manualTranscript ?? availableTranscripts[0]).fetch();
  }
}

export async function fetchYouTubeTranscript(
  input: string,
): Promise<YouTubeVideoContent> {
  const { videoId, url } = assertYouTubeVideoUrl(input);

  try {
    const transcript = await fetchTranscriptWithFallback(videoId);

    const text = normalizeTranscriptText(
      transcript.snippets.map((snippet) => snippet.text).join("\n"),
    );

    if (!text) {
      throw new AppError(
        "No transcript text could be extracted from this video.",
      );
    }

    const title =
      transcript.metadata?.title?.trim() || `YouTube video ${videoId}`;

    return {
      title,
      text,
      url,
      metadata: buildYouTubeMetadata(videoId, url, title, transcript),
    };
  } catch (error) {
    throw mapYouTubeError(error);
  }
}
