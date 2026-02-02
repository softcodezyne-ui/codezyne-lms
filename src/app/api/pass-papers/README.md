# Pass Paper API

A comprehensive API for managing pass papers including question papers, marks PDFs, and work solutions for educational institutions.

## Overview

The Pass Paper API provides complete CRUD operations for managing academic papers with the following features:
- Question paper management
- Marks PDF handling
- Work solution storage
- Advanced search and filtering
- File upload integration
- Statistics and analytics
- Role-based access control

## Data Model

### PassPaper Entity
```typescript
interface PassPaper {
  _id: string;
  sessionName: string;        // e.g., "Spring 2024"
  year: number;              // e.g., 2024
  subject: string;           // e.g., "Mathematics"
  examType: string;          // e.g., "Midterm", "Final"
  questionPaperUrl?: string; // PDF URL for question paper
  marksPdfUrl?: string;      // PDF URL for marks sheet
  workSolutionUrl?: string;  // PDF URL for work solution
  description?: string;      // Additional description
  tags?: string;            // Comma-separated tags
  isActive?: boolean;       // Active status
  uploadedBy?: string;      // Uploader email
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### 1. Get All Pass Papers
**GET** `/api/pass-papers`

#### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `?page=2` |
| `limit` | number | Items per page (default: 10) | `?limit=20` |
| `search` | string | Search across multiple fields | `?search=mathematics` |
| `sessionName` | string | Filter by session name | `?sessionName=Spring 2024` |
| `year` | number | Filter by year | `?year=2024` |
| `subject` | string | Filter by subject | `?subject=Mathematics` |
| `examType` | string | Filter by exam type | `?examType=Midterm` |
| `paperType` | string | Filter by paper type | `?paperType=question_paper` |
| `isActive` | boolean | Filter by active status | `?isActive=true` |
| `uploadedBy` | string | Filter by uploader | `?uploadedBy=admin@example.com` |
| `sortBy` | string | Sort field | `?sortBy=year` |
| `sortOrder` | string | Sort order (asc/desc) | `?sortOrder=desc` |

#### Response
```json
{
  "passPapers": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "sessionName": "Spring 2024",
      "year": 2024,
      "subject": "Mathematics",
      "examType": "Midterm",
      "questionPaperUrl": "https://res.cloudinary.com/...",
      "marksPdfUrl": "https://res.cloudinary.com/...",
      "workSolutionUrl": "https://res.cloudinary.com/...",
      "description": "Midterm exam for Mathematics",
      "tags": "math,midterm,spring2024",
      "isActive": true,
      "uploadedBy": "admin@example.com",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
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

### 2. Create Pass Paper
**POST** `/api/pass-papers`

#### Request Body
```json
{
  "sessionName": "Spring 2024",
  "year": 2024,
  "subject": "Mathematics",
  "examType": "Midterm",
  "questionPaperUrl": "https://res.cloudinary.com/...",
  "marksPdfUrl": "https://res.cloudinary.com/...",
  "workSolutionUrl": "https://res.cloudinary.com/...",
  "description": "Midterm exam for Mathematics",
  "tags": "math,midterm,spring2024",
  "isActive": true
}
```

#### Response
```json
{
  "message": "Pass paper created successfully",
  "passPaper": {
    "_id": "507f1f77bcf86cd799439011",
    "sessionName": "Spring 2024",
    "year": 2024,
    "subject": "Mathematics",
    "examType": "Midterm",
    "questionPaperUrl": "https://res.cloudinary.com/...",
    "marksPdfUrl": "https://res.cloudinary.com/...",
    "workSolutionUrl": "https://res.cloudinary.com/...",
    "description": "Midterm exam for Mathematics",
    "tags": "math,midterm,spring2024",
    "isActive": true,
    "uploadedBy": "admin@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Get Pass Paper by ID
**GET** `/api/pass-papers/[id]`

#### Response
```json
{
  "passPaper": {
    "_id": "507f1f77bcf86cd799439011",
    "sessionName": "Spring 2024",
    "year": 2024,
    "subject": "Mathematics",
    "examType": "Midterm",
    "questionPaperUrl": "https://res.cloudinary.com/...",
    "marksPdfUrl": "https://res.cloudinary.com/...",
    "workSolutionUrl": "https://res.cloudinary.com/...",
    "description": "Midterm exam for Mathematics",
    "tags": "math,midterm,spring2024",
    "isActive": true,
    "uploadedBy": "admin@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Update Pass Paper
**PUT** `/api/pass-papers/[id]`

#### Request Body
```json
{
  "sessionName": "Spring 2024 Updated",
  "description": "Updated description",
  "isActive": false
}
```

#### Response
```json
{
  "message": "Pass paper updated successfully",
  "passPaper": {
    "_id": "507f1f77bcf86cd799439011",
    "sessionName": "Spring 2024 Updated",
    "year": 2024,
    "subject": "Mathematics",
    "examType": "Midterm",
    "questionPaperUrl": "https://res.cloudinary.com/...",
    "marksPdfUrl": "https://res.cloudinary.com/...",
    "workSolutionUrl": "https://res.cloudinary.com/...",
    "description": "Updated description",
    "tags": "math,midterm,spring2024",
    "isActive": false,
    "uploadedBy": "admin@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:30:00.000Z"
  }
}
```

### 5. Delete Pass Paper
**DELETE** `/api/pass-papers/[id]`

#### Response
```json
{
  "message": "Pass paper deleted successfully"
}
```

### 6. Upload Pass Paper Files
**POST** `/api/pass-papers/upload`

#### Request (FormData)
```
sessionName: "Spring 2024"
year: 2024
subject: "Mathematics"
examType: "Midterm"
description: "Midterm exam for Mathematics"
tags: "math,midterm,spring2024"
isActive: true
questionPaper: [File] (optional)
marksPdf: [File] (optional)
workSolution: [File] (optional)
```

#### Response
```json
{
  "success": true,
  "message": "Pass paper uploaded successfully",
  "passPaper": {
    "_id": "507f1f77bcf86cd799439011",
    "sessionName": "Spring 2024",
    "year": 2024,
    "subject": "Mathematics",
    "examType": "Midterm",
    "questionPaperUrl": "https://res.cloudinary.com/...",
    "marksPdfUrl": "https://res.cloudinary.com/...",
    "workSolutionUrl": "https://res.cloudinary.com/...",
    "description": "Midterm exam for Mathematics",
    "tags": "math,midterm,spring2024",
    "isActive": true,
    "uploadedBy": "admin@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "uploadResults": {
    "questionPaper": {
      "success": true,
      "url": "https://res.cloudinary.com/..."
    },
    "marksPdf": {
      "success": true,
      "url": "https://res.cloudinary.com/..."
    },
    "workSolution": {
      "success": false,
      "error": "File too large"
    }
  }
}
```

### 7. Advanced Search
**GET** `/api/pass-papers/search`

#### Query Parameters
Same as GET `/api/pass-papers` plus:
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `yearFrom` | number | Filter by year range (from) | `?yearFrom=2020` |
| `yearTo` | number | Filter by year range (to) | `?yearTo=2024` |

#### Response
```json
{
  "passPapers": [...],
  "pagination": {...},
  "suggestions": {
    "subjects": ["Mathematics", "Physics", "Chemistry"],
    "examTypes": ["Midterm", "Final", "Quiz"],
    "years": [2024, 2023, 2022]
  }
}
```

### 8. Get Statistics
**GET** `/api/pass-papers/stats`

#### Response
```json
{
  "stats": {
    "totalPapers": 150,
    "activePapers": 140,
    "inactivePapers": 10,
    "papersByType": {
      "questionPapers": 120,
      "marksPdfs": 80,
      "workSolutions": 60
    },
    "papersBySubject": {
      "Mathematics": 45,
      "Physics": 30,
      "Chemistry": 25
    },
    "papersByYear": {
      "2024": 50,
      "2023": 40,
      "2022": 35
    },
    "recentUploads": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "sessionName": "Spring 2024",
        "year": 2024,
        "subject": "Mathematics",
        "examType": "Midterm",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "uploadedBy": "admin@example.com"
      }
    ]
  }
}
```

## Authentication & Authorization

### Required Roles
- **Read Access**: All authenticated users
- **Write Access**: Admin and Instructor roles only

### Authentication
All endpoints require a valid NextAuth session:
```typescript
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Validation Rules

### Required Fields
- `sessionName`: String, required
- `year`: Number, required, between 1900 and next year
- `subject`: String, required
- `examType`: String, required

### Optional Fields
- `questionPaperUrl`: String, optional
- `marksPdfUrl`: String, optional
- `workSolutionUrl`: String, optional
- `description`: String, optional
- `tags`: String, optional
- `isActive`: Boolean, optional (default: true)

### Business Rules
1. At least one paper URL must be provided
2. Duplicate papers (same session, year, subject, exam type) are not allowed
3. Year must be between 1900 and next year
4. All string fields are trimmed
5. Empty strings are converted to null for optional fields

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "error": "Session name, year, subject, and exam type are required"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

#### 404 Not Found
```json
{
  "error": "Pass paper not found"
}
```

#### 409 Conflict
```json
{
  "error": "A pass paper with this session, year, subject, and exam type already exists"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Usage Examples

### JavaScript/TypeScript

```typescript
// Get all pass papers
const response = await fetch('/api/pass-papers?page=1&limit=10');
const data = await response.json();

// Create pass paper
const newPaper = await fetch('/api/pass-papers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionName: 'Spring 2024',
    year: 2024,
    subject: 'Mathematics',
    examType: 'Midterm',
    questionPaperUrl: 'https://res.cloudinary.com/...',
    description: 'Midterm exam for Mathematics'
  })
});

// Search pass papers
const searchResults = await fetch('/api/pass-papers/search?search=mathematics&year=2024');

// Upload files
const formData = new FormData();
formData.append('sessionName', 'Spring 2024');
formData.append('year', '2024');
formData.append('subject', 'Mathematics');
formData.append('examType', 'Midterm');
formData.append('questionPaper', file);

const uploadResponse = await fetch('/api/pass-papers/upload', {
  method: 'POST',
  body: formData
});
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

const usePassPapers = () => {
  const [passPapers, setPassPapers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPassPapers = async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/pass-papers?${params}`);
      const data = await response.json();
      setPassPapers(data.passPapers);
    } catch (error) {
      console.error('Error fetching pass papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPassPaper = async (paperData) => {
    const response = await fetch('/api/pass-papers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paperData)
    });
    return response.json();
  };

  return { passPapers, loading, fetchPassPapers, createPassPaper };
};
```

## File Storage

### Cloudinary Integration
- Files are stored in Cloudinary
- Organized by folder structure:
  - `lms/pass-papers/question-papers/`
  - `lms/pass-papers/marks-pdfs/`
  - `lms/pass-papers/work-solutions/`
- Automatic file optimization
- CDN delivery for fast access
- Secure HTTPS URLs

### File Validation
- Only PDF files are accepted
- Maximum file size: 10MB
- File type validation on both client and server
- Malicious filename detection

## Performance Considerations

### Pagination
- Default page size: 10 items
- Maximum page size: 100 items
- Efficient database queries with skip/limit

### Indexing
- Compound index on (sessionName, year, subject, examType)
- Index on isActive for filtering
- Index on uploadedBy for user-specific queries
- Index on createdAt for sorting

### Caching
- Consider implementing Redis caching for frequently accessed data
- Cache statistics and search suggestions
- Implement cache invalidation on updates

## Security Best Practices

1. **Input Validation**: All inputs are validated and sanitized
2. **SQL Injection Prevention**: Using parameterized queries
3. **File Upload Security**: File type and size validation
4. **Access Control**: Role-based permissions
5. **Error Handling**: No sensitive information in error messages
6. **Rate Limiting**: Consider implementing rate limiting for production

## Monitoring & Logging

### Logging
- All API calls are logged
- Error details are logged for debugging
- Upload progress is tracked
- User actions are audited

### Metrics
- Request count and response times
- File upload success/failure rates
- Search query performance
- User activity patterns

## Future Enhancements

1. **Bulk Operations**: Bulk upload and update capabilities
2. **Version Control**: Track paper versions and changes
3. **Advanced Search**: Full-text search with Elasticsearch
4. **Analytics**: Detailed usage analytics and reporting
5. **API Versioning**: Support for multiple API versions
6. **Webhooks**: Real-time notifications for paper updates
7. **Export/Import**: Bulk export and import functionality
