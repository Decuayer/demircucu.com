import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./env";

/** Security review S9: every auth user has exactly one profile, always with role USER. */
const env = localSupabase();
const db = new Client({ connectionString: env.dbUrl });
const admin = createClient(env.apiUrl, env.secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const created: string[] = [];

beforeAll(() => db.connect());
afterAll(async () => {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  await db.end();
});

async function profile(id: string) {
  const { rows } = await db.query(`SELECT email, name, role FROM public."Profile" WHERE id = $1`, [
    id,
  ]);
  return rows[0] as { email: string; name: string | null; role: string } | undefined;
}

async function createUser(metadata: Record<string, unknown>) {
  const email = `trigger-${randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "Trigger-Test-12",
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error || !data.user) throw error ?? new Error("no user");
  created.push(data.user.id);
  return { id: data.user.id, email };
}

describe("auth.users -> Profile trigger", () => {
  it("creates a USER profile in the same transaction, ignoring a spoofed role", async () => {
    const user = await createUser({ name: "  Ada\u0007 Lovelace  ", role: "ADMIN" });
    expect(await profile(user.id)).toEqual({
      email: user.email,
      name: "Ada Lovelace",
      role: "USER",
    });
  });

  it("truncates long names and tolerates a missing name", async () => {
    const long = await createUser({ name: "x".repeat(500) });
    expect((await profile(long.id))?.name).toHaveLength(80);
    const anonymous = await createUser({});
    expect((await profile(anonymous.id))?.name).toBeNull();
  });

  it("does not block sign-up when a stale profile already uses the e-mail", async () => {
    const email = `stale-${randomUUID()}@example.test`;
    await db.query(
      `INSERT INTO public."Profile" (id, email, role, "createdAt", "updatedAt")
       VALUES ($1, $2, 'USER', now(), now())`,
      [randomUUID(), email],
    );
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "Trigger-Test-12",
      email_confirm: true,
    });
    expect(error).toBeNull();
    if (data.user) created.push(data.user.id);
    await db.query(`DELETE FROM public."Profile" WHERE email = $1`, [email]);
  });

  it("mirrors e-mail changes and deletes the profile with the user", async () => {
    const user = await createUser({ name: "Mover" });
    const newEmail = `moved-${randomUUID()}@example.test`;
    await admin.auth.admin.updateUserById(user.id, { email: newEmail, email_confirm: true });
    expect((await profile(user.id))?.email).toBe(newEmail);

    await admin.auth.admin.deleteUser(user.id);
    created.splice(created.indexOf(user.id), 1);
    expect(await profile(user.id)).toBeUndefined();
  });
});
