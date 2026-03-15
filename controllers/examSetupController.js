const ExamSetup = require('../models/ExamSetup');
const Subject = require('../models/Subject');
const Question = require('../models/Question');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const SubscriptionService = require('../services/subscriptionService');

const removeUndefined = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const createExamSetup = async (req, res) => {
  try {
    const subscriptionStatus = await SubscriptionService.checkSubscriptionStatus(req.user.id);
    if (!subscriptionStatus.active) {
      return res.status(403).json({ 
        message: 'Active subscription required to create exams',
        subscription: subscriptionStatus
      });
    }
    
    const { 
      title,
      description,
      class: studentClass,
      subjects,
      duration,
      totalMarks,
      passMark,
      startDate,
      startTime,
      endDate,
      endTime,
      instructions,
      shuffleQuestions,
      showResults,
      allowRetake,
      questionSelection
    } = req.body;
    
    if (!title || !studentClass || !subjects || !subjects.length || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: title, class, subjects, startDate, and endDate are required' 
      });
    }
    
    const startDateTime = new Date(`${startDate}T${startTime || '00:00'}`);
    const endDateTime = new Date(`${endDate}T${endTime || '23:59'}`);
    
    if (startDateTime >= endDateTime) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    const examSubjects = [];
    let totalQuestions = 0;
    let calculatedTotalMarks = 0;
    
    for (const subjectConfig of subjects) {
      const subject = await Subject.findById(subjectConfig.subjectId);
      if (!subject) {
        return res.status(404).json({ message: `Subject not found: ${subjectConfig.subjectId}` });
      }
      
      const questions = await Question.findAll({
        subjectId: subjectConfig.subjectId,
        class: studentClass,
        mode: 'exam',
        schoolId: req.user.schoolId
      });
      
      console.log(`Found ${questions.length} questions for subject ${subject.name} in school ${req.user.schoolId}`);
      
      if (questions.length === 0) {
        return res.status(400).json({ 
          message: `No questions available for subject: ${subject.name} in class ${studentClass}. Please create questions first.` 
        });
      }
      
      if (subjectConfig.questionCount && subjectConfig.questionCount > questions.length) {
        return res.status(400).json({ 
          message: `Subject ${subject.name} only has ${questions.length} questions available, but you requested ${subjectConfig.questionCount}` 
        });
      }
      
      let selectedQuestions = [];
      if (subjectConfig.questionCount && subjectConfig.questionCount > 0) {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        selectedQuestions = shuffled.slice(0, subjectConfig.questionCount);
      } else {
        selectedQuestions = questions;
      }
      
      const subjectMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      
      examSubjects.push({
        subjectId: subjectConfig.subjectId,
        subjectName: subject.name,
        questionCount: selectedQuestions.length,
        totalMarks: subjectMarks,
        questions: selectedQuestions.map(q => q.id)
      });
      
      totalQuestions += selectedQuestions.length;
      calculatedTotalMarks += subjectMarks;
    }
    
    const examData = removeUndefined({
      title,
      description,
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
      class: studentClass,
      subjects: examSubjects,
      duration: duration || 120,
      totalMarks: calculatedTotalMarks,
      passMark: passMark || 50,
      startDateTime,
      endDateTime,
      instructions,
      shuffleQuestions: shuffleQuestions !== false,
      showResults: showResults !== false,
      allowRetake: allowRetake || false,
      questionSelection: questionSelection || 'random',
      status: 'draft',
      assignedStudents: [],
      results: {}
    });
    
    const exam = await ExamSetup.create(examData);
    
    res.status(201).json({
      message: 'Exam setup created successfully',
      exam: {
        ...exam,
        totalMarks: calculatedTotalMarks
      }
    });
  } catch (error) {
    console.error('Create exam setup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllExamSetups = async (req, res) => {
  try {
    const { status, class: studentClass } = req.query;
    
    const filters = { schoolId: req.user.schoolId };
    if (status) filters.status = status;
    if (studentClass) filters.class = studentClass;
    
    const exams = await ExamSetup.findAll(filters);
    
    res.json({ exams });
  } catch (error) {
    console.error('Get all exam setups error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getExamSetupById = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await ExamSetup.findById(examId);
    
    if (!exam || exam.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const subjects = [];
    for (const subjectConfig of exam.subjects) {
      const questions = await Question.findAll({
        subjectId: subjectConfig.subjectId,
        class: exam.class,
        mode: 'exam',
        schoolId: req.user.schoolId
      });
      
      subjects.push({
        ...subjectConfig,
        availableQuestions: questions.length
      });
    }
    
    res.json({ 
      exam: {
        ...exam,
        subjects
      }
    });
  } catch (error) {
    console.error('Get exam setup by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateExamSetup = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await ExamSetup.findById(examId);
    
    if (!exam || exam.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft exams can be updated' });
    }
    
    const updateData = removeUndefined(req.body);
    
    if (updateData.startDate || updateData.endDate) {
      const startDateTime = new Date(`${updateData.startDate || exam.startDate}T${updateData.startTime || '00:00'}`);
      const endDateTime = new Date(`${updateData.endDate || exam.endDate}T${updateData.endTime || '23:59'}`);
      
      if (startDateTime >= endDateTime) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
      
      updateData.startDateTime = startDateTime;
      updateData.endDateTime = endDateTime;
    }
    
    if (updateData.subjects) {
      let recalculatedTotalMarks = 0;
      for (const subjectConfig of updateData.subjects) {
        const subject = await Subject.findById(subjectConfig.subjectId);
        if (!subject) {
          return res.status(404).json({ message: `Subject not found: ${subjectConfig.subjectId}` });
        }
        
        const questions = await Question.findAll({
          subjectId: subjectConfig.subjectId,
          class: updateData.class || exam.class,
          mode: 'exam',
          schoolId: req.user.schoolId
        });
        
        if (subjectConfig.questionCount && subjectConfig.questionCount > questions.length) {
          return res.status(400).json({ 
            message: `Subject ${subject.name} only has ${questions.length} questions available, but you requested ${subjectConfig.questionCount}` 
          });
        }
        
        let selectedQuestions = [];
        if (subjectConfig.questionCount && subjectConfig.questionCount > 0) {
          const shuffled = [...questions].sort(() => 0.5 - Math.random());
          selectedQuestions = shuffled.slice(0, subjectConfig.questionCount);
        } else {
          selectedQuestions = questions;
        }
        
        const subjectMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
        recalculatedTotalMarks += subjectMarks;
        subjectConfig.totalMarks = subjectMarks;
        subjectConfig.questions = selectedQuestions.map(q => q.id);
      }
      updateData.totalMarks = recalculatedTotalMarks;
    }
    
    const updatedExam = await ExamSetup.update(examId, updateData);
    
    res.json({
      message: 'Exam setup updated successfully',
      exam: updatedExam
    });
  } catch (error) {
    console.error('Update exam setup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteExamSetup = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await ExamSetup.findById(examId);
    
    if (!exam || exam.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status === 'active') {
      return res.status(400).json({ message: 'Cannot delete an active exam' });
    }
    
    await ExamSetup.delete(examId);
    
    res.json({ message: 'Exam setup deleted successfully' });
  } catch (error) {
    console.error('Delete exam setup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const activateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { studentIds } = req.body;
    
    const exam = await ExamSetup.findById(examId);
    
    if (!exam || exam.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status !== 'draft') {
      return res.status(400).json({ message: 'Exam is already activated or completed' });
    }
    
    let assignedStudents = [];
    
    if (studentIds && studentIds.length > 0) {
      assignedStudents = studentIds;
    } else {
      const students = await Student.findAll({ 
        schoolId: req.user.schoolId,
        class: exam.class
      });
      assignedStudents = students.map(s => s.id);
    }
    
    const updatedExam = await ExamSetup.update(examId, {
      status: 'active',
      assignedStudents
    });
    
    res.json({
      message: `Exam activated successfully for ${assignedStudents.length} students`,
      exam: updatedExam
    });
  } catch (error) {
    console.error('Activate exam error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deactivateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await ExamSetup.findById(examId);
    
    if (!exam || exam.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status !== 'active') {
      return res.status(400).json({ message: 'Exam is not active' });
    }
    
    const updatedExam = await ExamSetup.update(examId, {
      status: 'completed'
    });
    
    res.json({
      message: 'Exam deactivated successfully',
      exam: updatedExam
    });
  } catch (error) {
    console.error('Deactivate exam error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await ExamSetup.findById(examId);
    
    if (!exam || exam.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const results = await ExamSetup.getResults(examId);
    
    const summary = {
      totalStudents: results.length,
      submittedCount: results.filter(r => r.submitted).length,
      averageScore: 0,
      passRate: 0,
      distinctionRate: 0
    };
    
    if (results.length > 0) {
      const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
      summary.averageScore = totalScore / results.length;
      
      const passed = results.filter(r => (r.percentage || 0) >= exam.passMark).length;
      summary.passRate = (passed / results.length) * 100;
      
      const distinctions = results.filter(r => (r.percentage || 0) >= 75).length;
      summary.distinctionRate = (distinctions / results.length) * 100;
    }
    
    res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        totalMarks: exam.totalMarks,
        passMark: exam.passMark
      },
      summary,
      results
    });
  } catch (error) {
    console.error('Get exam results error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const assignStudentsToExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { studentIds } = req.body;
    
    if (!studentIds || !studentIds.length) {
      return res.status(400).json({ message: 'No students provided' });
    }
    
    const exam = await ExamSetup.findById(examId);
    
    if (!exam || exam.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const updatedExam = await ExamSetup.assignStudents(examId, studentIds);
    
    res.json({
      message: `Exam assigned to ${studentIds.length} students successfully`,
      exam: updatedExam
    });
  } catch (error) {
    console.error('Assign students to exam error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const startStudentExam = async (req, res) => {
  try {
    const { examSetupId } = req.body;
    const studentId = req.student.id;
    
    console.log('Starting exam with examSetupId:', examSetupId);
    console.log('Student ID:', studentId);
    
    if (!examSetupId) {
      return res.status(400).json({ message: 'examSetupId is required in request body' });
    }
    
    const examSetup = await ExamSetup.findById(examSetupId);
    
    if (!examSetup) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    const now = new Date();
    const startDateTime = examSetup.startDateTime?.toDate ? examSetup.startDateTime.toDate() : new Date(examSetup.startDateTime);
    const endDateTime = examSetup.endDateTime?.toDate ? examSetup.endDateTime.toDate() : new Date(examSetup.endDateTime);
    
    if (now < startDateTime) {
      return res.status(403).json({ message: 'Exam has not started yet' });
    }
    
    if (now > endDateTime) {
      return res.status(403).json({ message: 'Exam has already ended' });
    }
    
    if (examSetup.status !== 'active') {
      return res.status(403).json({ message: 'Exam is not active' });
    }
    
    if (!examSetup.assignedStudents.includes(studentId) && examSetup.assignedStudents.length > 0) {
      return res.status(403).json({ message: 'You are not assigned to this exam' });
    }
    
    const existingExam = await Exam.findByStudent(studentId);
    const inProgressExam = existingExam.find(e => e.examSetupId === examSetupId && e.status === 'in_progress');
    
    if (inProgressExam) {
      const examQuestions = inProgressExam.questions.map(({ correctAnswer, ...rest }) => rest);
      
      return res.json({
        message: 'Resuming existing exam',
        exam: {
          id: inProgressExam.id,
          examSetupId: examSetupId,
          title: examSetup.title,
          subjects: examSetup.subjects,
          duration: examSetup.duration,
          questions: examQuestions,
          answers: inProgressExam.answers || {},
          startTime: inProgressExam.startTime,
          status: inProgressExam.status,
          timeSpent: inProgressExam.timeSpent || 0,
          instructions: examSetup.instructions
        }
      });
    }
    
    const completedExam = existingExam.find(e => e.examSetupId === examSetupId && e.status === 'completed');
    if (completedExam && !examSetup.allowRetake) {
      return res.status(403).json({ message: 'You have already taken this exam and retakes are not allowed' });
    }
    
    let allQuestions = [];
    for (const subjectConfig of examSetup.subjects) {
      if (subjectConfig.questions && subjectConfig.questions.length > 0) {
        const questions = await Question.findAll({
          ids: subjectConfig.questions
        });
        
        allQuestions = [...allQuestions, ...questions];
      }
    }
    
    if (examSetup.shuffleQuestions) {
      allQuestions.sort(() => 0.5 - Math.random());
    }
    
    const examQuestions = allQuestions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      marks: q.marks || 1,
      difficulty: q.difficulty,
      topic: q.topic,
      subjectId: q.subjectId,
      subjectName: q.subjectName
    }));
    
    const exam = await Exam.create({
      studentId: studentId,
      schoolId: req.student.schoolId,
      examSetupId: examSetupId,
      title: examSetup.title,
      subjects: examSetup.subjects,
      duration: examSetup.duration,
      questionCount: examQuestions.length,
      questions: allQuestions,
      startTime: now,
      status: 'in_progress',
      answers: {},
      tabSwitches: 0,
      score: 0,
      totalMarks: examSetup.totalMarks
    });
    
    await Student.setCurrentExam(studentId, exam.id);
    
    res.status(201).json({
      message: 'Exam started',
      exam: {
        id: exam.id,
        examSetupId: examSetupId,
        title: examSetup.title,
        subjects: examSetup.subjects,
        duration: exam.duration,
        questionCount: exam.questionCount,
        questions: examQuestions,
        startTime: exam.startTime,
        status: exam.status,
        instructions: examSetup.instructions
      }
    });
  } catch (error) {
    console.error('Start student exam error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const submitStudentExam = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId);
    
    if (!exam || exam.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    if (exam.status === 'completed') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }
    
    const examSetup = await ExamSetup.findById(exam.examSetupId);
    
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
    
    res.json({
      message: 'Exam submitted successfully',
      exam: {
        id: updatedExam.id,
        examSetupId: updatedExam.examSetupId,
        score: updatedExam.score,
        totalMarks: updatedExam.totalMarks,
        percentage: updatedExam.percentage,
        endTime: updatedExam.endTime
      }
    });
  } catch (error) {
    console.error('Submit student exam error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAvailableExamsForStudent = async (req, res) => {
  try {
    console.log('Getting available exams for student:', req.student.id);
    
    const student = await Student.findById(req.student.id);
    
    if (!student) {
      console.log('Student not found');
      return res.status(404).json({ message: 'Student not found' });
    }
    
    console.log('Student details:', {
      id: student.id,
      schoolId: student.schoolId,
      class: student.class
    });
    
    const activeExams = await ExamSetup.getActiveExamsForStudent(
      req.student.id,
      student.schoolId,
      student.class
    );
    
    console.log(`Found ${activeExams.length} active exams for student`);
    
    res.json({ exams: activeExams });
  } catch (error) {
    console.error('Get available exams error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createExamSetup,
  getAllExamSetups,
  getExamSetupById,
  updateExamSetup,
  deleteExamSetup,
  activateExam,
  deactivateExam,
  getExamResults,
  assignStudentsToExam,
  startStudentExam,
  submitStudentExam,
  getAvailableExamsForStudent
};