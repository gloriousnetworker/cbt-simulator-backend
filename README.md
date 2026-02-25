# CBT Simulator Backend API

A robust backend API for the Computer-Based Testing (CBT) Simulator application built with Node.js, Express, and Firebase. This API serves three interfaces: Super Admin Dashboard, School Admin Dashboard, and Student CBT App.

🏗️ System Architecture Overview
User Roles & Hierarchy

    Super Admin (Top-level)

        Manages schools, admins, and system-wide operations

        Views all data across schools

        Handles tickets, reports, and system stats

        Manages subscriptions and revenue

    School Admin (School-level)

        Manages their specific school

        Creates and manages students

        Creates subjects and questions

        Views school-specific stats and tickets

    Student (End-user)

        Takes exams

        Views results and performance

        Manages profile

Core Domain Models

    User: Authentication and authorization for admins/super-admins

    Student: Student profiles with loginId, NIN, class, subjects

    School: Tenant/school information

    Subject: Subjects offered (with class, examType, duration)

    Question: CBT questions with options, correct answers

    Exam: Exam sessions with questions, answers, scores

    Ticket: Support tickets between admins and super-admins

Key Features Implemented
For Super Admin

    ✅ School management (CRUD, status toggle)

    ✅ Admin management (create, update, delete, status)

    ✅ System-wide stats dashboard

    ✅ Ticket management across all schools

    ✅ Report generation (school, admin, student, performance, revenue)

    ✅ Subscription management

For School Admin

    ✅ Student management (CRUD with auto-generated credentials)

    ✅ Subject management (CRUD)

    ✅ Question bank (CRUD, bulk import)

    ✅ School-specific dashboard stats

    ✅ Ticket creation and reply

    ✅ Student subject assignment

For Students

    ✅ Login via loginId/NIN + password

    ✅ Profile management

    ✅ Exam taking with anti-cheating (tab switch detection)

    ✅ Auto-submission after 3 tab switches

    ✅ Results and performance tracking

    ✅ Subject list view

Security Features

    ✅ JWT-based authentication (access + refresh tokens)

    ✅ Role-based authorization (super_admin, admin, student)

    ✅ 2FA for admin users (super_admin and admin)

    ✅ Subscription status checking for admins

    ✅ Password hashing with bcrypt

    ✅ Cookie-based token storage

Technical Stack

    Backend: Node.js + Express

    Database: Firebase Firestore

    Authentication: JWT with cookies

    2FA: speakeasy + QRCode

    Validation: express-validator

Data Flow
text

Super Admin → Manages → Schools → Admins → Students → Exams
                                          ↓
                                    Subjects/Questions

Key Business Logic

    Student Creation: Auto-generates loginId, email, default password

    Exam Taking: Random question selection, tab switch monitoring

    Subscription: Expiry checking for admin access

    Ticket System: Multi-level support (admin → super admin)

    Reporting: Multiple report types with CSV export

What You're Building

A complete SaaS-based CBT platform where:

    Super admin can onboard schools and manage the entire system

    Schools can manage their students, subjects, and question banks

    Students can take standardized tests with anti-cheating measures

    All data is isolated per school (multi-tenant)

    Subscription-based access control

    Support ticket system for issue resolution

API Structure
text

/api/auth/* - Authentication endpoints
/api/super-admin/* - Super admin operations
/api/admin/* - School admin operations
/api/student/* - Student operations
/api/exam/* - Exam-taking operations

The system is well-architected with clear separation of concerns, proper middleware chains, and comprehensive error handling. All your endpoints are logically grouped by role and functionality, making it maintainable and scalable.

## 🚀 Features

- **Authentication**: Cookie-based JWT authentication with refresh tokens
- **Role-Based Access**: Super Admin, School Admin, and Student roles
- **School Management**: Create and manage schools
- **Admin Management**: Create school admins with subscription plans
- **Student Management**: Register and manage students
- **Exam System**: Take exams, track performance, auto-save answers
- **Support Tickets**: Communication between admins and super admins
- **Subscription System**: Monthly, termly, yearly, and unlimited plans
- **Report Generation**: Generate CSV/JSON reports
- **Firebase Integration**: Firestore database and authentication

## 📋 Prerequisites

- Node.js 18.0 or higher
- npm or yarn
- Firebase account
- Postman (for testing)

## 🛠️ Installation

1. **Clone the repository**

git clone <https://github.com/gloriousnetworker/cbt-simulator-backend.git>
cd cbt-simulator-backend

2. **Install dependencies**

npm install

3. Set up Firebase

        Create a Firebase project at Firebase Console

        Enable Email/Password authentication

        Create a Firestore database

        Generate a service account key (Project Settings > Service accounts)

        Download and save as firebase-service-account.json in root directory

4. Generate JWT secrets

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

Run this twice to generate two different secrets for access and refresh tokens.

5. Create .env file

env

PORT=5000
JWT_SECRET=your-generated-secret-1
JWT_REFRESH_SECRET=your-generated-secret-2
COOKIE_SECURE=false
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

6. Create initial super admin

npm run seed

7. Start the server

npm run dev