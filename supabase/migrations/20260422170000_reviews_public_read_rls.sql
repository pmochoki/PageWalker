-- Anyone can read reviews (anon + signed-in). Only authenticated users can write;
-- each row must belong to the current user (user_id = auth.uid()) on insert/update/delete.

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT pol.polname
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'reviews'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', p.polname);
  END LOOP;
END $$;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

CREATE POLICY "reviews_select_public"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "reviews_insert_own"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_update_own"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_delete_own"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.reviews IS
  'RLS: public read; write only for authenticated, own rows.';
