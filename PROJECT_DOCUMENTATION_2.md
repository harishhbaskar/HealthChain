# HealthChain Bridge — Complete Project Documentation

> **Blockchain-Secured Electronic Health Records (EHR) System**
> A full-stack Doctor CRM / EHR platform that uses an in-app blockchain ledger to guarantee the integrity and tamper-proof nature of medical records.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement & Motivation](#2-problem-statement--motivation)
3. [Core Concept — How Blockchain Secures Medical Records](#3-core-concept--how-blockchain-secures-medical-records)
4. [Technology Stack](#4-technology-stack)
5. [Architecture Overview](#5-architecture-overview)
6. [Database Schema](#6-database-schema)
7. [Backend (Server) — File-by-File Breakdown](#7-backend-server--file-by-file-breakdown)
8. [Frontend (Client) — File-by-File Breakdown](#8-frontend-client--file-by-file-breakdown)
9. [Authentication & Authorization Flow](#9-authentication--authorization-flow)
10. [API Endpoints Reference](#10-api-endpoints-reference)
11. [Key Features Walkthrough](#11-key-features-walkthrough)
12. [Data Flow Diagrams](#12-data-flow-diagrams)
13. [Demo Data & Setup Instructions](#13-demo-data--setup-instructions)
14. [Security & HIPAA Compliance Features](#14-security--hipaa-compliance-features)
15. [Folder Structure](#15-folder-structure)
16. [Glossary](#16-glossary)

---

## 1. Project Overview

**HealthChain Bridge** is a full-stack web application designed for doctors/clinics to manage patient records, appointments, and clinical workflows — with a unique twist: every medical record is hashed using SHA-256 and stored on an in-application blockchain ledger. This ensures that no record can be modified after creation without detection.

### What the System Does

| Capability | Description |
|---|---|
| **Patient Management** | Register patients, store demographics, search/browse a Patient Directory |
| **Clinical Workstation** | Create structured SOAP notes (Subjective, Objective, Assessment, Plan) with vitals, severity, allergies |
| **Blockchain Integrity** | Each record is SHA-256 hashed and appended to a persistent blockchain. Any DB-level tampering is instantly detectable |
| **Appointment Scheduler** | Book, search, filter, and manage appointments with conflict detection and calendar view |
| **Dashboard Analytics** | Real-time stats — today's appointments, completed this week, total patients, recent activity |
| **Blockchain Explorer** | Visual representation of the entire blockchain with per-block verification |
| **Audit Trail** | HIPAA-compliant logging of every data access and modification event |
| **Admin Console** | Dedicated admin workspace for Audit Center, Blockchain Monitor, and Doctor Management |
| **Role-Based Access** | Patients self-register and view their data; Doctors provide care; Admins provision doctor accounts |

### Demo Credentials

| Username | Password | Role |
|---|---|---|
| `dr_house` | `password123` | Doctor |
| `dr_strange` | `password123` | Doctor |

---

## 2. Problem Statement & Motivation

**Problem:** Traditional EHR systems store medical records in a centralized database. If someone (a hacker, a disgruntled employee, or even a software bug) modifies a record directly in the database, there is no built-in mechanism to detect that the data has been altered. This is a critical concern for:
- **Legal liability** — Medical records are legal documents
- **Patient safety** — Tampered records could lead to wrong treatment
- **HIPAA compliance** — US healthcare regulation requires proof of data integrity

**Solution:** HealthChain Bridge solves this by adding a **blockchain verification layer** on top of a standard MySQL database:
1. When a doctor creates a medical record, the data is saved to MySQL as usual
2. A SHA-256 hash of the record's content is computed
3. This hash is added as a new block to a blockchain ledger (linked to the previous block's hash)
4. At any time, a user can click "Verify Integrity" — the system re-hashes the current DB data and compares it to the blockchain. If they don't match → **TAMPER DETECTED**

This gives the benefits of a traditional relational database (fast queries, SQL joins, structured data) combined with the immutability guarantees of a blockchain.

---

## 3. Core Concept — How Blockchain Secures Medical Records

### Step-by-Step Flow

```
Doctor fills SOAP form → Data saved to MySQL (4 tables) → SHA-256 hash generated
    → Hash added as new Block on Blockchain → Chain persisted to JSON file

Later: "Verify" clicked → Re-hash current DB data → Compare with Blockchain hash
    → Match = ✅ SECURE | Mismatch = ❌ TAMPERED
```

### The Hash Formula

The system creates a **deterministic string** from the record data in this exact format:

```
S: [Subjective text]
O: BP [blood_pressure] HR [heart_rate] Temp [temperature]
A: [Assessment/Diagnosis text]
P: [Plan/Prescription text]
```

This string is fed into Node.js `crypto.createHash('sha256')` to produce a 64-character hex hash.

**Why deterministic?** Because the same input must always produce the same hash. If even one character changes in the database, the hash will be completely different (avalanche effect), and the verification will fail.

### Blockchain Structure

Each block contains:

| Field | Description |
|---|---|
| `index` | Sequential block number (0 = genesis) |
| `timestamp` | ISO timestamp when block was created |
| `recordId` | The MySQL `visit_id` this block refers to |
| `dataHash` | SHA-256 hash of the medical record data |
| `previousHash` | The `currentHash` of the block before this one |
| `currentHash` | SHA-256 hash of (index + previousHash + timestamp + dataHash) |

The **genesis block** (index 0) is created automatically when the system starts for the first time. It has `recordId: 0` and `dataHash: "GENESIS_BLOCK"`.

### Chain Validation

To validate the entire chain, the system iterates through every block and checks:
1. Recalculate `currentHash` from the block's data — does it match the stored `currentHash`?
2. Does `previousHash` match the previous block's `currentHash`?

If both checks pass for every block → **Chain is valid** (no tampering anywhere).

---

## 4. Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.2 | UI component library |
| **Vite** | 7.3 | Build tool & dev server (port 5173) |
| **Tailwind CSS** | 4.1 | Utility-first CSS framework (dark theme) |
| **React Router DOM** | 7.13 | Client-side routing |
| **Axios** | 1.13 | HTTP client for API calls |
| **React Hot Toast** | 2.6 | Toast notification system |
| **Lucide React** | 0.574 | Icon library (consistent icon system) |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | — | JavaScript runtime |
| **Express** | 5.2 | REST API framework |
| **MySQL** | 8+ | Relational database (runs in Docker) |
| **mysql2** | 3.16 | MySQL driver with Promise support |
| **jsonwebtoken (JWT)** | 9.0 | Token-based authentication |
| **bcryptjs** | 3.0 | Password hashing (bcrypt algorithm) |
| **crypto** (built-in) | — | SHA-256 hashing for blockchain |

### Infrastructure

| Tool | Purpose |
|---|---|
| **Docker** | Hosts the MySQL container |
| **JSON file** | Persists blockchain data (`blockchain_data.json`) |
| **Fish shell** | Development terminal environment |

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│                   https://localhost:5173                  │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐  │
│  │AuthPage  │ │Dashboard │ │ Clinical  │ │Blockchain│  │
│  │(Login/   │ │Home      │ │Workstation│ │Explorer  │  │
│  │Register) │ │(Stats)   │ │(SOAP Form)│ │(Chain)   │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐  │
│  │Patient   │ │Patient   │ │Scheduler  │ │Audit     │  │
│  │Directory │ │Profile   │ │(Calendar) │ │Logs      │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘  │
│                        │                                 │
│                    Axios HTTP                            │
│                   (JWT Bearer)                           │
└────────────────────────┼────────────────────────────────┘
                         │
                    REST API calls
                         │
┌────────────────────────┼────────────────────────────────┐
│                    BACKEND (Express.js)                   │
│                   https://localhost:3443                   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │                  Middleware Layer                  │     │
│  │  verifyToken (JWT) → checkRole (RBAC) → Handler  │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐  │
│  │  Auth    │ │ Record   │ │Appointment│ │Dashboard │  │
│  │Controller│ │Controller│ │Controller │ │Controller│  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘  │
│                        │                                 │
│              ┌─────────┼─────────┐                      │
│              │         │         │                      │
│        ┌─────┴──┐ ┌────┴───┐ ┌──┴──────┐              │
│        │ MySQL  │ │Blockchain│ │ Audit  │              │
│        │  DB    │ │  (JSON) │ │  Log   │              │
│        └────────┘ └─────────┘ └────────┘              │
└──────────────────────────────────────────────────────────┘
```

### Request Lifecycle (Example: Creating a Record)

1. Doctor fills the SOAP form on the Clinical Workstation page
2. Frontend sends `POST /api/records` with JWT token in header
3. `verifyToken` middleware validates the JWT and attaches `userId` and `userRole` to the request
4. `checkRole(['doctor', 'admin'])` ensures only doctors can add records
5. `recordController.addRecord` runs:
   - Looks up the doctor's profile ID from the `doctors` table
   - Inserts data into 4 tables transactionally (visits → vitals → diagnoses → prescriptions)
   - Builds a deterministic string and generates SHA-256 hash
   - Updates the visit's `record_hash` column
   - Adds a new block to the blockchain
   - Writes an audit log entry
6. Response sent back with `visitId` and `blockchainHash`
7. Frontend shows success toast and refreshes the records list

---

## 6. Database Schema

The MySQL database `healthchain_db` contains **8 tables**:

### Core Authentication Tables

#### `users`
| Column | Type | Description |
|---|---|---|
| `id` | INT (PK, AUTO_INCREMENT) | Unique user ID |
| `username` | VARCHAR(255) UNIQUE | Login username |
| `password_hash` | VARCHAR(255) | bcrypt-hashed password |
| `role` | ENUM('patient','doctor','admin') | Access level |
| `created_at` | TIMESTAMP | Account creation date |

#### `audit_logs`
| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Log entry ID |
| `user_id` | INT (FK → users) | Who performed the action |
| `action_type` | VARCHAR(50) | Category: ADD_RECORD, VIEW_HISTORY, VERIFY_INTEGRITY, LOGIN, etc. |
| `details` | TEXT | Human-readable description |
| `ip_address` | VARCHAR(45) | Client IP (IPv4/IPv6) |
| `timestamp` | TIMESTAMP | When it happened |

### EHR Profile Tables

#### `patients`
| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Patient profile ID |
| `user_id` | INT (FK → users) | Link to auth account |
| `first_name`, `last_name` | VARCHAR(100) | Full name |
| `date_of_birth` | DATE | DOB |
| `gender` | ENUM('male','female','other') | Gender |
| `blood_type` | VARCHAR(5) | e.g., "O+", "AB-" |
| `phone_number` | VARCHAR(20) | Contact phone |
| `email` | VARCHAR(255) | Email address |
| `address` | TEXT | Mailing address |
| `emergency_contact_name` | VARCHAR(255) | Emergency contact |
| `emergency_contact_phone` | VARCHAR(20) | Emergency phone |
| `insurance_provider` | VARCHAR(255) | Insurance info |

#### `doctors`
| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Doctor profile ID |
| `user_id` | INT (FK → users) | Link to auth account |
| `first_name`, `last_name` | VARCHAR(100) | Full name |
| `specialty` | VARCHAR(150) | Medical specialty |

### EHR Visit Tables (Normalized SOAP)

#### `visits` (one row per patient encounter)
| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Visit ID (also the blockchain record ID) |
| `patient_id` | INT (FK → patients) | Which patient |
| `doctor_id` | INT (FK → doctors) | Which doctor |
| `chief_complaint` | TEXT | Subjective notes (the "S" in SOAP) |
| `allergies` | TEXT | Known allergies |
| `follow_up` | VARCHAR(100) | Follow-up instructions |
| `visit_date` | DATETIME | When the visit occurred |
| `record_hash` | VARCHAR(64) | SHA-256 hash for blockchain verification |

#### `vitals` (one row per visit — the "O" in SOAP)
| Column | Type | Description |
|---|---|---|
| `visit_id` | INT (FK → visits) | Parent visit |
| `blood_pressure` | VARCHAR(20) | e.g., "120/80" |
| `heart_rate` | INT | Beats per minute |
| `temperature` | DECIMAL(4,1) | Body temp (°F) |
| `spo2` | INT | Oxygen saturation % |
| `weight` | DECIMAL(5,1) | Body weight |

#### `diagnoses` (one row per visit — the "A" in SOAP)
| Column | Type | Description |
|---|---|---|
| `visit_id` | INT (FK → visits) | Parent visit |
| `condition_name` | VARCHAR(255) | Diagnosis |
| `severity` | ENUM('mild','moderate','severe','critical') | Severity level |

#### `prescriptions` (one row per visit — the "P" in SOAP)
| Column | Type | Description |
|---|---|---|
| `visit_id` | INT (FK → visits) | Parent visit |
| `medication_name` | VARCHAR(255) | Prescribed medication |
| `instructions` | TEXT | Dosage/usage instructions |

### Scheduler Table

#### `appointments`
| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Appointment ID |
| `patient_id` | INT (FK → patients) | Patient |
| `doctor_id` | INT (FK → doctors) | Doctor |
| `appointment_date` | DATE | Scheduled date |
| `appointment_time` | TIME | Scheduled time |
| `status` | ENUM('Scheduled','Completed','Cancelled','No-Show') | Current status |
| `reason_for_visit` | TEXT | Purpose of appointment |

### Entity Relationship Summary

```
users (1) ──── (1) patients
users (1) ──── (1) doctors
users (1) ──── (N) audit_logs

patients (1) ──── (N) visits
doctors  (1) ──── (N) visits

visits (1) ──── (1) vitals
visits (1) ──── (1) diagnoses
visits (1) ──── (1) prescriptions

patients (1) ──── (N) appointments
doctors  (1) ──── (N) appointments
```

---

## 7. Backend (Server) — File-by-File Breakdown

All server code lives in `/server/`.

### `server.js` — Application Entry Point
- Creates the Express application
- Applies middleware: CORS (cross-origin), body-parser (JSON)
- Mounts all API routes under `/api`
- Supports local HTTPS (`LOCAL_HTTPS=true`) using configured cert/key files
- Optionally starts HTTP listener that redirects to HTTPS
- **This is the file you run:** `node server.js` or `npm run dev`

### `src/config/db.js` — Database Connection
- Creates a MySQL connection using `mysql2`
- Connection config: host `127.0.0.1`, port `3306`, user `root`, password `root123`, database `healthchain_db`
- Supports optional MySQL TLS (`DB_SSL=true`) with CA/cert/key paths
- Exports the raw connection object (controllers call `.promise()` for async/await)
- Logs success/failure on connection attempt

### `src/routes/apiRoutes.js` — Route Definitions
The single router file that maps every URL to its controller function:

| Method | Path | Auth | Roles | Handler |
|---|---|---|---|---|
| POST | `/register` | No | Any | `authController.register` |
| POST | `/login` | No | Any | `authController.login` |
| GET | `/admin/doctors` | Yes | admin | `adminController.listDoctors` |
| POST | `/admin/doctors` | Yes | admin | `adminController.createDoctor` |
| PUT | `/admin/doctors/:doctorId` | Yes | admin | `adminController.updateDoctor` |
| GET | `/dashboard/stats` | Yes | doctor, admin | `dashboardController.getStats` |
| POST | `/records` | Yes | doctor, admin | `recordController.addRecord` |
| GET | `/records` | Yes | All | `recordController.getRecords` |
| GET | `/verify/:id` | Yes | All | `recordController.verifyIntegrity` |
| GET | `/patients` | Yes | doctor, admin | `recordController.getPatients` |
| GET | `/patients/:id` | Yes | doctor, admin | `recordController.getPatientById` |
| GET | `/patients/:id/timeline` | Yes | doctor, admin | `recordController.getPatientTimeline` |
| GET | `/audit-logs` | Yes | doctor, admin | `recordController.getAuditLogs` |
| POST | `/appointments` | Yes | doctor, admin | `appointmentController.bookAppointment` |
| GET | `/appointments` | Yes | All | `appointmentController.getAppointments` |
| GET | `/appointments/month` | Yes | doctor, admin | `appointmentController.getMonthAppointments` |
| PUT | `/appointments/:id/status` | Yes | doctor, admin | `appointmentController.updateStatus` |
| GET | `/blockchain/status` | Yes | All | Inline — returns `getChainStats()` |
| GET | `/blockchain` | Yes | doctor, admin | Inline — returns raw chain JSON |

### `src/middleware/authMiddleware.js` — JWT & RBAC
Two middleware functions that protect routes:

1. **`verifyToken(req, res, next)`**
   - Reads the `Authorization` header (`"Bearer <token>"`)
   - Verifies the JWT using the secret key
   - Attaches `req.userId` and `req.userRole` to the request
   - Returns 403 if no token, 500 if invalid token

2. **`checkRole(allowedRoles)`**
   - Factory function that returns middleware
   - Checks if `req.userRole` is in the `allowedRoles` array
   - Returns 403 "Access Denied" if role doesn't match

### `src/controllers/authController.js` — Registration & Login

**`register`** — Creates both an auth account AND a medical profile:
1. Hashes the password with bcrypt (8 salt rounds)
2. Inserts into `users` table
3. Public registration is **patient-only** (doctor/admin cannot self-register)
4. Creates a row in `patients` with placeholder profile defaults
5. Encrypts sensitive patient profile fields before storing at rest
  - encrypted fields: `email`, `address`, `emergency_contact_name`, `emergency_contact_phone`, `insurance_provider`
5. Returns success message

**`login`** — Authenticates and returns a JWT:
1. Looks up user by username
2. Compares password with bcrypt
3. Signs a JWT containing `{ id, role }` with 24-hour expiry
4. Returns `{ auth: true, token, user: { id, username, role } }`

### `src/controllers/recordController.js` — The Core EHR Engine (290 lines)

This is the most important controller. It handles:

**`addRecord`** — Creates a complete medical visit:
1. Validates input (assessment required, patient_id required)
2. Looks up doctor's profile ID from `doctors` table using `req.userId`
3. Sanitizes vitals (empty strings → NULL for numeric columns)
4. Calls `Record.createFullVisit()` which inserts into 4 tables in a **transaction** (visits → vitals → diagnoses → prescriptions). If any insert fails, all are rolled back
5. Builds the deterministic string and generates SHA-256 hash
6. Updates the visit's `record_hash` column
7. Adds a new block to the blockchain via `myBlockchain.addBlock(visitId, hash)`
8. Logs the action to `audit_logs`

**`getRecords`** — Fetches medical records:
- If user is a doctor → returns records for the specified `patientId` query param
- If user is a patient → securely looks up their patient profile and returns only THEIR records
- Joins visits + vitals + diagnoses + prescriptions in one query
- Logs the access for HIPAA compliance

**`verifyIntegrity`** — The blockchain verification endpoint:
1. Fetches the full visit data from MySQL (JOIN across all 4 tables)
2. Rebuilds the deterministic string from current DB data
3. Hashes it with SHA-256
4. Finds the corresponding block on the blockchain
5. Compares: if hashes match → SECURE, if not → TAMPERED
6. Logs the verification attempt

**`getPatients`** — Paginated patient directory:
- Supports `page`, `limit`, `search`, `sort`, `order` query params
- Search matches across `first_name + last_name` and `phone_number`
- Decrypts sensitive profile fields before response
- Returns `{ data: [...], pagination: { page, limit, total, totalPages } }`

**`getPatientById`** — Single patient lookup by ID (decrypted response)

**`getPatientTimeline`** — A patient's full history:
- Returns `{ visits: [...], appointments: [...] }` for a given patient
- Each visit includes all SOAP fields + doctor name
- Each appointment includes status, time, doctor name

**`getAuditLogs`** — Paginated, filterable audit trail:
- Search by username or details text
- Filter by `action_type`
- Joins with `users` table for username display

### `src/controllers/appointmentController.js` — Scheduler Logic (230 lines)

**`bookAppointment`** — Books a new appointment with conflict detection:
- Validates required fields
- Resolves doctor ID from login
- **Conflict detection**: checks for existing appointments within ±30 minutes on the same date
- Returns 409 with conflict details if overlap found
- Otherwise inserts and returns the new appointment ID

**`getAppointments`** — Paginated, filterable appointment list:
- For doctors: shows THEIR appointments (by doctor_id)
- For patients: shows THEIR appointments (by patient_id)
- Supports search (patient name, reason) and status filter
- Ordered by date and time ascending

**`getMonthAppointments`** — All appointments for a given month:
- Used by the CalendarView component
- Returns un-paginated list for a specific year/month range
- Includes patient names for display on calendar

**`updateStatus`** — Change appointment status:
- Validates status is one of: Scheduled, Completed, Cancelled, No-Show
- Updates the row by appointment ID

### `src/controllers/dashboardController.js` — Dashboard Stats (117 lines)

**`getStats`** — Aggregates multiple stats in one API call using `Promise.all`:
1. Today's scheduled appointments count
2. Upcoming appointments count (today + future)
3. Completed appointments this week
4. Total unique patients (from visits + appointments)
5. Today's schedule (next 6 appointments)
6. Recent activity feed (last 10 audit log entries)

Returns doctor info + all stats in a single response.

### `src/controllers/adminController.js` — Admin Doctor Provisioning

**`listDoctors`**
- Returns all doctor accounts by joining `doctors` + `users`

**`createDoctor`**
- Admin-only endpoint
- Creates login account in `users` with role `doctor`
- Creates matching profile row in `doctors`
- Uses transaction and duplicate username handling

**`updateDoctor`**
- Admin-only endpoint
- Updates doctor profile fields and linked username
- Optional password reset for doctor accounts
- Uses transaction and duplicate username handling

### `src/models/Blockchain.js` — The Blockchain Implementation (100 lines)

**`Block` class:**
- Constructor takes index, timestamp, recordId, dataHash, previousHash
- `calculateHash()` produces SHA-256 of all block fields concatenated

**`Blockchain` class:**
- **Singleton pattern** — only one instance exists, exported via `module.exports = new Blockchain()`
- Persists to `blockchain_data.json` on disk after every change
- On startup: loads from file if exists, otherwise creates genesis block
- `addBlock(recordId, dataHash)` — creates new block linked to previous
- `getBlockByRecordId(id)` — finds a specific block
- `isChainValid()` — iterates all blocks, recalculates hashes, verifies chain links
- `getChainStats()` — returns full chain, validity status, genesis timestamp, latest block

### `src/models/Records.js` — Database Model (136 lines)

**`createFullVisit(visitData, vitalsData, diagnosisData, prescriptionData)`**
- **Transactional**: Uses `BEGIN → INSERT → INSERT → INSERT → INSERT → COMMIT` (or ROLLBACK on error)
- Inserts into: visits → vitals → diagnoses → prescriptions
- Returns the new `visitId`

**`updateVisitHash(visitId, hash)`** — Sets the record_hash on a visit

**`getFullVisitById(visitId)`** — 4-table JOIN query for verification

**`getVisitsByPatient(patientId)`** — 4-table JOIN query for records list

### `src/models/User.js` — User Model (14 lines)
Simple model with `create()` and `findByUsername()` methods using callback-style queries.

### `src/models/AuditLog.js` — Audit Logger (14 lines)
Single `log(userId, actionType, details, ipAddress)` function that inserts into `audit_logs`.

### `src/utils/hashUtils.js` — SHA-256 Utility (7 lines)
Exports `generateHash(data)` — wraps Node's `crypto.createHash('sha256')`.

### `src/utils/fieldEncryption.js` — Field-Level Encryption Utility
- AES-256-GCM encryption/decryption helper for sensitive patient data
- Controlled by `FIELD_ENCRYPTION_KEY` environment variable
- Backward-compatible fallback for existing plaintext rows
- Uses encrypted payload prefixing (`enc:v1:`) to detect encrypted values

### `createAdmin.js` — Admin Bootstrap Script
- CLI utility to create or update an admin login account directly in DB
- Script command: `npm run create-admin -- --username <name> --password <password>`
- Prevents need for public admin registration

### `generateDemo.js` — Demo Data Generator (352 lines)
A standalone script that populates the database with realistic demo data:
- Registers 2 doctors and 10 patients via the API
- Creates 23 medical records with full SOAP notes, vitals, severity, and allergies
- Creates ~100 appointments spanning 4 weeks in the past to 2 weeks in the future
- Updates appointment statuses (Completed, Cancelled, No-Show for past dates)
- **Deletes `blockchain_data.json`** before running to prevent hash mismatches
- Run via: `node generateDemo.js` (requires server to be running)

### `seed_data.sql` — Name & Profile Updater (67 lines)
SQL script that updates the auto-created placeholder profiles with proper names:
- Updates doctors: Gregory House (Diagnostic Medicine), Stephen Strange (Neurosurgery)
- Updates 10 patients with superhero-themed names (Bruce Wayne, Clark Kent, Diana Prince, etc.) with realistic demographics
- Run via: `mysql -u root -proot123 -h 127.0.0.1 healthchain_db < seed_data.sql`

### `database_schema.sql` — Schema Definition (136 lines)
Creates the database and all 8 tables with proper foreign keys and constraints.

---

## 8. Frontend (Client) — File-by-File Breakdown

All client code lives in `/client/src/`.

### `main.jsx` — React Entry Point (11 lines)
- Renders `<App />` wrapped in `<StrictMode>` and `<BrowserRouter>`
- Mounts to the `#root` DOM element
- Imports global CSS (`index.css`)

### `App.jsx` — Root Application Component (402 lines)
The central orchestrator of the entire frontend:

**State Management:**
- `token` / `user` — Authentication state (persisted to localStorage)
- `patients` / `records` — Data lists fetched from API
- `soapForm` — SOAP note form state
- `selectedPatientId` — Currently selected patient
- `verificationStatus` — Map of record verification results

**Key Functions:**
- `handleLogin()` / `handleRegister()` — Auth handlers with toast notifications
- `addRecord()` — Submits SOAP form to API
- `verifyRecord()` — Calls verify endpoint, updates status map
- `logout()` — Clears state and localStorage

**Routing Structure:**
- Unauthenticated: `/login`, `/register` (full-screen, no sidebar)
- Authenticated: Sidebar + content area with these routes:
  - `/` → DashboardHome (doctor/patient) or redirect to `/admin` (admin)
  - `/admin` → AdminPanel (admin)
  - `/admin/doctors` → AdminDoctors (admin)
  - `/admin/audit` → AuditLogs (admin)
  - `/admin/blockchain` → BlockchainExplorer (admin)
  - `/clinical` → ClinicalWorkstation (doctor) or RecordsList (patient)
  - `/patients` → PatientDirectory
  - `/patients/:id` → PatientProfile
  - `/scheduler` → Scheduler
  - `/blockchain` → BlockchainExplorer
  - `/audit` → AuditLogs

**Toast System:** Uses custom render with `resolveValue` for dark-themed toast notifications. Success = ✅, Error = ⚠️.

### `pages/AuthPage.jsx` — Login & Registration (100 lines)
- Dual-purpose form (login/register) controlled by `view` prop
- Dark-themed card with Shield icon branding
- Password visibility toggle (eye icon)
- Public register path now creates **patient accounts only**
- UI explicitly states doctor accounts are provisioned by admin
- Controlled component — all state managed by parent App.jsx

### `pages/AdminPanel.jsx` — Admin Home
- Entry page for admin workspace
- Quick links to Audit Center, Blockchain Monitor, and Doctor Management
- Reuses dashboard analytics block for admin overview

### `pages/AdminDoctors.jsx` — Doctor Management
- Dedicated admin page for doctor provisioning
- Create doctor form (username, password, first/last name, specialty)
- Edit existing doctor accounts with optional password reset

### `pages/DashboardHome.jsx` — Doctor Dashboard (244 lines)
- Greeting with time-of-day ("Good morning, Dr. House")
- 4 stat cards: Today's Appointments, Completed This Week, Total Patients, Upcoming
- Today's Schedule panel (next 6 appointments)
- Recent Activity feed (last 10 actions)
- Quick-link cards to Clinical Workstation, Patient Directory, Scheduler
- Guards against "Dr. Dr." display bug
- For patients: simplified view with "My Medical Records" link

### `pages/ClinicalWorkstation.jsx` — SOAP Note Creation (505 lines)
The main "doctor's console" — self-contained with its own data fetching:

**Layout:** Two-column — form (left, 60%) + patient records (right, 40%)

**Tabbed Form (4 tabs):**
1. **Patient** — Searchable patient selector combobox
2. **Vitals** — BP, heart rate, temperature, SpO2, weight inputs
3. **Diagnosis** — Assessment text, severity dropdown, allergies, follow-up
4. **Prescription** — Plan/medication textarea

**Special Features:**
- **Live Hash Preview** — Shows real-time SHA-256 hash of current form data (using `useMemo`)
- **Quick Templates** — 5 one-click SOAP templates (Common Cold, Hypertension, Diabetes, Back Pain, Annual Physical)
- **Side Records Panel** — Scrollable, sticky panel showing selected patient's record history with verify buttons

### `pages/BlockchainExplorer.jsx` — Chain Visualizer (275 lines)
- Header with chain stats: total blocks, chain status (valid/invalid), genesis date
- "Verify All Records" bulk action
- Visual block cards with expand/collapse:
  - Block number, timestamp, record ID
  - Hashes: current, previous, data (truncated with expand)
  - Color-coded: Genesis (purple), Verified (green), Tampered (red), Unknown (gray)
- "How It Works" educational section explaining: Record Created → Hash Generated → Block Added → Verification

### `pages/PatientProfile.jsx` — Patient Detail View (601 lines)
- Accessed via `/patients/:id` (from Patient Directory links)
- Patient header: avatar, name, demographics, contact info
- 3 tabs: Overview, Visit History, Appointments
- **Overview**: Stats (total visits, appointments, last visit), notes
- **Visit History**: SOAP record cards with full details
- **Appointments**: Appointment cards with status badges
- Inline forms to book appointments or add visit records directly from the profile

### `pages/AuditLogs.jsx` — HIPAA Audit Trail (131 lines)
- Debounced search input (300ms delay)
- Action type filter dropdown (ADD_RECORD, VIEW_HISTORY, VERIFY_INTEGRITY, LOGIN)
- Paginated table of audit entries
- Color-coded action type badges
- Each row: timestamp, user, action type, details, IP address

### `components/layout/Sidebar.jsx` — Navigation Sidebar (102 lines)
- Fixed left sidebar with collapse toggle
- Brand header: HealthChain Bridge with Activity icon
- Navigation links (filtered by role):
  - Patients: Dashboard, Clinical
  - Doctors: Dashboard, Clinical, Patients, Scheduler, Blockchain, Audit Logs
  - Admins: Admin Panel, Doctor Management, Audit Center, Blockchain Monitor
- User avatar pill showing role badge
- Sign Out button
- Uses `NavLink` for active route highlighting (blue background on current page)

### `components/records/PatientDirectory.jsx` — Patient Grid (120 lines)
- Searchable patient card grid (debounced server-side search)
- Each card: initials avatar, name, age, DOB, phone, blood type
- Click card → navigates to `/patients/:id` (PatientProfile)
- Paginated with Pagination component

### `components/records/Scheduler.jsx` — Appointment Manager (313 lines)
- Dual view mode: List | Calendar (toggle buttons)
- **List View:**
  - Search input + status filter dropdown
  - Appointment cards with patient name, date, time, reason, status badge
  - Quick actions: Complete ✓ / Cancel ✗ buttons
  - "Missed" orange badge for past-dated Scheduled appointments
  - Pagination
- **Calendar View:** Delegates to CalendarView component
- **Booking Modal:**
  - PatientSearch combobox for selecting patient
  - Date, time, and reason inputs
  - Conflict detection (server returns 409 on overlap)
- Self-sufficient: fetches its own patient list on mount

### `components/records/CalendarView.jsx` — Month Calendar (179 lines)
- Month grid with day numbers
- Month navigation (prev/next arrows + "Today" button)
- Color-coded status dots on dates with appointments:
  - Blue = Scheduled, Green = Completed, Red = Cancelled, Yellow = No-Show
- Click a date → side panel shows that day's appointments
- Side panel details: patient name, time, status badge, reason

### `components/records/RecordsList.jsx` — Medical Records Display (137 lines)
- Renders visit records as styled cards
- Each card shows:
  - Visit date and severity badge (color-coded: mild/moderate/severe/critical)
  - Subjective (chief complaint)
  - Vitals grid: BP, HR, Temp, SpO2, Weight
  - Assessment (diagnosis)
  - Allergies and Follow-up notes
  - Plan (prescription)
  - Blockchain hash (truncated)
- Verify Integrity button per card (shows loading → secure → tampered states)

### `components/records/PatientInfoBanner.jsx` — Patient Notice (14 lines)
Simple blue info banner shown to patient-role users: "You can view and verify your records. Only doctors can add new records."

### `components/ui/PatientSearch.jsx` — Searchable Patient Selector (119 lines)
Shared component used by both ClinicalWorkstation and Scheduler:
- Displays selected patient as a badge (avatar initials, name, ID, gender, blood type)
- Click to open → searchable dropdown filters by name, ID, or phone
- Click-outside-to-close behavior
- `compact` prop variant for modal usage (smaller sizing)
- Props: `patients`, `selectedPatientId`, `onSelect`, `compact`

### `components/ui/Pagination.jsx` — Pagination Control (64 lines)
Generic, reusable pagination component:
- Previous / Next buttons
- Numbered page buttons (max 5 visible, with ellipsis for overflow)
- Results count label ("Showing page X of Y (Z results)")
- Returns null when ≤1 page
- Used by: PatientDirectory, Scheduler, AuditLogs

### `components/VerifyButton.jsx` — (Empty File)
Placeholder file. Verification logic is handled inline in RecordsList and BlockchainExplorer.

### `components/forms/DoctorSoapForm.jsx` — Legacy SOAP Form (117 lines)
Original single-page SOAP form (superseded by the tabbed ClinicalWorkstation). Kept for backward compatibility.

### `utils/soap.js` — SOAP Form Utilities (72 lines)
Exports:
- `initialSoapForm` — Default empty form state object with all SOAP fields
- `TEMPLATES` — Array of 5 clinical templates for one-click form filling:
  1. Common Cold
  2. Hypertension Follow-up
  3. Type 2 Diabetes Check
  4. Acute Back Pain
  5. Annual Physical Exam

### `constants/api.js` — API Configuration (2 lines)
Exports env-aware API URL with HTTPS-aware fallback:
- uses `VITE_API_URL` when provided
- defaults to `https://localhost:3443/api` when browser protocol is HTTPS
- otherwise falls back to `http://localhost:3000/api`

---

## 9. Authentication & Authorization Flow

### Registration Flow
```
User → POST /api/register { username, password }
  → bcrypt hash password
  → INSERT into users table
  → Role hard-set to patient (server-side enforcement)
  → Encrypt sensitive patient fields for at-rest storage
  → INSERT into patients table (placeholder profile)
  → Auto-login: POST /api/login
  → Receive JWT token
  → Store token + user in localStorage
  → Redirect by role (admins routed to /admin)
```

### Login Flow
```
User → POST /api/login { username, password }
  → Lookup user by username
  → bcrypt.compareSync(password, stored_hash)
  → IF valid: Sign JWT { id, role } with 24hr expiry
  → Return { auth: true, token, user }
  → Frontend stores in localStorage
  → All subsequent requests include: Authorization: Bearer <token>
```

### Authorization (Per-Request)
```
Request with JWT → verifyToken middleware
  → jwt.verify(token, SECRET_KEY)
  → Attach req.userId, req.userRole
  → checkRole(['doctor', 'admin'])  ← (varies by route)
  → IF role not allowed → 403 "Access Denied"
  → ELSE → proceed to controller
```

### Role Permissions Matrix

| Action | Patient | Doctor | Admin |
|---|:---:|:---:|:---:|
| Login | ✅ | ✅ | ✅ |
| Public Register (self-service) | ✅ | ❌ | ❌ |
| View own records | ✅ | ✅ | ✅ |
| Add new records | ❌ | ✅ | ✅ |
| View patient directory | ❌ | ✅ | ✅ |
| Book appointments | ❌ | ✅ | ✅ |
| View blockchain explorer | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ✅ | ✅ |
| View dashboard stats | ❌ | ✅ | ✅ |
| Create / edit doctor accounts | ❌ | ❌ | ✅ |

---

## 10. API Endpoints Reference

### Authentication

#### `POST /api/register`
**Body:** `{ username: string, password: string }`
**Note:** Server enforces patient role for public registration.
**Response:** `{ message: "User and Profile registered successfully!" }`

#### `POST /api/login`
**Body:** `{ username: string, password: string }`
**Response:** `{ auth: true, token: "jwt...", user: { id, username, role } }`

### Admin Doctor Management

#### `GET /api/admin/doctors` 🔒 Admin
**Response:** `{ data: [...doctorsWithUsernames] }`

#### `POST /api/admin/doctors` 🔒 Admin
**Body:** `{ username, password, first_name, last_name, specialty }`
**Response:** `{ message: "Doctor account created successfully." }`

#### `PUT /api/admin/doctors/:doctorId` 🔒 Admin
**Body:** `{ username, first_name, last_name, specialty, password? }`
**Response:** `{ message: "Doctor updated successfully." }`

### Dashboard

#### `GET /api/dashboard/stats` 🔒 Doctor/Admin
**Response:** `{ doctor: { first_name, last_name }, stats: { todayAppointments, completedThisWeek, totalPatients, upcomingAppointments }, todaySchedule: [...], recentActivity: [...] }`

### Medical Records

#### `POST /api/records` 🔒 Doctor/Admin
**Body:**
```json
{
  "patient_id": 1,
  "subjective": "Patient reports headache...",
  "vitals": { "bp": "120/80", "hr": 72, "temp": 98.6, "spo2": 98, "weight": 70 },
  "assessment": "Tension headache",
  "plan": "Ibuprofen 400mg PRN",
  "severity": "mild",
  "allergies": "None",
  "followUp": "2 weeks"
}
```
**Response:** `{ message: "Record saved securely!", visitId: 1, blockchainHash: "abc123..." }`

#### `GET /api/records?patientId=1` 🔒 All Roles
**Response:** Array of visit objects with joined vitals/diagnoses/prescriptions

#### `GET /api/verify/:visitId` 🔒 All Roles
**Response:** `{ status: "SECURE" | "TAMPERED", valid: boolean, message: string }`

### Patients

#### `GET /api/patients?page=1&limit=12&search=wayne` 🔒 Doctor/Admin
**Response:** `{ data: [...patients], pagination: { page, limit, total, totalPages } }`

#### `GET /api/patients/:id` 🔒 Doctor/Admin
**Response:** Single patient object with all profile fields

#### `GET /api/patients/:id/timeline` 🔒 Doctor/Admin
**Response:** `{ visits: [...], appointments: [...] }`

### Appointments

#### `POST /api/appointments` 🔒 Doctor/Admin
**Body:** `{ patient_id: 1, appointment_date: "2026-02-26", appointment_time: "09:00", reason_for_visit: "Follow-up" }`
**Response:** `{ message: "Appointment booked successfully!", appointmentId: 1 }`
**Error 409:** `{ error: "Scheduling conflict: you already have an appointment with..." }`

#### `GET /api/appointments?page=1&limit=12&search=&status=Scheduled` 🔒 All Roles
**Response:** `{ data: [...appointments], pagination: {...} }`

#### `GET /api/appointments/month?year=2026&month=2` 🔒 Doctor/Admin
**Response:** Array of all appointments for that month (un-paginated)

#### `PUT /api/appointments/:id/status` 🔒 Doctor/Admin
**Body:** `{ status: "Completed" | "Cancelled" | "No-Show" | "Scheduled" }`
**Response:** `{ message: "Appointment #1 updated to Completed." }`

### Blockchain

#### `GET /api/blockchain/status` 🔒 All Roles
**Response:** `{ length, isValid, genesisTimestamp, latestBlock, blocks: [...] }`

#### `GET /api/blockchain` 🔒 Doctor/Admin
**Response:** Raw blockchain array

### Audit Logs

#### `GET /api/audit-logs?page=1&limit=20&search=&action=ADD_RECORD` 🔒 Doctor/Admin
**Response:** `{ data: [...logs], pagination: {...} }`

---

## 11. Key Features Walkthrough

### Feature 1: Creating a Medical Record (Clinical Workstation)

1. Navigate to **Clinical** in the sidebar
2. **Tab 1 - Patient**: Search and select a patient from the combobox
3. **Tab 2 - Vitals**: Enter blood pressure, heart rate, temperature, SpO2, weight
4. **Tab 3 - Diagnosis**: Enter assessment, select severity, add allergies and follow-up notes
5. **Tab 4 - Prescription**: Enter medication plan
6. Watch the **Live Hash Preview** update as you type
7. Optionally use **Quick Templates** to pre-fill common conditions
8. Click **Save Record to Blockchain**
9. The record is saved to MySQL, hashed, and added to the blockchain
10. The records panel on the right updates to show the new record

### Feature 2: Verifying Record Integrity

1. On any record card (Clinical Workstation or Blockchain Explorer), click **Verify Integrity**
2. The system:
   - Fetches current data from MySQL
   - Regenerates the SHA-256 hash
   - Compares with the blockchain
3. Result appears as a badge:
   - ✅ **SECURE** (green) — data matches blockchain
   - ❌ **TAMPERED** (red) — data has been modified

### Feature 3: Booking an Appointment (Scheduler)

1. Navigate to **Scheduler** in the sidebar
2. Click **+ New Appointment**
3. Search and select a patient
4. Pick a date, time, and reason
5. If there's a **conflict** (another appointment within 30 minutes), you'll get an error
6. On success, the appointment appears in the list and calendar views
7. Manage appointments with **Complete** ✓ or **Cancel** ✗ buttons

### Feature 4: Exploring the Blockchain

1. Navigate to **Blockchain** in the sidebar
2. See chain overview: total blocks, validity status, genesis date
3. Click any block to expand and see:
   - Block index and timestamp
   - Record ID (links to the medical record)
   - All three hashes (current, previous, data)
4. Click **Verify All Records** to bulk-verify every record on the chain
5. Read the **How It Works** section for a visual explanation

### Feature 5: HIPAA Audit Trail

1. Navigate to **Audit Logs** in the sidebar
2. Every action is logged: record creation, record viewing, integrity checks
3. Search by username or details
4. Filter by action type
5. Each entry shows: who, what, when, and from where (IP address)

---

## 12. Data Flow Diagrams

### Record Creation Flow
```
┌──────────────┐     POST /api/records      ┌──────────────┐
│   Clinical   │ ──────────────────────────→ │   Record     │
│  Workstation │     { SOAP data }           │  Controller  │
│  (React)     │                             │  (Express)   │
└──────────────┘                             └──────┬───────┘
                                                    │
                              ┌──────────────────────┼─────────────────────┐
                              │                      │                     │
                              ▼                      ▼                     ▼
                      ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                      │    MySQL     │     │  Blockchain  │     │  Audit Log   │
                      │ (4 tables    │     │  (addBlock)  │     │  (INSERT)    │
                      │  in TX)      │     │              │     │              │
                      └──────────────┘     └──────────────┘     └──────────────┘
```

### Verification Flow
```
┌──────────────┐     GET /api/verify/:id    ┌──────────────┐
│   Any Page   │ ──────────────────────────→ │   Record     │
│  (Verify     │                             │  Controller  │
│   Button)    │                             └──────┬───────┘
└──────────────┘                                    │
                                          ┌─────────┴─────────┐
                                          │                   │
                                          ▼                   ▼
                                  ┌──────────────┐   ┌──────────────┐
                                  │   MySQL DB   │   │  Blockchain  │
                                  │ (fetch data, │   │ (get stored  │
                                  │  re-hash)    │   │   hash)      │
                                  └──────┬───────┘   └──────┬───────┘
                                         │                   │
                                         ▼                   ▼
                                  ┌──────────────────────────────┐
                                  │     COMPARE HASHES           │
                                  │  DB hash == Blockchain hash? │
                                  │  YES → SECURE                │
                                  │  NO  → TAMPERED              │
                                  └──────────────────────────────┘
```

### Authentication Flow
```
┌──────────┐   POST /login    ┌──────────┐   jwt.sign()    ┌──────────┐
│  Login   │ ───────────────→ │  Auth    │ ──────────────→ │   JWT    │
│  Form    │  {user, pass}    │Controller│                 │  Token   │
└──────────┘                  └──────────┘                 └────┬─────┘
                                                                │
     ┌──────────────────────────────────────────────────────────┘
     │  Token stored in localStorage
     │  Sent as: Authorization: Bearer <token>
     ▼
┌──────────┐   Every API call  ┌──────────────┐   jwt.verify()  ┌──────────┐
│  React   │ ────────────────→ │ verifyToken  │ ──────────────→ │checkRole │
│  App     │  Bearer token     │ Middleware   │  req.userId     │Middleware │
└──────────┘                   └──────────────┘  req.userRole   └──────────┘
```

---

## 13. Demo Data & Setup Instructions

### Prerequisites
1. Node.js (v18+)
2. Docker (for MySQL container)
3. Fish shell (optional, but used in development)
4. `mkcert` (for trusted local HTTPS certificates)

### Step-by-Step Setup

```bash
# 1. Start MySQL in Docker
docker run --name healthchain-mysql -e MYSQL_ROOT_PASSWORD=root123 -p 3306:3306 -d mysql:8

# 2. Wait for MySQL to be ready (~10 seconds), then create the schema
mysql -u root -proot123 -h 127.0.0.1 < server/database_schema.sql

# 3. Install backend dependencies
cd server
npm install

# 3a. Create backend env file
cp .env.example .env
# Set HTTPS paths + FIELD_ENCRYPTION_KEY in .env

# 4. Start the backend server
npm run dev
# HTTPS API runs on https://localhost:3443

# 5. In a new terminal, generate demo data (server must be running)
cd server
node generateDemo.js

# 6. Apply proper names to demo profiles
mysql -u root -proot123 -h 127.0.0.1 healthchain_db < seed_data.sql

# 7. In a new terminal, install frontend dependencies
cd client
npm install

# 7a. Create frontend env file
cp .env.example .env
# Set VITE_HTTPS_* and VITE_API_URL in .env

# 8. Start the frontend dev server
npm run dev
# Frontend runs on https://localhost:5173

# 9. Open browser, login with: dr_house / password123
```

### Local HTTPS Certificate Setup (mkcert)

```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Example generated files:
#   ~/localhost+2.pem
#   ~/localhost+2-key.pem
# Point both server/.env and client/.env to these absolute paths.
```

### Demo Data Contents

| Category | Count | Details |
|---|---|---|
| Doctors | 2 | Dr. Gregory House (Diagnostic Medicine), Dr. Stephen Strange (Neurosurgery) |
| Patients | 10 | Bruce Wayne, Clark Kent, Diana Prince, Tony Stark, Natasha Romanoff, Peter Parker, Wanda Maximoff, Steve Rogers, Logan Howlett, Barry Allen |
| Medical Records | 23 | Full SOAP notes with vitals, severity levels, allergies — across various conditions |
| Appointments | ~100 | Spanning 4 weeks past to 2 weeks future, with mixed statuses (Completed, Scheduled, Cancelled, No-Show) |
| Blockchain Blocks | 24 | 1 genesis + 23 record blocks |

### Resetting the Database

```bash
# Drop and recreate everything:
mysql -u root -proot123 -h 127.0.0.1 -e "DROP DATABASE healthchain_db;"
mysql -u root -proot123 -h 127.0.0.1 < server/database_schema.sql

# Re-generate demo data (server must be running):
node server/generateDemo.js
mysql -u root -proot123 -h 127.0.0.1 healthchain_db < server/seed_data.sql
```

---

## 14. Security & HIPAA Compliance Features

### Authentication Security
| Feature | Implementation |
|---|---|
| Password Hashing | bcryptjs with 8 salt rounds — passwords never stored in plaintext |
| Token-Based Auth | JWT tokens with 24-hour expiry |
| Stateless Sessions | No server-side session storage; each request carries its own auth proof |
| Public Signup Hardening | `/register` enforces patient-only role on backend |
| Admin Provisioning | Doctor accounts are created/updated only through admin-protected endpoints |

### Transport & Storage Security
| Feature | Implementation |
|---|---|
| Local HTTPS | Express + Vite can run over TLS using local cert/key files |
| HTTP Redirect | Optional local HTTP → HTTPS redirect on API server |
| Database TLS | Optional MySQL SSL/TLS support via env (`DB_SSL*`) |
| Field-Level Encryption | AES-256-GCM encryption for sensitive patient profile fields |
| Keyed Encryption | Controlled through `FIELD_ENCRYPTION_KEY` env variable |

### Authorization Security
| Feature | Implementation |
|---|---|
| Role-Based Access Control (RBAC) | `checkRole()` middleware enforces per-endpoint role requirements |
| Data Isolation | Patients can only access their OWN records (server-side enforcement) |
| Doctor Verification | Doctor ID resolved from JWT user ID on every request (not from client input) |

### Data Integrity
| Feature | Implementation |
|---|---|
| Blockchain Verification | SHA-256 hash of every record stored on an immutable chain |
| Tamper Detection | Any modification to DB data causes hash mismatch → TAMPERED |
| Deterministic Hashing | Same data always produces same hash for reproducible verification |
| Transaction Safety | Multi-table inserts wrapped in MySQL transactions with rollback |

### Audit Trail (HIPAA Compliance)
| Feature | Implementation |
|---|---|
| Action Logging | Every data access, creation, and verification logged to `audit_logs` |
| User Tracking | `user_id` and `username` recorded with every action |
| IP Tracking | Client IP address captured for each event |
| Timestamping | Automatic `TIMESTAMP` on every log entry |
| Searchable History | Paginated, filterable audit log UI |

### Logged Actions
| Action Type | Triggered When |
|---|---|
| `ADD_RECORD` | Doctor creates a new medical record |
| `VIEW_HISTORY` | Any user views medical records |
| `VERIFY_INTEGRITY` | Any user verifies a record's blockchain integrity |

---

## 15. Folder Structure

```
healthchain-mvp/
├── PROJECT_DOCUMENTATION_2.md        ← This file
│
├── server/                           ← BACKEND (Node.js + Express)
│   ├── server.js                     ← Entry point — Express app setup
│   ├── package.json                  ← Dependencies & scripts
│   ├── .env.example                  ← Backend env template (HTTPS, DB, encryption)
│   ├── createAdmin.js                ← Admin bootstrap utility
│   ├── database_schema.sql           ← Full DB schema (8 tables)
│   ├── seed_data.sql                 ← Profile name updates (run after generateDemo)
│   ├── generateDemo.js               ← Demo data generator (10 patients, 23 records, 100 appts)
│   ├── blockchain_data.json          ← Persisted blockchain (auto-generated, do not edit)
│   │
│   └── src/
│       ├── config/
│       │   └── db.js                 ← MySQL connection setup
│       │
│       ├── middleware/
│       │   └── authMiddleware.js     ← JWT verification + RBAC
│       │
│       ├── controllers/
│       │   ├── authController.js     ← Register + Login
│       │   ├── adminController.js    ← Admin doctor provisioning
│       │   ├── recordController.js   ← SOAP records, patients, verify, audit logs
│       │   ├── appointmentController.js ← Booking, listing, calendar, status
│       │   └── dashboardController.js   ← Dashboard stats aggregation
│       │
│       ├── models/
│       │   ├── User.js               ← User DB queries
│       │   ├── Records.js            ← Visit transaction + queries
│       │   ├── Blockchain.js         ← Block + Blockchain classes (singleton)
│       │   └── AuditLog.js           ← Audit log insert
│       │
│       ├── routes/
│       │   └── apiRoutes.js          ← All route definitions
│       │
│       └── utils/
│           ├── hashUtils.js          ← SHA-256 helper
│           └── fieldEncryption.js    ← AES-256-GCM patient field encryption
│
├── client/                           ← FRONTEND (React + Vite + Tailwind)
│   ├── package.json                  ← Dependencies & scripts
│   ├── .env.example                  ← Frontend env template (HTTPS + API URL)
│   ├── index.html                    ← HTML template
│   ├── vite.config.js                ← Vite build configuration
│   │
│   └── src/
│       ├── main.jsx                  ← React entry point (BrowserRouter)
│       ├── App.jsx                   ← Root component (auth, routing, state)
│       ├── App.css                   ← Custom animations
│       ├── index.css                 ← Tailwind imports + global styles
│       │
│       ├── constants/
│       │   └── api.js                ← API_URL constant
│       │
│       ├── utils/
│       │   └── soap.js               ← SOAP form defaults + clinical templates
│       │
│       ├── pages/
│       │   ├── AuthPage.jsx          ← Login / Register form
│       │   ├── AdminPanel.jsx        ← Admin workspace home
│       │   ├── AdminDoctors.jsx      ← Doctor account management
│       │   ├── DashboardHome.jsx     ← Stats + activity + quick links
│       │   ├── ClinicalWorkstation.jsx ← Tabbed SOAP form + records panel
│       │   ├── PatientProfile.jsx    ← Patient detail + timeline
│       │   ├── BlockchainExplorer.jsx ← Chain visualization + verification
│       │   ├── AuditLogs.jsx         ← HIPAA audit trail table
│       │   └── Dashboard.jsx         ← (Empty placeholder)
│       │
│       └── components/
│           ├── layout/
│           │   └── Sidebar.jsx       ← Navigation sidebar
│           │
│           ├── records/
│           │   ├── RecordsList.jsx    ← Medical record cards with verify
│           │   ├── PatientDirectory.jsx ← Patient grid with search
│           │   ├── PatientInfoBanner.jsx ← Patient-role info banner
│           │   ├── Scheduler.jsx     ← Appointment management
│           │   └── CalendarView.jsx  ← Month calendar grid
│           │
│           ├── ui/
│           │   ├── PatientSearch.jsx  ← Searchable patient combobox
│           │   └── Pagination.jsx    ← Generic pagination control
│           │
│           └── forms/
│               └── DoctorSoapForm.jsx ← Legacy SOAP form (unused)
```

---

## 16. Glossary

| Term | Definition |
|---|---|
| **SOAP** | A medical documentation format: **S**ubjective (what the patient says), **O**bjective (measurable vitals/findings), **A**ssessment (diagnosis), **P**lan (treatment/prescription) |
| **EHR** | Electronic Health Records — digital version of a patient's paper chart |
| **SHA-256** | A cryptographic hash function that produces a 256-bit (64 hex character) output. Any change to the input completely changes the output |
| **Blockchain** | A linked list of blocks where each block contains a hash of the previous block, making the chain tamper-evident |
| **Genesis Block** | The first block in a blockchain (index 0), created with no real data — serves as the chain's anchor |
| **JWT** | JSON Web Token — a compact, URL-safe token used for authentication. Contains encoded claims (user ID, role) signed with a secret key |
| **RBAC** | Role-Based Access Control — restricting access based on the user's assigned role (patient, doctor, admin) |
| **HIPAA** | Health Insurance Portability and Accountability Act — US law requiring protection of patient health information |
| **Deterministic** | Given the same input, always produces the same output. Critical for hash verification |
| **bcrypt** | A password hashing algorithm that incorporates a salt and is intentionally slow, making brute-force attacks impractical |
| **Middleware** | Functions that execute between receiving a request and sending a response (e.g., JWT verification, role checking) |
| **Transaction** | A set of database operations that either ALL succeed or ALL fail (rollback). Ensures data consistency |
| **Singleton** | A design pattern allowing only one instance of a class. The Blockchain model uses this so all parts of the app share the same chain |
| **Audit Trail** | A chronological record of who accessed what data and when — required for HIPAA compliance |
| **Conflict Detection** | The scheduler checks for overlapping appointments within a 30-minute window before booking |

---

*Updated for HealthChain Bridge MVP — March 2026*
