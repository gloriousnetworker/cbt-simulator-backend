// controllers/subjectController.js
const Subject = require('../models/Subject');
const Question = require('../models/Question');

const removeUndefined = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const createSubject = async (req, res) => {
  try {
    const { name, code, description, class: studentClass, examType, duration, questionCount } = req.body;
    
    if (!name || !code || !studentClass) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, code, and class are required' 
      });
    }
    
    // Check if subject with same name exists for this school
    const existingSubjects = await Subject.findAll({ 
      schoolId: req.user.schoolId
    });
    
    const subjectExists = existingSubjects.some(subject => 
      subject.name.toLowerCase() === name.toLowerCase()
    );
    
    if (subjectExists) {
      return res.status(400).json({ message: 'Subject with this name already exists in your school' });
    }
    
    const subjectData = removeUndefined({
      name,
      code,
      description,
      class: studentClass,
      examType: examType || 'WAEC',
      duration: duration || 120,
      questionCount: questionCount || 50,
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
      status: 'active'
    });
    
    const subject = await Subject.create(subjectData);
    
    res.status(201).json({
      message: 'Subject created successfully',
      subject
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll({ schoolId: req.user.schoolId });
    res.json({ subjects });
  } catch (error) {
    console.error('Get all subjects error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getSubjectById = async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject || subject.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const questions = await Question.findBySubject(subjectId);
    const questionCount = questions.length;
    
    res.json({
      subject,
      questionCount,
      questions
    });
  } catch (error) {
    console.error('Get subject by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject || subject.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // If updating name, check if new name already exists
    if (req.body.name && req.body.name.toLowerCase() !== subject.name.toLowerCase()) {
      const existingSubjects = await Subject.findAll({ 
        schoolId: req.user.schoolId
      });
      
      const nameExists = existingSubjects.some(s => 
        s.name.toLowerCase() === req.body.name.toLowerCase() && s.id !== subjectId
      );
      
      if (nameExists) {
        return res.status(400).json({ message: 'Subject with this name already exists' });
      }
    }
    
    const updateData = removeUndefined(req.body);
    const updatedSubject = await Subject.update(subjectId, updateData);
    
    res.json({
      message: 'Subject updated successfully',
      subject: updatedSubject
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject || subject.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const questions = await Question.findBySubject(subjectId);
    
    if (questions.length > 0) {
      for (const question of questions) {
        await Question.delete(question.id);
      }
    }
    
    await Subject.delete(subjectId);
    
    res.json({ message: 'Subject and all associated questions deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject
};