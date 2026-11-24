import { ADMIN, adminClient, clearRateLimits, sql } from "./helpers/supabase";

/** Creates (or resets) the E2E admin account and promotes its profile. */
export default async function globalSetup(): Promise<void> {
  const admin = adminClient();
  const existing = await sql<{ id: string }>(`SELECT id FROM auth.users WHERE email = $1`, [
    ADMIN.email,
  ]);
  let id = existing[0]?.id;
  if (id) {
    await admin.auth.admin.updateUserById(id, { password: ADMIN.password });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN.email,
      password: ADMIN.password,
      email_confirm: true,
      user_metadata: { name: "E2E Admin" },
    });
    if (error || !data.user) throw error ?? new Error("could not create admin");
    id = data.user.id;
  }
  // Promotion is a manual database step by design; the trigger always creates USER profiles.
  await sql(`UPDATE public."Profile" SET role = 'ADMIN' WHERE id = $1`, [id]);
  await clearRateLimits();
}
