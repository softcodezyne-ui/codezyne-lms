#!/usr/bin/env node

const mongoose = require('mongoose');

// User schema (matching the one in your models)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  phone: { type: String, trim: true, sparse: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'instructor', 'student'], default: 'student' },
  isActive: { type: Boolean, default: true },
  avatar: { type: String, default: '' },
  enrollmentDate: { type: Date },
  parentPhone: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function migrateUsersToPhone() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://codezyneRifat:txaIcDXdhb@cluster0.lyutjz9.mongodb.net/hhhjhjhjhjjh?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all users without phone numbers
    const usersWithoutPhone = await User.find({ 
      $or: [
        { phone: { $exists: false } },
        { phone: null },
        { phone: '' }
      ]
    });

    console.log(`\n📊 Found ${usersWithoutPhone.length} users without phone numbers`);

    if (usersWithoutPhone.length === 0) {
      console.log('✅ All users already have phone numbers. No migration needed.');
      await mongoose.disconnect();
      process.exit(0);
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each user
    for (const user of usersWithoutPhone) {
      try {
        // Try to extract phone from email if it contains numbers
        let phoneNumber = null;
        
        // Check if email contains phone-like pattern (e.g., "01712345678@student.local" or "phone@domain.com")
        const emailMatch = user.email.match(/(\d{10,15})/);
        if (emailMatch) {
          phoneNumber = emailMatch[1];
          console.log(`📱 Extracted phone from email for ${user.email}: ${phoneNumber}`);
        } else {
          // Generate phone number from user ID or email hash
          // Use a pattern: 017 + last 8 digits of user ID hash
          const userIdStr = user._id.toString();
          const hash = userIdStr.split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
          }, 0);
          
          // Generate 8-digit number from hash
          const digits = Math.abs(hash).toString().padStart(8, '0').slice(-8);
          phoneNumber = `017${digits}`;
          
          // Ensure uniqueness
          let uniquePhone = phoneNumber;
          let counter = 0;
          while (await User.findOne({ phone: uniquePhone })) {
            counter++;
            uniquePhone = `017${(parseInt(digits) + counter).toString().padStart(8, '0').slice(-8)}`;
          }
          phoneNumber = uniquePhone;
          
          console.log(`🔢 Generated phone for ${user.email}: ${phoneNumber}`);
        }

        // Clean phone number
        const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

        // Check if phone already exists
        const existingUser = await User.findOne({ phone: cleanPhone });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
          console.log(`⚠️  Phone ${cleanPhone} already exists for another user. Skipping ${user.email}`);
          skipped++;
          continue;
        }

        // Update user with phone number
        user.phone = cleanPhone;
        await user.save();
        
        migrated++;
        console.log(`✅ Migrated: ${user.email} -> ${cleanPhone} (${user.role})`);

      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${usersWithoutPhone.length}`);

    // Verify migration
    const usersStillWithoutPhone = await User.countDocuments({ 
      $or: [
        { phone: { $exists: false } },
        { phone: null },
        { phone: '' }
      ]
    });

    if (usersStillWithoutPhone === 0) {
      console.log('\n✅ Migration completed successfully! All users now have phone numbers.');
    } else {
      console.log(`\n⚠️  Warning: ${usersStillWithoutPhone} users still don't have phone numbers.`);
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
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

// Run migration
console.log('🚀 Starting user migration to phone-based authentication...\n');
migrateUsersToPhone();

