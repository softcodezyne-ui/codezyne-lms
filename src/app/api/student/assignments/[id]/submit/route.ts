import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import Enrollment from '@/models/Enrollment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CreateSubmissionRequest } from '@/types/assignment';
import cloudinary from '@/lib/cloudinary';
import { Readable } from 'stream';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // The endpoint supports both JSON and multipart/form-data
    let body: any = {} as CreateSubmissionRequest;
    let uploadedFiles: Array<{ name: string; url: string; type: string; size: number }> = [];

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const content = (form.get('content') as string) || '';
      const answersRaw = (form.get('answers') as string) || '';
      const timeSpent = (form.get('timeSpent') as string) || '';
      body.content = content;
      if (answersRaw) {
        try { body.answers = JSON.parse(answersRaw); } catch {}
      }
      if (timeSpent) body.timeSpent = parseInt(timeSpent, 10) || undefined;

      // Multiple files: input name "files" can be one or many
      const files = form.getAll('files');
      for (const f of files) {
        try {
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
            uploadedFiles.push({
              name: file.name,
              url: result.secure_url,
              type: file.type || 'application/octet-stream',
              size: file.size || 0,
            });
          }
        } catch (e) {
          // ignore single file failure, continue other files
        }
      }
      if (uploadedFiles.length > 0) body.files = uploadedFiles;
    } else {
      // JSON
      body = await request.json();
    }

    // Check if assignment exists
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student: session.user.id,
      course: assignment.course,
      status: 'active'
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in this course' },
        { status: 403 }
      );
    }

    // Check if assignment is active (required for submission)
    if (!assignment.isActive) {
      return NextResponse.json(
        { error: 'Assignment is not available for submission' },
        { status: 400 }
      );
    }

    // Check if assignment is within submission period
    const now = new Date();
    if (assignment.startDate && now < assignment.startDate) {
      return NextResponse.json(
        { error: 'Assignment submission period has not started yet' },
        { status: 400 }
      );
    }

    if (assignment.dueDate && now > assignment.dueDate && !assignment.allowLateSubmission) {
      return NextResponse.json(
        { error: 'Assignment submission deadline has passed' },
        { status: 400 }
      );
    }

    // Check if student has reached max attempts
    const existingSubmissions = await AssignmentSubmission.countDocuments({
      assignment: id,
      student: session.user.id
    });

    if (existingSubmissions >= assignment.maxAttempts) {
      return NextResponse.json(
        { error: 'Maximum number of attempts reached' },
        { status: 400 }
      );
    }

    // Check if assignment is late
    const isLate = assignment.dueDate && now > assignment.dueDate;

    // Validate file uploads if required
    if (assignment.type === 'file_upload') {
      if (!body.files || body.files.length === 0) {
        return NextResponse.json(
          { error: 'File upload is required for this assignment' },
          { status: 400 }
        );
      }

      // Validate file types
      if (assignment.allowedFileTypes && assignment.allowedFileTypes.length > 0) {
        const invalidFiles = body.files.filter((file: { name: string }) => {
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          return !assignment.allowedFileTypes!.includes(`.${fileExtension}`);
        });

        if (invalidFiles.length > 0) {
          return NextResponse.json(
            { error: `Invalid file types. Allowed types: ${assignment.allowedFileTypes.join(', ')}` },
            { status: 400 }
          );
        }
      }

      // Validate file sizes
      if (assignment.maxFileSize) {
        const oversizedFiles = body.files.filter((file: { size: number }) => 
          file.size > assignment.maxFileSize! * 1024 * 1024
        );

        if (oversizedFiles.length > 0) {
          return NextResponse.json(
            { error: `File size exceeds maximum allowed size of ${assignment.maxFileSize}MB` },
            { status: 400 }
          );
        }
      }
    }

    // Validate content for essay-type assignments
    if (assignment.type === 'essay' && (!body.content || body.content.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Content is required for essay assignments' },
        { status: 400 }
      );
    }

    // Create submission
    const submission = new AssignmentSubmission({
      assignment: id,
      student: session.user.id,
      content: body.content,
      files: body.files,
      answers: body.answers,
      status: 'submitted',
      submittedAt: new Date(),
      maxScore: assignment.totalMarks,
      isLate,
      attemptNumber: existingSubmissions + 1,
      timeSpent: body.timeSpent,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    });

    await submission.save();
    await submission.populate('student', 'name email');
    await submission.populate('groupMembers', 'name email');

    return NextResponse.json({
      success: true,
      data: submission,
      message: isLate ? 'Assignment submitted successfully (late submission)' : 'Assignment submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to submit assignment' },
      { status: 500 }
    );
  }
}
