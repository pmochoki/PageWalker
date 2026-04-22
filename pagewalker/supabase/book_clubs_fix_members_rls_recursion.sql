-- Fix: "infinite recursion detected in policy for relation 'book_club_members'"
-- Cause: the previous policy called is_book_club_member(), which queried book_club_members
-- and re-entered the same RLS policy.
-- Run this once in the Supabase SQL editor (safe to re-run).

DROP FUNCTION IF EXISTS public.is_book_club_member(uuid, uuid);

DROP POLICY IF EXISTS "book_club_members_select" ON public.book_club_members;

CREATE POLICY "book_club_members_select"
  ON public.book_club_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
