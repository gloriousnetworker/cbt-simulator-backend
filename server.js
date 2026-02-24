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
const examRoutes = require('./routes/examRoutes');

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

// In server.js, update the corsOptions:
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Apply CORS middleware - this handles OPTIONS preflight automatically
app.use(cors(corsOptions));

app.get('/', (req, res) => {
  res.json({
    name: 'CBT Simulator API',
    version: '1.0.0',
    description: 'Backend API for Computer-Based Testing Simulation Platform',
    environment: process.env.NODE_ENV || 'development',
    status: 'online',
    timestamp: new Date(),
    cors: {
      allowedOrigins,
      credentials: true
    },
    documentation: {
      endpoints: {
        auth: {
          login: 'POST /api/auth/login',
          '2fa_verify': 'POST /api/auth/verify-2fa',
          logout: 'POST /api/auth/logout',
          refresh: 'POST /api/auth/refresh',
          me: 'GET /api/auth/me',
          setup2fa: 'POST /api/auth/setup-2fa',
          verify2faSetup: 'POST /api/auth/verify-2fa-setup',
          disable2fa: 'POST /api/auth/disable-2fa'
        },
        superAdmin: {
          base: '/api/super-admin',
          schools: 'GET/POST /api/super-admin/schools',
          admins: 'GET/POST /api/super-admin/admins',
          students: 'GET /api/super-admin/students',
          tickets: 'GET /api/super-admin/tickets',
          dashboard: 'GET /api/super-admin/dashboard/stats',
          reports: 'POST /api/super-admin/reports/generate'
        },
        admin: {
          base: '/api/admin',
          students: 'GET/POST /api/admin/students',
          studentById: 'GET/PUT/DELETE /api/admin/students/:studentId',
          subjects: 'POST/DELETE /api/admin/students/:studentId/subjects',
          tickets: 'GET/POST /api/admin/tickets',
          dashboard: 'GET /api/admin/dashboard/stats'
        },
        student: {
          base: '/api/student',
          login: 'POST /api/student/login',
          profile: 'GET/PUT /api/student/profile',
          changePassword: 'PUT /api/student/change-password',
          subjects: 'GET /api/student/subjects',
          examHistory: 'GET /api/student/exam-history'
        },
        exam: {
          base: '/api/exam',
          start: 'POST /api/exam/start',
          submit: 'POST /api/exam/:examId/submit',
          getExam: 'GET /api/exam/:examId',
          tabSwitch: 'POST /api/exam/:examId/tab-switch',
          saveAnswer: 'POST /api/exam/:examId/save-answer',
          results: 'GET /api/exam/results/all',
          performance: 'GET /api/exam/performance/summary'
        },
        debug: {
          health: 'GET /health',
          firebase: 'GET /debug/firebase',
          env: 'GET /debug/env'
        }
      },
      authentication: 'Cookie-based JWT authentication with 2FA support for admins'
    },
    links: {
      health: '/health',
      documentation: '/',
      repository: 'https://github.com/yourusername/cbt-simulator-backend'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/exam', examRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

app.get('/debug/firebase', (req, res) => {
  const { db, auth } = require('./config/firebase');
  res.json({
    firebaseInitialized: !!db && !!auth,
    dbIsNull: db === null,
    authIsNull: auth === null,
    environment: process.env.NODE_ENV,
    hasEnvVars: {
      projectId: !!process.env.FIREBASE_PROJECT_ID,
      clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: !!process.env.FIREBASE_PRIVATE_KEY
    }
  });
});

app.get('/debug/env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'not set',
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'not set',
    privateKeyLength: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method,
    hint: 'Visit / for API documentation'
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

// Start server only if not in production (for Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}`);
    console.log('Allowed origins:', allowedOrigins);
  });
}

module.exports = app;