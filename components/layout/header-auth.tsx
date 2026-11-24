import { getCurrentUser } from "@/lib/auth/session";
import { LoginButton, MobileAuthButton, UserMenu, type SessionUser } from "./user-menu";

async function getSessionUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return { name: user.name, email: user.email, isAdmin: user.role === "ADMIN" };
}

/**
 * The only request-time part of the header. Rendered inside <Suspense> so every page keeps a
 * static shell; `getCurrentUser` is deduplicated per request with the page's own checks.
 */
export async function DesktopAuth() {
  const user = await getSessionUser();
  return user ? <UserMenu user={user} /> : <LoginButton />;
}

export async function MobileAuth() {
  return <MobileAuthButton user={await getSessionUser()} />;
}
