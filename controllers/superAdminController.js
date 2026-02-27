const bcrypt = require('bcryptjs');
const User = require('../models/User');
const School = require('../models/School');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Ticket = require('../models/Ticket');
const SubscriptionService = require('../services/subscriptionService');
const { db } = require('../config/firebase');

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
      emailVerified: true,
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
    console.error('Create admin error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.findAll({ role: 'admin' });
    
    const adminsWithStatus = await Promise.all(
      admins.map(async (admin) => {
        const subscriptionStatus = await SubscriptionService.checkSubscriptionStatus(admin.id);
        const { password, ...adminWithoutPassword } = admin;
        
        return {
          ...adminWithoutPassword,
          subscriptionStatus
        };
      })
    );
    
    res.json({ admins: adminsWithStatus });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAdminById = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    const subscriptionStatus = await SubscriptionService.checkSubscriptionStatus(adminId);
    const { password, ...adminWithoutPassword } = admin;
    
    res.json({
      admin: {
        ...adminWithoutPassword,
        subscriptionStatus
      }
    });
  } catch (error) {
    console.error('Get admin by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { name, email, subscription, status } = req.body;
    
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (status) updateData.status = status;
    
    if (subscription) {
      const expiryDate = SubscriptionService.calculateExpiryDate(subscription.plan);
      updateData.subscription = {
        ...admin.subscription,
        ...subscription,
        expiryDate: expiryDate || admin.subscription?.expiryDate,
        updatedAt: new Date()
      };
    }
    
    const updatedAdmin = await User.update(adminId, updateData);
    
    const { password, ...adminWithoutPassword } = updatedAdmin;
    
    res.json({
      message: 'Admin updated successfully',
      admin: adminWithoutPassword
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    await User.delete(adminId);
    
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: error.message });
  }
};

const toggleAdminStatus = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'suspended', 'expired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    const updatedAdmin = await User.toggleStatus(adminId, status);
    
    const { password, ...adminWithoutPassword } = updatedAdmin;
    
    res.json({
      message: `Admin ${status} successfully`,
      admin: adminWithoutPassword
    });
  } catch (error) {
    console.error('Toggle admin status error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAllSchools = async (req, res) => {
  try {
    const schools = await School.findAll();
    
    const schoolsWithStats = await Promise.all(
      schools.map(async (school) => {
        const studentCount = await Student.getStudentCount(school.id);
        const admins = await User.findAll({ schoolId: school.id, role: 'admin' });
        return {
          ...school,
          studentCount,
          adminCount: admins.length
        };
      })
    );
    
    res.json({ schools: schoolsWithStats });
  } catch (error) {
    console.error('Get all schools error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getSchoolById = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    const school = await School.findById(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    const studentCount = await Student.getStudentCount(schoolId);
    const admins = await User.findAll({ schoolId, role: 'admin' });
    const students = await Student.findAll({ schoolId });
    
    const studentsWithoutPassword = students.map(({ password, ...rest }) => rest);
    
    res.json({
      school: {
        ...school,
        studentCount,
        adminCount: admins.length
      },
      admins: admins.map(({ password, ...rest }) => rest),
      students: studentsWithoutPassword
    });
  } catch (error) {
    console.error('Get school by ID error:', error);
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
    console.error('Create school error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, address, phone, email, status } = req.body;
    
    const school = await School.findById(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (status) updateData.status = status;
    
    const updatedSchool = await School.update(schoolId, updateData);
    
    res.json({
      message: 'School updated successfully',
      school: updatedSchool
    });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    const school = await School.findById(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    const admins = await User.findAll({ schoolId, role: 'admin' });
    const students = await Student.findAll({ schoolId });
    
    if (admins.length > 0 || students.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete school with existing admins or students. Please delete them first.' 
      });
    }
    
    await School.delete(schoolId);
    
    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ message: error.message });
  }
};

const toggleSchoolStatus = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const school = await School.findById(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    const updatedSchool = await School.toggleStatus(schoolId, status);
    
    if (status === 'suspended') {
      const admins = await User.findAll({ schoolId, role: 'admin' });
      await Promise.all(
        admins.map(admin => User.toggleStatus(admin.id, 'suspended'))
      );
    }
    
    res.json({
      message: `School ${status} successfully`,
      school: updatedSchool
    });
  } catch (error) {
    console.error('Toggle school status error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll();
    
    const studentsWithoutPassword = students.map(({ password, ...rest }) => rest);
    
    res.json({ students: studentsWithoutPassword });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const tickets = await Ticket.findAll({ status });
    res.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    res.json({ ticket });
  } catch (error) {
    console.error('Get ticket by ID error:', error);
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
    console.error('Respond to ticket error:', error);
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
    console.error('Update ticket status error:', error);
    res.status(500).json({ message: error.message });
  }
};

const createSubject = async (req, res) => {
  try {
    const { name, code, description, examType, duration, questionCount } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ 
        message: 'Missing required fields: name and code are required' 
      });
    }
    
    const existingSubjects = await Subject.findAll({ name });
    
    if (existingSubjects.length > 0) {
      return res.status(400).json({ message: 'Subject with this name already exists' });
    }
    
    const subjectData = {
      name,
      code,
      description: description || '',
      examType: examType || 'WAEC',
      duration: duration || 120,
      questionCount: questionCount || 50,
      isGlobal: true,
      createdBy: req.user.id,
      status: 'active'
    };
    
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
    const subjects = await Subject.findAll({});
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

const updateSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    const updateData = { ...req.body };
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
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    await Subject.delete(subjectId);
    
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
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
    const activeAdmins = adminsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
    
    const studentsSnapshot = await db.collection('students').get();
    const totalStudents = studentsSnapshot.size;
    
    const examsSnapshot = await db.collection('exams').get();
    const totalExams = examsSnapshot.size;
    
    const ticketsSnapshot = await db.collection('tickets')
      .where('status', '==', 'open')
      .get();
    const openTickets = ticketsSnapshot.size;
    
    const subscriptionStats = await SubscriptionService.getSubscriptionStats();
    
    res.json({
      stats: {
        totalSchools: schools.totalSchools,
        activeSchools: schools.activeSchools,
        pendingSchools: schools.pendingSchools,
        totalAdmins,
        activeAdmins,
        totalStudents,
        totalExams,
        openTickets,
        ...subscriptionStats
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
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
              studentCount: await Student.getStudentCount(school.id),
              adminCount: (await User.findAll({ schoolId: school.id, role: 'admin' })).length
            }))
          )
        };
        break;
        
      case 'admin':
        const admins = await User.findAll({ role: 'admin' });
        const adminsWithDetails = await Promise.all(
          admins.map(async (admin) => {
            const subscriptionStatus = await SubscriptionService.checkSubscriptionStatus(admin.id);
            const { password, ...adminWithoutPassword } = admin;
            return {
              ...adminWithoutPassword,
              subscriptionStatus
            };
          })
        );
        report = {
          type: 'Admin Report',
          generatedAt: new Date(),
          admins: adminsWithDetails,
          totalAdmins: adminsWithDetails.length
        };
        break;
        
      case 'student':
        const students = await Student.findAll();
        const studentsWithoutPassword = students.map(({ password, ...rest }) => rest);
        report = {
          type: 'Student Report',
          generatedAt: new Date(),
          students: studentsWithoutPassword,
          totalStudents: studentsWithoutPassword.length
        };
        break;
        
      case 'performance':
        const exams = await db.collection('exams').get();
        const examData = exams.docs.map(doc => doc.data());
        const totalScore = examData.reduce((sum, exam) => sum + (exam.score || 0), 0);
        const averageScore = examData.length > 0 ? totalScore / examData.length : 0;
        
        const subjectBreakdown = {};
        examData.forEach(exam => {
          if (!subjectBreakdown[exam.subject]) {
            subjectBreakdown[exam.subject] = { total: 0, count: 0 };
          }
          subjectBreakdown[exam.subject].total += exam.score || 0;
          subjectBreakdown[exam.subject].count++;
        });
        
        Object.keys(subjectBreakdown).forEach(subject => {
          subjectBreakdown[subject].average = 
            subjectBreakdown[subject].total / subjectBreakdown[subject].count;
        });
        
        report = {
          type: 'Performance Report',
          generatedAt: new Date(),
          totalExams: examData.length,
          averageScore,
          subjectBreakdown
        };
        break;
        
      case 'revenue':
        const adminList = await User.findAll({ role: 'admin' });
        const revenueData = adminList.map(admin => ({
          adminName: admin.name,
          schoolId: admin.schoolId,
          plan: admin.subscription?.plan,
          amount: admin.subscription?.amount || 0,
          startDate: admin.subscription?.startDate,
          expiryDate: admin.subscription?.expiryDate,
          status: admin.status
        }));
        
        const totalRevenue = revenueData.reduce((sum, item) => sum + item.amount, 0);
        
        report = {
          type: 'Revenue Report',
          generatedAt: new Date(),
          totalRevenue,
          subscriptions: revenueData
        };
        break;
    }
    
    if (format === 'csv') {
      const csvData = JSON.stringify(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${Date.now()}.csv`);
      return res.send(csvData);
    }
    
    res.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus,
  getAllSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
  toggleSchoolStatus,
  getAllStudents,
  getTickets,
  getTicketById,
  respondToTicket,
  updateTicketStatus,
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  getDashboardStats,
  generateReport
};