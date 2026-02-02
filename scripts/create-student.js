const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// User schema (simplified version)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  phone: { type: String, trim: true, sparse: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'instructor', 'student'], default: 'student' },
  isActive: { type: Boolean, default: true },
  avatar: { type: String, default: '' },
  enrollmentDate: { type: Date, default: Date.now },
  parentPhone: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createStudentUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://codezyneRifat:txaIcDXdhb@cluster0.lyutjz9.mongodb.net/hhhjhjhjhjjh?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Get command line arguments
    const args = process.argv.slice(2);
    
    // Default values
    let phone = '01700000009';
    let password = 'student123';
    let firstName = 'John';
    let lastName = 'Doe';
    let parentPhone = '';

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--phone':
          phone = args[i + 1];
          i++;
          break;
        case '--password':
          password = args[i + 1];
          i++;
          break;
        case '--firstName':
          firstName = args[i + 1];
          i++;
          break;
        case '--lastName':
          lastName = args[i + 1];
          i++;
          break;
        case '--parentPhone':
          parentPhone = args[i + 1];
          i++;
          break;
        case '--help':
          console.log(`
Usage: bun run create-student [options]

Options:
  --phone <phone>        Student phone number (default: 01700000000)
  --password <password>  Student password (default: student123)
  --firstName <name>     Student first name (default: John)
  --lastName <name>      Student last name (default: Doe)
  --parentPhone <phone>  Parent/Guardian phone number (optional)
  --help                 Show this help message

Examples:
  bun run create-student
  bun run create-student --phone 01712345678 --firstName John --lastName Smith
  bun run create-student --phone 01798765432 --firstName Jane --lastName Doe --parentPhone +1234567890
          `);
          process.exit(0);
      }
    }

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Check if student user already exists by phone
    const existingStudentByPhone = await User.findOne({ phone: cleanPhone });
    if (existingStudentByPhone) {
      console.log(`Student user with phone ${cleanPhone} already exists!`);
      console.log(`Phone: ${cleanPhone}`);
      console.log(`Password: ${password}`);
      process.exit(0);
    }

    // Auto-generate email from phone number
    let generatedEmail = `${cleanPhone}@student.local`;

    // Check if generated email already exists (unlikely but possible)
    const existingStudentByEmail = await User.findOne({ email: generatedEmail.toLowerCase() });
    if (existingStudentByEmail) {
      // If email exists, append timestamp
      const timestamp = Date.now();
      generatedEmail = `${cleanPhone}_${timestamp}@student.local`;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create student user
    const studentUser = new User({
      email: generatedEmail.toLowerCase(),
      phone: cleanPhone,
      password: hashedPassword,
      firstName: firstName,
      lastName: lastName,
      role: 'student',
      isActive: true,
      enrollmentDate: new Date(),
      parentPhone: parentPhone || undefined
    });

    await studentUser.save();
    console.log('Student user created successfully!');
    console.log(`Phone: ${cleanPhone}`);
    console.log(`Email (auto-generated): ${generatedEmail}`);
    console.log(`Password: ${password}`);
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Role: student`);
    if (parentPhone) {
      console.log(`Parent Phone: ${parentPhone}`);
    }

  } catch (error) {
    console.error('Error creating student user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createStudentUser();
