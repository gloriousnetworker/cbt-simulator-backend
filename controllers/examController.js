// controllers/examController.js
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Question = require('../models/Question');

const startExam = async (req, res) => {
  try {
    const { subjectId, examType, duration, questionCount = 50 } = req.body;
    
    const student = await Student.findById(req.student.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject || subject.schoolId !== student.schoolId) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    if (!student.subjects?.includes(subject.name)) {
      return res.status(403).json({ message: 'You are not enrolled in this subject' });
    }
    
    let questions = await Question.findAll({ 
      subjectId: subjectId,
      schoolId: student.schoolId
    });
    
    if (questions.length === 0) {
      return res.status(404).json({ message: 'No questions available for this subject' });
    }
    
    if (questions[0].class !== undefined) {
      const classQuestions = questions.filter(q => q.class === student.class);
      if (classQuestions.length > 0) {
        questions = classQuestions;
      }
    }
    
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffledQuestions.slice(0, Math.min(questionCount, shuffledQuestions.length));
    
    const examQuestions = selectedQuestions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      marks: q.marks || 1,
      difficulty: q.difficulty,
      topic: q.topic,
      correctAnswer: q.correctAnswer
    }));
    
    const exam = await Exam.create({
      studentId: req.student.id,
      schoolId: student.schoolId,
      subjectId: subjectId,
      subject: subject.name,
      examType,
      duration,
      questionCount: examQuestions.length,
      questions: examQuestions,
      startTime: new Date(),
      status: 'pending',
      answers: {},
      tabSwitches: 0,
      score: 0,
      totalMarks: examQuestions.reduce((sum, q) => sum + (q.marks || 1), 0)
    });
    
    const questionsForClient = examQuestions.map(({ correctAnswer, ...rest }) => rest);
    
    res.status(201).json({
      message: 'Exam started',
      exam: {
        id: exam.id,
        subject: exam.subject,
        subjectId: exam.subjectId,
        examType: exam.examType,
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
    const { answers } = req.body;
    
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
      const userAnswer = answers[question.id];
      if (userAnswer !== undefined && userAnswer === question.correctAnswer) {
        totalScore += question.marks || 1;
      }
    });
    
    const percentage = ((totalScore / exam.totalMarks) * 100).toFixed(1);
    
    const updatedExam = await Exam.update(examId, {
      answers,
      score: totalScore,
      percentage: parseFloat(percentage),
      status: 'completed',
      endTime: new Date()
    });
    
    res.json({
      message: 'Exam submitted successfully',
      exam: {
        id: updatedExam.id,
        subject: updatedExam.subject,
        examType: updatedExam.examType,
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
    
    res.json({ exam });
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
      const score = exam.score || 0;
      const percentage = exam.totalMarks ? ((score / exam.totalMarks) * 100).toFixed(1) : 0;
      
      await Exam.update(examId, {
        tabSwitches,
        status: 'completed',
        endTime: new Date(),
        autoSubmitted: true,
        percentage: parseFloat(percentage)
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
    
    const answers = { ...exam.answers, [questionId]: answer };
    
    await Exam.update(examId, { answers });
    
    res.json({ message: 'Answer saved' });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getResults = async (req, res) => {
  try {
    const exams = await Exam.findByStudent(req.student.id);
    
    const results = exams
      .filter(exam => exam.status === 'completed')
      .map(exam => ({
        id: exam.id,
        subject: exam.subject,
        subjectId: exam.subjectId,
        score: exam.score || 0,
        totalMarks: exam.totalMarks || 0,
        percentage: exam.percentage || 0,
        date: exam.endTime || exam.createdAt,
        examType: exam.examType
      }));
    
    res.json({ results });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPerformance = async (req, res) => {
  try {
    const exams = await Exam.findByStudent(req.student.id);
    
    const completedExams = exams.filter(exam => exam.status === 'completed');
    
    const performance = {
      totalExams: completedExams.length,
      averageScore: 0,
      averagePercentage: 0,
      subjects: {}
    };
    
    if (completedExams.length > 0) {
      const totalScore = completedExams.reduce((sum, exam) => sum + (exam.score || 0), 0);
      const totalPercentage = completedExams.reduce((sum, exam) => sum + (exam.percentage || 0), 0);
      
      performance.averageScore = Math.round(totalScore / completedExams.length);
      performance.averagePercentage = Math.round(totalPercentage / completedExams.length);
      
      completedExams.forEach(exam => {
        if (!performance.subjects[exam.subject]) {
          performance.subjects[exam.subject] = {
            attempts: 0,
            totalScore: 0,
            totalPercentage: 0
          };
        }
        performance.subjects[exam.subject].attempts++;
        performance.subjects[exam.subject].totalScore += exam.score || 0;
        performance.subjects[exam.subject].totalPercentage += exam.percentage || 0;
      });
    }
    
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