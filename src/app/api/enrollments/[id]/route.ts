import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import CourseCategory from '@/models/CourseCategory';
import { UpdateEnrollmentRequest } from '@/types/enrollment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const enrollment = await Enrollment.findById(id)
      .populate('studentInfo', 'firstName lastName email avatar')
      .populate({
        path: 'courseInfo',
        select: 'title description thumbnailUrl price category isPaid duration rating instructor',
        populate: {
          path: 'instructor',
          select: 'firstName lastName'
        }
      })
      .lean();

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...(enrollment as any),
        _id: (enrollment as any)._id.toString(),
        student: (enrollment as any).student.toString(),
        course: (enrollment as any).course.toString(),
        enrolledAt: (enrollment as any).enrolledAt.toISOString(),
        lastAccessedAt: (enrollment as any).lastAccessedAt?.toISOString(),
        completedAt: (enrollment as any).completedAt?.toISOString(),
        droppedAt: (enrollment as any).droppedAt?.toISOString(),
        suspendedAt: (enrollment as any).suspendedAt?.toISOString(),
        createdAt: (enrollment as any).createdAt.toISOString(),
        updatedAt: (enrollment as any).updatedAt.toISOString(),
        // Map populated data to expected field names
        courseLuInfo: (enrollment as any).courseInfo,
        studentInfo: (enrollment as any).studentInfo
      }
    });

  } catch (error) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrollment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body: UpdateEnrollmentRequest = await request.json();

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Update enrollment fields
    Object.keys(body).forEach(key => {
      if (body[key as keyof UpdateEnrollmentRequest] !== undefined) {
        (enrollment as any)[key] = body[key as keyof UpdateEnrollmentRequest];
      }
    });

    await enrollment.save();

    // Populate the updated enrollment
    await enrollment.populate([
      { path: 'studentInfo', select: 'firstName lastName email avatar' },
      { path: 'courseInfo', select: 'title description thumbnailUrl price category isPaid' }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...enrollment.toObject(),
        _id: enrollment._id.toString(),
        student: enrollment.student.toString(),
        course: enrollment.course.toString(),
        enrolledAt: enrollment.enrolledAt.toISOString(),
        lastAccessedAt: enrollment.lastAccessedAt?.toISOString(),
        completedAt: enrollment.completedAt?.toISOString(),
        droppedAt: enrollment.droppedAt?.toISOString(),
        suspendedAt: enrollment.suspendedAt?.toISOString(),
        createdAt: enrollment.createdAt.toISOString(),
        updatedAt: enrollment.updatedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating enrollment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update enrollment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    await Enrollment.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Enrollment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting enrollment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete enrollment' },
      { status: 500 }
    );
  }
}
