const mongoose = require('mongoose');

// Course schema
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  thumbnailUrl: { type: String },
  isPaid: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  price: { type: Number },
  salePrice: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add virtual fields
courseSchema.virtual('finalPrice').get(function() {
  return this.salePrice || this.price || 0;
});

courseSchema.virtual('discountPercentage').get(function() {
  if (this.salePrice && this.price && this.salePrice < this.price) {
    return Math.round(((this.price - this.salePrice) / this.price) * 100);
  }
  return 0;
});

courseSchema.set('toJSON', { virtuals: true });

const Course = mongoose.model('Course', courseSchema);

// Course Category schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  color: { type: String },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CourseCategory = mongoose.model('CourseCategory', categorySchema);

async function createSampleData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eduhub');
    console.log('Connected to MongoDB');

    // Create categories
    const categories = [
      { name: 'Web Development', description: 'Learn modern web development', color: '#3B82F6', icon: '🌐' },
      { name: 'Data Science', description: 'Master data analysis and machine learning', color: '#10B981', icon: '📊' },
      { name: 'Mobile Development', description: 'Build mobile applications', color: '#8B5CF6', icon: '📱' },
      { name: 'Design', description: 'UI/UX and graphic design', color: '#F59E0B', icon: '🎨' },
      { name: 'Business', description: 'Business and entrepreneurship', color: '#EF4444', icon: '💼' }
    ];

    for (const categoryData of categories) {
      const existingCategory = await CourseCategory.findOne({ name: categoryData.name });
      if (!existingCategory) {
        const category = new CourseCategory(categoryData);
        await category.save();
        console.log(`Created category: ${categoryData.name}`);
      }
    }

    // Create sample courses
    const courses = [
      {
        title: 'Complete React Development Course',
        description: 'Learn React from scratch and build real-world applications. This comprehensive course covers everything from basic concepts to advanced patterns.',
        category: 'Web Development',
        isPaid: true,
        status: 'published',
        price: 99,
        salePrice: 79
      },
      {
        title: 'JavaScript Fundamentals',
        description: 'Master the fundamentals of JavaScript programming. Perfect for beginners who want to start their coding journey.',
        category: 'Web Development',
        isPaid: false,
        status: 'published'
      },
      {
        title: 'Python for Data Science',
        description: 'Learn Python programming for data analysis, visualization, and machine learning. Includes hands-on projects.',
        category: 'Data Science',
        isPaid: true,
        status: 'published',
        price: 149,
        salePrice: 119
      },
      {
        title: 'Mobile App Development with React Native',
        description: 'Build cross-platform mobile applications using React Native. Learn to create apps for both iOS and Android.',
        category: 'Mobile Development',
        isPaid: true,
        status: 'published',
        price: 199
      },
      {
        title: 'UI/UX Design Principles',
        description: 'Learn the fundamentals of user interface and user experience design. Create beautiful and functional designs.',
        category: 'Design',
        isPaid: false,
        status: 'published'
      },
      {
        title: 'Digital Marketing Strategy',
        description: 'Master digital marketing techniques including SEO, social media marketing, and content strategy.',
        category: 'Business',
        isPaid: true,
        status: 'published',
        price: 89,
        salePrice: 69
      },
      {
        title: 'Node.js Backend Development',
        description: 'Build scalable backend applications with Node.js. Learn Express, MongoDB, and deployment strategies.',
        category: 'Web Development',
        isPaid: true,
        status: 'published',
        price: 129
      },
      {
        title: 'Machine Learning Basics',
        description: 'Introduction to machine learning concepts and algorithms. Perfect for beginners in AI and ML.',
        category: 'Data Science',
        isPaid: false,
        status: 'published'
      }
    ];

    for (const courseData of courses) {
      const existingCourse = await Course.findOne({ title: courseData.title });
      if (!existingCourse) {
        const course = new Course(courseData);
        await course.save();
        console.log(`Created course: ${courseData.title}`);
      }
    }

    console.log('\nSample data created successfully!');
    console.log('You can now visit the home page to see the courses.');

  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createSampleData();

