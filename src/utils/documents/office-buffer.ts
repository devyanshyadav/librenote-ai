export function isOfficeOpenXmlBuffer(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

const IMAGE_CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  emf: "image/emf",
  wmf: "image/wmf",
};

export function resolveImageContentType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_CONTENT_TYPE_BY_EXT[extension] ?? "application/octet-stream";
}

export function carvePngImages(buffer: Buffer): Array<{
  buffer: Buffer;
  contentType: string;
}> {
  const figures: Array<{ buffer: Buffer; contentType: string }> = [];
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  let offset = 0;

  while (offset < buffer.length - signature.length) {
    const start = buffer.indexOf(signature, offset);
    if (start === -1) {
      break;
    }

    let end = start + signature.length;
    while (end + 12 <= buffer.length) {
      const chunkLength = buffer.readUInt32BE(end);
      const chunkType = buffer.toString("ascii", end + 4, end + 8);
      end += 8 + chunkLength + 4;

      if (chunkType === "IEND") {
        break;
      }
    }

    if (end > start + signature.length && end <= buffer.length) {
      figures.push({
        buffer: buffer.subarray(start, end),
        contentType: "image/png",
      });
    }

    offset = start + 1;
  }

  return figures;
}

export function carveJpegImages(buffer: Buffer): Array<{
  buffer: Buffer;
  contentType: string;
}> {
  const figures: Array<{ buffer: Buffer; contentType: string }> = [];
  let offset = 0;

  while (offset < buffer.length - 3) {
    const start = buffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]), offset);
    if (start === -1) {
      break;
    }

    const end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 3);
    if (end === -1) {
      break;
    }

    const imageEnd = end + 2;
    if (imageEnd > start + 3) {
      figures.push({
        buffer: buffer.subarray(start, imageEnd),
        contentType: "image/jpeg",
      });
    }

    offset = start + 1;
  }

  return figures;
}

export function extractEmbeddedImages(buffer: Buffer): Array<{
  buffer: Buffer;
  contentType: string;
  caption: string;
}> {
  const seen = new Set<string>();
  const figures: Array<{
    buffer: Buffer;
    contentType: string;
    caption: string;
  }> = [];

  for (const figure of [
    ...carvePngImages(buffer),
    ...carveJpegImages(buffer),
  ]) {
    const signature = figure.buffer.subarray(0, 16).toString("hex");
    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    figures.push({
      ...figure,
      caption: `Figure ${figures.length + 1}`,
    });
  }

  return figures;
}
