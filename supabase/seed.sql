-- Supabase-only bootstrap (storage + auth profile trigger).
-- Schema comes from `bun run db:push` (Drizzle). Applied by `bun run setup` or `bun run setup:db`.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('gallery', 'gallery', true),
  ('sources', 'sources', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "gallery_public_read" ON storage.objects;
CREATE POLICY "gallery_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "gallery_auth_insert" ON storage.objects;
CREATE POLICY "gallery_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gallery'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "gallery_auth_update" ON storage.objects;
CREATE POLICY "gallery_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'gallery'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "gallery_auth_delete" ON storage.objects;
CREATE POLICY "gallery_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gallery'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "sources_auth_read" ON storage.objects;
CREATE POLICY "sources_auth_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sources'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "sources_auth_insert" ON storage.objects;
CREATE POLICY "sources_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sources'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "sources_auth_update" ON storage.objects;
CREATE POLICY "sources_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sources'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "sources_auth_delete" ON storage.objects;
CREATE POLICY "sources_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sources'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
