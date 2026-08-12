import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { type StudioArtifact, studioArtifacts } from "@/db/schema";
import { generateArtifactContent } from "@/lib/studio/generate-artifact-content.server";
import { getArtifactConfig } from "@/lib/studio/artifact-registry";
import { synthesizeAudioOverviewFile } from "@/lib/studio/audio-overview.service";
import { normalizeNoteBodyForCreate } from "@/lib/studio/note-content.utils";
import { getNotebookBrief } from "@/lib/studio/notebook-context.service";
import { isStudioArtifactGenerationTimedOut } from "@/lib/studio/studio-artifact-status";
import { StudioJourneyLog } from "@/lib/studio/studio-journey-log";
import {
  summarizeFlashcardPromptForLog,
  summarizeFlashcardsOutputForLog,
  summarizeNotebookBriefForLog,
} from "@/lib/studio/studio-journey-log-details";
import { assertNotebookOwner } from "@/lib/notebooks/notebook.service";
import type {
  AudioOverviewContent,
  AudioOverviewScript,
  FlashcardsContent,
  NoteContent,
  ReportContent,
  StudioArtifactContent,
  StudioArtifactItem,
  StudioArtifactListItem,
  StudioArtifactType,
  StudioGeneratedArtifactType,
  StudioGenerateOptions,
} from "@/types";

type ArtifactToolResult = { toolName: string; output: unknown };

function applyReportBanner(
  content: ReportContent,
  toolResults: ArtifactToolResult[],
): ReportContent {
  const banner = toolResults.find((entry) => entry.toolName === "generateImage")
    ?.output as { url?: string; alt?: string } | null | undefined;

  if (!banner?.url) {
    const { banner: _banner, ...withoutBanner } = content;
    return withoutBanner;
  }

  return {
    ...content,
    banner: {
      url: banner.url,
      alt: banner.alt ?? content.banner?.alt ?? "Report banner",
    },
  };
}

function formatRowDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

const studioArtifactListSelect = {
  id: studioArtifacts.id,
  notebookId: studioArtifacts.notebookId,
  title: studioArtifacts.title,
  type: studioArtifacts.type,
  status: studioArtifacts.status,
  createdAt: studioArtifacts.createdAt,
  updatedAt: studioArtifacts.updatedAt,
};

function toStudioArtifactListItem(row: {
  id: string;
  notebookId: string;
  title: string;
  type: StudioArtifact["type"];
  status: StudioArtifactListItem["status"];
  createdAt: Date | string;
  updatedAt: Date | string;
}): StudioArtifactListItem {
  return {
    id: row.id,
    notebookId: row.notebookId,
    title: row.title,
    status: row.status,
    type: row.type as StudioArtifactType,
    createdAt: formatRowDate(row.createdAt),
    updatedAt: formatRowDate(row.updatedAt),
  };
}

function toStudioArtifactItem(row: StudioArtifact): StudioArtifactItem {
  return {
    ...toStudioArtifactListItem(row),
    content: (row.content as StudioArtifactContent | null) ?? null,
    fileUrl: row.fileUrl ?? null,
  } as StudioArtifactItem;
}

async function persistArtifactTimeout(
  artifact: StudioArtifact,
): Promise<StudioArtifact> {
  if (
    artifact.status !== "processing" ||
    !isStudioArtifactGenerationTimedOut(formatRowDate(artifact.createdAt))
  ) {
    return artifact;
  }

  const [timedOut] = await db
    .update(studioArtifacts)
    .set({ status: "timeout", updatedAt: new Date() })
    .where(
      and(
        eq(studioArtifacts.id, artifact.id),
        eq(studioArtifacts.status, "processing"),
      ),
    )
    .returning();

  return timedOut ?? { ...artifact, status: "timeout" };
}

function resolveArtifactTitle(
  fallbackTitle: string,
  content: StudioArtifactContent,
): string {
  if ("title" in content && content.title.length > 0) {
    return content.title;
  }

  return fallbackTitle;
}

async function finalizeArtifactContent(
  type: StudioArtifactType,
  output: StudioArtifactContent,
  toolResults: ArtifactToolResult[],
  userId: string,
  artifactId: string,
  options?: StudioGenerateOptions,
): Promise<{ content: StudioArtifactContent; fileUrl?: string }> {
  if (type === "report") {
    return {
      content: applyReportBanner(output as ReportContent, toolResults),
    };
  }

  if (type === "audio_overview") {
    const audioContent: AudioOverviewContent = {
      ...(output as AudioOverviewScript),
      format: options?.audioOverviewFormat ?? "overview",
    };
    const audio = await synthesizeAudioOverviewFile(
      audioContent,
      userId,
      artifactId,
      options?.audioLanguage,
    );

    return {
      fileUrl: audio.fileUrl,
      content: { ...audioContent, playback: audio.playback },
    };
  }

  return { content: output };
}

async function getOwnedArtifact(
  userId: string,
  notebookId: string,
  artifactId: string,
): Promise<StudioArtifact> {
  const [artifact] = await db
    .select()
    .from(studioArtifacts)
    .where(eq(studioArtifacts.id, artifactId))
    .limit(1);

  if (!artifact || artifact.notebookId !== notebookId) {
    throw new Error("Studio artifact not found.");
  }

  await assertNotebookOwner(notebookId, userId);

  return artifact;
}

export async function listStudioArtifacts(
  userId: string,
  notebookId: string,
): Promise<StudioArtifactListItem[]> {
  await assertNotebookOwner(notebookId, userId);

  const rows = await db
    .select(studioArtifactListSelect)
    .from(studioArtifacts)
    .where(eq(studioArtifacts.notebookId, notebookId))
    .orderBy(desc(studioArtifacts.createdAt));

  const artifacts = await Promise.all(
    rows.map((row) => persistArtifactTimeout(row as StudioArtifact)),
  );

  return artifacts.map(toStudioArtifactListItem);
}

export async function getStudioArtifactById(
  userId: string,
  artifactId: string,
): Promise<StudioArtifactItem> {
  const [artifact] = await db
    .select()
    .from(studioArtifacts)
    .where(eq(studioArtifacts.id, artifactId))
    .limit(1);

  if (!artifact) {
    throw new Error("Studio artifact not found.");
  }

  await assertNotebookOwner(artifact.notebookId, userId);

  return toStudioArtifactItem(await persistArtifactTimeout(artifact));
}

export async function deleteStudioArtifact(
  userId: string,
  notebookId: string,
  artifactId: string,
): Promise<void> {
  await assertNotebookOwner(notebookId, userId);

  const [deleted] = await db
    .delete(studioArtifacts)
    .where(eq(studioArtifacts.id, artifactId))
    .returning({
      id: studioArtifacts.id,
      notebookId: studioArtifacts.notebookId,
    });

  if (!deleted || deleted.notebookId !== notebookId) {
    throw new Error("Studio artifact not found.");
  }
}

function patchArtifactContentTitle(
  content: StudioArtifactContent | null,
  title: string,
): StudioArtifactContent | null {
  if (content && "title" in content) {
    return { ...content, title };
  }

  return content;
}

export async function renameStudioArtifact(
  userId: string,
  notebookId: string,
  artifactId: string,
  title: string,
): Promise<StudioArtifactListItem> {
  const artifact = await getOwnedArtifact(userId, notebookId, artifactId);

  if (artifact.status === "processing" || artifact.status === "pending") {
    throw new Error("Cannot rename an artifact while it is generating.");
  }

  const content = patchArtifactContentTitle(
    (artifact.content as StudioArtifactContent | null) ?? null,
    title,
  );

  const [updated] = await db
    .update(studioArtifacts)
    .set({
      title,
      content,
      updatedAt: new Date(),
    })
    .where(eq(studioArtifacts.id, artifactId))
    .returning(studioArtifactListSelect);

  if (!updated) {
    throw new Error("Failed to rename studio artifact.");
  }

  return toStudioArtifactListItem(updated);
}

export async function createStudioArtifactJob(
  userId: string,
  notebookId: string,
  type: StudioGeneratedArtifactType,
): Promise<StudioArtifactItem> {
  await assertNotebookOwner(notebookId, userId);

  const config = getArtifactConfig(type);

  const [pending] = await db
    .insert(studioArtifacts)
    .values({
      notebookId,
      type,
      title: config.title,
      status: "processing",
    })
    .returning();

  if (!pending) {
    throw new Error("Failed to create studio artifact.");
  }

  return toStudioArtifactItem(pending);
}

export async function runStudioArtifactGeneration(
  userId: string,
  notebookId: string,
  artifactId: string,
  journeyId?: string,
  sourceIds?: string[],
  options?: StudioGenerateOptions,
): Promise<StudioArtifactItem> {
  const artifact = await getOwnedArtifact(userId, notebookId, artifactId);
  const type = artifact.type as StudioArtifactType;

  if (type === "note") {
    throw new Error("Notes are created manually and cannot be generated.");
  }

  const log = StudioJourneyLog.continue(
    journeyId ?? crypto.randomUUID().slice(0, 8),
    { notebookId, type },
  );

  log.start("artifact", `Generating ${type}`, {
    sourceIds: sourceIds ?? [],
  });

  try {
    const brief = await getNotebookBrief(userId, notebookId, log, sourceIds);
    const config = getArtifactConfig(type, {
      userId,
      artifactId: artifact.id,
      options,
    });
    const userPrompt = config.buildUserPrompt(brief);

    if (type === "flashcards") {
      log.step(
        "artifact",
        "Flashcard brief context",
        summarizeNotebookBriefForLog(brief),
      );
      log.step(
        "artifact",
        "Flashcard model input",
        summarizeFlashcardPromptForLog(config.system, userPrompt),
      );
    }

    log.step("artifact", "Calling model for artifact content", {
      artifactId: artifact.id,
      type,
    });

    const onAttemptFailed = ({
      attempt,
      maxAttempts,
      error,
    }: {
      attempt: number;
      maxAttempts: number;
      error: unknown;
    }) => {
      log.step(
        "artifact",
        `Generation attempt ${attempt}/${maxAttempts} failed, retrying`,
        {
          artifactId: artifact.id,
          type,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    };

    const { output, toolResults } = await generateArtifactContent({
      type,
      config,
      userPrompt,
      onAttemptFailed,
      log,
      artifactId: artifact.id,
    });

    const { content, fileUrl } = await finalizeArtifactContent(
      type,
      output as StudioArtifactContent,
      toolResults,
      userId,
      artifact.id,
      options,
    );

    if (type === "flashcards") {
      log.step(
        "artifact",
        "Flashcard model output",
        summarizeFlashcardsOutputForLog(content as FlashcardsContent),
      );
    }

    const [completed] = await db
      .update(studioArtifacts)
      .set({
        content,
        title: resolveArtifactTitle(artifact.title, content),
        fileUrl,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(studioArtifacts.id, artifact.id))
      .returning();

    if (!completed) {
      throw new Error("Failed to save studio artifact.");
    }

    log.success("artifact", `${type} generated successfully`, {
      artifactId: completed.id,
      title: completed.title,
    });
    log.end("artifact", "Studio journey complete", {
      artifactId: completed.id,
    });

    return toStudioArtifactItem(completed);
  } catch (error) {
    await db
      .update(studioArtifacts)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(studioArtifacts.id, artifact.id));

    log.fail("artifact", "Studio generation failed", error);
    log.end("artifact", "Studio journey failed");
    throw error;
  }
}

export async function createNoteArtifact(
  userId: string,
  notebookId: string,
  input?: { title?: string; body?: string },
): Promise<StudioArtifactItem> {
  await assertNotebookOwner(notebookId, userId);

  const title = input?.title?.trim() || "New Note";
  const body = normalizeNoteBodyForCreate(input?.body ?? "");
  const content: NoteContent = { title, body };

  const [created] = await db
    .insert(studioArtifacts)
    .values({
      notebookId,
      type: "note",
      title,
      content,
      status: "completed",
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create note.");
  }

  return toStudioArtifactItem(created);
}

export async function updateStudioNote(
  userId: string,
  notebookId: string,
  artifactId: string,
  input: { title?: string; body?: string },
): Promise<StudioArtifactItem> {
  const artifact = await getOwnedArtifact(userId, notebookId, artifactId);

  if (artifact.type !== "note") {
    throw new Error("Only note artifacts can be updated this way.");
  }

  const current = (artifact.content as NoteContent | null) ?? {
    title: artifact.title,
    body: "",
  };

  const nextContent: NoteContent = {
    title: input.title?.trim() || current.title,
    body: input.body ?? current.body,
  };

  const [updated] = await db
    .update(studioArtifacts)
    .set({
      title: nextContent.title,
      content: nextContent,
      updatedAt: new Date(),
    })
    .where(eq(studioArtifacts.id, artifactId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update note.");
  }

  return toStudioArtifactItem(updated);
}
