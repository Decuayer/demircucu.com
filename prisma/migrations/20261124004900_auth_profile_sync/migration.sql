-- Keeps public."Profile" in sync with Supabase Auth users (security review S9).
--
-- * INSERT on auth.users creates the profile in the same transaction, so a signed-up user can
--   never exist without a profile, whatever the sign-up path (e-mail, OAuth, dashboard invite).
-- * The role is always USER. It is never read from user-controlled metadata; admins are
--   promoted manually in the database.
-- * The display name comes from raw_user_meta_data.name, stripped of control characters and
--   truncated to 80 characters.
-- * ON CONFLICT DO NOTHING: a leftover profile with the same id or e-mail never blocks sign-up.
-- * E-mail changes are mirrored; deleting the auth user deletes the profile (and, by cascade,
--   its comments and likes).
-- * Existing auth users without a profile are backfilled.
--
-- Functions live in the `app_private` schema, which is not exposed by the Data API.
-- Plain PostgreSQL (CI) has no `auth` schema: the whole migration is a no-op there and is
-- exercised against the local Supabase stack instead (tests/supabase).

DO $migration$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users not found; skipping Supabase Auth profile sync';
    RETURN;
  END IF;

  CREATE SCHEMA IF NOT EXISTS app_private;
  REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

  CREATE OR REPLACE FUNCTION app_private.profile_display_name(meta jsonb)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path = ''
  AS $fn$
    SELECT NULLIF(
      left(btrim(regexp_replace(COALESCE(meta ->> 'name', ''), '[[:cntrl:]]', '', 'g')), 80),
      ''
    )
  $fn$;

  CREATE OR REPLACE FUNCTION app_private.handle_new_auth_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $fn$
  BEGIN
    INSERT INTO public."Profile" (id, email, name, role, "createdAt", "updatedAt")
    VALUES (
      NEW.id::text,
      COALESCE(NEW.email, NEW.id::text || '@users.invalid'),
      app_private.profile_display_name(NEW.raw_user_meta_data),
      'USER',
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END
  $fn$;

  CREATE OR REPLACE FUNCTION app_private.handle_auth_user_email_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $fn$
  BEGIN
    IF NEW.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
      UPDATE public."Profile" SET email = NEW.email, "updatedAt" = now()
      WHERE id = NEW.id::text;
    END IF;
    RETURN NEW;
  END
  $fn$;

  CREATE OR REPLACE FUNCTION app_private.handle_deleted_auth_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $fn$
  BEGIN
    DELETE FROM public."Profile" WHERE id = OLD.id::text;
    RETURN OLD;
  END
  $fn$;

  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC;

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION app_private.handle_new_auth_user();

  DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
  CREATE TRIGGER on_auth_user_email_changed
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION app_private.handle_auth_user_email_change();

  DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
  CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION app_private.handle_deleted_auth_user();

  INSERT INTO public."Profile" (id, email, name, role, "createdAt", "updatedAt")
  SELECT
    u.id::text,
    COALESCE(u.email, u.id::text || '@users.invalid'),
    app_private.profile_display_name(u.raw_user_meta_data),
    'USER',
    now(),
    now()
  FROM auth.users u
  ON CONFLICT DO NOTHING;
END
$migration$;
