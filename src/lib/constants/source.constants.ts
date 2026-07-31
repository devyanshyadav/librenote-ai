export const SOURCE_UPLOAD_MAX_DURATION = 120;
/** Serverless route budget for a single source ingest (large PDFs, long audio) */
export const SOURCE_INGEST_MAX_DURATION = 600;

export const SOURCE_MAX_BULK_URLS = 10;
/** Parallel URL imports — each runs full ingest, so keep modest */
export const SOURCE_BULK_URL_CONCURRENCY = 2;

export const SOURCE_MAX_DOCUMENT_FILES = 25;
export const SOURCE_MAX_DOCUMENT_FILE_MB = 50;
export const SOURCE_MAX_DOCUMENT_FILE_BYTES =
  SOURCE_MAX_DOCUMENT_FILE_MB * 1024 * 1024;

/** Full text above this size is chunked only — not duplicated on `sources.extracted_text` */
export const SOURCE_MAX_STORED_TEXT_CHARS = 50_000;

/** Max chunks per map batch (also capped by SOURCE_SUMMARY_MAP_BATCH_MAX_CHARS) */
export const SOURCE_SUMMARY_CHUNKS_PER_MAP_BATCH = 10;

/** Character budget per map batch — whichever limit is hit first ends the batch */
export const SOURCE_SUMMARY_MAP_BATCH_MAX_CHARS = 100_000;

/** Parallel map workers — keep modest for OpenRouter rate limits */
export const SOURCE_SUMMARY_MAP_CONCURRENCY = 6;

/** Centroid-closest chunks highlighted at the top of each map batch */
export const SOURCE_SUMMARY_CENTROID_ANCHORS_PER_BATCH = 2;

/**
 * Target section count before the final source-guide prose step.
 * Stored section notes are never merged — this only compacts input for the
 * short UI guide on very large documents (100+ pages).
 */
export const SOURCE_SUMMARY_GUIDE_REDUCE_TARGET = 8;

/** Background summary job budget — large PDFs run many map batches */
export const SOURCE_SUMMARY_MAX_DURATION = 600;

/** Max text chunks sent to the embedding API per request */
export const SOURCE_EMBED_BATCH_SIZE = 32;
/** Overlap between consecutive embed chunks — improves RAG at boundaries */
export const SOURCE_EMBED_CHUNK_OVERLAP_CHARS = 300;
export const SOURCE_EMBED_CHUNK_MAX_CHARS = 1800;
/** Parallel figure uploads during PDF ingest */
export const PDF_FIGURE_UPLOAD_CONCURRENCY = 4;
/** Rows per INSERT — keep small; vector payloads get large fast on Supabase pooler */
export const SOURCE_DB_INSERT_BATCH_SIZE = 4;
export const SOURCE_EMBED_MAX_RETRIES = 3;
export const SOURCE_EMBEDDING_DIMENSIONS = 1024;

export const SOURCE_MAX_AUDIO_FILES = 1;
export const SOURCE_MAX_AUDIO_FILE_MB = 25;
export const SOURCE_MAX_AUDIO_FILE_BYTES =
  SOURCE_MAX_AUDIO_FILE_MB * 1024 * 1024;

export const SOURCE_DOCUMENT_EXTENSIONS = [
  "pdf",
  "txt",
  "doc",
  "docx",
  "md",
  "json",
  "html",
  "htm",
  "xls",
  "xlsx",
  "csv",
] as const;

export const SOURCE_AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "m4a",
  "webm",
  "ogg",
  "flac",
  "aac",
  "mp4",
] as const;

export const SOURCE_COMING_SOON_EXTENSIONS = [] as const;

export const SOURCE_AUDIO_FORMATS_LABEL = "mp3, wav, m4a, webm, ogg, flac, aac";

export const SOURCE_DOCUMENT_ACCEPT =
  ".pdf,.txt,.doc,.docx,.md,.json,.html,.htm,.xls,.xlsx,.csv,application/pdf,text/plain,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/json,text/html,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

export const SOURCE_AUDIO_ACCEPT =
  ".mp3,.wav,.m4a,.webm,.ogg,.flac,.aac,.mp4,audio/*";

export const SOURCE_DOCUMENT_EXTENSION_SET = new Set<string>(
  SOURCE_DOCUMENT_EXTENSIONS,
);

export const SOURCE_AUDIO_EXTENSION_SET = new Set<string>(
  SOURCE_AUDIO_EXTENSIONS,
);

export const SOURCE_COMING_SOON_EXTENSION_SET = new Set<string>(
  SOURCE_COMING_SOON_EXTENSIONS,
);
