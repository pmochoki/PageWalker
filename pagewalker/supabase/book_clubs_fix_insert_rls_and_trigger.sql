-- Fix: "new row violates row-level security policy for table book_clubs" when creating a club
-- or when anyone joins and member_count is synced.
-- Run in Supabase → SQL Editor. Safe to run more than once.
--
-- 1) INSERT: allow authenticated users to create a row only when they set created_by to self.
--    (Drops the older name from book_clubs.sql if present.)
DROP POLICY IF EXISTS "Anyone can create club" ON public.book_clubs;
DROP POLICY IF EXISTS "book_clubs_insert" ON public.book_clubs;
CREATE POLICY "book_clubs_insert"
  ON public.book_clubs
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 2) Counter trigger: under RLS, the follow-up UPDATE on book_clubs must not run as the
--    invoker. SECURITY DEFINER (owned by a privileged role) updates member_count for any join/leave.
CREATE OR REPLACE FUNCTION public.sync_book_club_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.book_clubs
    SET member_count = member_count + 1
    WHERE id = NEW.club_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.book_clubs
    SET member_count = GREATEST(0, member_count - 1)
    WHERE id = OLD.club_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Re-attach trigger so it uses the new function definition
DROP TRIGGER IF EXISTS tr_sync_book_club_member_count ON public.book_club_members;
CREATE TRIGGER tr_sync_book_club_member_count
  AFTER INSERT OR DELETE ON public.book_club_members
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_book_club_member_count();
