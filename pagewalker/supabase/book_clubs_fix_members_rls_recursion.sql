-- Fix: "infinite recursion detected in policy for relation 'book_club_members'"
-- Safe to run multiple times. Run in Supabase → SQL Editor (project admin).
--
-- 1) Drop helper that re-queried book_club_members under RLS
DROP FUNCTION IF EXISTS public.is_book_club_member(uuid, uuid);

-- 2) Remove every policy on book_club_members (old names, duplicates, or broken)
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT pol.polname
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'book_club_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.book_club_members', p.polname);
  END LOOP;
END $$;

-- 3) SELECT: only your own rows (no helper or cross-row pattern → no recursion)
CREATE POLICY "book_club_members_select"
  ON public.book_club_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4) Join with invite, sign-up, etc.: insert your own row
CREATE POLICY "book_club_members_insert_self"
  ON public.book_club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5) Organiser can add another user (e.g. approve a join)
CREATE POLICY "book_club_members_insert_creator"
  ON public.book_club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.book_clubs bc
      WHERE bc.id = club_id AND bc.created_by = auth.uid()
    )
  );

COMMENT ON TABLE public.book_club_members IS
  'RLS: see only own member rows. Club listing uses book_clubs + public/member.';
