const Exam = require('../models/Exam');
const Student = require('../models/Student');

const startExam = async (req, res) => {
  try {
    const { subject, examType, duration } = req.body;
    
    const student = await Student.findById(req.user.id);
    
    if (!student.subjects?.includes(subject)) {
      return res.status(403).json({ message: 'You are not enrolled in this subject' });
    }
    
    const exam = await Exam.create({
      studentId: req.user.id,
      schoolId: student.schoolId,
      subject,
      examType,
      duration,
      startTime: new Date(),
      status: 'in-progress',
      answers: {},
      tabSwitches: 0
    });
    
    res.status(201).json({
      message: 'Exam started',
      exam
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body;
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.user.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status === 'completed') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }
    
    let score = 0;
    const totalQuestions = Object.keys(answers).length;
    
    if (totalQuestions > 0) {
      score = Math.floor(Math.random() * 100);
    }
    
    const updatedExam = await Exam.update(examId, {
      answers,
      score,
      status: 'completed',
      endTime: new Date()
    });
    
    res.json({
      message: 'Exam submitted successfully',
      exam: updatedExam
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.user.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    res.json({ exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const recordTabSwitch = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.user.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const tabSwitches = (exam.tabSwitches || 0) + 1;
    
    let autoSubmitted = false;
    if (tabSwitches >= 3) {
      await Exam.update(examId, {
        tabSwitches,
        status: 'completed',
        endTime: new Date(),
        autoSubmitted: true
      });
      autoSubmitted = true;
    } else {
      await Exam.update(examId, { tabSwitches });
    }
    
    res.json({
      message: autoSubmitted ? 'Exam auto-submitted due to tab switching' : 'Tab switch recorded',
      tabSwitches,
      autoSubmitted
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveAnswer = async (req, res) => {
  try {
    const { examId } = req.params;
    const { questionId, answer } = req.body;
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.user.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const answers = { ...exam.answers, [questionId]: answer };
    
    await Exam.update(examId, { answers });
    
    res.json({ message: 'Answer saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getResults = async (req, res) => {
  try {
    const exams = await Exam.findByStudent(req.user.id);
    
    const results = exams
      .filter(exam => exam.status === 'completed')
      .map(exam => ({
        id: exam.id,
        subject: exam.subject,
        score: exam.score,
        date: exam.endTime,
        examType: exam.examType
      }));
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPerformance = async (req, res) => {
  try {
    const performance = await Exam.getResults(req.user.id);
    res.json({ performance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  startExam,
  submitExam,
  getExamById,
  recordTabSwitch,
  saveAnswer,
  getResults,
  getPerformance
};