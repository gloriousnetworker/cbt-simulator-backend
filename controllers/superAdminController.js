const bcrypt = require('bcryptjs');
const User = require('../models/User');
const School = require('../models/School');
const Student = require('../models/Student');
const Ticket = require('../models/Ticket');
const SubscriptionService = require('../services/subscriptionService');

const createAdmin = async (req, res) => {
  try {
    const { email, password, name, schoolId, subscription } = req.body;
    
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const school = await School.findById(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const expiryDate = SubscriptionService.calculateExpiryDate(subscription.plan);
    
    const admin = await User.create({
      email,
      password: hashedPassword,
      name,
      role: 'admin',
      schoolId,
      status: 'active',
      subscription: {
        plan: subscription.plan,
        startDate: new Date(),
        expiryDate,
        amount: SubscriptionService.subscriptionPlans[subscription.plan].price,
        active: true
      }
    });
    
    const { password: _, ...adminWithoutPassword } = admin;
    
    res.status(201).json({
      message: 'Admin created successfully',
      admin: adminWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllSchools = async (req, res) => {
  try {
    const schools = await School.findAll();
    
    const schoolsWithStats = await Promise.all(
      schools.map(async (school) => {
        const studentCount = await Student.getStudentCount(school.id);
        return {
          ...school,
          studentCount
        };
      })
    );
    
    res.json({ schools: schoolsWithStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSchool = async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    
    const school = await School.create({
      name,
      address,
      phone,
      email,
      status: 'active'
    });
    
    res.status(201).json({
      message: 'School created successfully',
      school
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .get();
    
    const admins = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const admin = { id: doc.id, ...doc.data() };
        const subscriptionStatus = await SubscriptionService.checkSubscriptionStatus(doc.id);
        return {
          ...admin,
          subscriptionStatus
        };
      })
    );
    
    const { password: _, ...adminsWithoutPassword } = admins;
    
    res.json({ admins: adminsWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll();
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const tickets = await Ticket.findAll({ status });
    res.json({ tickets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const respondToTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const updatedTicket = await Ticket.addMessage(ticketId, {
      sender: 'super_admin',
      senderId: req.user.id,
      content: message
    });
    
    res.json({
      message: 'Response sent successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;
    
    const ticket = await Ticket.updateStatus(ticketId, status);
    
    res.json({
      message: 'Ticket status updated',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const schools = await School.getStats();
    
    const adminsSnapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .get();
    const totalAdmins = adminsSnapshot.size;
    
    const studentsSnapshot = await db.collection('students').get();
    const totalStudents = studentsSnapshot.size;
    
    const examsSnapshot = await db.collection('exams').get();
    const totalExams = examsSnapshot.size;
    
    const ticketsSnapshot = await db.collection('tickets')
      .where('status', '==', 'open')
      .get();
    const openTickets = ticketsSnapshot.size;
    
    const totalRevenue = adminsSnapshot.docs.reduce((sum, doc) => {
      const admin = doc.data();
      return sum + (admin.subscription?.amount || 0);
    }, 0);
    
    res.json({
      stats: {
        totalSchools: schools.totalSchools,
        activeSchools: schools.activeSchools,
        totalAdmins,
        totalStudents,
        totalExams,
        openTickets,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateReport = async (req, res) => {
  try {
    const { type, format, startDate, endDate } = req.body;
    
    let report = {};
    
    switch (type) {
      case 'school':
        const schools = await School.findAll();
        report = {
          type: 'School Report',
          generatedAt: new Date(),
          schools: await Promise.all(
            schools.map(async (school) => ({
              ...school,
              studentCount: await Student.getStudentCount(school.id)
            }))
          )
        };
        break;
        
      case 'student':
        const students = await Student.findAll();
        report = {
          type: 'Student Report',
          generatedAt: new Date(),
          students,
          totalStudents: students.length
        };
        break;
        
      case 'performance':
        const exams = await db.collection('exams').get();
        const examData = exams.docs.map(doc => doc.data());
        const averageScore = examData.reduce((sum, exam) => sum + (exam.score || 0), 0) / examData.length || 0;
        
        report = {
          type: 'Performance Report',
          generatedAt: new Date(),
          totalExams: examData.length,
          averageScore,
          subjectBreakdown: {}
        };
        break;
        
      case 'revenue':
        const admins = await db.collection('users')
          .where('role', '==', 'admin')
          .get();
        
        report = {
          type: 'Revenue Report',
          generatedAt: new Date(),
          totalRevenue: admins.docs.reduce((sum, doc) => sum + (doc.data().subscription?.amount || 0), 0),
          subscriptions: admins.docs.map(doc => ({
            admin: doc.data().name,
            plan: doc.data().subscription?.plan,
            amount: doc.data().subscription?.amount,
            date: doc.data().subscription?.startDate
          }))
        };
        break;
    }
    
    if (format === 'csv') {
      // Convert to CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
      return res.send(report);
    }
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAdmin,
  getAllSchools,
  createSchool,
  getAllAdmins,
  getAllStudents,
  getTickets,
  respondToTicket,
  updateTicketStatus,
  getDashboardStats,
  generateReport
};