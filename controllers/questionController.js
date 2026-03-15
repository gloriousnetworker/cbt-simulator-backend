const Question = require('../models/Question');
const Subject = require('../models/Subject');

const removeUndefined = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const createQuestion = async (req, res) => {
  try {
    const { 
      subjectId, 
      question, 
      options, 
      correctAnswer, 
      marks, 
      explanation, 
      difficulty, 
      topic,
      class: studentClass,
      examType,
      mode
    } = req.body;
    
    if (!subjectId || !question || !options || options.length !== 4 || !correctAnswer) {
      return res.status(400).json({ 
        message: 'Missing required fields: subjectId, question, options (4), and correctAnswer are required' 
      });
    }
    
    if (!mode || !['exam', 'practice'].includes(mode)) {
      return res.status(400).json({ 
        message: 'Mode is required and must be either "exam" or "practice"' 
      });
    }

    if (!options.includes(correctAnswer)) {
      return res.status(400).json({ 
        message: 'Correct answer must be one of the provided options' 
      });
    }
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const questionData = removeUndefined({
      subjectId,
      subjectName: subject.name,
      question,
      options,
      correctAnswer,
      marks: marks || 1,
      explanation: explanation || '',
      difficulty: difficulty || 'medium',
      topic: topic || 'General',
      class: studentClass || 'General',
      examType: examType || subject.examType,
      mode,
      schoolId: req.user.schoolId,
      createdBy: req.user.id
    });
    
    const question_ = await Question.create(questionData);
    
    const questions = await Question.findBySubject(subjectId);
    await Subject.update(subjectId, { questionCount: questions.length });
    
    res.status(201).json({
      message: 'Question created successfully',
      question: question_
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const { subjectId, class: studentClass, examType, difficulty, mode } = req.query;
    
    const filters = { schoolId: req.user.schoolId };
    
    if (subjectId) filters.subjectId = subjectId;
    if (studentClass) filters.class = studentClass;
    if (examType) filters.examType = examType;
    if (difficulty) filters.difficulty = difficulty;
    if (mode) filters.mode = mode;
    
    const questions = await Question.findAll(filters);
    
    res.json({ questions });
  } catch (error) {
    console.error('Get all questions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    if (!questionId) {
      return res.status(400).json({ message: 'Question ID is required' });
    }
    
    console.log('Fetching question with ID:', questionId);
    console.log('User school ID:', req.user.schoolId);
    
    const question = await Question.findById(questionId);
    
    if (!question) {
      console.log('Question not found for ID:', questionId);
      return res.status(404).json({ message: 'Question not found' });
    }
    
    console.log('Question found, schoolId:', question.schoolId);
    
    if (question.schoolId !== req.user.schoolId) {
      console.log('School ID mismatch - question belongs to different school');
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json({ question });
  } catch (error) {
    console.error('Get question by ID error:', {
      message: error.message,
      stack: error.stack,
      questionId: req.params.questionId
    });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const question = await Question.findById(questionId);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    if (question.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (req.body.correctAnswer && req.body.options) {
      if (!req.body.options.includes(req.body.correctAnswer)) {
        return res.status(400).json({ 
          message: 'Correct answer must be one of the provided options' 
        });
      }
    } else if (req.body.correctAnswer && !req.body.options) {
      if (!question.options.includes(req.body.correctAnswer)) {
        return res.status(400).json({ 
          message: 'Correct answer must be one of the existing options' 
        });
      }
    }
    
    const updateData = removeUndefined(req.body);
    const updatedQuestion = await Question.update(questionId, updateData);
    
    res.json({
      message: 'Question updated successfully',
      question: updatedQuestion
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const question = await Question.findById(questionId);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    if (question.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    const subjectId = question.subjectId;
    
    await Question.delete(questionId);
    
    const questions = await Question.findBySubject(subjectId);
    await Subject.update(subjectId, { questionCount: questions.length });
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const bulkImportQuestions = async (req, res) => {
  try {
    const { subjectId, questions } = req.body;
    
    if (!subjectId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Invalid request: subjectId and questions array required' });
    }
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const createdQuestions = [];
    const errors = [];
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.question || !q.options || q.options.length !== 4 || !q.correctAnswer || !q.mode) {
        errors.push({ index: i, message: 'Missing required fields' });
        continue;
      }
      
      if (!['exam', 'practice'].includes(q.mode)) {
        errors.push({ index: i, message: 'Mode must be either "exam" or "practice"' });
        continue;
      }

      if (!q.options.includes(q.correctAnswer)) {
        errors.push({ index: i, message: 'Correct answer must be one of the options' });
        continue;
      }
      
      const questionData = {
        subjectId,
        subjectName: subject.name,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 1,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium',
        topic: q.topic || 'General',
        class: q.class || 'General',
        examType: q.examType || subject.examType,
        mode: q.mode,
        schoolId: req.user.schoolId,
        createdBy: req.user.id
      };
      
      const question_ = await Question.create(questionData);
      createdQuestions.push(question_);
    }
    
    const allQuestions = await Question.findBySubject(subjectId);
    await Subject.update(subjectId, { questionCount: allQuestions.length });
    
    res.status(201).json({
      message: `Successfully imported ${createdQuestions.length} questions`,
      count: createdQuestions.length,
      errors: errors.length > 0 ? errors : undefined,
      questions: createdQuestions
    });
  } catch (error) {
    console.error('Bulk import questions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  bulkImportQuestions,
  removeUndefined
};