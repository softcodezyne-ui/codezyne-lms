import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Exam from '@/models/Exam';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questions, exam } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Questions array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate exam if provided
    if (exam) {
      const examExists = await Exam.findById(exam);
      if (!examExists) {
        return NextResponse.json(
          { error: 'Exam not found' },
          { status: 404 }
        );
      }
    }

    // Validate each question
    const validationErrors: string[] = [];
    const processedQuestions = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionErrors: string[] = [];

      // Required fields validation
      if (!question.question || question.question.trim().length < 10) {
        questionErrors.push('Question must be at least 10 characters long');
      }
      if (question.question && question.question.trim().length > 2000) {
        questionErrors.push('Question cannot exceed 2000 characters');
      }

      if (!question.type || !['mcq', 'written', 'true_false', 'fill_blank', 'essay'].includes(question.type)) {
        questionErrors.push('Type must be one of: mcq, written, true_false, fill_blank, essay');
      }

      if (!question.marks || question.marks < 1 || question.marks > 100) {
        questionErrors.push('Marks must be between 1 and 100');
      }

      if (!question.difficulty || !['easy', 'medium', 'hard'].includes(question.difficulty)) {
        questionErrors.push('Difficulty must be one of: easy, medium, hard');
      }

      // Type-specific validation
      if (question.type === 'mcq' || question.type === 'true_false') {
        if (!question.options || question.options.length < 2) {
          questionErrors.push('MCQ/True-False questions must have at least 2 options');
        } else {
          const validOptions = question.options.filter((opt: any) => opt.text && opt.text.trim() !== '');
          if (validOptions.length < 2) {
            questionErrors.push('At least 2 valid options are required');
          } else {
            const correctOptions = validOptions.filter((opt: any) => opt.isCorrect);
            if (correctOptions.length === 0) {
              questionErrors.push('At least one option must be marked as correct');
            }
          }

          if (question.type === 'true_false' && validOptions.length !== 2) {
            questionErrors.push('True/False questions must have exactly 2 options');
          }
        }
      }

      if (question.type === 'written' || question.type === 'essay') {
        if (!question.correctAnswer || question.correctAnswer.trim().length < 5) {
          questionErrors.push('Written/Essay questions must have a correct answer (minimum 5 characters)');
        }
      }

      // Time limit validation
      if (question.timeLimit !== undefined) {
        if (question.timeLimit < 1 || question.timeLimit > 60) {
          questionErrors.push('Time limit must be between 1 and 60 minutes');
        }
      }

      if (questionErrors.length > 0) {
        validationErrors.push(`Question ${i + 1}: ${questionErrors.join(', ')}`);
      } else {
        // Process the question for database insertion
        const processedQuestion = {
          question: question.question.trim(),
          type: question.type,
          marks: question.marks,
          difficulty: question.difficulty,
          category: question.category?.trim() || undefined,
          options: question.options || undefined,
          correctAnswer: question.correctAnswer?.trim() || undefined,
          explanation: question.explanation?.trim() || undefined,
          hints: question.hints || [],
          tags: question.tags || [],
          timeLimit: question.timeLimit || 1,
          isActive: true,
          createdBy: session.user.id,
          exam: exam || undefined
        };

        processedQuestions.push(processedQuestion);
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationErrors,
          validCount: processedQuestions.length,
          totalCount: questions.length
        },
        { status: 400 }
      );
    }

    // Create questions in bulk
    const createdQuestions = await Question.insertMany(processedQuestions);

    // Update exam if provided
    if (exam && createdQuestions.length > 0) {
      const questionIds = createdQuestions.map(q => q._id);
      await Exam.findByIdAndUpdate(
        exam,
        { $push: { questions: { $each: questionIds } } },
        { new: true }
      );
    }

    // Populate the created questions
    const populatedQuestions = await Question.find({ _id: { $in: createdQuestions.map(q => q._id) } })
      .populate('createdBy', 'name email role')
      .populate('exam', 'title')
      .lean();

    return NextResponse.json({
      success: true,
      data: populatedQuestions,
      message: `Successfully created ${createdQuestions.length} questions`,
      stats: {
        total: questions.length,
        created: createdQuestions.length,
        failed: questions.length - createdQuestions.length
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Bulk question creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create questions' },
      { status: 500 }
    );
  }
}
