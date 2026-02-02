import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const enrollment = await Enrollment.findById(id)
      .populate('student', 'firstName lastName email avatar')
      .populate('course', 'title category')
      .lean();

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Verify the course belongs to this instructor
    const course = await Course.findById((enrollment as any).course);
    if (!course || (course as any).createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        ...enrollment,
        studentInfo: (enrollment as any).student,
        courseInfo: (enrollment as any).course,
        student: (enrollment as any).student?._id,
        course: (enrollment as any).course?._id
      }
    });

  } catch (error) {
    console.error('Error fetching instructor enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const enrollment = await Enrollment.findById(id);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Verify the course belongs to this instructor
    const course = await Course.findById((enrollment as any).course);
    if (!course || (course as any).createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { status, progress, paymentStatus, paymentAmount, paymentMethod, paymentId, notes } = body;

    // Update enrollment
    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      id,
      {
        ...(status && { status }),
        ...(progress !== undefined && { progress }),
        ...(paymentStatus && { paymentStatus }),
        ...(paymentAmount !== undefined && { paymentAmount }),
        ...(paymentMethod && { paymentMethod }),
        ...(paymentId && { paymentId }),
        ...(notes && { notes }),
        updatedAt: new Date()
      },
      { new: true }
    )
      .populate('student', 'firstName lastName email avatar')
      .populate('course', 'title category');

    return NextResponse.json({
      data: {
        ...updatedEnrollment.toObject(),
        studentInfo: (updatedEnrollment as any).student,
        courseInfo: (updatedEnrollment as any).course,
        student: (updatedEnrollment as any).student?._id,
        course: (updatedEnrollment as any).course?._id
      }
    });

  } catch (error) {
    console.error('Error updating instructor enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to update enrollment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const enrollment = await Enrollment.findById(id);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Verify the course belongs to this instructor
    const course = await Course.findById((enrollment as any).course);
    if (!course || (course as any).createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await Enrollment.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Enrollment deleted successfully' });

  } catch (error) {
    console.error('Error deleting instructor enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to delete enrollment' },
      { status: 500 }
    );
  }
}
