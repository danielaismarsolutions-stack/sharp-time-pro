-- Migration: Create barber-avatars storage bucket
-- Description: Sets up storage bucket for barber profile photos with public read access
-- Created: 2026-02-16

-- Create storage bucket for barber avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barber-avatars',
  'barber-avatars',
  true, -- Public bucket so external websites can read images
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Public Access for Barber Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload barber avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update barber avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete barber avatars" ON storage.objects;

-- Policy 1: Allow public read access (so external websites can view images)
CREATE POLICY "Public Access for Barber Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'barber-avatars');

-- Policy 2: Allow authenticated users to upload avatars
-- Note: Using anon role since app uses anonymous key for operations
CREATE POLICY "Authenticated users can upload barber avatars"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (
  bucket_id = 'barber-avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Policy 3: Allow authenticated users to update avatars
CREATE POLICY "Authenticated users can update barber avatars"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'barber-avatars')
WITH CHECK (bucket_id = 'barber-avatars');

-- Policy 4: Allow authenticated users to delete avatars
CREATE POLICY "Authenticated users can delete barber avatars"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'barber-avatars');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Barber avatars storage bucket created successfully!';
  RAISE NOTICE 'Bucket name: barber-avatars';
  RAISE NOTICE 'Public access: Enabled (read-only)';
  RAISE NOTICE 'File size limit: 5MB';
  RAISE NOTICE 'Allowed types: JPEG, PNG, WebP';
END $$;
