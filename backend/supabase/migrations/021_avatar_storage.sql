-- ===================== AVATAR STORAGE =====================
-- Public bucket: avatars/{user_id}/avatar.{ext}
-- Files are public-read, but only the owning user can write.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read avatar files (public CDN URLs)
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can upload into their own user_id folder
CREATE POLICY "avatars_user_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can overwrite their own avatar (upsert support)
CREATE POLICY "avatars_user_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
