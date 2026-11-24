import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * The authenticated Supabase user for this request, verified by the Auth server
 * (`auth.getUser()`), never read from the unverified session cookie.
 *
 * Wrapped in React `cache` so the header, the page and every guard share one Auth round trip and
 * one profile query per request.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/** Profile of the signed-in user, or null for anonymous visitors. */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  return prisma.profile.findUnique({ where: { id: user.id } });
});
