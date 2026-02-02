import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';

// POST /api/course-reviews/upload-thumbnail - Upload thumbnail image
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only students can upload thumbnails
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'Only students can upload thumbnails' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary with thumbnail-specific folder
    const thumbnailId = `thumbnail_${session.user.id}_${Date.now()}`;
    
    return new Promise<NextResponse>((resolve) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'lms/course-reviews/thumbnails',
          public_id: thumbnailId,
          transformation: [
            { width: 1280, height: 720, crop: 'fill', quality: 'auto', fetch_format: 'auto' }
          ],
          resource_type: 'image'
        },
        (error: any, result: any) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            resolve(NextResponse.json(
              { success: false, error: 'Failed to upload thumbnail' },
              { status: 500 }
            ));
          } else if (result) {
            resolve(NextResponse.json({
              success: true,
              data: {
                url: result.secure_url,
                publicId: result.public_id,
                thumbnailUrl: result.secure_url
              },
              message: 'Thumbnail uploaded successfully'
            }));
          } else {
            resolve(NextResponse.json(
              { success: false, error: 'Upload failed' },
              { status: 500 }
            ));
          }
        }
      ).end(buffer);
    });

  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload thumbnail' },
      { status: 500 }
    );
  }
}

