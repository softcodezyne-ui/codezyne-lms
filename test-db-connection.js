const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

async function testConnection() {
  console.log('Testing database connection...');
  
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }
  
  console.log('Using URI:', uri.replace(/:([^@]+)@/, ':***@')); // Mask password for security
  
  try {
    // Connect to MongoDB
    await mongoose.connect(uri, {
      bufferCommands: false,
    });
    
    console.log('✅ Successfully connected to MongoDB');
    
    // Test a simple operation
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections in the database`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

testConnection();