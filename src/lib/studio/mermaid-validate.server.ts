/**
 * Server-side Mermaid validation via a persistent child process.
 *
 * Mermaid and DOMPurify cannot run reliably inside the Next.js/Turbopack bundle,
 * so validation happens in scripts/validate-mermaid.mjs (plain Node/Bun).
 * One worker is reused per process for fast retries during diagram generation.
 */
import "server-only";
import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import type { VisualFlowDiagramType } from "@/lib/studio/visual-flow.constants";
import { stripMermaidFences } from "@/lib/studio/mermaid-utils";

export type MermaidValidationResult =
  | { valid: true; diagramType: string }
  | { valid: false; error: string };

type WorkerResponse = {
  id: number | null;
  valid: boolean;
  error?: string;
};

const WORKER_SCRIPT = path.join(process.cwd(), "scripts/validate-mermaid.mjs");
const VALIDATION_TIMEOUT_MS = 60_000;

function fail(error: string): MermaidValidationResult {
  return { valid: false, error };
}

function ok(diagramType: string): MermaidValidationResult {
  return { valid: true, diagramType };
}

class MermaidValidatorWorker {
  private child: ChildProcess | null = null;
  private nextId = 0;
  private stdoutBuffer = "";
  private readonly pending = new Map<
    number,
    (response: WorkerResponse) => void
  >();

  private ensureWorker(): void {
    if (this.child) {
      return;
    }

    this.child = spawn(process.execPath, [WORKER_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    this.child.stdout?.on("data", (chunk: Buffer) => {
      this.stdoutBuffer += chunk.toString("utf8");

      let newlineIndex = this.stdoutBuffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
        this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
        this.handleWorkerLine(line);
        newlineIndex = this.stdoutBuffer.indexOf("\n");
      }
    });

    this.child.stderr?.on("data", (chunk: Buffer) => {
      console.error("[mermaid-validator]", chunk.toString("utf8").trim());
    });

    this.child.on("error", (error) => {
      this.rejectPending(error.message);
      this.child = null;
    });

    this.child.on("exit", (code) => {
      this.rejectPending(
        `Mermaid validator exited unexpectedly${code != null ? ` (${code})` : ""}.`,
      );
      this.child = null;
    });
  }

  private handleWorkerLine(line: string): void {
    if (!line) {
      return;
    }

    let response: WorkerResponse;
    try {
      response = JSON.parse(line) as WorkerResponse;
    } catch {
      return;
    }

    if (typeof response.id !== "number") {
      return;
    }

    const resolve = this.pending.get(response.id);
    if (!resolve) {
      return;
    }

    this.pending.delete(response.id);
    resolve(response);
  }

  private rejectPending(message: string): void {
    for (const resolve of this.pending.values()) {
      resolve({ id: null, valid: false, error: message });
    }
    this.pending.clear();
  }

  async validate(code: string): Promise<WorkerResponse> {
    this.ensureWorker();

    const id = ++this.nextId;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!this.pending.has(id)) {
          return;
        }

        this.pending.delete(id);
        resolve({
          id,
          valid: false,
          error: "Mermaid validation timed out.",
        });
      }, VALIDATION_TIMEOUT_MS);

      this.pending.set(id, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      const wrote = this.child?.stdin?.write(`${JSON.stringify({ id, code })}\n`);

      if (wrote === false) {
        clearTimeout(timeout);
        this.pending.delete(id);
        resolve({
          id,
          valid: false,
          error: "Mermaid validator is not accepting input.",
        });
      }
    });
  }
}

const globalForValidator = globalThis as typeof globalThis & {
  mermaidValidatorWorker?: MermaidValidatorWorker;
};

function getValidatorWorker(): MermaidValidatorWorker {
  globalForValidator.mermaidValidatorWorker ??= new MermaidValidatorWorker();
  return globalForValidator.mermaidValidatorWorker;
}

export async function validateMermaidCode(
  rawCode: string,
  diagramType?: VisualFlowDiagramType,
): Promise<MermaidValidationResult> {
  const code = stripMermaidFences(rawCode);

  if (!code) {
    return fail("Diagram code is empty.");
  }

  if (!diagramType) {
    return fail("Diagram type is required for validation.");
  }

  const result = await getValidatorWorker().validate(code);

  if (result.valid) {
    return ok(diagramType);
  }

  return fail(result.error ?? "Mermaid validation failed.");
}
