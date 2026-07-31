import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedUserOrThrow(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: User must be logged in");
  }

  return user;
}

export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

