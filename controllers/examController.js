// controllers/examController.js
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const ExamSetup = require('../models/ExamSetup');

const submitExam = async (req, res) => {
  try {
    const { examId } = req.params;
    
    console.log('Submitting exam:', examId);
    console.log('Student ID:', req.student.id);
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status === 'completed') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }
    
    const questions = exam.questions || [];
    let totalScore = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    
    // Calculate actual total marks from subjects if available
    let actualTotalMarks = exam.totalMarks;
    if (exam.subjects && exam.subjects.length > 0) {
      actualTotalMarks = exam.subjects.reduce((sum, subject) => 
        sum + (subject.totalMarks || 0), 0
      );
    }
    
    console.log('Total marks calculation:', {
      examTotalMarks: exam.totalMarks,
      subjectsTotalMarks: actualTotalMarks,
      using: actualTotalMarks
    });
    
    questions.forEach(question => {
      const userAnswer = exam.answers[question.id];
      const isCorrect = userAnswer !== undefined && userAnswer === question.correctAnswer;
      
      console.log(`Question ${question.id}:`, {
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        marks: question.marks || 1
      });
      
      if (isCorrect) {
        totalScore += question.marks || 1;
        correctAnswers++;
      } else if (userAnswer !== undefined) {
        wrongAnswers++;
      }
    });
    
    const percentage = ((totalScore / actualTotalMarks) * 100).toFixed(1);
    
    console.log('Score calculation:', {
      totalScore,
      actualTotalMarks,
      percentage,
      correctAnswers,
      wrongAnswers,
      unanswered: questions.length - (correctAnswers + wrongAnswers)
    });
    
    const updatedExam = await Exam.update(examId, {
      score: totalScore,
      percentage: parseFloat(percentage),
      status: 'completed',
      endTime: new Date()
    });
    
    await Student.setCurrentExam(req.student.id, null);
    
    // Add result to exam setup if it exists
    if (exam.examSetupId) {
      const examSetup = await ExamSetup.findById(exam.examSetupId);
      if (examSetup) {
        await ExamSetup.addResult(exam.examSetupId, req.student.id, {
          examId: examId,
          score: totalScore,
          totalMarks: actualTotalMarks,
          percentage: parseFloat(percentage),
          correctAnswers,
          wrongAnswers,
          totalQuestions: questions.length,
          submittedAt: new Date(),
          submitted: true
        });
      }
    }
    
    res.json({
      message: 'Exam submitted successfully',
      exam: {
        id: updatedExam.id,
        examSetupId: updatedExam.examSetupId,
        subjects: updatedExam.subjects,
        score: updatedExam.score,
        totalMarks: actualTotalMarks,
        percentage: updatedExam.percentage,
        correctAnswers,
        wrongAnswers,
        totalQuestions: questions.length,
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
    
    console.log('Getting exam by ID:', examId);
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Remove correctAnswer from questions for client
    const questionsForClient = exam.questions.map(({ correctAnswer, ...rest }) => rest);
    
    const examForClient = {
      id: exam.id,
      examSetupId: exam.examSetupId,
      title: exam.title,
      subjects: exam.subjects,
      duration: exam.duration,
      questionCount: exam.questionCount,
      questions: questionsForClient,
      answers: exam.answers || {},
      startTime: exam.startTime,
      status: exam.status,
      timeSpent: exam.timeSpent || 0,
      score: exam.score,
      totalMarks: exam.totalMarks,
      percentage: exam.percentage,
      tabSwitches: exam.tabSwitches,
      instructions: exam.instructions,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt
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
    
    console.log('Recording tab switch for exam:', examId);
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const tabSwitches = (exam.tabSwitches || 0) + 1;
    let autoSubmitted = false;
    
    // Auto-submit after 3 tab switches
    if (tabSwitches >= 3) {
      console.log('Auto-submitting exam due to tab switches:', tabSwitches);
      
      const questions = exam.questions || [];
      let totalScore = 0;
      let correctAnswers = 0;
      let wrongAnswers = 0;
      
      // Calculate actual total marks from subjects
      let actualTotalMarks = exam.totalMarks;
      if (exam.subjects && exam.subjects.length > 0) {
        actualTotalMarks = exam.subjects.reduce((sum, subject) => 
          sum + (subject.totalMarks || 0), 0
        );
      }
      
      questions.forEach(question => {
        const userAnswer = exam.answers[question.id];
        const isCorrect = userAnswer !== undefined && userAnswer === question.correctAnswer;
        
        if (isCorrect) {
          totalScore += question.marks || 1;
          correctAnswers++;
        } else if (userAnswer !== undefined) {
          wrongAnswers++;
        }
      });
      
      const percentage = actualTotalMarks ? ((totalScore / actualTotalMarks) * 100).toFixed(1) : 0;
      
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
      
      // Add result to exam setup if it exists
      if (exam.examSetupId) {
        const examSetup = await ExamSetup.findById(exam.examSetupId);
        if (examSetup) {
          await ExamSetup.addResult(exam.examSetupId, req.student.id, {
            examId: examId,
            score: totalScore,
            totalMarks: actualTotalMarks,
            percentage: parseFloat(percentage),
            correctAnswers,
            wrongAnswers,
            totalQuestions: questions.length,
            submittedAt: new Date(),
            submitted: true,
            autoSubmitted: true
          });
        }
      }
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
    
    console.log('Saving answer:', {
      examId,
      questionId,
      answer,
      timestamp: new Date().toISOString()
    });
    
    if (!questionId) {
      return res.status(400).json({ message: 'questionId is required' });
    }
    
    if (!answer) {
      return res.status(400).json({ message: 'answer is required' });
    }
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status === 'completed') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }
    
    // Verify the question exists in this exam
    const questionExists = exam.questions.some(q => q.id === questionId);
    if (!questionExists) {
      return res.status(400).json({ message: 'Question not found in this exam' });
    }
    
    await Exam.saveAnswer(examId, questionId, answer);
    
    // Get the updated exam to verify the answer was saved
    const updatedExam = await Exam.findById(examId);
    const savedAnswer = updatedExam.answers[questionId];
    
    console.log('Answer saved verification:', {
      questionId,
      sentAnswer: answer,
      savedAnswer,
      match: savedAnswer === answer
    });
    
    res.json({ 
      message: 'Answer saved',
      saved: true,
      answer: savedAnswer
    });
  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getResults = async (req, res) => {
  try {
    console.log('Getting results for student:', req.student.id);
    
    const exams = await Exam.findByStudent(req.student.id, 'completed');
    
    const results = exams.map(exam => {
      const questions = exam.questions || [];
      const totalQuestions = questions.length;
      const answeredQuestions = Object.keys(exam.answers || {}).length;
      const correctAnswers = questions.filter(q => 
        exam.answers[q.id] && exam.answers[q.id] === q.correctAnswer
      ).length;
      
      // Calculate actual total marks from subjects
      let actualTotalMarks = exam.totalMarks;
      if (exam.subjects && exam.subjects.length > 0) {
        actualTotalMarks = exam.subjects.reduce((sum, subject) => 
          sum + (subject.totalMarks || 0), 0
        );
      }
      
      return {
        id: exam.id,
        examSetupId: exam.examSetupId,
        title: exam.title,
        subjects: exam.subjects,
        score: exam.score || 0,
        totalMarks: actualTotalMarks,
        percentage: exam.percentage || 0,
        correctAnswers,
        wrongAnswers: answeredQuestions - correctAnswers,
        unanswered: totalQuestions - answeredQuestions,
        totalQuestions,
        date: exam.endTime || exam.createdAt,
        duration: exam.duration,
        status: exam.status
      };
    });
    
    res.json({ results });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPerformance = async (req, res) => {
  try {
    console.log('Getting performance for student:', req.student.id);
    
    const exams = await Exam.findByStudent(req.student.id, 'completed');
    
    const performance = {
      totalExams: exams.length,
      averageScore: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalQuestions: 0,
      subjects: {}
    };
    
    if (exams.length > 0) {
      let totalPercentage = 0;
      
      exams.forEach(exam => {
        const questions = exam.questions || [];
        const answeredQuestions = Object.keys(exam.answers || {}).length;
        const correctCount = questions.filter(q => 
          exam.answers[q.id] && exam.answers[q.id] === q.correctAnswer
        ).length;
        
        totalPercentage += exam.percentage || 0;
        performance.totalCorrect += correctCount;
        performance.totalWrong += answeredQuestions - correctCount;
        performance.totalQuestions += questions.length;
        
        // Group by subjects
        if (exam.subjects && exam.subjects.length > 0) {
          exam.subjects.forEach(subjectConfig => {
            const subjectName = subjectConfig.subjectName;
            if (!performance.subjects[subjectName]) {
              performance.subjects[subjectName] = {
                attempts: 0,
                totalScore: 0,
                totalMarks: 0,
                averagePercentage: 0,
                bestScore: 0
              };
            }
            
            performance.subjects[subjectName].attempts++;
            performance.subjects[subjectName].totalScore += exam.score || 0;
            performance.subjects[subjectName].totalMarks += exam.totalMarks || 0;
            performance.subjects[subjectName].bestScore = Math.max(
              performance.subjects[subjectName].bestScore,
              exam.score || 0
            );
          });
        }
      });
      
      performance.averageScore = (totalPercentage / exams.length).toFixed(1);
      
      // Calculate average percentages for subjects
      Object.keys(performance.subjects).forEach(subject => {
        const subj = performance.subjects[subject];
        const avgPercentage = (subj.totalScore / subj.totalMarks) * 100;
        subj.averagePercentage = avgPercentage.toFixed(1);
      });
    }
    
    res.json({ performance });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Legacy method - kept for backward compatibility
const startExam = async (req, res) => {
  try {
    const { subjectId } = req.body;
    
    console.log('Legacy startExam called with subjectId:', subjectId);
    console.log('This method is deprecated. Please use examSetupController.startStudentExam instead.');
    
    const student = await Student.findById(req.student.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Find active exam setups for this student's class
    const ExamSetup = require('../models/ExamSetup');
    const activeExams = await ExamSetup.getActiveExamsForStudent(
      req.student.id,
      student.schoolId,
      student.class
    );
    
    // Find an exam that includes this subject
    const matchingExam = activeExams.find(exam => 
      exam.subjects.some(s => s.subjectId === subjectId)
    );
    
    if (matchingExam) {
      // Redirect to the proper start method
      req.body.examSetupId = matchingExam.id;
      return require('./examSetupController').startStudentExam(req, res);
    }
    
    return res.status(404).json({ 
      message: 'No active exam found for this subject',
      deprecated: true,
      suggestion: 'Please use the new exam setup system'
    });
  } catch (error) {
    console.error('Legacy start exam error:', error);
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