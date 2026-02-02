import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadVideo } from '@/lib/cloudinary';

// POST /api/course-reviews/upload - Upload video review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only students can upload video reviews
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'Only students can upload video reviews' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { success: false, error: 'File must be a video' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Video file size must be less than 100MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    console.log('Uploading video to Cloudinary:', {
      filename: file.name,
      size: file.size,
      type: file.type,
      uploadedBy: session.user.email || session.user.id
    });

    const result = await uploadVideo(buffer, {
      folder: 'lms/course-reviews',
      description: 'Course review video',
      originalName: file.name,
      uploadedBy: session.user.email || session.user.id,
      uploadedAt: new Date().toISOString()
    });

    if (!result.success) {
      console.error('Cloudinary upload failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to upload video' },
        { status: 500 }
      );
    }

    const videoUrl = result.secureUrl || result.url;
    const videoThumbnail = result.thumbnailUrl || null;

    console.log('Video uploaded successfully to Cloudinary:', {
      publicId: result.publicId,
      videoUrl: videoUrl,
      secureUrl: result.secureUrl,
      url: result.url,
      thumbnailUrl: videoThumbnail
    });

    return NextResponse.json({
      success: true,
      data: {
        videoUrl: videoUrl,
        publicId: result.publicId,
        videoThumbnail: videoThumbnail,
        filename: file.name,
        size: file.size,
        type: file.type
      },
      message: 'Video uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

