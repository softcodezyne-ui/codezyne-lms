# PDF Upload API

A comprehensive API for uploading, managing, and deleting PDF files using Cloudinary storage.

## Overview

The PDF Upload API provides secure and efficient PDF file management with the following features:
- PDF file upload with validation
- File size and type restrictions
- Progress tracking
- Secure deletion
- Metadata management
- Role-based access control

## Endpoints

### POST /api/upload/pdf

Upload a PDF file to Cloudinary storage.

#### Request

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token> (via NextAuth session)
```

**Body (FormData):**
```
file: File (required) - PDF file to upload
folder: string (optional) - Cloudinary folder path (default: 'lms/documents')
description: string (optional) - File description
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "PDF uploaded successfully",
  "pdf": {
    "publicId": "lms/documents/document_1234567890_abc123",
    "url": "http://res.cloudinary.com/...",
    "secureUrl": "https://res.cloudinary.com/...",
    "fileName": "document.pdf",
    "size": 1024000,
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "uploadedBy": "admin@example.com",
    "folder": "lms/documents",
    "description": "Course material"
  }
}
```

**Error (400/401/500):**
```json
{
  "success": false,
  "error": "Error message"
}
```

### DELETE /api/upload/pdf

Delete a PDF file from Cloudinary storage.

#### Request

**Query Parameters:**
```
publicId: string (required) - Cloudinary public ID of the PDF
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "PDF deleted successfully"
}
```

**Error (400/401/500):**
```json
{
  "success": false,
  "error": "Error message"
}
```

### GET /api/upload/pdf

Get information about a PDF file.

#### Request

**Query Parameters:**
```
publicId: string (required) - Cloudinary public ID of the PDF
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "pdf": {
    "publicId": "lms/documents/document_1234567890_abc123",
    "url": "http://res.cloudinary.com/...",
    "secureUrl": "https://res.cloudinary.com/...",
    "fileName": "document.pdf",
    "size": 1024000,
    "format": "pdf",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "uploadedBy": "admin@example.com",
    "folder": "lms/documents",
    "description": "Course material"
  }
}
```

## File Validation

### File Type
- Only PDF files are accepted (`application/pdf`)
- MIME type validation is performed

### File Size
- Maximum size: 10MB
- Configurable via environment variables

### File Name
- Maximum length: 255 characters
- Invalid characters are rejected: `<>:"/\|?*` and control characters
- Special characters are sanitized

## Security Features

### Authentication
- Requires valid NextAuth session
- Role-based access control (admin/instructor only)

### File Security
- File type validation
- File size limits
- Malicious filename detection
- Secure file storage via Cloudinary

### Error Handling
- Comprehensive error messages
- No sensitive information exposure
- Proper HTTP status codes

## Usage Examples

### JavaScript/TypeScript

```typescript
// Upload PDF
const uploadPDF = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'lms/course-materials');
  formData.append('description', 'Course syllabus');

  const response = await fetch('/api/upload/pdf', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  return result;
};

// Delete PDF
const deletePDF = async (publicId: string) => {
  const response = await fetch(`/api/upload/pdf?publicId=${publicId}`, {
    method: 'DELETE',
  });

  const result = await response.json();
  return result;
};

// Get PDF info
const getPDFInfo = async (publicId: string) => {
  const response = await fetch(`/api/upload/pdf?publicId=${publicId}`);
  const result = await response.json();
  return result;
};
```

### React Hook

```typescript
import { usePDFUpload } from '@/hooks/usePDFUpload';

const MyComponent = () => {
  const { uploadPDF, isUploading, uploadProgress, error } = usePDFUpload();

  const handleUpload = async (file: File) => {
    const result = await uploadPDF(file, {
      folder: 'lms/documents',
      description: 'Course material',
      onProgress: (progress) => console.log(`Upload: ${progress}%`),
      onSuccess: (result) => console.log('Upload successful:', result),
      onError: (error) => console.error('Upload failed:', error),
    });
  };

  return (
    <div>
      {isUploading && <div>Uploading... {uploadProgress}%</div>}
      {error && <div>Error: {error}</div>}
      {/* Upload UI */}
    </div>
  );
};
```

### React Component

```typescript
import PDFUpload from '@/components/PDFUpload';

const MyComponent = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  return (
    <PDFUpload
      currentPDF={pdfUrl}
      onPDFChange={(url, publicId) => {
        setPdfUrl(url);
        console.log('PDF uploaded:', { url, publicId });
      }}
      onPDFRemove={() => {
        setPdfUrl(null);
        console.log('PDF removed');
      }}
      onError={(error) => console.error('Upload error:', error)}
      folder="lms/course-materials"
      description="Course syllabus"
      size="md"
      maxSize={10}
    />
  );
};
```

## Environment Variables

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid file, missing parameters, or validation error |
| 401 | Unauthorized | Authentication required or insufficient permissions |
| 500 | Internal Server Error | Server error or Cloudinary API error |

## Rate Limits

- No specific rate limits implemented
- Cloudinary API limits apply
- Consider implementing rate limiting for production use

## File Storage

- Files are stored in Cloudinary
- Organized by folder structure
- Automatic file optimization
- CDN delivery for fast access
- Secure HTTPS URLs

## Best Practices

1. **File Validation**: Always validate files on the client side before upload
2. **Progress Tracking**: Use the progress callback for better UX
3. **Error Handling**: Implement proper error handling and user feedback
4. **File Cleanup**: Delete unused files to manage storage costs
5. **Security**: Validate file types and sizes on both client and server
6. **Performance**: Use appropriate file sizes and compression

## Troubleshooting

### Common Issues

1. **File too large**: Reduce file size or increase limit
2. **Invalid file type**: Ensure file is a valid PDF
3. **Upload timeout**: Check network connection and file size
4. **Permission denied**: Verify user has admin/instructor role
5. **Cloudinary error**: Check API credentials and quotas

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will provide detailed error information in the console.
