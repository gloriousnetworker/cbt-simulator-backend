// controllers/questionController.js
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
      examType
    } = req.body;
    
    if (!subjectId || !question || !options || !options.length === 4 || correctAnswer === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields: subjectId, question, options (4), and correctAnswer are required' 
      });
    }
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject || subject.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const questionData = removeUndefined({
      subjectId,
      subjectName: subject.name,
      question,
      options,
      correctAnswer,
      marks: marks || 1,
      explanation,
      difficulty: difficulty || 'medium',
      topic: topic || 'General',
      class: studentClass || subject.class,
      examType: examType || subject.examType,
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
    res.status(500).json({ message: error.message });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const { subjectId, class: studentClass, examType, difficulty } = req.query;
    
    const filters = { schoolId: req.user.schoolId };
    
    if (subjectId) filters.subjectId = subjectId;
    if (studentClass) filters.class = studentClass;
    if (examType) filters.examType = examType;
    if (difficulty) filters.difficulty = difficulty;
    
    const questions = await Question.findAll(filters);
    
    res.json({ questions });
  } catch (error) {
    console.error('Get all questions error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const question = await Question.findById(questionId);
    
    if (!question || question.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json({ question });
  } catch (error) {
    console.error('Get question by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const question = await Question.findById(questionId);
    
    if (!question || question.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    const updateData = removeUndefined(req.body);
    const updatedQuestion = await Question.update(questionId, updateData);
    
    res.json({
      message: 'Question updated successfully',
      question: updatedQuestion
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const question = await Question.findById(questionId);
    
    if (!question || question.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    const subjectId = question.subjectId;
    
    await Question.delete(questionId);
    
    const questions = await Question.findBySubject(subjectId);
    await Subject.update(subjectId, { questionCount: questions.length });
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: error.message });
  }
};

const bulkImportQuestions = async (req, res) => {
  try {
    const { subjectId, questions } = req.body;
    
    if (!subjectId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Invalid request: subjectId and questions array required' });
    }
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject || subject.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const createdQuestions = [];
    
    for (const q of questions) {
      if (!q.question || !q.options || q.options.length !== 4 || q.correctAnswer === undefined) {
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
        class: q.class || subject.class,
        examType: q.examType || subject.examType,
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
      questions: createdQuestions
    });
  } catch (error) {
    console.error('Bulk import questions error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  bulkImportQuestions
};