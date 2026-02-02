const mongoose = require('mongoose');

// Set up environment variables
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://codezyneRifat:txaIcDXdhb@cluster0.lyutjz9.mongodb.net/hhhjhjhjhjjh?retryWrites=true&w=majority&appName=Cluster0';

// Import models
const UserProgress = require('../src/models/UserProgress').default;
const Enrollment = require('../src/models/Enrollment').default;
const Lesson = require('../src/models/Lesson').default;

async function fixEnrollmentProgress() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all enrollments
    const enrollments = await Enrollment.find({}).populate('student course');
    console.log(`Found ${enrollments.length} enrollments to check`);

    let fixedCount = 0;
    let totalProcessed = 0;

    for (const enrollment of enrollments) {
      const studentId = enrollment.student._id;
      const courseId = enrollment.course._id;

      // Get total lessons in course
      const totalLessons = await Lesson.countDocuments({ 
        course: courseId, 
        isPublished: true 
      });

      if (totalLessons === 0) {
        console.log(`Course ${enrollment.course.title} has no lessons, skipping`);
        continue;
      }

      // Get completed lessons for this student in this course
      const completedLessons = await UserProgress.countDocuments({
        user: studentId,
        course: courseId,
        isCompleted: true,
      });

      // Calculate correct progress percentage
      const correctProgressPercentage = Math.round((completedLessons / totalLessons) * 100);
      const isCompleted = completedLessons === totalLessons && totalLessons > 0;

      // Check if enrollment progress needs updating
      if (enrollment.progress !== correctProgressPercentage || 
          (isCompleted && enrollment.status !== 'completed') ||
          (!isCompleted && enrollment.status === 'completed')) {
        
        console.log(`Fixing enrollment for student ${enrollment.student.firstName} ${enrollment.student.lastName} in course ${enrollment.course.title}`);
        console.log(`  Current progress: ${enrollment.progress}%, Correct progress: ${correctProgressPercentage}%`);
        console.log(`  Current status: ${enrollment.status}, Should be: ${isCompleted ? 'completed' : 'active'}`);

        // Update enrollment
        await Enrollment.findByIdAndUpdate(enrollment._id, {
          progress: correctProgressPercentage,
          status: isCompleted ? 'completed' : 'active',
          lastAccessedAt: new Date(),
          ...(isCompleted && { completedAt: new Date() })
        });

        fixedCount++;
        console.log(`  ✅ Fixed enrollment progress`);
      }

      totalProcessed++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Total enrollments processed: ${totalProcessed}`);
    console.log(`  Enrollments fixed: ${fixedCount}`);
    console.log(`  Enrollments already correct: ${totalProcessed - fixedCount}`);

  } catch (error) {
    console.error('Error fixing enrollment progress:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixEnrollmentProgress();
