const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const Ticket = require('../models/Ticket');

const createStudent = async (req, res) => {
  try {
    const { firstName, lastName, middleName, nin, phone, dateOfBirth, class: studentClass } = req.body;
    
    const loginId = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const email = `${loginId}@${req.user.schoolName?.toLowerCase().replace(/\s+/g, '') || 'school'}.edu.ng`;
    
    let finalLoginId = loginId;
    let counter = 1;
    
    while (await Student.findAll({ loginId: finalLoginId }).length > 0) {
      finalLoginId = `${loginId}${counter.toString().padStart(3, '0')}`;
      counter++;
    }
    
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const student = await Student.create({
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
      subjects: ['Mathematics', 'English']
    });
    
    const { password: _, ...studentWithoutPassword } = student;
    
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
    res.status(500).json({ message: error.message });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({ schoolId: req.user.schoolId });
    
    const studentsWithoutPassword = students.map(({ password, ...rest }) => rest);
    
    res.json({ students: studentsWithoutPassword });
  } catch (error) {
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
    
    const { password: _, ...studentWithoutPassword } = student;
    
    res.json({
      student: studentWithoutPassword,
      exams,
      performance
    });
  } catch (error) {
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
    
    const updatedStudent = await Student.update(studentId, req.body);
    
    const { password: _, ...studentWithoutPassword } = updatedStudent;
    
    res.json({
      message: 'Student updated successfully',
      student: studentWithoutPassword
    });
  } catch (error) {
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
    res.status(500).json({ message: error.message });
  }
};

const createTicket = async (req, res) => {
  try {
    const { subject, category, priority, description } = req.body;
    
    const ticket = await Ticket.create({
      subject,
      category,
      priority,
      description,
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
      createdByType: 'admin'
    });
    
    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ schoolId: req.user.schoolId });
    res.json({ tickets });
  } catch (error) {
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
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const students = await Student.findAll({ schoolId: req.user.schoolId });
    const totalStudents = students.length;
    
    const exams = await Exam.findBySchool(req.user.schoolId);
    
    const totalExams = exams.length;
    const averageScore = exams.reduce((sum, exam) => sum + (exam.score || 0), 0) / totalExams || 0;
    
    const recentExams = exams.slice(0, 10);
    
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
      stats: {
        totalStudents,
        totalExams,
        averageScore,
        openTickets
      },
      recentExams,
      subjectPerformance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addStudentSubject = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject } = req.body;
    
    const student = await Student.findById(studentId);
    
    if (!student || student.schoolId !== req.user.schoolId) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const subjects = student.subjects || ['Mathematics', 'English'];
    
    if (subjects.includes(subject)) {
      return res.status(400).json({ message: 'Subject already assigned' });
    }
    
    subjects.push(subject);
    
    const updatedStudent = await Student.update(studentId, { subjects });
    
    res.json({
      message: 'Subject added successfully',
      subjects: updatedStudent.subjects
    });
  } catch (error) {
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
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  createTicket,
  getTickets,
  replyToTicket,
  getDashboardStats,
  addStudentSubject,
  removeStudentSubject
};