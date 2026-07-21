# HealthChain MVP

A secure healthcare records management system built as a proof of concept for managing patient records with blockchain-backed integrity verification.

## 🚀 Live Demo

**URL**: [https://health-chain-seven.vercel.app](https://health-chain-seven.vercel.app)

> **Note**: This application is hosted on free-tier services. The backend and database may go to sleep after periods of inactivity. Please allow up to **30 seconds** for the initial load and API requests to wake up the server.

## ✨ Features

- **Patient Authentication**: Secure login and registration with JWT-based authentication and bcrypt password hashing.
- **Secure Medical Record Management**: CRUD operations for patient medical records with robust access control.
- **Blockchain Integrity Verification**: Simulated blockchain mechanics to ensure data immutability, integrity, and traceability.
- **REST API Backend**: Express.js server providing structured, validated endpoints.
- **Modern Interactive UI**: Built with React, Tailwind CSS, GSAP, and Three.js for a premium, dynamic, and responsive user experience.
- **Robust Security**: Configured with Helmet, CORS, and rate-limiting for production-grade security.

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router DOM
- **Animations/Graphics**: GSAP, Three.js
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

### Backend (Server)
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js v5
- **Database**: MySQL (using `mysql2`)
- **Authentication**: JSON Web Tokens (JWT), `bcryptjs`
- **Security**: Helmet, Express Rate Limit, CORS

## 📁 Project Structure

```text
healthchain-mvp/
├── client/                 # React frontend application
│   ├── src/                # Source code (components, pages, styles)
│   ├── public/             # Static assets
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
└── server/                 # Express backend application
    ├── src/                # Source code (controllers, routes, middleware)
    ├── database_schema.sql # Database schema definitions
    ├── package.json        # Backend dependencies
    └── server.js           # Express application entry point
```

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- MySQL Server

### 1. Clone the Repository
```bash
git clone <repository-url>
cd healthchain-mvp
```

### 2. Setup the Database
Create a MySQL database and execute the SQL script to initialize the schema (or run the provided seed scripts):
```bash
mysql -u your_username -p your_database_name < server/database_schema.sql
```

### 3. Configure the Backend (Server)
Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory using `.env.example` as a template and update your credentials:
```env
PORT=3000
DB_HOST=localhost
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:5173
```

Start the backend development server:
```bash
npm run dev
```

### 4. Configure the Frontend (Client)
In a new terminal window, navigate to the `client` directory and install dependencies:
```bash
cd client
npm install
```

Create a `.env` file in the `client` directory to point to your local API URL:
```env
VITE_API_URL=http://localhost:3000
```

Start the frontend development server:
```bash
npm run dev
```

## 🌐 Deployment Architecture

- **Frontend**: Hosted on [Vercel](https://vercel.com)
- **Backend**: Hosted on [Render](https://render.com)
- **Database**: Hosted on [Aiven](https://aiven.io) for MySQL

## 📄 License
This project is intended for educational purposes and proof-of-concept demonstrations.