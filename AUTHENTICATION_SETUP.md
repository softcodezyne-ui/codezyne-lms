# Authentication and User Management Setup

This document provides instructions for setting up the authentication and user management system in the EduHub LMS.

## Features Implemented

- **Role-based Authentication**: Three user roles (admin, instructor, student)
- **MongoDB Integration**: User data stored in MongoDB with Mongoose ODM
- **NextAuth.js**: Secure authentication with JWT sessions
- **User Management**: Admin panel for managing users and roles
- **Protected Routes**: Role-based access control for different dashboard areas
- **Registration & Login**: Complete authentication flow with form validation

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/eduhu   

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

### 2. MongoDB Setup

Make sure MongoDB is running on your system. You can use:
- Local MongoDB installation
- MongoDB Atlas (cloud)yy
- Docker: `docker run -d -p 27017:27017 --name mongodb mongo:latest`

### 3. Install Dependencies

The required dependencies are already installed, but if you need to reinstall:

```bash
bun install
```

### 4. Run the Application

```bash
bun run dev
```

## User Roles and Access

### Admin Role
- Full access to all features
- User management dashboard (`/admin/users`)
- Can create, update, and delete users
- Can change user roles and status
- Access to admin dashboard (`/admin/dashboard`)

### Instructor Role
- Access to instructor dashboard (`/instructor/dashboard`)
- Can manage courses and students (when implemented)
- Cannot access admin features

### Student Role
- Access to student dashboard (`/student/dashboard`)
- Can view courses and assignments (when implemented)
- Cannot access admin or instructor features

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints

### User Management (Admin only)
- `GET /api/users` - Get all users with pagination and filtering
- `POST /api/users` - Create new user
- `GET /api/users/[id]` - Get user by ID
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

## Database Schema

### User Model
```typescript
{
  email: string (unique, required)
  password: string (hashed, required)
  firstName: string (required)
  lastName: string (required)
  role: 'admin' | 'instructor' | 'student' (default: 'student')
  isActive: boolean (default: true)
  avatar?: string
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}
```

## Security Features

- **Password Hashing**: Using bcryptjs with 12 salt rounds
- **JWT Sessions**: Secure session management with NextAuth.js
- **Role-based Access Control**: Middleware and components for route protection
- **Input Validation**: Server-side validation for all user inputs
- **CSRF Protection**: Built-in NextAuth.js CSRF protection

## Usage Examples

### Creating a New User (Admin)
```typescript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'student'
  })
});
```

### Protecting a Route
```typescript
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div>Admin content here</div>
    </ProtectedRoute>
  );
}
```

## Testing the Authentication

1. Start the application: `bun run dev`
2. Navigate to `http://localhost:3000`
3. Click "Get Started" to register a new account
4. After registration, you'll be automatically signed in
5. You'll be redirected to the appropriate dashboard based on your role
6. To test admin features, manually change a user's role to 'admin' in the database

## Next Steps

- Implement password reset functionality
- Add email verification for new accounts
- Create course management features
- Add assignment and grading systems
- Implement real-time notifications
- Add file upload capabilities for avatars and course materials
