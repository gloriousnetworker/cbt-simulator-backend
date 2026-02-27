const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const authRoutes = require('./routes/authRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();

app.use(express.json());
app.use(cookieParser());

// Dynamic CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://mts-waec-super-admin.vercel.app',
  'https://waec-cbt-simulator.vercel.app',
  'https://waec-cbt-admin.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'CBT Simulator API',
    version: '1.0.0',
    description: 'Backend API for Computer-Based Testing Simulation Platform',
    environment: process.env.NODE_ENV || 'development',
    status: 'online',
    timestamp: new Date(),
    baseUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        verifyEmail: 'POST /api/auth/verify-email',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        '2fa': {
          setup: 'POST /api/auth/setup-2fa',
          verify: 'POST /api/auth/verify-2fa',
          verifySetup: 'POST /api/auth/verify-2fa-setup',
          disable: 'POST /api/auth/disable-2fa'
        }
      },
      superAdmin: {
        admins: 'GET/POST /api/super-admin/admins',
        schools: 'GET/POST /api/super-admin/schools',
        subjects: 'GET/POST /api/super-admin/subjects',
        students: 'GET /api/super-admin/students',
        tickets: 'GET /api/super-admin/tickets',
        dashboard: 'GET /api/super-admin/dashboard/stats',
        reports: 'POST /api/super-admin/reports/generate'
      },
      admin: {
        profile: 'GET/PUT /api/admin/profile',
        subjects: 'GET /api/admin/subjects',
        students: 'GET/POST /api/admin/students',
        questions: 'GET/POST /api/admin/questions',
        tickets: 'GET/POST /api/admin/tickets',
        dashboard: 'GET /api/admin/dashboard/stats'
      },
      student: {
        login: 'POST /api/student/login',
        profile: 'GET/PUT /api/student/profile',
        subjects: 'GET /api/student/subjects',
        exams: {
          start: 'POST /api/student/exams/start',
          submit: 'POST /api/student/exams/:examId/submit',
          details: 'GET /api/student/exams/:examId',
          saveAnswer: 'POST /api/student/exams/:examId/save-answer',
          tabSwitch: 'POST /api/student/exams/:examId/tab-switch'
        },
        results: 'GET /api/student/results/all',
        performance: 'GET /api/student/performance/summary',
        practice: 'GET /api/student/practice',
        examHistory: 'GET /api/student/exam-history'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      '/api/auth/*',
      '/api/super-admin/*',
      '/api/admin/*',
      '/api/student/*',
      '/health',
      '/'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Export for Vercel
module.exports = app;

// Start server locally
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Allowed origins:', allowedOrigins);
  });
}