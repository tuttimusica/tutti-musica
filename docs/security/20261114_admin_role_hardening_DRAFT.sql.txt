-- Tutti: DRAFT SECURITY MIGRATION — NOT APPLIED TO SUPABASE
-- Review against production schema and take a verified database backup before applying.
-- Intended to run as a Supabase migration in one transaction.
--
-- Objective:
-- 1. Use one administrator authority (verified auth.users identity + allowlist).
-- 2. Prevent browser users from changing their own role or approval status.
-- 3. Preserve server-side teacher approval through SECURITY DEFINER RPC.
--
-- Rollback (only after review):
--   DROP TRIGGER IF EXISTS tutti_guard_usuarios_privileges ON public.usuarios;
--   DROP FUNCTION IF EXISTS private.tutti_guard_usuarios_privileges();
--   DROP TRIGGER IF EXISTS tutti_guard_profiles_role ON public.profiles;
--   DROP FUNCTION IF EXISTS private.tutti_guard_profiles_role();
--   Restore the previous definitions of private.is_admin() and
--   private.tutti_is_admin() from the pre-migration backup.
--
-- WARNING: Replacing admin functions changes RLS behavior globally.
-- Test with an actual authorized admin, a student and a pending teacher
-- in a staging environment before production deployment.

BEGIN;

CREATE OR REPLACE FUNCTION private.tutti_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.administradores_autorizados a
      ON lower(trim(a.email)) = lower(trim(u.email))
    WHERE u.id = (SELECT auth.uid())
      AND u.email_confirmed_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.tutti_is_admin();
$$;

CREATE OR REPLACE FUNCTION private.tutti_guard_usuarios_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Trusted service operations have no authenticated end-user JWT.
  -- Ordinary authenticated users cannot change authorization fields.
  IF auth.uid() IS NOT NULL
     AND NOT private.tutti_is_admin()
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
     )
  THEN
    RAISE EXCEPTION 'You cannot change your own access privileges'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tutti_guard_usuarios_privileges ON public.usuarios;
CREATE TRIGGER tutti_guard_usuarios_privileges
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION private.tutti_guard_usuarios_privileges();

CREATE OR REPLACE FUNCTION private.tutti_guard_profiles_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT private.tutti_is_admin()
     AND NEW.role IS DISTINCT FROM OLD.role
  THEN
    RAISE EXCEPTION 'You cannot change your own access privileges'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tutti_guard_profiles_role ON public.profiles;
CREATE TRIGGER tutti_guard_profiles_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.tutti_guard_profiles_role();

COMMIT;
