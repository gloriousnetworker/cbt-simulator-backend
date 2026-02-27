const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Question = require('../models/Question');

const startExam = async (req, res) => {
  try {
    const { subjectId } = req.body;
    
    const student = await Student.findById(req.student.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    if (!student.examMode) {
      return res.status(403).json({ message: 'Exam mode is not enabled for this student' });
    }
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    if (!student.subjects?.includes(subject.name)) {
      return res.status(403).json({ message: 'You are not enrolled in this subject' });
    }
    
    const existingExam = await Exam.findByStudent(req.student.id, 'in_progress');
    const inProgressExam = existingExam.find(e => e.subjectId === subjectId);
    
    if (inProgressExam) {
      const examQuestions = inProgressExam.questions.map(({ correctAnswer, ...rest }) => rest);
      
      return res.json({
        message: 'Resuming existing exam',
        exam: {
          id: inProgressExam.id,
          subject: inProgressExam.subject,
          subjectId: inProgressExam.subjectId,
          duration: inProgressExam.duration,
          questionCount: inProgressExam.questionCount,
          questions: examQuestions,
          answers: inProgressExam.answers || {},
          startTime: inProgressExam.startTime,
          status: inProgressExam.status,
          timeSpent: inProgressExam.timeSpent || 0
        }
      });
    }
    
    const questions = await Question.getRandomQuestions(
      subjectId, 
      subject.questionCount, 
      student.class,
      'exam'
    );
    
    if (questions.length === 0) {
      return res.status(404).json({ message: 'No exam questions available for this subject' });
    }
    
    const examQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      marks: q.marks || 1,
      difficulty: q.difficulty,
      topic: q.topic
    }));
    
    const exam = await Exam.create({
      studentId: req.student.id,
      schoolId: student.schoolId,
      subjectId: subjectId,
      subject: subject.name,
      duration: subject.duration,
      questionCount: examQuestions.length,
      questions: questions,
      startTime: new Date(),
      status: 'in_progress',
      answers: {},
      tabSwitches: 0,
      score: 0,
      totalMarks: examQuestions.reduce((sum, q) => sum + (q.marks || 1), 0)
    });
    
    await Student.setCurrentExam(req.student.id, exam.id);
    
    const questionsForClient = examQuestions.map(q => q);
    
    res.status(201).json({
      message: 'Exam started',
      exam: {
        id: exam.id,
        subject: exam.subject,
        subjectId: exam.subjectId,
        duration: exam.duration,
        questionCount: exam.questionCount,
        questions: questionsForClient,
        startTime: exam.startTime,
        status: exam.status
      }
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ message: error.message });
  }
};

const submitExam = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status === 'completed') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }
    
    const questions = exam.questions || [];
    let totalScore = 0;
    
    questions.forEach(question => {
      const userAnswer = exam.answers[question.id];
      if (userAnswer !== undefined && userAnswer === question.correctAnswer) {
        totalScore += question.marks || 1;
      }
    });
    
    const percentage = ((totalScore / exam.totalMarks) * 100).toFixed(1);
    
    const updatedExam = await Exam.update(examId, {
      score: totalScore,
      percentage: parseFloat(percentage),
      status: 'completed',
      endTime: new Date()
    });
    
    await Student.setCurrentExam(req.student.id, null);
    
    res.json({
      message: 'Exam submitted successfully',
      exam: {
        id: updatedExam.id,
        subject: updatedExam.subject,
        subjectId: updatedExam.subjectId,
        score: updatedExam.score,
        totalMarks: updatedExam.totalMarks,
        percentage: updatedExam.percentage,
        endTime: updatedExam.endTime
      }
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const examForClient = {
      ...exam,
      questions: exam.questions.map(({ correctAnswer, ...rest }) => rest)
    };
    
    res.json({ exam: examForClient });
  } catch (error) {
    console.error('Get exam by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

const recordTabSwitch = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const tabSwitches = (exam.tabSwitches || 0) + 1;
    let autoSubmitted = false;
    
    if (tabSwitches >= 3) {
      const questions = exam.questions || [];
      let totalScore = 0;
      
      questions.forEach(question => {
        const userAnswer = exam.answers[question.id];
        if (userAnswer !== undefined && userAnswer === question.correctAnswer) {
          totalScore += question.marks || 1;
        }
      });
      
      const percentage = exam.totalMarks ? ((totalScore / exam.totalMarks) * 100).toFixed(1) : 0;
      
      await Exam.update(examId, {
        tabSwitches,
        score: totalScore,
        percentage: parseFloat(percentage),
        status: 'completed',
        endTime: new Date(),
        autoSubmitted: true
      });
      
      await Student.setCurrentExam(req.student.id, null);
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
    console.error('Record tab switch error:', error);
    res.status(500).json({ message: error.message });
  }
};

const saveAnswer = async (req, res) => {
  try {
    const { examId } = req.params;
    const { questionId, answer } = req.body;
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status === 'completed') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }
    
    await Exam.saveAnswer(examId, questionId, answer);
    
    res.json({ message: 'Answer saved' });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getResults = async (req, res) => {
  try {
    const exams = await Exam.findByStudent(req.student.id, 'completed');
    
    const results = exams.map(exam => ({
      id: exam.id,
      subject: exam.subject,
      subjectId: exam.subjectId,
      score: exam.score || 0,
      totalMarks: exam.totalMarks || 0,
      percentage: exam.percentage || 0,
      date: exam.endTime || exam.createdAt,
      duration: exam.duration
    }));
    
    res.json({ results });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPerformance = async (req, res) => {
  try {
    const performance = await Exam.getResults(req.student.id);
    res.json({ performance });
  } catch (error) {
    console.error('Get performance error:', error);
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