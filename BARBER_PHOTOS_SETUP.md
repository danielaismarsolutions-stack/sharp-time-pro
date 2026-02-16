# Barber Photos Feature - Setup Instructions

## Overview

This feature enables barbers to upload profile photos that are stored in Supabase Storage and displayed in the admin app. The photos are accessible via public URLs, so your external barber website can fetch and display them.

## Database Changes

✅ **No database schema changes needed!** The `avatar_url` column already exists in the `users` table.

## Supabase Storage Setup

### Step 1: Run the SQL Migration

You need to create the storage bucket and set up Row Level Security (RLS) policies:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **SQL Editor** → **New Query**
3. Copy and paste the SQL from: `supabase/migrations/create_barber_avatars_storage.sql`
4. Click **Run** to execute the migration

### Step 2: Verify the Bucket

After running the migration, verify the bucket was created:

1. Go to: **Storage** in the Supabase Dashboard
2. You should see a bucket named `barber-avatars`
3. Bucket settings should be:
   - **Public**: ✅ Yes (for external website access)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: image/jpeg, image/png, image/webp

### Alternative: Manual Bucket Creation

If you prefer to create the bucket manually instead of running SQL:

1. Go to: **Storage** → **Create a new bucket**
2. Set:
   - **Name**: `barber-avatars`
   - **Public bucket**: ✅ Enabled
   - **File size limit**: 5242880 (5MB in bytes)
   - **Allowed MIME types**: Select JPEG, PNG, WebP

Then still run the SQL migration to create the RLS policies (skip the INSERT line).

## How It Works

### For Admins (Your App)

1. **Upload Photo**: When creating/editing a barber, you can now upload a profile photo
2. **Validation**: Photos must be JPG, PNG, or WebP format, maximum 5MB
3. **Storage**: Photos are uploaded to Supabase Storage bucket `barber-avatars`
4. **Database**: The public URL is saved in the `users.avatar_url` field
5. **Display**: Photos appear in the BarberCard component automatically

### For External Website

Your external barber booking website can fetch barber data from the `users` table and display the photos:

```javascript
// Example API call
const response = await fetch(
  'https://omeeupvetsacxbgojifx.supabase.co/rest/v1/users?business_id=eq.11111111-1111-1111-1111-111111111111&role=eq.barber',
  {
    headers: {
      'apikey': 'YOUR_ANON_KEY',
      'Authorization': 'Bearer YOUR_ANON_KEY'
    }
  }
);

const barbers = await response.json();

// Each barber object will have:
// - avatar_url: Public URL to the photo (or null if no photo)
// - name: Barber name
// - bio: Biography
// - email, phone: Contact info
```

## Files Modified/Created

### New Files
- ✅ `src/services/supabaseStorage.ts` - Storage service for uploads/deletes
- ✅ `src/lib/imageValidation.ts` - Image validation utilities
- ✅ `src/components/barbers/AvatarUpload.tsx` - Avatar upload component
- ✅ `supabase/migrations/create_barber_avatars_storage.sql` - Storage bucket setup

### Modified Files
- ✅ `src/services/supabaseBarbers.ts` - Added avatar URL update methods
- ✅ `src/components/barbers/BarberModal.tsx` - Integrated avatar upload
- ✅ `src/pages/Barbers.tsx` - Handle avatar uploads for new barbers
- ✅ `src/components/barbers/BarberCard.tsx` - Already displays avatars (no changes needed)

## Testing Checklist

### Before Testing
- [ ] Run the SQL migration in Supabase Dashboard
- [ ] Verify the `barber-avatars` bucket exists
- [ ] Verify the bucket is public

### Test Cases
- [ ] Create a new barber with a photo
- [ ] Create a new barber without a photo
- [ ] Edit an existing barber and add a photo
- [ ] Edit an existing barber and change the photo (old one should be deleted)
- [ ] Edit an existing barber and remove the photo
- [ ] Verify uploaded photos display in BarberCard
- [ ] Test uploading invalid file types (should show error)
- [ ] Test uploading oversized files >5MB (should show error)
- [ ] Verify external website can access photo URLs

## Security Notes

- ✅ Public read access enabled (required for external website)
- ✅ Upload/update/delete requires authentication (uses anon key)
- ✅ Photos are stored in `avatars/` subfolder
- ✅ Filenames include barber ID and timestamp for uniqueness
- ✅ Client-side validation prevents invalid uploads
- ✅ Server-side validation via Supabase bucket settings

## Troubleshooting

### Photos not uploading
1. Check browser console for errors
2. Verify the storage bucket exists in Supabase Dashboard
3. Verify RLS policies are created (Storage → Policies)

### Photos not visible on external website
1. Verify the bucket is set to **Public**
2. Check the `avatar_url` value in the database (should be a full URL)
3. Try accessing the URL directly in a browser

### Old photos not being deleted
- Check browser console for deletion errors
- Manually delete old photos via Supabase Dashboard (Storage → barber-avatars)

## Next Steps

After setting up:
1. ✅ Run the SQL migration
2. ✅ Test uploading photos in the admin app
3. ✅ Update your external website to fetch and display `avatar_url`
4. ✅ Consider adding image optimization/compression for large photos

## Support

If you encounter issues:
- Check Supabase Dashboard → Storage → Policies
- Verify bucket is public and has correct MIME type restrictions
- Check browser console for error messages
- Ensure anon key has correct permissions
