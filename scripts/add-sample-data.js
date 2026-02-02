const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample data
const sampleUsers = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'student',
    password: '$2a$10$example.hash',
    createdAt: new Date()
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'student',
    password: '$2a$10$example.hash',
    createdAt: new Date()
  },
  {
    name: 'Mike Johnson',
    email: 'mike@example.com',
    role: 'student',
    password: '$2a$10$example.hash',
    createdAt: new Date()
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    role: 'teacher',
    password: '$2a$10$example.hash',
    createdAt: new Date()
  },
  {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    password: '$2a$10$example.hash',
    createdAt: new Date()
  }
];

const sampleCourses = [
  {
    title: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript programming',
    price: 99,
    status: 'published',
    instructor: null, // Will be set to teacher ID
    createdAt: new Date()
  },
  {
    title: 'React Development',
    description: 'Master React.js for modern web development',
    price: 149,
    status: 'published',
    instructor: null, // Will be set to teacher ID
    createdAt: new Date()
  },
  {
    title: 'Node.js Backend',
    description: 'Build scalable backend applications with Node.js',
    price: 199,
    status: 'published',
    instructor: null, // Will be set to teacher ID
    createdAt: new Date()
  }
];

const sampleEnrollments = [
  {
    student: null, // Will be set to student ID
    course: null, // Will be set to course ID
    enrolledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    status: 'active',
    progress: 75,
    paymentStatus: 'paid',
    paymentAmount: 99
  },
  {
    student: null, // Will be set to student ID
    course: null, // Will be set to course ID
    enrolledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: 'active',
    progress: 45,
    paymentStatus: 'paid',
    paymentAmount: 149
  },
  {
    student: null, // Will be set to student ID
    course: null, // Will be set to course ID
    enrolledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    status: 'active',
    progress: 20,
    paymentStatus: 'paid',
    paymentAmount: 199
  }
];

const samplePayments = [
  {
    amount: 99,
    status: 'completed',
    paymentMethod: 'card',
    transactionId: 'TXN001',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    amount: 149,
    status: 'completed',
    paymentMethod: 'card',
    transactionId: 'TXN002',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    amount: 199,
    status: 'completed',
    paymentMethod: 'card',
    transactionId: 'TXN003',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  }
];

async function addSampleData() {
  try {
    await connectDB();
    
    // Import models
    const User = require('../src/models/User').default;
    const Course = require('../src/models/Course').default;
    const Enrollment = require('../src/models/Enrollment').default;
    const Payment = require('../src/models/Payment').default;
    const CourseProgress = require('../src/models/CourseProgress').default;
    
    console.log('📝 Adding sample users...');
    const users = await User.insertMany(sampleUsers);
    console.log(`✅ Added ${users.length} users`);
    
    // Get teacher and students
    const teacher = users.find(u => u.role === 'teacher');
    const students = users.filter(u => u.role === 'student');
    
    console.log('📚 Adding sample courses...');
    const courses = await Course.insertMany(
      sampleCourses.map(course => ({
        ...course,
        instructor: teacher._id
      }))
    );
    console.log(`✅ Added ${courses.length} courses`);
    
    console.log('💳 Adding sample payments...');
    const payments = await Payment.insertMany(samplePayments);
    console.log(`✅ Added ${payments.length} payments`);
    
    console.log('📖 Adding sample enrollments...');
    const enrollments = await Enrollment.insertMany([
      {
        ...sampleEnrollments[0],
        student: students[0]._id,
        course: courses[0]._id
      },
      {
        ...sampleEnrollments[1],
        student: students[1]._id,
        course: courses[1]._id
      },
      {
        ...sampleEnrollments[2],
        student: students[2]._id,
        course: courses[2]._id
      }
    ]);
    console.log(`✅ Added ${enrollments.length} enrollments`);
    
    console.log('📊 Adding sample course progress...');
    const courseProgresses = await CourseProgress.insertMany([
      {
        user: students[0]._id,
        course: courses[0]._id,
        isCompleted: false,
        progressPercentage: 75,
        totalLessons: 10,
        completedLessons: 7,
        totalTimeSpent: 120, // 2 hours
        lastAccessedAt: new Date(),
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        user: students[1]._id,
        course: courses[1]._id,
        isCompleted: false,
        progressPercentage: 45,
        totalLessons: 12,
        completedLessons: 5,
        totalTimeSpent: 90, // 1.5 hours
        lastAccessedAt: new Date(),
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        user: students[2]._id,
        course: courses[2]._id,
        isCompleted: false,
        progressPercentage: 20,
        totalLessons: 15,
        completedLessons: 3,
        totalTimeSpent: 45, // 45 minutes
        lastAccessedAt: new Date(),
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ]);
    console.log(`✅ Added ${courseProgresses.length} course progress records`);
    
    console.log('\n🎉 Sample data added successfully!');
    console.log('📊 Dashboard should now show:');
    console.log(`  - ${users.length} users (${students.length} students, 1 teacher, 1 admin)`);
    console.log(`  - ${courses.length} courses`);
    console.log(`  - ${enrollments.length} enrollments`);
    console.log(`  - ${payments.length} payments`);
    console.log(`  - ${courseProgresses.length} progress records`);
    console.log('\n💡 You can now test the dashboard at: http://localhost:3000/admin/dashboard');
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addSampleData();
