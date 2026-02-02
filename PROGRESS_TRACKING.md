# Progress Tracking System

This document describes the comprehensive lesson and chapter completion tracking system implemented in the LMS.

## Overview

The progress tracking system tracks completion status at three levels:
1. **Lesson Level** - Individual lesson completion
2. **Chapter Level** - Chapter completion based on all lessons in the chapter
3. **Course Level** - Course completion based on all lessons in the course

## Models

### 1. UserProgress (Lesson Progress)
- Tracks individual lesson completion
- Fields: user, course, lesson, isCompleted, progressPercentage, timeSpent, completedAt, lastAccessedAt
- Unique constraint: user + lesson

### 2. ChapterProgress (Chapter Progress)
- Tracks chapter completion
- Fields: user, course, chapter, isCompleted, progressPercentage, totalLessons, completedLessons, totalTimeSpent, completedAt, lastAccessedAt
- Unique constraint: user + chapter

### 3. CourseProgress (Course Progress)
- Tracks course completion
- Fields: user, course, isCompleted, progressPercentage, totalLessons, completedLessons, totalTimeSpent, completedAt, lastAccessedAt
- Unique constraint: user + course

## API Endpoints

### 1. Lesson Status Check
```
GET /api/progress/lesson-status?course={courseId}&lesson={lessonId}
```
Returns the completion status of a specific lesson.

### 2. Chapter Status Check
```
GET /api/progress/chapter-status?course={courseId}&chapter={chapterId}
```
Returns the completion status of a specific chapter with all its lessons.

### 3. Comprehensive Progress Dashboard
```
GET /api/progress/dashboard?course={courseId}
```
Returns detailed progress information including:
- Course statistics
- Chapter-wise progress
- Lesson-wise progress
- Learning streaks
- Recent activity
- Milestones

### 4. Progress Completion API
```
POST /api/progress/completion
```
Body:
```json
{
  "course": "courseId",
  "lesson": "lessonId", // for lesson completion
  "chapter": "chapterId", // for chapter completion
  "isCompleted": true,
  "progressPercentage": 100,
  "timeSpent": 30,
  "type": "lesson" // or "chapter"
}
```

### 5. Enhanced Progress API
```
GET /api/progress?course={courseId}&lesson={lessonId}
POST /api/progress
```
The existing progress API has been enhanced to automatically update chapter and course progress when lesson progress is updated.

## Features

### Automatic Progress Updates
- When a lesson is completed, the system automatically:
  1. Updates the lesson progress
  2. Recalculates chapter progress
  3. Recalculates course progress

### Progress Calculation
- **Lesson Progress**: Based on individual lesson completion
- **Chapter Progress**: Based on percentage of completed lessons in the chapter
- **Course Progress**: Based on percentage of completed lessons in the course

### Time Tracking
- Tracks time spent on each lesson
- Aggregates time spent at chapter and course levels
- Calculates average time per lesson

### Learning Analytics
- Current learning streak
- Longest learning streak
- Total study days
- Recent activity
- Milestone tracking (25%, 50%, 75%, 100% completion)

## Usage Examples

### Check if a lesson is completed
```javascript
const response = await fetch(`/api/progress/lesson-status?course=${courseId}&lesson=${lessonId}`);
const data = await response.json();
const isCompleted = data.data.isCompleted;
```

### Mark a lesson as completed
```javascript
const response = await fetch('/api/progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    course: courseId,
    lesson: lessonId,
    isCompleted: true,
    progressPercentage: 100,
    timeSpent: 30
  })
});
```

### Get comprehensive progress dashboard
```javascript
const response = await fetch(`/api/progress/dashboard?course=${courseId}`);
const data = await response.json();
const dashboard = data.data;
```

## Database Indexes

The system includes optimized indexes for efficient queries:
- UserProgress: { user: 1, lesson: 1 }, { user: 1, course: 1 }
- ChapterProgress: { user: 1, chapter: 1 }, { user: 1, course: 1 }
- CourseProgress: { user: 1, course: 1 }

## Performance Considerations

- All progress calculations are done asynchronously
- Database queries are optimized with proper indexes
- Progress updates are batched to prevent excessive database calls
- Caching can be implemented for frequently accessed progress data

## Integration with Existing System

The new progress tracking system integrates seamlessly with the existing:
- Quiz system
- User authentication
- Course structure
- Lesson management

All existing functionality remains unchanged while adding comprehensive progress tracking capabilities.
