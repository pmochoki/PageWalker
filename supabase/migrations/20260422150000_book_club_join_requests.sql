-- Join requests for listed (is_private = false) book clubs. Required for
-- "Request to join" on /clubs. Safe to re-run: IF NOT EXISTS + DROP IF EXISTS on policies.

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_club_join_requests TO authenticated;
GRANT ALL ON public.book_club_join_requests TO service_role;

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

COMMENT ON TABLE public.book_club_join_requests IS
  'User requests to join is_private = false (listed) clubs; creators approve in web/app.';
