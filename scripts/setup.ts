#!/usr/bin/env bun
/**
 * Local setup: install deps → Supabase → env → schema → seed → build → start.
 *   bun run setup
 *
 * Flags:
 *   --skip-supabase  Database only (cloud Supabase / existing stack)
 *   --no-dev         Finish setup without building or starting the app
 *   --no-start       Same as --no-dev
 *
 * Cross-platform: macOS, Linux, and Windows (Docker Desktop + Bun required).
 */

import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import {
  APP_NAME,
  APP_SUPABASE_PROJECT_ID,
} from "../src/lib/constants/brand.constants";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = resolve(ROOT, ".env.local");
const SEED_FILE = resolve(ROOT, "supabase/seed.sql");
const PROJECT_ID = APP_SUPABASE_PROJECT_ID;
const APP_URL = "http://localhost:3000";
const SUPABASE_PORTS = [54320, 54321, 54322, 54323, 54324] as const;
const IS_WIN = process.platform === "win32";
const MANAGED_ENV_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "DATABASE_URL",
]);

const palette = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

type SupabaseStatus = {
  API_URL?: string;
  ANON_KEY?: string;
  PUBLISHABLE_KEY?: string;
  DB_URL?: string;
};

class SetupUi {
  private timer: ReturnType<typeof setInterval> | null = null;
  private frame = 0;
  private label = "";
  private detail = "";
  private readonly frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private cursorHidden = false;

  banner(subtitle: string) {
    console.log("");
    console.log(
      `  ${palette.bold}${palette.cyan}${APP_NAME}${palette.reset}  ${palette.dim}${subtitle}${palette.reset}`,
    );
    console.log("");
  }

  section(title: string) {
    console.log(
      `\n  ${palette.dim}── ${title} ${"─".repeat(Math.max(0, 42 - title.length))}${palette.reset}\n`,
    );
  }

  begin(label: string, detail?: string) {
    this.stopSpinner();
    this.label = label;
    this.detail = detail ?? "";
    this.frame = 0;
    this.hideCursor();
    this.renderSpinner();
    this.timer = setInterval(() => {
      this.frame = (this.frame + 1) % this.frames.length;
      this.renderSpinner();
    }, 90);
  }

  updateDetail(detail: string) {
    this.detail = detail;
    if (this.timer) {
      this.renderSpinner();
    }
  }

  /** Pause spinner before subprocess output (stdio inherit). */
  suspend() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
    process.stdout.write("\r\x1b[K");
    this.showCursor();
  }

  succeed(detail?: string) {
    this.finish(true, detail);
  }

  ok(label: string, detail?: string) {
    this.stopSpinner();
    console.log(
      `  ${palette.green}✓${palette.reset} ${label}${detail ? ` ${palette.dim}— ${detail}${palette.reset}` : ""}`,
    );
  }

  note(message: string) {
    console.log(`  ${palette.dim}·${palette.reset} ${message}`);
  }

  fail(message: string): never {
    this.finish(false);
    console.error(`\n  ${palette.red}${palette.bold}Setup failed${palette.reset}`);
    console.error(`  ${message}\n`);
    process.exit(1);
  }

  success(lines: string[]) {
    console.log(
      `\n  ${palette.green}${palette.bold}Setup complete${palette.reset}\n`,
    );
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    console.log("");
  }

  private finish(success: boolean, detail?: string) {
    if (!this.timer) {
      if (success) {
        console.log(
          `  ${palette.green}✓${palette.reset} ${this.label}${detail ? ` ${palette.dim}— ${detail}${palette.reset}` : ""}`,
        );
      }
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
    process.stdout.write("\r\x1b[K");

    const mark = success
      ? `${palette.green}✓${palette.reset}`
      : `${palette.red}✗${palette.reset}`;
    const suffix = detail ?? this.detail;
    console.log(
      `  ${mark} ${this.label}${suffix ? ` ${palette.dim}— ${suffix}${palette.reset}` : ""}`,
    );
    this.showCursor();
  }

  private stopSpinner() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      process.stdout.write("\r\x1b[K");
      this.showCursor();
    }
  }

  private renderSpinner() {
    const frame = `${palette.cyan}${this.frames[this.frame]}${palette.reset}`;
    process.stdout.write("\r\x1b[K");
    process.stdout.write(
      `  ${frame} ${this.label}${this.detail ? ` ${palette.dim}— ${this.detail}${palette.reset}` : ""}`,
    );
  }

  private hideCursor() {
    if (!this.cursorHidden) {
      process.stdout.write("\x1b[?25l");
      this.cursorHidden = true;
    }
  }

  private showCursor() {
    if (this.cursorHidden) {
      process.stdout.write("\x1b[?25h");
      this.cursorHidden = false;
    }
  }
}

const ui = new SetupUi();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command: string, args: string[], env?: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: IS_WIN && command === "docker",
  });

  if (result.status !== 0) {
    ui.fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function runStep(
  label: string,
  detail: string | undefined,
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
) {
  ui.begin(label, detail);
  ui.suspend();
  run(command, args, env);
  ui.succeed();
}

function runCapture(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: IS_WIN && command === "docker",
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function runSupabase(args: string[]) {
  run("bunx", ["supabase", ...args]);
}

function captureSupabase(args: string[]) {
  return runCapture("bunx", ["supabase", ...args]);
}

function parseSupabaseStatus(raw: string | null): SupabaseStatus | null {
  if (!raw) {
    return null;
  }

  try {
    const status = JSON.parse(raw) as SupabaseStatus;
    if (!status.API_URL || !status.DB_URL) {
      return null;
    }

    const publishableKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
    if (!publishableKey) {
      return null;
    }

    return { ...status, ANON_KEY: publishableKey };
  } catch {
    return null;
  }
}

function isProjectSupabaseContainer(name: string): boolean {
  return name.includes(`_${PROJECT_ID}`);
}

function isSupabaseContainer(name: string): boolean {
  return name.startsWith("supabase_");
}

function getSupabaseProjectIdFromContainer(name: string): string | null {
  const match = name.match(/^supabase_[^_]+_(.+)$/);
  return match?.[1] ?? null;
}

function listSupabaseContainersForProject(projectId: string): string[] {
  const result = spawnSync("docker", ["ps", "-a", "--format", "{{.Names}}"], {
    encoding: "utf8",
    shell: IS_WIN,
  });

  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(
      (name) => name.startsWith("supabase_") && name.endsWith(`_${projectId}`),
    );
}

function stopSupabaseStackForProject(projectId: string) {
  for (const container of listSupabaseContainersForProject(projectId)) {
    spawnSync("docker", ["rm", "-f", container], {
      stdio: "ignore",
      shell: IS_WIN,
    });
  }
}

function getDockerContainerOnPort(port: number): string | null {
  const result = spawnSync(
    "docker",
    ["ps", "--filter", `publish=${port}`, "--format", "{{.Names}}"],
    { encoding: "utf8", shell: IS_WIN },
  );

  if (result.status !== 0) {
    return null;
  }

  const name = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return name ?? null;
}

function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });

    const finish = (listening: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(listening);
    };

    socket.setTimeout(750);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function getBlockingSupabaseProjectIds(): string[] {
  const ids = new Set<string>();

  for (const port of SUPABASE_PORTS) {
    const container = getDockerContainerOnPort(port);
    if (!container || isProjectSupabaseContainer(container)) {
      continue;
    }

    if (!isSupabaseContainer(container)) {
      continue;
    }

    const projectId = getSupabaseProjectIdFromContainer(container);
    if (projectId && projectId !== PROJECT_ID) {
      ids.add(projectId);
    }
  }

  return [...ids];
}

async function reclaimBlockingSupabaseStacks() {
  const blockingIds = getBlockingSupabaseProjectIds();
  if (blockingIds.length === 0) {
    return;
  }

  ui.begin(
    "Reclaiming ports",
    `stopping old Supabase stack (${blockingIds.join(", ")})`,
  );

  for (const projectId of blockingIds) {
    stopSupabaseStackForProject(projectId);
  }

  await sleep(2000);
  ui.succeed("ports ready");
}

async function ensurePortsAvailableForStart() {
  await reclaimBlockingSupabaseStacks();

  const conflicts: string[] = [];

  for (const port of SUPABASE_PORTS) {
    const container = getDockerContainerOnPort(port);
    if (container) {
      if (!isProjectSupabaseContainer(container)) {
        conflicts.push(
          `port ${port} is used by Docker container "${container}"`,
        );
      }
      continue;
    }

    if (await isPortListening(port)) {
      conflicts.push(`port ${port} is already in use on this machine`);
    }
  }

  if (conflicts.length === 0) {
    return;
  }

  ui.fail(
    "Cannot start Supabase — required ports are busy.\n" +
      conflicts.map((line) => `  • ${line}`).join("\n") +
      "\n\nSetup auto-stops other Supabase stacks on these ports, but not unrelated apps.\n" +
      "Free ports 54320–54324 or change them in supabase/config.toml.",
  );
}

function ensureDocker() {
  const result = spawnSync("docker", ["info"], {
    stdio: "ignore",
    shell: IS_WIN,
  });

  if (result.status !== 0) {
    ui.fail(
      "Docker is not running. Install Docker Desktop, start it, then run setup again.\n" +
        "  https://docs.docker.com/get-docker/",
    );
  }
}

function readEnvValue(key: string): string | undefined {
  if (!existsSync(ENV_FILE)) {
    return undefined;
  }

  const match = readFileSync(ENV_FILE, "utf8").match(
    new RegExp(`^${key}=(.*)$`, "m"),
  );

  if (!match?.[1]) {
    return undefined;
  }

  return match[1].replace(/^["']|["']$/g, "").trim() || undefined;
}

function getSupabaseStatus(): SupabaseStatus | null {
  return parseSupabaseStatus(captureSupabase(["status", "-o", "json"]));
}

async function startSupabase(): Promise<SupabaseStatus> {
  await ensurePortsAvailableForStart();

  ui.begin("Starting Supabase", "first run may take a few minutes");
  ui.suspend();
  runSupabase(["start"]);

  const status = getSupabaseStatus();
  if (!status) {
    ui.fail(
      "Could not read Supabase local credentials. Run `bun run supabase:status` to debug.",
    );
  }

  ui.succeed("local stack ready");
  return status;
}

function isCurrentProjectSupabaseRunning(): boolean {
  const container = getDockerContainerOnPort(54321);
  return Boolean(container && isProjectSupabaseContainer(container));
}

async function ensureSupabase(): Promise<{
  status: SupabaseStatus;
  alreadyRunning: boolean;
}> {
  if (isCurrentProjectSupabaseRunning()) {
    const existing = getSupabaseStatus();
    if (existing) {
      ui.ok("Supabase", "already running");
      return { status: existing, alreadyRunning: true };
    }
  }

  return { status: await startSupabase(), alreadyRunning: false };
}

function writeEnvFile(status: SupabaseStatus) {
  const preservedLines: string[] = [];
  const seenKeys = new Set<string>();

  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
      const keyMatch = line.match(/^([A-Z][A-Z0-9_]*)=/);
      if (keyMatch) {
        seenKeys.add(keyMatch[1]);
        if (MANAGED_ENV_KEYS.has(keyMatch[1])) {
          continue;
        }
      }
      preservedLines.push(line);
    }

    while (preservedLines.length > 0 && !preservedLines.at(-1)?.trim()) {
      preservedLines.pop();
    }
  }

  const lines = [...preservedLines];
  if (lines.length > 0) {
    lines.push("");
  }

  lines.push("# Supabase — updated by `bun run setup`");
  lines.push(`NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`);
  lines.push(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.ANON_KEY}`);
  lines.push(`DATABASE_URL=${status.DB_URL}`);

  if (
    !seenKeys.has("OPENROUTER_API_KEY") &&
    !readEnvValue("OPENROUTER_API_KEY")
  ) {
    lines.push(
      "# OPENROUTER_API_KEY=  # optional — https://openrouter.ai/keys",
    );
  }

  writeFileSync(ENV_FILE, `${lines.join("\n")}\n`, "utf8");
}

async function waitForDatabase(databaseUrl: string) {
  const attempts = 15;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const sql = postgres(databaseUrl, {
      max: 1,
      connect_timeout: 5,
      onnotice: () => {},
    });

    try {
      await sql`select 1`;
      await sql.end({ timeout: 5 });
      return;
    } catch {
      await sql.end({ timeout: 1 }).catch(() => {});
      if (attempt === attempts) {
        ui.fail(
          "Database is not ready yet. Wait a few seconds, then run:\n  bun run setup:db",
        );
      }
      await sleep(2000);
    }
  }
}

async function prepareDatabase(databaseUrl: string) {
  ui.begin("Preparing database", "pgvector, schema & seed");

  await waitForDatabase(databaseUrl);

  const sql = postgres(databaseUrl, {
    max: 1,
    onnotice: () => {},
  });

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    await sql.unsafe(readFileSync(SEED_FILE, "utf8"));
  } finally {
    await sql.end({ timeout: 5 });
  }

  ui.suspend();
  run("bunx", ["drizzle-kit", "push", "--force"], {
    DATABASE_URL: databaseUrl,
  });
  ui.succeed();
}

function installDependencies() {
  runStep("Installing dependencies", "bun install", "bun", ["install"]);
}

function openBrowser(url: string) {
  try {
    if (IS_WIN) {
      spawnSync("cmd", ["/c", "start", "", url], {
        stdio: "ignore",
        shell: true,
      });
      return;
    }

    if (process.platform === "darwin") {
      spawnSync("open", [url], { stdio: "ignore" });
      return;
    }

    const result = spawnSync("xdg-open", [url], { stdio: "ignore" });
    if (result.status !== 0) {
      ui.note(`Open ${url} in your browser.`);
    }
  } catch {
    ui.note(`Open ${url} in your browser.`);
  }
}

async function waitForApp(url: string) {
  for (let attempt = 1; attempt <= 90; attempt++) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet.
    }

    await sleep(1000);
  }

  return false;
}

function buildApp() {
  runStep(
    "Building application",
    "production build",
    "bun",
    ["run", "build"],
    { NODE_ENV: "production" },
  );
}

async function startProductionServer() {
  ui.section("Launch");
  ui.begin("Starting application", "production mode");
  ui.suspend();

  const server = spawn("bun", ["run", "start"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "inherit",
    shell: IS_WIN,
  });

  const ready = await waitForApp(APP_URL);
  if (ready) {
    openBrowser(APP_URL);
    ui.succeed(APP_URL);
  } else {
    ui.succeed(`started — open ${APP_URL} manually`);
  }

  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.on("exit", (code) => {
      if (code === 0 || code === null) {
        resolve();
        return;
      }

      reject(new Error(`bun start exited with code ${code}`));
    });
  });
}

async function buildAndStartApp() {
  buildApp();
  await startProductionServer();
}

function printNextSteps(options: {
  skipSupabase: boolean;
  hasOpenRouter: boolean;
}) {
  const lines = [
    `${palette.cyan}${APP_URL}${palette.reset}  App`,
  ];

  if (!options.skipSupabase) {
    lines.push(
      `${palette.dim}http://127.0.0.1:54323${palette.reset}  Supabase Studio`,
      `${palette.dim}http://127.0.0.1:54324${palette.reset}  Local email inbox`,
    );
  }

  if (!options.hasOpenRouter) {
    lines.push(
      "",
      `${palette.yellow}Tip:${palette.reset} Add OPENROUTER_API_KEY to .env.local for chat & studio`,
      `${palette.dim}https://openrouter.ai/keys${palette.reset}`,
    );
  }

  ui.success(lines);
}

async function main() {
  const skipSupabase = process.argv.includes("--skip-supabase");
  const noStart =
    process.argv.includes("--no-dev") ||
    process.argv.includes("--no-start");
  const shouldStartApp = !skipSupabase && !noStart;

  ui.banner(
    skipSupabase ? "Database setup" : "Local setup — one command to run",
  );

  ui.section("Dependencies");
  installDependencies();

  let databaseUrl = readEnvValue("DATABASE_URL");

  if (!skipSupabase) {
    ui.section("Infrastructure");
    ui.begin("Checking Docker");
    ensureDocker();
    ui.succeed("running");

    const { status } = await ensureSupabase();

    ui.begin("Writing environment", ".env.local");
    writeEnvFile(status);
    databaseUrl = status.DB_URL;
    if (!databaseUrl) {
      ui.fail("Supabase did not return DATABASE_URL.");
    }
    ui.succeed("config updated");
  } else if (!databaseUrl) {
    ui.fail(
      "DATABASE_URL is missing. Add it to .env.local (cloud Supabase → Project Settings → Database).",
    );
  }

  if (!databaseUrl) {
    ui.fail("DATABASE_URL is missing.");
  }

  ui.section("Database");
  await prepareDatabase(databaseUrl);

  const hasOpenRouter = Boolean(readEnvValue("OPENROUTER_API_KEY"));
  if (hasOpenRouter) {
    ui.note("OpenRouter API key found");
  } else {
    ui.note("OpenRouter optional — add OPENROUTER_API_KEY when you need AI features");
  }

  if (shouldStartApp) {
    ui.section("Build & launch");
    await buildAndStartApp();
    return;
  }

  printNextSteps({ skipSupabase, hasOpenRouter });

  if (!skipSupabase) {
    ui.note("Stop Supabase: bun run supabase:stop");
  }
  ui.note("Dev mode: bun dev");
  ui.note("Production: bun run build && bun start");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
