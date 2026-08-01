const MAX_BYTES = 10 * 1024 * 1024;

type ModelImageFile = {
  type: "file";
  mediaType: string;
  filename?: string;
  data: { type: "url"; url: URL };
};

function mediaTypeFromDataUrl(dataUrl: string): string {
  return dataUrl.match(/^data:([^;,]+)/)?.[1] ?? "image/png";
}

function filenameFromUrl(url: string): string | undefined {
  try {
    return new URL(url).pathname.split("/").pop() || undefined;
  } catch {
    return undefined;
  }
}

async function toDataUrl(imageUrl: string): Promise<string | null> {
  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
      return null;
    }

    const mediaType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/png";

    return `data:${mediaType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

async function toModelImageFile(imageUrl: string): Promise<ModelImageFile | null> {
  const dataUrl = await toDataUrl(imageUrl);
  if (!dataUrl) {
    return null;
  }

  return {
    type: "file",
    mediaType: mediaTypeFromDataUrl(dataUrl),
    filename: filenameFromUrl(imageUrl),
    data: { type: "url", url: new URL(dataUrl) },
  };
}

export async function buildModelImageFiles(
  imageUrls: string[],
): Promise<ModelImageFile[]> {
  const files = await Promise.all(imageUrls.map(toModelImageFile));
  return files.filter((file): file is ModelImageFile => file !== null);
}
