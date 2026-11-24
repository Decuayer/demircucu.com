/**
 * Shared mocks for integration tests that call server actions directly (outside Next.js).
 * Import this module first; the actions are then loaded with dynamic `await import()` so the
 * mocks registered here are in place (vi.mock is not hoisted out of helper modules).
 */
import { vi } from "vitest";
import type { Profile } from "@prisma/client";

export const auth: { current: Profile | null } = { current: null };
export const cache = { updateTag: vi.fn(), revalidateTag: vi.fn() };
export const headerValues = { ip: "203.0.113.7" };
/** Callbacks passed to `after()`; not run (the follow-up expiry is unit-tested in lib/cache). */
export const afterTasks: (() => unknown)[] = [];

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(async () => auth.current),
  getAuthUser: vi.fn(async () => (auth.current ? { id: auth.current.id } : null)),
}));

vi.mock("next/cache", () => ({
  updateTag: cache.updateTag,
  revalidateTag: cache.revalidateTag,
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  after: vi.fn((task: () => unknown) => afterTasks.push(task)),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": headerValues.ip })),
  cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })),
}));

vi.mock("@/lib/supabase/storage", () => ({
  BUCKET_NAME: "media",
  deleteFileFromStorage: vi.fn(async () => ({ success: true })),
  uploadFileToStorage: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
