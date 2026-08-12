/**
 * Server-side Mermaid validation via a persistent child process.
 *
 * Mermaid and DOMPurify cannot run reliably inside the Next.js/Turbopack bundle,
 * so validation happens in scripts/validate-mermaid.mjs (plain Node/Bun).
 * One worker is reused per process for fast retries during diagram generation.
 */
import "server-only";
import { type ChildProcess, spawn } from "node:child_process";
import { statSync } from "node:fs";
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

const VALIDATION_TIMEOUT_MS = 60_000;

function getWorkerScriptPath(): string {
  // Resolve at runtime only — Turbopack treats module-level paths passed to
  // spawn() as bundle entries and fails the build if it can't import them.
  return path.join(process.cwd(), "scripts", "validate-mermaid.mjs");
}

function fail(error: string): MermaidValidationResult {
  return { valid: false, error };
}

function ok(diagramType: string): MermaidValidationResult {
  return { valid: true, diagramType };
}

function getScriptMtimeMs(): number | null {
  try {
    return statSync(getWorkerScriptPath()).mtimeMs;
  } catch {
    return null;
  }
}

class MermaidValidatorWorker {
  private child: ChildProcess | null = null;
  private nextId = 0;
  private stdoutBuffer = "";
  private workerMtimeMs: number | null = null;
  private readonly pending = new Map<
    number,
    (response: WorkerResponse) => void
  >();

  private ensureWorker(): void {
    const currentMtime = getScriptMtimeMs();

    // The worker is a singleton child process. If validate-mermaid.mjs is
    // edited on disk (e.g. hot-reloaded in dev) but the running worker was
    // spawned before the edit, it keeps executing the *old* code from
    // memory — the fix never takes effect until something notices the
    // mismatch and restarts it.
    if (
      this.child &&
      currentMtime !== null &&
      this.workerMtimeMs !== null &&
      currentMtime !== this.workerMtimeMs
    ) {
      this.restartWorker("validate-mermaid.mjs changed on disk");
    }

    if (this.child) {
      return;
    }

    this.workerMtimeMs = currentMtime;

    const workerScriptPath = getWorkerScriptPath();

    // Explicit "node" rather than process.execPath: under `bun dev`,
    // process.execPath resolves to the Bun binary, and Bun's Node
    // compatibility layer is not guaranteed to match Node's ESM/linkedom/
    // dompurify behavior exactly. The validator needs to match what a real
    // Node process does, since that's what the deployed server runs.
    // This does mean Node.js must be present wherever this runs, even if
    // the app itself is served by Bun.
    //
    // Use shell mode so Turbopack doesn't treat the script path as a bundle
    // entry (spawn(["node", path]) triggers module resolution at build time).
    this.child = spawn(`node ${JSON.stringify(workerScriptPath)}`, {
      shell: true,
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

  private restartWorker(reason: string): void {
    console.warn(`[mermaid-validator] restarting worker: ${reason}`);
    this.rejectPending("Mermaid validator restarting.");
    const staleChild = this.child;
    this.child = null;
    staleChild?.removeAllListeners();
    staleChild?.kill();
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