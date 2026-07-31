# LibreNote AI

**The open-source, self-hosted alternative to NotebookLM.** Spins up locally in one command. Powered by any model via [OpenRouter](https://openrouter.ai).

Upload PDFs, web pages, YouTube transcripts, and more. Chat with grounded citations over your sources. Generate studio artifacts — flashcards, quizzes, mind maps, audio overviews, and notes — without sending your data to a proprietary cloud.

## Why LibreNote AI?

| | NotebookLM | LibreNote AI |
|---|------------|--------------|
| **Hosting** | Google-hosted | Self-hosted on your machine or server |
| **Data privacy** | Processed in Google's cloud | Your Postgres, your Supabase, your keys |
| **Models** | Fixed Google models | Any model on OpenRouter (Claude, GPT, Gemini, Llama, …) |
| **Open source** | Closed | MIT licensed — inspect, fork, extend |
| **Setup** | Sign in with Google | `bun run setup && bun dev` |

## Features

- **Source ingestion** — PDF, DOCX, XLSX, web URLs, YouTube, and pasted text
- **RAG chat** — Vector search with pgvector, reranking, and inline citations
- **Studio** — Flashcards, quizzes, mind maps, slide decks, audio overviews, and rich notes
- **Self-hosted auth** — Supabase Auth (email/password, Google OAuth)
- **One-command local dev** — Docker + Supabase + schema push + seed

## Quick start (local)

**Prerequisites**

- [Docker Desktop](https://docs.docker.com/get-docker/) (running)
- [Bun](https://bun.sh)

Supabase CLI is included as a dev dependency — no separate install needed.

**One-command setup**

```bash
git clone <your-repo-url>
cd librenoteai
bun install
bun run setup
bun dev
```

Setup will:

1. Start local Supabase for **this repo only** (`project_id: librenoteai`) — skips start if already running
2. Update `.env.local` (preserves your other env vars like `OPENROUTER_API_KEY`)
3. Run `drizzle-kit push` to sync the schema from `src/db/schema.ts`
4. Apply `supabase/seed.sql` (storage buckets + auth profile trigger)

Setup never stops or removes your other Docker containers. It only uses ports **54320–54324** for this project's Supabase stack.

> **Upgrading from an older clone?** If you previously used `project_id: notebook-llm`, stop that stack first (`bun run supabase:stop` in the old directory, or remove the `supabase_*_notebook-llm` Docker containers) so ports 54320–54324 are free.

OpenRouter is **optional during setup**. Add `OPENROUTER_API_KEY` to `.env.local` when you're ready for chat and AI features — the app shows a hint in the header until then.

**Run the app**

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000), create an account with email/password, and start a notebook.

> Local auth has email confirmations disabled — sign up signs you in immediately.  
> Password reset emails are captured locally at [http://127.0.0.1:54324](http://127.0.0.1:54324) (Mailpit), not your real inbox.

## Useful commands

| Command | Description |
|---------|-------------|
| `bun run setup` | Full local setup (Supabase + schema push + seed) |
| `bun run setup:db` | Push schema + seed (local Supabase running, or cloud `.env.local`) |
| `bun run dev` | Start Next.js dev server |
| `bun run db:push` | Sync schema from Drizzle (`src/db/schema.ts`) |
| `bun run db:generate` | Generate SQL migrations from schema changes |
| `bun run db:migrate` | Apply generated migrations (production/CI) |
| `bun run supabase:status` | Show local Supabase URLs and keys |
| `bun run supabase:stop` | Stop local Supabase containers |
| `bun run db:studio` | Open Drizzle Studio |

**Local services after setup**

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Email inbox (local) | http://127.0.0.1:54324 |

## Environment variables

Copy `.env.example` to `.env.local` or let `bun run setup` generate it for local dev.

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | No | Chat, embeddings, reranking, and studio (add when ready) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` also works) |
| `DATABASE_URL` | Yes | Postgres connection string (direct or session pooler) |

## Cloud Supabase

Use cloud Supabase when you do not want local Docker. The app uses the same env vars — only the values change.

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` → `.env.local` and fill in:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Database URI** (direct or session mode) → `DATABASE_URL`
   - Your OpenRouter key → `OPENROUTER_API_KEY` (optional — add when you need AI features)
3. In Supabase **Authentication → URL configuration**, set Site URL to your app origin and add `https://your-domain/auth/callback` to redirect URLs
4. Run database bootstrap (pgvector + schema + storage buckets + auth trigger):

```bash
bun run setup:db
```

5. Start the app: `bun dev`

`setup:db` runs the same steps as local setup after Supabase is configured: enables `vector`, pushes the Drizzle schema, and applies `supabase/seed.sql`.

## Tech stack

- **Next.js** — App Router
- **Supabase** — Auth + Storage
- **PostgreSQL + pgvector** — RAG vector search
- **Drizzle ORM** — Database schema and migrations
- **OpenRouter** — LLM, embeddings, rerank

## Security & privacy

LibreNote AI is designed to run entirely on infrastructure you control:

- Source files and embeddings live in **your** Postgres database
- File uploads go to **your** Supabase Storage buckets
- API keys (`OPENROUTER_API_KEY`, `DATABASE_URL`) stay in your environment — never hardcoded
- Only `.env.example` belongs in git — `.env` and `.env.local` are gitignored
- Row-level security policies scope data to notebook owners

## License

[MIT](LICENSE) — use, modify, and deploy freely.
