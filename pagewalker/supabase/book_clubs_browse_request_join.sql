-- Book clubs: directory browsing, join requests, member_count, and RLS fixes.
-- Run in Supabase SQL editor (after book_clubs.sql). Safe to re-run with IF NOT EXISTS / DROP IF EXISTS where noted.

-- 1) Member count on book_clubs (avoids loading full rosters for browse cards)
ALTER TABLE book_clubs
  ADD COLUMN IF NOT EXISTS member_count INT NOT NULL DEFAULT 0;

UPDATE book_clubs bc
SET member_count = sub.c
FROM (
  SELECT club_id, COUNT(*)::int AS c
  FROM book_club_members
  GROUP BY club_id
) sub
WHERE bc.id = sub.club_id;

CREATE OR REPLACE FUNCTION public.sync_book_club_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS tr_sync_book_club_member_count ON public.book_club_members;
CREATE TRIGGER tr_sync_book_club_member_count
  AFTER INSERT OR DELETE ON public.book_club_members
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_book_club_member_count();

-- 2) Join requests
CREATE TABLE IF NOT EXISTS public.book_club_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.book_clubs (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (club_id, user_id)
);

CREATE INDEX IF NOT EXISTS book_club_join_requests_club_idx
  ON public.book_club_join_requests (club_id, status);

ALTER TABLE public.book_club_join_requests ENABLE ROW LEVEL SECURITY;

-- 3) book_clubs: who can read
DROP POLICY IF EXISTS "Club members can see club" ON public.book_clubs;
CREATE POLICY "book_clubs_select"
  ON public.book_clubs
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (SELECT club_id FROM public.book_club_members WHERE user_id = auth.uid())
    OR is_private = false
  );

-- 4) book_club_members: SELECT only own rows (no self-referential subquery — avoids infinite recursion)
DROP FUNCTION IF EXISTS public.is_book_club_member(uuid, uuid);
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
CREATE POLICY "book_club_members_select"
  ON public.book_club_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "book_club_members_insert_self"
  ON public.book_club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
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

-- 5) Join requests RLS
DROP POLICY IF EXISTS "read_join_requests" ON public.book_club_join_requests;
CREATE POLICY "read_join_requests"
  ON public.book_club_join_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR club_id IN (SELECT id FROM public.book_clubs WHERE created_by = auth.uid())
  );

DROP POLICY IF EXISTS "create_join_request" ON public.book_club_join_requests;
CREATE POLICY "create_join_request"
  ON public.book_club_join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND club_id IN (SELECT id FROM public.book_clubs WHERE is_private = false)
    AND NOT EXISTS (
      SELECT 1 FROM public.book_club_members m
      WHERE m.club_id = book_club_join_requests.club_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user_update_rejected_to_pending" ON public.book_club_join_requests;
CREATE POLICY "user_update_rejected_to_pending"
  ON public.book_club_join_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'rejected')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "creator_update_join_request" ON public.book_club_join_requests;
CREATE POLICY "creator_update_join_request"
  ON public.book_club_join_requests
  FOR UPDATE
  TO authenticated
  USING (club_id IN (SELECT id FROM public.book_clubs WHERE created_by = auth.uid()))
  WITH CHECK (club_id IN (SELECT id FROM public.book_clubs WHERE created_by = auth.uid()));

-- Optional: only creators resolve requests
COMMENT ON TABLE public.book_club_join_requests IS
  'User requests to join is_private = false (listed) clubs; creators approve in web/app.';

UPDATE public.book_clubs SET is_private = true WHERE is_private IS NULL;
