# Student API Documentation

This document describes the Student API endpoints for managing students in the Learning Management System.

## Base URL
```
/api/students
```

## Authentication
All endpoints require admin authentication. Include the session token in the request headers.

## Endpoints

### 1. Get All Students
**GET** `/api/students`

Retrieves a paginated list of all students.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of students per page (default: 10)
- `search` (optional): Search term for name, email, or student ID
- `status` (optional): Filter by status (`active`, `inactive`, `all`)
- `grade` (optional): Filter by grade level

#### Example Request
```bash
GET /api/students?page=1&limit=10&search=john&status=active&grade=10
```

#### Response
```json
{
  "students": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "student",
      "isActive": true,
      "avatar": "https://res.cloudinary.com/...",
      "studentId": "STU001",
      "enrollmentDate": "2024-01-15T00:00:00.000Z",
      "grade": "10",
      "parentEmail": "parent@example.com",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z",
      "lastLogin": "2024-01-20T10:30:00.000Z",
      "fullName": "John Doe"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 2. Create Student
**POST** `/api/students`

Creates a new student account.

#### Request Body
```json
{
  "email": "john.doe@example.com",
  "password": "Student123!",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "avatar": "https://res.cloudinary.com/...",
  "studentId": "STU001",
  "grade": "10",
  "parentEmail": "parent@example.com"
}
```

#### Required Fields
- `email`: Student's email address
- `password`: Student's password
- `firstName`: Student's first name
- `lastName`: Student's last name

#### Optional Fields
- `isActive`: Whether the student account is active (default: true)
- `avatar`: URL to student's profile picture
- `studentId`: Unique student ID number
- `grade`: Student's grade level
- `parentEmail`: Parent/guardian email address

#### Response
```json
{
  "message": "Student created successfully",
  "student": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "isActive": true,
    "avatar": "https://res.cloudinary.com/...",
    "studentId": "STU001",
    "enrollmentDate": "2024-01-15T00:00:00.000Z",
    "grade": "10",
    "parentEmail": "parent@example.com",
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z",
    "fullName": "John Doe"
  }
}
```

### 3. Get Student by ID
**GET** `/api/students/[id]`

Retrieves a specific student by their ID.

#### Path Parameters
- `id`: Student's unique identifier

#### Response
```json
{
  "student": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "isActive": true,
    "avatar": "https://res.cloudinary.com/...",
    "studentId": "STU001",
    "enrollmentDate": "2024-01-15T00:00:00.000Z",
    "grade": "10",
    "parentEmail": "parent@example.com",
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z",
    "lastLogin": "2024-01-20T10:30:00.000Z",
    "fullName": "John Doe"
  }
}
```

### 4. Update Student
**PUT** `/api/students/[id]`

Updates an existing student's information.

#### Path Parameters
- `id`: Student's unique identifier

#### Request Body
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "isActive": true,
  "avatar": "https://res.cloudinary.com/...",
  "studentId": "STU001",
  "grade": "11",
  "parentEmail": "newparent@example.com"
}
```

#### Response
```json
{
  "message": "Student updated successfully",
  "student": {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "isActive": true,
    "avatar": "https://res.cloudinary.com/...",
    "studentId": "STU001",
    "enrollmentDate": "2024-01-15T00:00:00.000Z",
    "grade": "11",
    "parentEmail": "newparent@example.com",
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z",
    "lastLogin": "2024-01-20T10:30:00.000Z",
    "fullName": "John Doe"
  }
}
```

### 5. Delete Student
**DELETE** `/api/students/[id]`

Deletes a student account.

#### Path Parameters
- `id`: Student's unique identifier

#### Response
```json
{
  "message": "Student deleted successfully"
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 400 Bad Request
```json
{
  "error": "Email, password, first name, and last name are required"
}
```

### 404 Not Found
```json
{
  "error": "Student not found"
}
```

### 409 Conflict
```json
{
  "error": "Student with this email already exists"
}
```
or
```json
{
  "error": "Student ID already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Student-Specific Fields

### studentId
- **Type**: String
- **Unique**: Yes
- **Description**: Unique identifier for the student (e.g., "STU001", "2024001")
- **Validation**: Must be unique across all students

### enrollmentDate
- **Type**: Date
- **Description**: Date when the student was enrolled
- **Default**: Set automatically when student is created

### grade
- **Type**: String
- **Description**: Student's current grade level (e.g., "9", "10", "11", "12")
- **Indexed**: Yes (for efficient filtering)

### parentEmail
- **Type**: String
- **Description**: Email address of parent or guardian
- **Validation**: Must be a valid email format

## Usage Examples

### Create a new student
```javascript
const response = await fetch('/api/students', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'jane.smith@example.com',
    password: 'Student123!',
    firstName: 'Jane',
    lastName: 'Smith',
    studentId: 'STU002',
    grade: '9',
    parentEmail: 'parent@example.com'
  })
});

const data = await response.json();
console.log(data.message); // "Student created successfully"
```

### Get students with filters
```javascript
const response = await fetch('/api/students?search=john&status=active&grade=10&page=1&limit=5');
const data = await response.json();
console.log(data.students); // Array of students
console.log(data.pagination); // Pagination info
```

### Update student information
```javascript
const response = await fetch('/api/students/64f1a2b3c4d5e6f7g8h9i0j1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    grade: '11',
    parentEmail: 'newparent@example.com'
  })
});

const data = await response.json();
console.log(data.message); // "Student updated successfully"
```

## Database Indexes

The following indexes are created for optimal query performance:
- `email`: For email-based lookups
- `role`: For role-based filtering
- `isActive`: For status filtering
- `studentId`: For student ID lookups
- `grade`: For grade-based filtering

## Notes

- All email addresses are automatically converted to lowercase
- Student IDs must be unique across all students
- The `enrollmentDate` is automatically set when a student is created
- Password is hashed using bcrypt before storage
- The `fullName` field is a virtual field that combines `firstName` and `lastName`
- All timestamps are in UTC format
