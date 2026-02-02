#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the User schema (matching the one in your models)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  phone: { type: String, trim: true, sparse: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'instructor', 'student'], 
    default: 'instructor' 
  },
  isActive: { type: Boolean, default: true },
  avatar: { type: String },
  enrollmentDate: { type: Date, default: Date.now },
  parentPhone: { type: String },
  // Teacher-specific fields
  specialization: { type: String },
  bio: { type: String },
  experience: { type: Number, default: 0 },
  education: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createTeacherUser() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Default values
  let phone = '01700000001';
  let password = 'teacher123';
  let firstName = 'John';
  let lastName = 'Doe';
  let specialization = 'Mathematics';
  let experience = 5;
  let education = 'Master\'s in Education';
  let bio = 'Experienced educator passionate about teaching and student success.';

  // Parse arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--phone':
        phone = value;
        break;
      case '--password':
        password = value;
        break;
      case '--firstName':
        firstName = value;
        break;
      case '--lastName':
        lastName = value;
        break;
      case '--specialization':
        specialization = value;
        break;
      case '--experience':
        experience = parseInt(value) || 0;
        break;
      case '--education':
        education = value;
        break;
      case '--bio':
        bio = value;
        break;
      case '--help':
        console.log(`
Usage: bun run create-teacher [options]

Options:
  --phone <phone>           Teacher phone number (default: 01700000001)
  --password <password>     Teacher password (default: teacher123)
  --firstName <firstName>   Teacher first name (default: John)
  --lastName <lastName>     Teacher last name (default: Doe)
  --specialization <spec>   Teaching specialization (default: Mathematics)
  --experience <years>      Years of experience (default: 5)
  --education <education>   Education background (default: Master's in Education)
  --bio <bio>              Teacher bio (default: Experienced educator...)
  --help                    Show this help message

Examples:
  bun run create-teacher --phone "01712345678" --firstName "Jane" --lastName "Smith"
  bun run create-teacher --phone "01798765432" --specialization "Science" --experience 10 --education "PhD in Physics"
        `);
        process.exit(0);
        break;
    }
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://codezyneRifat:txaIcDXdhb@cluster0.lyutjz9.mongodb.net/hhhjhjhjhjjh?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Check if user already exists by phone
    const existingUserByPhone = await User.findOne({ phone: cleanPhone });
    if (existingUserByPhone) {
      console.log(`❌ Teacher with phone ${cleanPhone} already exists!`);
      console.log('User details:', {
        id: existingUserByPhone._id,
        name: `${existingUserByPhone.firstName} ${existingUserByPhone.lastName}`,
        role: existingUserByPhone.role,
        isActive: existingUserByPhone.isActive
      });
      process.exit(1);
    }

    // Auto-generate email from phone number
    let generatedEmail = `${cleanPhone}@teacher.local`;

    // Check if generated email already exists (unlikely but possible)
    const existingUserByEmail = await User.findOne({ email: generatedEmail.toLowerCase() });
    if (existingUserByEmail) {
      // If email exists, append timestamp
      const timestamp = Date.now();
      generatedEmail = `${cleanPhone}_${timestamp}@teacher.local`;
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the teacher user
    const teacherUser = new User({
      email: generatedEmail.toLowerCase(),
      phone: cleanPhone,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'instructor',
      isActive: true,
      specialization,
      bio,
      experience,
      education,
      enrollmentDate: new Date()
    });

    // Save the user
    await teacherUser.save();

    console.log('✅ Teacher user created successfully!');
    console.log('Teacher details:', {
      id: teacherUser._id,
      phone: teacherUser.phone,
      email: teacherUser.email,
      name: `${teacherUser.firstName} ${teacherUser.lastName}`,
      role: teacherUser.role,
      specialization: teacherUser.specialization,
      experience: `${teacherUser.experience} years`,
      education: teacherUser.education,
      isActive: teacherUser.isActive,
      enrollmentDate: teacherUser.enrollmentDate
    });

    console.log('\n🔐 Login credentials:');
    console.log(`Phone: ${cleanPhone}`);
    console.log(`Email (auto-generated): ${generatedEmail}`);
    console.log(`Password: ${password}`);
    console.log('\n📝 Note: Please change the password after first login for security.');

  } catch (error) {
    console.error('Error creating teacher user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

createTeacherUser();
