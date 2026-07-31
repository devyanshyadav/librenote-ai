import { z } from "zod";

const isServer = typeof window === "undefined";

const ENV_HELP =
  "Set the required variables in `.env.local`. For local dev run `bun run setup`; for cloud Supabase see README.";

function resolveSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
});

const clientParsed = clientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: resolveSupabasePublishableKey(),
});

if (!clientParsed.success) {
  console.error(
    "❌ Invalid public environment variables:",
    JSON.stringify(clientParsed.error.format(), null, 2),
  );
  throw new Error(`Invalid public environment variables. ${ENV_HELP}`);
}

let serverData: z.infer<typeof serverSchema> = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY?.trim() || undefined,
};

if (isServer) {
  const serverParsed = serverSchema.safeParse(serverData);
  if (!serverParsed.success) {
    console.error(
      "❌ Invalid server environment variables:",
      JSON.stringify(serverParsed.error.format(), null, 2),
    );
    throw new Error(`Invalid server environment variables. ${ENV_HELP}`);
  }
  serverData = serverParsed.data;
}

export const env = {
  ...clientParsed.data,
  ...serverData,
};
