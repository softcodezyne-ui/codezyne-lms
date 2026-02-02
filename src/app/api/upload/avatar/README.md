# Avatar Upload API

This API endpoint handles user avatar uploads using Cloudinary for image storage and processing.

## Endpoints

### POST `/api/upload/avatar`

Uploads a user avatar image to Cloudinary.

#### Request

- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Required (NextAuth session)

#### Form Data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `avatar` | File | Yes | Image file to upload |

#### File Validation

- **Allowed Types**: JPEG, JPG, PNG, GIF, WebP
- **Max Size**: 5MB
- **Auto Processing**: Images are automatically resized to 400x400px with face detection cropping

#### Response

**Success (200)**
```json
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/lms/avatars/avatar_user123_1234567890.jpg",
  "publicId": "lms/avatars/avatar_user123_1234567890",
  "message": "Avatar uploaded successfully"
}
```

**Error (400)**
```json
{
  "error": "No file provided"
}
```

**Error (401)**
```json
{
  "error": "Unauthorized"
}
```

**Error (500)**
```json
{
  "error": "Internal server error"
}
```

### DELETE `/api/upload/avatar`

Deletes an avatar image from Cloudinary.

#### Request

- **Method**: `DELETE`
- **Authentication**: Required (NextAuth session)
- **Query Parameters**:
  - `publicId` (string, required): Cloudinary public ID of the image to delete

#### Response

**Success (200)**
```json
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

**Error (400)**
```json
{
  "error": "Public ID is required"
}
```

## Environment Variables

Add these to your `.env.local` file:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Usage Examples

### React Hook Usage

```tsx
import { useAvatarUpload } from '@/hooks/useAvatarUpload';

function MyComponent() {
  const { uploadAvatar, deleteAvatar, isUploading, isDeleting } = useAvatarUpload();

  const handleFileUpload = async (file: File) => {
    const result = await uploadAvatar(file);
    if (result?.success) {
      console.log('Avatar URL:', result.imageUrl);
    }
  };

  const handleDelete = async (publicId: string) => {
    const success = await deleteAvatar(publicId);
    if (success) {
      console.log('Avatar deleted');
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        disabled={isUploading}
      />
      {isUploading && <p>Uploading...</p>}
    </div>
  );
}
```

### Component Usage

```tsx
import AvatarUpload from '@/components/AvatarUpload';

function ProfilePage() {
  const [avatarUrl, setAvatarUrl] = useState('');

  return (
    <AvatarUpload
      currentAvatar={avatarUrl}
      onAvatarChange={(imageUrl, publicId) => {
        setAvatarUrl(imageUrl);
        // Save to your database
      }}
      onAvatarRemove={() => {
        setAvatarUrl('');
        // Remove from your database
      }}
      size="lg"
    />
  );
}
```

### Direct API Usage

```javascript
// Upload avatar
const formData = new FormData();
formData.append('avatar', file);

const response = await fetch('/api/upload/avatar', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result.imageUrl);

// Delete avatar
const deleteResponse = await fetch(`/api/upload/avatar?publicId=${publicId}`, {
  method: 'DELETE',
});

const deleteResult = await deleteResponse.json();
console.log(deleteResult.message);
```

## Image Processing

All uploaded images are automatically processed by Cloudinary:

- **Resize**: 400x400 pixels
- **Crop**: Fill with face detection gravity
- **Quality**: Auto-optimized
- **Format**: Auto-selected best format (WebP when supported)

## Security

- **Authentication**: All endpoints require valid NextAuth session
- **File Validation**: Strict file type and size validation
- **User Isolation**: Images are stored with user-specific naming
- **Error Handling**: Comprehensive error handling and logging

## Error Handling

The API includes comprehensive error handling for:

- Missing authentication
- Invalid file types
- File size limits
- Cloudinary upload failures
- Network errors
- Server errors

All errors return appropriate HTTP status codes and descriptive error messages.
