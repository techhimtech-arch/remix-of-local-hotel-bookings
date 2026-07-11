
-- Revoke EXECUTE on SECURITY DEFINER functions from public roles.
-- Triggers still execute (they run as table owner regardless of EXECUTE grants).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Hide profiles from GraphQL/PostgREST discovery by anon and authenticated roles.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
-- service_role retains full access for admin/edge-function use.
GRANT ALL ON public.profiles TO service_role;
