import { AppError } from "@/lib/app-error";

const YOUTUBE_VIDEO_ID_PATTERN = /^[\w-]{11}$/;

export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();

  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : null;
      }

      const pathMatch = url.pathname.match(
        /^\/(?:shorts|embed|live|v)\/([\w-]{11})/,
      );
      if (pathMatch) {
        return pathMatch[1];
      }
    }
  } catch {}

  return null;
}

export function assertYouTubeVideoUrl(input: string): {
  videoId: string;
  url: string;
} {
  const videoId = parseYouTubeVideoId(input);

  if (!videoId) {
    throw new AppError("Please enter a valid YouTube URL or video ID.");
  }

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
