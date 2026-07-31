import {
  SOURCE_AUDIO_EXTENSION_SET,
  SOURCE_COMING_SOON_EXTENSION_SET,
  SOURCE_DOCUMENT_EXTENSION_SET,
  SOURCE_MAX_AUDIO_FILE_BYTES,
  SOURCE_MAX_AUDIO_FILE_MB,
  SOURCE_MAX_DOCUMENT_FILE_BYTES,
  SOURCE_MAX_DOCUMENT_FILE_MB,
} from "@/lib/constants";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLS_MIME = "application/vnd.ms-excel";

const DOCUMENT_CONTENT_TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  doc: DOC_MIME,
  docx: DOCX_MIME,
  json: "application/json",
  html: "text/html",
  htm: "text/html",
  xls: XLS_MIME,
  xlsx: XLSX_MIME,
  csv: "text/csv",
};

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function resolveDocumentUploadContentType(
  fileName: string,
  mimeType = "",
): string | undefined {
  const extension = getFileExtension(fileName);
  if (DOCUMENT_CONTENT_TYPE_BY_EXT[extension]) {
    return DOCUMENT_CONTENT_TYPE_BY_EXT[extension];
  }

  if (mimeType) {
    return mimeType;
  }

  return undefined;
}

export function isAudioSourceFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  if (SOURCE_AUDIO_EXTENSION_SET.has(extension)) return true;
  return file.type.startsWith("audio/");
}

export function isDocumentSourceFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  if (SOURCE_DOCUMENT_EXTENSION_SET.has(extension)) return true;
  if (
    file.type === DOCX_MIME ||
    file.type === DOC_MIME ||
    file.type === XLSX_MIME ||
    file.type === XLS_MIME ||
    file.type === "application/pdf" ||
    file.type === "text/csv"
  ) {
    return true;
  }
  return file.type.startsWith("text/");
}

export function isSupportedDocumentUpload(file: File): boolean {
  if (!isDocumentSourceFile(file)) return false;
  return file.size <= SOURCE_MAX_DOCUMENT_FILE_BYTES;
}

export function isSupportedAudioUpload(file: File): boolean {
  if (!isAudioSourceFile(file)) return false;
  return file.size <= SOURCE_MAX_AUDIO_FILE_BYTES;
}

export function isComingSoonSourceUpload(file: File): boolean {
  const extension = getFileExtension(file.name);
  if (file.type.startsWith("image/")) return true;
  return SOURCE_COMING_SOON_EXTENSION_SET.has(extension);
}

export function getUnsupportedDocumentMessage(file: File): string {
  if (isAudioSourceFile(file)) {
    return `${file.name} is audio. Use the Audio option instead.`;
  }

  if (
    isDocumentSourceFile(file) &&
    file.size > SOURCE_MAX_DOCUMENT_FILE_BYTES
  ) {
    return `${file.name} exceeds the ${SOURCE_MAX_DOCUMENT_FILE_MB}MB limit.`;
  }

  if (isComingSoonSourceUpload(file)) {
    return `${file.name} is not supported yet. PDF, Word, Excel, TXT, MD, JSON, and HTML are supported.`;
  }

  return `${file.name} is not a supported file type.`;
}

export function getUnsupportedAudioMessage(file: File): string {
  if (!isAudioSourceFile(file)) {
    return `${file.name} is not a supported audio format.`;
  }

  if (file.size > SOURCE_MAX_AUDIO_FILE_BYTES) {
    return `${file.name} exceeds the ${SOURCE_MAX_AUDIO_FILE_MB}MB limit.`;
  }

  return `${file.name} could not be added.`;
}

export function partitionDocumentFiles(files: File[]) {
  const supported: File[] = [];
  const unsupported: File[] = [];

  for (const file of files) {
    if (!isDocumentSourceFile(file)) {
      unsupported.push(file);
      continue;
    }

    if (!isSupportedDocumentUpload(file)) {
      unsupported.push(file);
      continue;
    }

    supported.push(file);
  }

  return { supported, unsupported };
}

export function partitionAudioFiles(files: File[]) {
  const supported: File[] = [];
  const unsupported: File[] = [];

  for (const file of files) {
    if (!isAudioSourceFile(file)) {
      unsupported.push(file);
      continue;
    }

    if (file.size > SOURCE_MAX_AUDIO_FILE_BYTES) {
      unsupported.push(file);
      continue;
    }

    supported.push(file);
  }

  return { supported, unsupported };
}
