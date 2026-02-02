# Assignment System Implementation

This document outlines the comprehensive assignment system implemented for the PetMota LMS platform.

## Overview

The assignment system provides a complete solution for creating, managing, and grading assignments in an educational environment. It supports multiple assignment types, submission tracking, grading, and comprehensive analytics.

## Features

### Assignment Types
- **Essay**: Text-based assignments with rich content support
- **File Upload**: Document submissions with file type and size validation
- **Quiz**: Auto-graded assignments with multiple question types
- **Project**: Long-term assignments with milestone tracking
- **Presentation**: Multimedia submissions with presentation support

### Key Features
- ✅ Multiple assignment types
- ✅ Due date management with late submission handling
- ✅ Group assignment support
- ✅ Rubric-based grading
- ✅ File upload with validation
- ✅ Auto-grading for quiz assignments
- ✅ Submission tracking and analytics
- ✅ Grade management and feedback
- ✅ Time tracking for assignments
- ✅ Plagiarism detection integration ready

## Database Models

### Assignment Model (`src/models/Assignment.ts`)

```typescript
interface IAssignment {
  title: string;
  description?: string;
  instructions?: string;
  type: 'essay' | 'file_upload' | 'quiz' | 'project' | 'presentation';
  course: ObjectId;
  chapter?: ObjectId;
  lesson?: ObjectId;
  createdBy: ObjectId;
  totalMarks: number;
  passingMarks: number;
  dueDate?: Date;
  startDate?: Date;
  isActive: boolean;
  isPublished: boolean;
  allowLateSubmission: boolean;
  latePenaltyPercentage?: number;
  maxAttempts: number;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  attachments?: AssignmentAttachment[];
  rubric?: AssignmentRubric[];
  isGroupAssignment: boolean;
  maxGroupSize?: number;
  autoGrade: boolean;
  timeLimit?: number;
  showCorrectAnswers: boolean;
  allowReview: boolean;
}
```

### AssignmentSubmission Model (`src/models/AssignmentSubmission.ts`)

```typescript
interface IAssignmentSubmission {
  assignment: ObjectId;
  student: ObjectId;
  groupMembers?: ObjectId[];
  content?: string;
  files?: AssignmentFile[];
  answers?: AssignmentAnswer[];
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  submittedAt?: Date;
  gradedAt?: Date;
  gradedBy?: ObjectId;
  score?: number;
  maxScore: number;
  feedback?: string;
  rubricScores?: RubricScore[];
  isLate: boolean;
  latePenaltyApplied?: number;
  attemptNumber: number;
  timeSpent?: number;
}
```

## API Endpoints

### Core Assignment APIs

#### GET `/api/assignments`
- Fetch assignments with filtering and pagination
- Supports search, type, status, course filters
- Returns comprehensive statistics

#### POST `/api/assignments`
- Create new assignment
- Validates all required fields
- Supports all assignment types

#### GET `/api/assignments/[id]`
- Get specific assignment details
- Includes submission statistics
- Role-based access control

#### PUT `/api/assignments/[id]`
- Update assignment
- Creator or admin access only
- Validates all constraints

#### DELETE `/api/assignments/[id]`
- Delete assignment
- Only if no submissions exist
- Creator or admin access only

### Submission APIs

#### GET `/api/assignments/[id]/submissions`
- Get submissions for an assignment
- Role-based filtering (students see only their own)
- Comprehensive statistics

#### POST `/api/assignments/[id]/submissions`
- Submit assignment
- Validates submission constraints
- Handles late submissions

#### PUT `/api/assignments/[id]/submissions/[submissionId]/grade`
- Grade assignment submission
- Supports rubric-based grading
- Instructor/admin access only

### Student APIs

#### GET `/api/student/assignments`
- Get assignments for enrolled courses
- Shows submission status
- Filters by course and status

#### POST `/api/student/assignments/[id]/submit`
- Submit assignment as student
- Validates enrollment and constraints
- Handles file uploads

### Instructor APIs

#### GET `/api/instructor/assignments`
- Get instructor's assignments
- Comprehensive statistics
- Submission tracking

## TypeScript Types

All types are defined in `src/types/assignment.ts`:

- `Assignment`: Core assignment interface
- `AssignmentSubmission`: Submission interface
- `CreateAssignmentRequest`: Assignment creation
- `UpdateAssignmentRequest`: Assignment updates
- `CreateSubmissionRequest`: Submission creation
- `GradeSubmissionRequest`: Grading interface
- `AssignmentFilters`: Query filters
- `SubmissionFilters`: Submission query filters
- `AssignmentStats`: Statistics interface

## Usage Examples

### Creating an Assignment

```typescript
const assignmentData: CreateAssignmentRequest = {
  title: "Essay on Climate Change",
  description: "Write a comprehensive essay on climate change impacts",
  type: "essay",
  course: "course_id",
  totalMarks: 100,
  passingMarks: 50,
  dueDate: "2024-12-31T23:59:59Z",
  allowLateSubmission: true,
  latePenaltyPercentage: 10,
  maxAttempts: 2
};

const response = await fetch('/api/assignments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(assignmentData)
});
```

### Submitting an Assignment

```typescript
const submissionData: CreateSubmissionRequest = {
  assignment: "assignment_id",
  content: "This is my essay content...",
  timeSpent: 120 // minutes
};

const response = await fetch('/api/student/assignments/assignment_id/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(submissionData)
});
```

### Grading a Submission

```typescript
const gradeData: GradeSubmissionRequest = {
  score: 85,
  feedback: "Excellent work! Well-structured arguments.",
  rubricScores: [
    {
      criteria: "Content Quality",
      score: 40,
      maxScore: 50,
      feedback: "Strong arguments presented"
    }
  ]
};

const response = await fetch('/api/assignments/assignment_id/submissions/submission_id/grade', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(gradeData)
});
```

## Security Features

- **Authentication**: All endpoints require valid session
- **Authorization**: Role-based access control
- **Validation**: Comprehensive input validation
- **File Security**: File type and size validation
- **Late Submission**: Configurable penalty system
- **Attempt Limits**: Prevents submission abuse

## Analytics and Reporting

The system provides comprehensive analytics:

- Assignment completion rates
- Average scores and grade distribution
- Late submission tracking
- Time spent analysis
- Rubric-based performance metrics
- Course-level assignment statistics

## Integration Points

- **Course System**: Integrates with existing course structure
- **User Management**: Uses existing user roles and permissions
- **File Upload**: Compatible with existing file upload system
- **Progress Tracking**: Can be integrated with course progress
- **Notification System**: Ready for notification integration

## Future Enhancements

- Plagiarism detection integration
- Peer review assignments
- Collaborative editing
- Video submission support
- Mobile app integration
- Advanced analytics dashboard
- Automated feedback generation
- Integration with external tools (Turnitin, etc.)

## Error Handling

All endpoints include comprehensive error handling:

- Validation errors with specific messages
- Authorization errors with proper status codes
- Database errors with fallback responses
- File upload errors with size/type validation
- Business logic errors (late submissions, attempt limits)

## Performance Considerations

- Database indexes on frequently queried fields
- Pagination for large datasets
- Aggregation pipelines for statistics
- Efficient population of related documents
- Caching strategies for frequently accessed data

This assignment system provides a robust foundation for educational content management and assessment in the PetMota LMS platform.
