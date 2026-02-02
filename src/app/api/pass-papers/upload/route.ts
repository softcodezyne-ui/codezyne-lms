import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { uploadPDF } from '@/lib/cloudinary';
import { PassPaper } from '@/models/PassPaper';
import { PassPaperUploadResult } from '@/types/pass-paper';

// POST /api/pass-papers/upload - Upload pass paper files
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['admin', 'instructor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and instructors can upload pass papers.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // Get pass paper data
    const sessionName = formData.get('sessionName') as string;
    const year = parseInt(formData.get('year') as string);
    const subject = formData.get('subject') as string;
    const examType = formData.get('examType') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;
    const isActive = formData.get('isActive') === 'true';

    // Get files
    const questionPaperFile = formData.get('questionPaper') as File;
    const marksPdfFile = formData.get('marksPdf') as File;
    const workSolutionFile = formData.get('workSolution') as File;

    // Validation
    if (!sessionName || !year || !subject || !examType) {
      return NextResponse.json(
        { error: 'Session name, year, subject, and exam type are required' },
        { status: 400 }
      );
    }

    if (!questionPaperFile && !marksPdfFile && !workSolutionFile) {
      return NextResponse.json(
        { error: 'At least one file must be uploaded' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for duplicate pass paper
    const existingPaper = await PassPaper.findOne({
      sessionName: sessionName.trim(),
      year,
      subject: subject.trim(),
      examType: examType.trim()
    });

    if (existingPaper) {
      return NextResponse.json(
        { error: 'A pass paper with this session, year, subject, and exam type already exists' },
        { status: 409 }
      );
    }

    const uploadResults: PassPaperUploadResult['uploadResults'] = {};
    let questionPaperUrl: string | undefined;
    let marksPdfUrl: string | undefined;
    let workSolutionUrl: string | undefined;

    // Upload question paper
    if (questionPaperFile) {
      try {
        const bytes = await questionPaperFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const result = await uploadPDF(buffer, {
          folder: 'lms/pass-papers/question-papers',
          description: `Question paper - ${sessionName} ${year} ${subject}`,
          originalName: questionPaperFile.name,
          uploadedBy: session.user.email
        });

        if (result.success) {
          questionPaperUrl = result.secureUrl;
          uploadResults.questionPaper = {
            success: true,
            url: result.secureUrl
          };
        } else {
          uploadResults.questionPaper = {
            success: false,
            error: result.error || 'Upload failed'
          };
        }
      } catch (error) {
        uploadResults.questionPaper = {
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        };
      }
    }

    // Upload marks PDF
    if (marksPdfFile) {
      try {
        const bytes = await marksPdfFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const result = await uploadPDF(buffer, {
          folder: 'lms/pass-papers/marks-pdfs',
          description: `Marks PDF - ${sessionName} ${year} ${subject}`,
          originalName: marksPdfFile.name,
          uploadedBy: session.user.email
        });

        if (result.success) {
          marksPdfUrl = result.secureUrl;
          uploadResults.marksPdf = {
            success: true,
            url: result.secureUrl
          };
        } else {
          uploadResults.marksPdf = {
            success: false,
            error: result.error || 'Upload failed'
          };
        }
      } catch (error) {
        uploadResults.marksPdf = {
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        };
      }
    }

    // Upload work solution
    if (workSolutionFile) {
      try {
        const bytes = await workSolutionFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const result = await uploadPDF(buffer, {
          folder: 'lms/pass-papers/work-solutions',
          description: `Work solution - ${sessionName} ${year} ${subject}`,
          originalName: workSolutionFile.name,
          uploadedBy: session.user.email
        });

        if (result.success) {
          workSolutionUrl = result.secureUrl;
          uploadResults.workSolution = {
            success: true,
            url: result.secureUrl
          };
        } else {
          uploadResults.workSolution = {
            success: false,
            error: result.error || 'Upload failed'
          };
        }
      } catch (error) {
        uploadResults.workSolution = {
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        };
      }
    }

    // Check if at least one upload was successful
    if (!questionPaperUrl && !marksPdfUrl && !workSolutionUrl) {
      return NextResponse.json({
        success: false,
        error: 'All file uploads failed',
        uploadResults
      } as PassPaperUploadResult, { status: 400 });
    }

    // Create pass paper record
    const passPaper = new PassPaper({
      sessionName: sessionName.trim(),
      year,
      subject: subject.trim(),
      examType: examType.trim(),
      questionPaperUrl,
      marksPdfUrl,
      workSolutionUrl,
      description: description?.trim() || undefined,
      tags: tags?.trim() || undefined,
      isActive,
      uploadedBy: session.user.email
    });

    await passPaper.save();

    return NextResponse.json({
      success: true,
      message: 'Pass paper uploaded successfully',
      passPaper: passPaper.toObject(),
      uploadResults
    } as PassPaperUploadResult, { status: 201 });

  } catch (error) {
    console.error('Upload pass paper error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
