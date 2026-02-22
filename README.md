# CBT Simulator Backend API

A robust backend API for the Computer-Based Testing (CBT) Simulator application built with Node.js, Express, and Firebase. This API serves three interfaces: Super Admin Dashboard, School Admin Dashboard, and Student CBT App.

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

git clone <your-repo-url>
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