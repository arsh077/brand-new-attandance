<div align="center">
  <img src="public/assets/logo.png" alt="Legal Success India" width="150" height="150" style="border-radius: 50%;" />
  <h1>Legal Success India - Attendance Portal</h1>
  <p><strong>Modern Employee Attendance Management System</strong></p>
  
  ![React](https://img.shields.io/badge/React-19.2.3-blue?logo=react)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?logo=typescript)
  ![Vite](https://img.shields.io/badge/Vite-6.2.0-purple?logo=vite)
  ![License](https://img.shields.io/badge/License-MIT-green)
</div>

---

## 📋 Overview

A comprehensive attendance management portal built for **Legal Success India Private Limited**. This application provides role-based access for Administrators, Managers, and Employees to efficiently track attendance, manage leaves, and monitor workforce analytics.

## ✨ Features

### 🔐 Role-Based Access Control
- **Administrator**: Full system access, employee management, analytics
- **Manager**: Team oversight, attendance approval, leave management
- **Employee**: Personal attendance tracking, leave requests

### 📊 Core Functionality
- ✅ Real-time clock in/clock out system
- 📈 Interactive dashboard with analytics
- 📅 Leave request management
- 👥 Employee directory and management
- 📊 Attendance reports with charts (Recharts)
- 🔔 Late arrival tracking
- 💾 Local storage persistence

### 🎨 Modern UI/UX
- Clean, professional interface
- Responsive design
- Smooth animations
- Intuitive navigation
- Real-time updates

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arsh077/legal-success-india-attandnce.git
   cd legal-success-india-attandnce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Add the logo**
   - Save the company logo as `public/assets/logo.png`
   - Recommended: 200x200px, circular crop, white background

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173`

## 🏗️ Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
legal-success-india-attendance/
├── public/
│   └── assets/
│       └── logo.png              # Company logo
├── components/
│   ├── DashboardStats.tsx        # Dashboard statistics
│   └── Sidebar.tsx               # Navigation sidebar
├── pages/
│   ├── Attendance.tsx            # Attendance tracking
│   ├── Dashboard.tsx             # Main dashboard
│   ├── Employees.tsx             # Employee management
│   ├── Leaves.tsx                # Leave management
│   └── Login.tsx                 # Authentication
├── services/
│   └── authService.ts            # Authentication logic
├── App.tsx                       # Main app component
├── constants.tsx                 # App constants & icons
├── types.ts                      # TypeScript definitions
└── index.tsx                     # Entry point
```

## 🔑 Demo Credentials

### Administrator
- Email: `admin@legalsuccess.in`
- Password: Any password

### Manager
- Email: `manager@legalsuccess.in`
- Password: Any password

### Employee
- Email: `employee@legalsuccess.in`
- Password: Any password

## 🛠️ Tech Stack

- **Frontend**: React 19.2.3
- **Language**: TypeScript 5.8.2
- **Build Tool**: Vite 6.2.0
- **Charts**: Recharts 3.6.0
- **Styling**: Tailwind CSS (inline styles)
- **State Management**: React Hooks + Local Storage

## 📸 Screenshots

### Login Screen
Role selection with modern UI design

### Dashboard
Real-time analytics and attendance overview

### Attendance Tracking
Clock in/out with automatic late detection

### Leave Management
Request and approve leave applications

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Developer

**Arsh**
- GitHub: [@arsh077](https://github.com/arsh077)

## 🏢 About Legal Success India

Legal Success India Private Limited - Professional legal services with modern workforce management.

---

<div align="center">
  <p>Made with ❤️ for Legal Success India</p>
  <p>© 2026 Legal Success India Private Limited. All rights reserved.</p>
</div>
