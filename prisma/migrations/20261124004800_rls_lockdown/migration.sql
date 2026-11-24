-- Defence in depth for the Supabase Data API (security review S1).
--
-- The application reaches the database only through Prisma as the table owner, which bypasses
-- row level security. The Supabase client roles (`anon`, `authenticated`) must never read or
-- write these tables through PostgREST, even if the Data API is re-enabled or a grant is added by
-- mistake. Two independent layers:
--   1. RLS enabled on every table in `public` with no policies: client roles see zero rows.
--   2. No privileges for client roles on the schema, its tables, sequences and functions, now
--      and for objects created later by this role.
--
-- Plain PostgreSQL (CI, docker compose) has no `anon` / `authenticated` roles; the grant changes
-- are skipped there while RLS is still enabled, so every environment has the same table state.
-- tests/integration/rls.int.test.ts fails if any table in `public` is left without RLS.

DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.relname);
  END LOOP;
END
$$;

DO $$
DECLARE
  client_role text;
BEGIN
  -- PostgreSQL 15+ grants USAGE on schema public to PUBLIC, which every role (including the
  -- client roles) inherits. Only roles that are granted USAGE explicitly (postgres, service_role
  -- on Supabase) keep it. Older Supabase projects already ship without this grant.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA public FROM PUBLIC;
  END IF;

  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', client_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', client_role);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', client_role);
      EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', client_role);
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', client_role);
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', client_role);
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', client_role);
    END IF;
  END LOOP;
END
$$;
