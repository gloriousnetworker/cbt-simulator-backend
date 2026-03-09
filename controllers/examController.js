// controllers/examController.js
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const ExamSetup = require('../models/ExamSetup');

// Note: startExam is now handled by examSetupController.startStudentExam
// This controller handles the other exam operations

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
    
    // Add result to exam setup if it exists
    if (exam.examSetupId) {
      const examSetup = await ExamSetup.findById(exam.examSetupId);
      if (examSetup) {
        await ExamSetup.addResult(exam.examSetupId, req.student.id, {
          examId: examId,
          score: totalScore,
          totalMarks: exam.totalMarks,
          percentage: parseFloat(percentage),
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
    
    console.log('Getting exam by ID:', examId);
    console.log('Student ID:', req.student.id);
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Remove correctAnswer from questions for client
    const examForClient = {
      id: exam.id,
      examSetupId: exam.examSetupId,
      subjects: exam.subjects,
      subject: exam.subject,
      duration: exam.duration,
      questionCount: exam.questionCount,
      questions: exam.questions.map(({ correctAnswer, ...rest }) => rest),
      answers: exam.answers || {},
      startTime: exam.startTime,
      status: exam.status,
      timeSpent: exam.timeSpent || 0,
      score: exam.score,
      totalMarks: exam.totalMarks,
      percentage: exam.percentage,
      tabSwitches: exam.tabSwitches,
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
      
      // Add result to exam setup if it exists
      if (exam.examSetupId) {
        const examSetup = await ExamSetup.findById(exam.examSetupId);
        if (examSetup) {
          await ExamSetup.addResult(exam.examSetupId, req.student.id, {
            examId: examId,
            score: totalScore,
            totalMarks: exam.totalMarks,
            percentage: parseFloat(percentage),
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
    
    console.log('Saving answer for exam:', examId, 'question:', questionId, 'answer:', answer);
    
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
    console.log('Getting results for student:', req.student.id);
    
    const exams = await Exam.findByStudent(req.student.id, 'completed');
    
    const results = exams.map(exam => {
      // Get exam setup details if available
      const subjectsList = exam.subjects || [];
      const subjectNames = subjectsList.map(s => s.subjectName).join(', ');
      
      return {
        id: exam.id,
        examSetupId: exam.examSetupId,
        title: exam.title,
        subjects: subjectsList,
        subject: exam.subject || subjectNames,
        score: exam.score || 0,
        totalMarks: exam.totalMarks || 0,
        percentage: exam.percentage || 0,
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
    
    const performance = await Exam.getResults(req.student.id);
    
    // Enhance performance with subject details
    const enhancedPerformance = {
      ...performance,
      subjects: {}
    };
    
    // Get all completed exams
    const exams = await Exam.findByStudent(req.student.id, 'completed');
    
    // Group by subject for detailed performance
    exams.forEach(exam => {
      if (exam.subjects && exam.subjects.length > 0) {
        exam.subjects.forEach(subjectConfig => {
          const subjectName = subjectConfig.subjectName;
          if (!enhancedPerformance.subjects[subjectName]) {
            enhancedPerformance.subjects[subjectName] = {
              attempts: 0,
              totalScore: 0,
              averagePercentage: 0,
              bestScore: 0,
              lastAttempt: null
            };
          }
          
          // For now, we approximate per-subject score
          // This can be enhanced if you store per-subject scores separately
          const subjectScore = exam.score * (subjectConfig.totalMarks / exam.totalMarks);
          
          enhancedPerformance.subjects[subjectName].attempts++;
          enhancedPerformance.subjects[subjectName].totalScore += subjectScore;
          enhancedPerformance.subjects[subjectName].bestScore = Math.max(
            enhancedPerformance.subjects[subjectName].bestScore,
            subjectScore
          );
          enhancedPerformance.subjects[subjectName].lastAttempt = exam.endTime || exam.createdAt;
        });
      } else if (exam.subject) {
        // Fallback for old exam format
        if (!enhancedPerformance.subjects[exam.subject]) {
          enhancedPerformance.subjects[exam.subject] = {
            attempts: 0,
            totalScore: 0,
            averagePercentage: 0,
            bestScore: 0,
            lastAttempt: null
          };
        }
        
        enhancedPerformance.subjects[exam.subject].attempts++;
        enhancedPerformance.subjects[exam.subject].totalScore += exam.score || 0;
        enhancedPerformance.subjects[exam.subject].bestScore = Math.max(
          enhancedPerformance.subjects[exam.subject].bestScore,
          exam.score || 0
        );
        enhancedPerformance.subjects[exam.subject].lastAttempt = exam.endTime || exam.createdAt;
      }
    });
    
    // Calculate average percentages for each subject
    Object.keys(enhancedPerformance.subjects).forEach(subject => {
      const subj = enhancedPerformance.subjects[subject];
      subj.averagePercentage = (subj.totalScore / subj.attempts).toFixed(1);
    });
    
    res.json({ performance: enhancedPerformance });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Note: startExam is now handled by examSetupController.startStudentExam
// This function is kept for backward compatibility but will redirect
const startExam = async (req, res) => {
  try {
    const { subjectId } = req.body;
    
    console.log('Legacy startExam called with subjectId:', subjectId);
    console.log('This method is deprecated. Please use examSetupController.startStudentExam instead.');
    
    // For backward compatibility, try to find an active exam setup for this subject
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
  startExam, // Kept for backward compatibility
  submitExam,
  getExamById,
  recordTabSwitch,
  saveAnswer,
  getResults,
  getPerformance
};