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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://codezyneRifat:txaIcDXdhb@cluster0.lyutjz9.mongodb.net/hhhjhjhjhjjh?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get command line arguments
    const args = process.argv.slice(2);
    
    // Default values
    let phone = '01700000000';
    let password = 'admin123';
    let firstName = 'Admin';
    let lastName = 'User';

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
        case '--help':
          console.log(`
Usage: bun run create-admin [options]

Options:
  --phone <phone>        Admin phone number (default: 01700000000)
  --password <password>  Admin password (default: admin123)
  --firstName <name>    Admin first name (default: Admin)
  --lastName <name>      Admin last name (default: User)
  --help                 Show this help message

Examples:
  bun run create-admin
  bun run create-admin --phone 01712345678 --firstName John --lastName Admin
          `);
          process.exit(0);
      }
    }

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Check if admin user already exists by phone
    const existingAdminByPhone = await User.findOne({ phone: cleanPhone });
    if (existingAdminByPhone) {
      console.log(`Admin user with phone ${cleanPhone} already exists!`);
      console.log(`Phone: ${cleanPhone}`);
      console.log(`Password: ${password}`);
      process.exit(0);
    }

    // Auto-generate email from phone number
    let generatedEmail = `${cleanPhone}@admin.local`;

    // Check if generated email already exists (unlikely but possible)
    const existingAdminByEmail = await User.findOne({ email: generatedEmail.toLowerCase() });
    if (existingAdminByEmail) {
      // If email exists, append timestamp
      const timestamp = Date.now();
      generatedEmail = `${cleanPhone}_${timestamp}@admin.local`;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const adminUser = new User({
      email: generatedEmail.toLowerCase(),
      phone: cleanPhone,
      password: hashedPassword,
      firstName: firstName,
      lastName: lastName,
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log(`Phone: ${cleanPhone}`);
    console.log(`Email (auto-generated): ${generatedEmail}`);
    console.log(`Password: ${password}`);
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Role: admin`);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdminUser();
