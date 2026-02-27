const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const Ticket = require('../models/Ticket');
const School = require('../models/School');
const Subject = require('../models/Subject');
const Question = require('../models/Question');
const SubscriptionService = require('../services/subscriptionService');
const EmailService = require('../services/emailService');

const removeUndefined = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const getProfile = async (req, res) => {
  try {
    const { password, ...admin } = req.user;
    const subscriptionStatus = await SubscriptionService.checkSubscriptionStatus(req.user.id);
    res.json({ 
      admin,
      subscription: req.user.subscription || null,
      subscriptionStatus
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    const updatedAdmin = await User.update(req.user.id, updateData);
    
    const { password, ...adminWithoutPassword } = updatedAdmin;
    
    res.json({
      message: 'Profile updated successfully',
      admin: adminWithoutPassword
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const admin = await User.findById(req.user.id);
    
    const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await User.update(req.user.id, { password: hashedPassword });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll({ isGlobal: true });
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
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    res.json({ subject });
  } catch (error) {
    console.error('Get subject by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getSubscriptionPlans = async (req, res) => {
  try {
    res.json({
      plans: SubscriptionService.subscriptionPlans,
      currentSubscription: req.user.subscription || null
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({ message: error.message });
  }
};

const activateSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!SubscriptionService.subscriptionPlans[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }
    
    const subscriptionData = await SubscriptionService.activateSubscription(
      req.user.id, 
      plan, 
      'self'
    );
    
    try {
      await EmailService.sendSubscriptionActivationEmail(
        req.user.email,
        req.user.name,
        subscriptionData
      );
    } catch (emailError) {
      console.error('Subscription activation email failed:', emailError);
    }
    
    res.json({
      message: 'Subscription activated successfully',
      subscription: subscriptionData
    });
  } catch (error) {
    console.error('Activate subscription error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const status = await SubscriptionService.checkSubscriptionStatus(req.user.id);
    res.json({
      status,
      subscription: req.user.subscription || null
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ message: error.message });
  }
};

const createStudent = async (req, res) => {
  try {
    const subscriptionStatus = await SubscriptionService.checkSubscriptionStatus(req.user.id);
    if (!subscriptionStatus.active) {
      return res.status(403).json({ 
        message: 'Active subscription required to create students',
        subscription: subscriptionStatus
      });
    }
    
    const { firstName, lastName, middleName, nin, phone, dateOfBirth, class: studentClass } = req.body;
    
    if (!firstName || !lastName || !studentClass) {
      return res.status(400).json({ 
        message: 'Missing required fields: firstName, lastName, and class are required' 
      });
    }
    
    const school = await School.findById(req.user.schoolId);
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    const schoolDomain = school.email ? school.email.split('@')[1] : 'school.edu.ng';
    
    const baseLoginId = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    let finalLoginId = baseLoginId;
    let counter = 1;
    const maxAttempts = 100;
    
    while (counter <= maxAttempts) {
      const existingStudents = await Student.findAll({ loginId: finalLoginId });
      if (existingStudents.length === 0) {
        break;
      }
      finalLoginId = `${baseLoginId}${counter.toString().padStart(3, '0')}`;
      counter++;
    }
    
    if (counter > maxAttempts) {
      return res.status(500).json({ 
        message: 'Unable to generate unique login ID after multiple attempts' 
      });
    }
    
    const email = `${finalLoginId}@${schoolDomain}`;
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const subjects = ['Mathematics', 'English'];
    
    const studentData = removeUndefined({
      firstName,
      lastName,
      middleName,
      nin,
      phone,
      dateOfBirth,
      class: studentClass,
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
      loginId: finalLoginId,
      email,
      password: hashedPassword,
      status: 'active',
      subjects,
      examMode: false,
      currentExam: null
    });
    
    const student = await Student.create(studentData);
    
    const { password, ...studentWithoutPassword } = student;
    
    res.status(201).json({
      message: 'Student created successfully',
      student: studentWithoutPassword,
      credentials: {
        loginId: finalLoginId,
        email,
        password: '123456'
      }
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({ schoolId: req.user.schoolId });
    
    const studentsWithoutPassword = students.map(({ password, ...rest }) => rest);
    
    res.json({ students: studentsWithoutPassword });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findById(studentId);
    
    if (!student || student.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const exams = await Exam.findByStudent(studentId);
    const performance = await Exam.getResults(studentId);
    
    const { password, ...studentWithoutPassword } = student;
    
    res.json({
      student: studentWithoutPassword,
      exams,
      performance
    });
  } catch (error) {
    console.error('Get student by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findById(studentId);
    
    if (!student || student.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const updateData = removeUndefined(req.body);
    const updatedStudent = await Student.update(studentId, updateData);
    
    const { password, ...studentWithoutPassword } = updatedStudent;
    
    res.json({
      message: 'Student updated successfully',
      student: studentWithoutPassword
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findById(studentId);
    
    if (!student || student.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    await Student.delete(studentId);
    
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: error.message });
  }
};

const toggleExamMode = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examMode } = req.body;
    
    const student = await Student.findById(studentId);
    
    if (!student || student.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const updatedStudent = await Student.toggleExamMode(studentId, examMode);
    
    const { password, ...studentWithoutPassword } = updatedStudent;
    
    res.json({
      message: `Exam mode ${examMode ? 'enabled' : 'disabled'} successfully`,
      student: studentWithoutPassword
    });
  } catch (error) {
    console.error('Toggle exam mode error:', error);
    res.status(500).json({ message: error.message });
  }
};

const addStudentSubject = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subjectId } = req.body;
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const student = await Student.findById(studentId);
    
    if (!student || student.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const subjects = student.subjects || [];
    
    if (subjects.includes(subject.name)) {
      return res.status(400).json({ message: 'Subject already assigned to student' });
    }
    
    subjects.push(subject.name);
    
    const updatedStudent = await Student.update(studentId, { subjects });
    
    res.json({
      message: 'Subject added successfully',
      subjects: updatedStudent.subjects
    });
  } catch (error) {
    console.error('Add subject error:', error);
    res.status(500).json({ message: error.message });
  }
};

const removeStudentSubject = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject } = req.body;
    
    if (subject === 'Mathematics' || subject === 'English') {
      return res.status(400).json({ message: 'Cannot remove required subjects' });
    }
    
    const student = await Student.findById(studentId);
    
    if (!student || student.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const subjects = student.subjects.filter(s => s !== subject);
    
    const updatedStudent = await Student.update(studentId, { subjects });
    
    res.json({
      message: 'Subject removed successfully',
      subjects: updatedStudent.subjects
    });
  } catch (error) {
    console.error('Remove subject error:', error);
    res.status(500).json({ message: error.message });
  }
};

const createTicket = async (req, res) => {
  try {
    const { subject, category, priority, description } = req.body;
    
    const ticketData = removeUndefined({
      subject,
      category,
      priority,
      description,
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
      createdByType: 'admin'
    });
    
    const ticket = await Ticket.create(ticketData);
    
    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ schoolId: req.user.schoolId });
    res.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: error.message });
  }
};

const replyToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket || ticket.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const updatedTicket = await Ticket.addMessage(ticketId, {
      sender: 'admin',
      senderId: req.user.id,
      content: message
    });
    
    res.json({
      message: 'Reply sent successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const subscriptionStatus = await SubscriptionService.checkSubscriptionStatus(req.user.id);
    
    const students = await Student.findAll({ schoolId: req.user.schoolId });
    const totalStudents = students.length;
    
    const exams = await Exam.findBySchool(req.user.schoolId);
    
    const totalExams = exams.length;
    const averageScore = exams.reduce((sum, exam) => sum + (exam.score || 0), 0) / totalExams || 0;
    
    const recentExams = exams.slice(0, 10);
    
    const studentsInExamMode = students.filter(s => s.examMode).length;
    
    const subjectPerformance = {};
    exams.forEach(exam => {
      if (!subjectPerformance[exam.subject]) {
        subjectPerformance[exam.subject] = {
          total: 0,
          count: 0
        };
      }
      subjectPerformance[exam.subject].total += exam.score || 0;
      subjectPerformance[exam.subject].count++;
    });
    
    Object.keys(subjectPerformance).forEach(subject => {
      subjectPerformance[subject].average = 
        subjectPerformance[subject].total / subjectPerformance[subject].count;
    });
    
    const tickets = await Ticket.findAll({ schoolId: req.user.schoolId });
    const openTickets = tickets.filter(t => t.status === 'open').length;
    
    res.json({
      subscription: subscriptionStatus,
      stats: {
        totalStudents,
        studentsInExamMode,
        totalExams,
        averageScore,
        openTickets
      },
      recentExams,
      subjectPerformance
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAllSubjects,
  getSubjectById,
  getSubscriptionPlans,
  activateSubscription,
  getSubscriptionStatus,
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  toggleExamMode,
  addStudentSubject,
  removeStudentSubject,
  createTicket,
  getTickets,
  replyToTicket,
  getDashboardStats
};