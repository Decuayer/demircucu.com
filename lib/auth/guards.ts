import "server-only";
import type { Profile } from "@prisma/client";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "./session";
import { AuthorizationError } from "./errors";

/** Signed-in user with a profile, or throws `AuthorizationError("unauthenticated")`. */
export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("unauthenticated");
  return user;
}

/**
 * The single admin check. Every admin server action, route handler and page uses it; the proxy
 * redirect for `/admin` is only a convenience, not the security boundary.
 */
export async function requireAdmin(): Promise<Profile> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthorizationError("forbidden");
  return user;
}

/** Page variant: redirects anonymous visitors to login and non-admins to the home page. */
export async function requireAdminPage(locale: string): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/auth/login", locale });
  if (user.role !== "ADMIN") return redirect({ href: "/", locale });
  return user;
}

/** Page variant of `requireUser`. */
export async function requireUserPage(locale: string): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/auth/login", locale });
  return user;
}
