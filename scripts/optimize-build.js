#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build optimization...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('.next')) {
    execSync('rm -rf .next', { stdio: 'inherit' });
  }
  if (fs.existsSync('tsconfig.tsbuildinfo')) {
    execSync('rm -f tsconfig.tsbuildinfo', { stdio: 'inherit' });
  }
  console.log('✅ Cleaned previous builds');
} catch (error) {
  console.warn('⚠️  Warning: Could not clean previous builds:', error.message);
}

// Check for TypeScript errors
console.log('\n🔍 Checking TypeScript errors...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ No TypeScript errors found');
} catch (error) {
  console.error('❌ TypeScript errors found. Please fix them before building.');
  process.exit(1);
}

// Run linting
console.log('\n🔍 Running ESLint...');
try {
  execSync('npx next lint', { stdio: 'inherit' });
  console.log('✅ No linting errors found');
} catch (error) {
  console.warn('⚠️  Warning: Linting errors found. Consider fixing them for better code quality.');
}

// Build the project
console.log('\n🏗️  Building the project...');
const startTime = Date.now();

try {
  execSync('npm run build', { stdio: 'inherit' });
  const endTime = Date.now();
  const buildTime = (endTime - startTime) / 1000;
  
  console.log(`\n✅ Build completed successfully in ${buildTime.toFixed(2)} seconds`);
  
  // Analyze build size
  console.log('\n📊 Build analysis:');
  if (fs.existsSync('.next/static/chunks')) {
    const chunks = fs.readdirSync('.next/static/chunks');
    console.log(`   - Generated ${chunks.length} chunk files`);
  }
  
  // Check for large files
  console.log('\n🔍 Checking for large files in build...');
  try {
    const result = execSync('find .next -name "*.js" -size +500k -exec ls -lh {} \\;', { encoding: 'utf8' });
    if (result.trim()) {
      console.log('⚠️  Large files found:');
      console.log(result);
    } else {
      console.log('✅ No unusually large files found');
    }
  } catch (error) {
    // No large files found, which is good
    console.log('✅ No unusually large files found');
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Build optimization complete!');
console.log('\n💡 Tips for faster builds:');
console.log('   - Use `npm run build:fast` to skip linting during development');
console.log('   - Use `npm run build:analyze` to analyze bundle size');
console.log('   - Consider using `npm run dev` with Turbopack for faster development');
