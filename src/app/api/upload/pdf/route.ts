import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadPDF, deletePDF, getPDFInfo } from '@/lib/cloudinary';

// POST /api/upload/pdf - Upload PDF file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['admin', 'instructor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and instructors can upload PDFs.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'lms/documents';
    const description = formData.get('description') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Validate file name
    const fileName = file.name;
    if (!fileName || fileName.length > 255) {
      return NextResponse.json(
        { error: 'Invalid file name' },
        { status: 400 }
      );
    }

    // Check for malicious file names
    const dangerousPatterns = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousPatterns.test(fileName)) {
      return NextResponse.json(
        { error: 'Invalid characters in file name' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await uploadPDF(buffer, {
      folder,
      description,
      originalName: fileName,
      uploadedBy: session.user.email,
      uploadedAt: new Date().toISOString()
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to upload PDF' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'PDF uploaded successfully',
      pdf: {
        publicId: result.publicId,
        url: result.url,
        secureUrl: result.secureUrl,
        fileName: fileName,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: session.user.email,
        folder: folder,
        description: description
      }
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/upload/pdf - Delete PDF file
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['admin', 'instructor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and instructors can delete PDFs.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    // Delete from Cloudinary
    const result = await deletePDF(publicId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete PDF' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'PDF deleted successfully'
    });

  } catch (error) {
    console.error('PDF delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/upload/pdf - Get PDF information
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    // Get PDF information from Cloudinary
    const result = await getPDFInfo(publicId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to get PDF information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pdf: result.pdf
    });

  } catch (error) {
    console.error('PDF info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
