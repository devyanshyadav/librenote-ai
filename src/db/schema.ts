import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import type { NotebookChatUIMessage } from "@/types";

// ==========================================
// ENUMS & CUSTOM TYPES
// ==========================================
export const sourceTypeEnum = pgEnum("source_type", [
  "pdf",
  "web",
  "youtube",
  "text_note",
  "word",
  "spreadsheet",
  "audio",
]);

export const roleEnum = pgEnum("collaborator_role", [
  "owner",
  "editor",
  "viewer",
]);

export const senderEnum = pgEnum("message_sender", ["user", "assistant"]);

export const artifactTypeEnum = pgEnum("artifact_type", [
  "audio_overview",
  "slide_deck",
  "video_overview",
  "mind_map",
  "report",
  "flashcards",
  "quiz",
  "infographic",
  "data_table",
  "note",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "timeout",
]);

// ==========================================
// 1. USERS / PROFILES (Links with Supabase Auth)
// ==========================================
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().notNull(), // Matches auth.users id from Supabase
    email: text("email").notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("Users can view own profile", {
      for: "select",
      to: "authenticated",
      using: sql`(select auth.uid()) = id`,
    }),
    pgPolicy("Users can update own profile", {
      for: "update",
      to: "authenticated",
      using: sql`(select auth.uid()) = id`,
    }),
  ],
);

// ==========================================
// 2. NOTEBOOKS
// ==========================================
export const notebooks = pgTable(
  "notebooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").default("Untitled notebook").notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    isFeatured: boolean("is_featured").default(false).notNull(),
    studioBriefCache: jsonb("studio_brief_cache"),
    ownerId: uuid("owner_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("Users can view own notebooks", {
      for: "select",
      to: "authenticated",
      using: sql`(select auth.uid()) = owner_id OR id IN (select notebook_id from notebook_collaborators where user_id = (select auth.uid()))`,
    }),
    pgPolicy("Users can insert own notebooks", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`(select auth.uid()) = owner_id`,
    }),
    pgPolicy("Owners can update own notebooks", {
      for: "update",
      to: "authenticated",
      using: sql`(select auth.uid()) = owner_id`,
    }),
    pgPolicy("Owners can delete own notebooks", {
      for: "delete",
      to: "authenticated",
      using: sql`(select auth.uid()) = owner_id`,
    }),
  ],
);

// ==========================================
// 3. NOTEBOOK COLLABORATORS (Sharing System)
// ==========================================
export const notebookCollaborators = pgTable(
  "notebook_collaborators",
  {
    notebookId: uuid("notebook_id")
      .references(() => notebooks.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    role: roleEnum("role").default("viewer").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.notebookId, table.userId] }),
    pgPolicy("Users can view collaborators", {
      for: "select",
      to: "authenticated",
      using: sql`user_id = (select auth.uid()) OR notebook_id IN (select id from notebooks where owner_id = (select auth.uid()))`,
    }),
    pgPolicy("Owners can manage collaborators", {
      for: "all",
      to: "authenticated",
      using: sql`notebook_id IN (select id from notebooks where owner_id = (select auth.uid()))`,
    }),
  ],
);

// ==========================================
// Helper SQL expression for checking notebook access
// ==========================================
const hasNotebookAccess = sql`notebook_id IN (
  select id from notebooks 
  where owner_id = (select auth.uid()) 
  OR id IN (select notebook_id from notebook_collaborators where user_id = (select auth.uid()))
)`;

const hasNotebookWriteAccess = sql`notebook_id IN (
  select id from notebooks 
  where owner_id = (select auth.uid()) 
  OR id IN (select notebook_id from notebook_collaborators where user_id = (select auth.uid()) and role = 'editor')
)`;

// ==========================================
// 4. SOURCES (PDFs, Web links, Audio, etc.)
// ==========================================
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notebookId: uuid("notebook_id")
      .references(() => notebooks.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    type: sourceTypeEnum("type").notNull(),

    // Storage paths for files (Supabase Storage) or external URLs (Web/YouTube)
    sourceUrl: text("source_url"),
    storagePath: text("storage_path"),

    // Cleaned plain text extracted from the source for LLM reading
    extractedText: text("extracted_text"),

    // AI-generated source guide summary
    summary: text("summary"),

    // Toggle status inside the notebook (checkboxes on the left panel)
    isSelected: boolean("is_selected").default(true).notNull(),

    metadata: jsonb("metadata"), // e.g., token count, file size, YouTube length
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("Users can view sources if they have notebook access", {
      for: "select",
      to: "authenticated",
      using: hasNotebookAccess,
    }),
    pgPolicy("Users can manage sources if they have notebook write access", {
      for: "all",
      to: "authenticated",
      using: hasNotebookWriteAccess,
    }),
  ],
);

// ==========================================
// 5. DOCUMENT CHUNKS (For RAG / Vector search)
// ==========================================
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .references(() => sources.id, { onDelete: "cascade" })
      .notNull(),

    chunkIndex: integer("chunk_index").notNull().default(0),

    // The actual text chunk that the LLM will read
    content: text("content").notNull(),

    // Figure chunks: { kind: "figure", page, imageUrl }; text chunks: { kind: "text" } | null
    metadata: jsonb("metadata"),

    // The vector embedding. 1024 is standard for Mistral's mistral-embed-2312.
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
  },
  (table) => [
    index("document_chunks_source_id_chunk_index_idx").on(
      table.sourceId,
      table.chunkIndex,
    ),
    // HNSW (Hierarchical Navigable Small World) index for fast vector similarity search in Supabase
    index("embedding_index").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"), // Cosine distance standard for OpenAI embeddings
    ),
    pgPolicy("Users can view document chunks if they have source access", {
      for: "select",
      to: "authenticated",
      using: sql`source_id IN (
      select id from sources where notebook_id IN (
        select id from notebooks 
        where owner_id = (select auth.uid()) 
        OR id IN (select notebook_id from notebook_collaborators where user_id = (select auth.uid()))
      )
    )`,
    }),
    pgPolicy("Manage document chunks (write access)", {
      for: "all",
      to: "authenticated",
      using: sql`source_id IN (
      select id from sources where notebook_id IN (
        select id from notebooks 
        where owner_id = (select auth.uid()) 
        OR id IN (select notebook_id from notebook_collaborators where user_id = (select auth.uid()) and role = 'editor')
      )
    )`,
    }),
  ],
);

// ==========================================
// 6. NOTEBOOK CHAT MESSAGES (Ephemeral chat history per notebook)
// ==========================================
export const notebookChatMessages = pgTable(
  "notebook_chat_messages",
  {
    id: text("id").primaryKey(),
    notebookId: uuid("notebook_id")
      .references(() => notebooks.id, { onDelete: "cascade" })
      .notNull(),
    role: senderEnum("role").notNull(),
    parts: jsonb("parts").$type<NotebookChatUIMessage["parts"]>().notNull(),
    metadata: jsonb("metadata").$type<NotebookChatUIMessage["metadata"]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notebook_chat_messages_notebook_id_idx").on(table.notebookId),
    pgPolicy("Users can view chat messages if they have notebook access", {
      for: "select",
      to: "authenticated",
      using: hasNotebookAccess,
    }),
    pgPolicy("Manage chat messages (write access)", {
      for: "all",
      to: "authenticated",
      using: hasNotebookWriteAccess,
    }),
  ],
);

// ==========================================
// 7. STUDIO ARTIFACTS (Quizzes, Flashcards, Podcasts)
// ==========================================
export const studioArtifacts = pgTable(
  "studio_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notebookId: uuid("notebook_id")
      .references(() => notebooks.id, { onDelete: "cascade" })
      .notNull(),
    type: artifactTypeEnum("type").notNull(),
    title: text("title").notNull(),

    // Flexible storage for structures (e.g., array of flashcards, markdown reports, quiz arrays)
    content: jsonb("content"),

    // File link when the artifact produces a stored asset (e.g. audio file)
    fileUrl: text("file_url"),

    status: jobStatusEnum("status").default("pending").notNull(), // Useful for async generation
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("Users can view studio artifacts if they have notebook access", {
      for: "select",
      to: "authenticated",
      using: hasNotebookAccess,
    }),
    pgPolicy("Manage studio artifacts (write access)", {
      for: "all",
      to: "authenticated",
      using: hasNotebookWriteAccess,
    }),
  ],
);

// ==========================================
// RELATIONS DEFINITIONS (Drizzle Queries)
// ==========================================
export const profilesRelations = relations(profiles, ({ many }) => ({
  notebooks: many(notebooks),
  collaborations: many(notebookCollaborators),
}));

export const notebookRelations = relations(notebooks, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [notebooks.ownerId],
    references: [profiles.id],
  }),
  collaborators: many(notebookCollaborators),
  sources: many(sources),
  chatMessages: many(notebookChatMessages),
  artifacts: many(studioArtifacts),
}));

export const notebookCollaboratorsRelations = relations(
  notebookCollaborators,
  ({ one }) => ({
    notebook: one(notebooks, {
      fields: [notebookCollaborators.notebookId],
      references: [notebooks.id],
    }),
    user: one(profiles, {
      fields: [notebookCollaborators.userId],
      references: [profiles.id],
    }),
  }),
);

export const sourceRelations = relations(sources, ({ one, many }) => ({
  notebook: one(notebooks, {
    fields: [sources.notebookId],
    references: [notebooks.id],
  }),
  chunks: many(documentChunks),
}));

export const documentChunkRelations = relations(documentChunks, ({ one }) => ({
  source: one(sources, {
    fields: [documentChunks.sourceId],
    references: [sources.id],
  }),
}));

export const notebookChatMessageRelations = relations(
  notebookChatMessages,
  ({ one }) => ({
    notebook: one(notebooks, {
      fields: [notebookChatMessages.notebookId],
      references: [notebooks.id],
    }),
  }),
);

export const studioArtifactRelations = relations(
  studioArtifacts,
  ({ one }) => ({
    notebook: one(notebooks, {
      fields: [studioArtifacts.notebookId],
      references: [notebooks.id],
    }),
  }),
);

// Infer Types
export type Profile = typeof profiles.$inferSelect;
export type Notebook = typeof notebooks.$inferSelect;
export type NewNotebook = typeof notebooks.$inferInsert;
export type NotebookCollaborator = typeof notebookCollaborators.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type NotebookChatMessage = typeof notebookChatMessages.$inferSelect;
export type NewNotebookChatMessage = typeof notebookChatMessages.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type StudioArtifact = typeof studioArtifacts.$inferSelect;
export type NewStudioArtifact = typeof studioArtifacts.$inferInsert;
