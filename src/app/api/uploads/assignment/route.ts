import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    const form = await request.formData();
    const files = form.getAll('files');
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploaded: Array<{ name: string; url: string; type: string; size: number }> = [];

    for (const f of files) {
      // @ts-ignore - File from web std
      const file = f as File;
      if (!file || typeof file.arrayBuffer !== 'function') continue;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result: any = await new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          {
            folder: 'lms/assignments/submissions',
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
          },
          (err, res) => {
            if (err) reject(err); else resolve(res);
          }
        );
        Readable.from(buffer).pipe(upload);
      });
      if (result?.secure_url) {
        uploaded.push({
          name: file.name,
          url: result.secure_url,
          type: file.type || 'application/octet-stream',
          size: file.size || 0,
        });
      }
    }

    if (uploaded.length === 0) {
      return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
    }

    return NextResponse.json({ success: true, files: uploaded });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}


