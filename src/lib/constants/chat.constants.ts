export const CHAT_MESSAGE_CHAR_LIMIT = 4000;

export const NOTEBOOK_CHAT_REQUEST_MESSAGE_LIMIT = 10;

export const NOTEBOOK_CHAT_MAX_DURATION = 60;
export const NOTEBOOK_CHAT_MAX_OUTPUT_TOKENS = 10_000;
export const NOTEBOOK_CHAT_MAX_AGENT_STEPS = 5;

export const NOTEBOOK_CHAT_MAX_FILES = 3;
export const NOTEBOOK_CHAT_MAX_FILE_SIZE = 1024 * 1024;

export const RAG_SIMILARITY_THRESHOLD = 0.35;
/** How many vector hits to consider before applying the context budget */
export const RAG_CANDIDATE_LIMIT = 20;
/** Max characters of chunk text sent to the model per search */
export const RAG_MAX_CONTEXT_CHARS = 12_000;
/** Hard cap on chunks per search (safety even when chunks are small) */
export const RAG_MAX_CHUNK_COUNT = 12;
/** Max distinct queries per searchContext call */
export const RAG_MULTI_QUERY_MAX = 4;

/** Total character budget for the active-source catalog in chat instructions */
export const CHAT_SOURCE_CATALOG_MAX_CHARS = 4_000;
/** Max description length per source in the catalog */
export const CHAT_SOURCE_DESCRIPTION_MAX_CHARS = 200;
/** Max text sampled from extractedText for keyword extraction */
export const CHAT_SOURCE_KEYWORD_SAMPLE_MAX_CHARS = 8_000;
/** Max keywords listed per source */
export const CHAT_SOURCE_MAX_KEYWORDS = 20;
