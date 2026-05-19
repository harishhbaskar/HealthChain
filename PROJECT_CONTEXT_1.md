# HealthChain MVP - Full Project Context Document

## 1) Project Overview

HealthChain MVP is a full-stack healthcare records application that combines:

- EHR-style medical records (SOAP-based visit data)
- Role-based access control (patient / doctor / admin)
- Appointment scheduling
- Audit logging for compliance tracking
- A local blockchain-like immutable hash ledger for integrity verification

The system stores canonical data in MySQL and writes deterministic SHA-256 record hashes into a file-backed chain (`server/blockchain_data.json`) to detect tampering.

## 2) Tech Stack

### Backend

- Node.js + Express (CommonJS)
- MySQL (`mysql2`)
- JWT auth (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- CORS + JSON body parsing

### Frontend

- React 19 + Vite
- React Router
- Axios
- Tailwind CSS v4
- `react-hot-toast`
- `lucide-react` icons

## 3) Repository Layout (High-Level)

```
healthchain-mvp/
  client/                      # React frontend
    src/
      App.jsx                  # Main app shell, routing, auth/session state
      pages/                   # Route-level pages
      components/              # Reusable UI + feature components
      constants/api.js         # API base URL
      utils/                   # SOAP defaults/templates + hash preview helper
  server/                      # Express backend
    server.js                  # App bootstrap
    src/
      routes/apiRoutes.js      # API route map
      controllers/             # Request handlers
      models/                  # DB models + blockchain model
      middleware/              # JWT + RBAC middleware
      config/db.js             # MySQL connection
      utils/hashUtils.js       # SHA-256
    database_schema.sql        # Core schema
    seed_data.sql              # Named profile seed updates
    generateDemo.js            # Large demo-data generator script
    blockchain_data.json       # File-backed blockchain data store
```

## 4) Backend Architecture

### 4.1 Bootstrapping

- `server/server.js`
  - Initializes Express
  - Applies `cors()` and JSON body parser
  - Mounts routes under `/api`
  - Starts server on `PORT` or `3000`

### 4.2 Database Connectivity

- `server/src/config/db.js`
  - Uses `mysql2.createConnection(...)`
  - Hardcoded connection settings:
    - host: `127.0.0.1`
    - port: `3306`
    - user: `root`
    - password: `root123`
    - database: `healthchain_db`
  - Exits process on DB connection failure

### 4.3 Authentication + RBAC

- `server/src/middleware/authMiddleware.js`
  - `verifyToken`: parses bearer token, validates JWT, sets:
    - `req.userId`
    - `req.userRole`
  - `checkRole(allowedRoles)`: enforces role authorization
  - `SECRET_KEY` is hardcoded in source

### 4.4 Route Map

- `POST /api/register`
- `POST /api/login`
- `GET /api/dashboard/stats` (doctor/admin)
- `POST /api/records` (doctor/admin)
- `GET /api/records` (patient/doctor/admin)
- `GET /api/verify/:id` (authenticated)
- `GET /api/patients` (doctor/admin)
- `GET /api/patients/:id` (doctor/admin)
- `GET /api/patients/:id/timeline` (doctor/admin)
- `GET /api/audit-logs` (doctor/admin)
- `POST /api/appointments` (doctor/admin)
- `GET /api/appointments` (patient/doctor/admin)
- `GET /api/appointments/month` (doctor/admin)
- `PUT /api/appointments/:id/status` (doctor/admin)
- `GET /api/blockchain/status` (authenticated)
- `GET /api/blockchain` (currently unprotected debug endpoint)

### 4.5 Controllers

#### Auth Controller (`authController.js`)

- Register:
  - Inserts into `users`
  - Auto-creates:
    - `doctors` profile for doctor role
    - `patients` profile for others (placeholder fields)
- Login:
  - Fetches user by username
  - Verifies bcrypt hash
  - Returns JWT + user summary

#### Record Controller (`recordController.js`)

- `addRecord`
  - Validates payload
  - Resolves logged-in doctor’s `doctor_id`
  - Uses transactional multi-table insert (visit/vitals/diagnosis/prescription)
  - Builds deterministic SOAP string
  - Computes SHA-256 record hash
  - Saves hash into `visits.record_hash`
  - Appends block to blockchain ledger
  - Writes compliance log entry

- `getRecords`
  - Patient: resolves own `patient_id` via `user_id`
  - Doctor/Admin: uses `patientId` query param
  - Returns joined visit records
  - Logs access in `audit_logs`

- `verifyIntegrity`
  - Rebuilds deterministic string from DB visit data
  - Re-hashes and compares with blockchain block `dataHash`
  - Returns `SECURE`, `TAMPERED`, or `UNKNOWN`
  - Logs verification action

- `getPatients`
  - Pagination + search + sorting

- `getPatientById`
  - Returns full patient profile

- `getPatientTimeline`
  - Returns merged `visits` + `appointments` data for profile timeline

- `getAuditLogs`
  - Pagination + search + action filter

#### Appointment Controller (`appointmentController.js`)

- `bookAppointment`
  - Resolves doctor profile from logged-in user
  - Detects time conflicts within +/- 30 minutes
  - Inserts scheduled appointment

- `getAppointments`
  - Role-aware query:
    - doctor/admin sees own doctor appointments
    - patient sees own appointments
  - Pagination + search + status filter

- `getMonthAppointments`
  - Returns unpaginated month data for calendar UI

- `updateStatus`
  - Valid statuses:
    - `Scheduled`
    - `Completed`
    - `Cancelled`
    - `No-Show`

#### Dashboard Controller (`dashboardController.js`)

- For doctor/admin:
  - Resolves doctor profile
  - Executes parallel stat queries:
    - today's appointment count
    - upcoming appointment count
    - completed appointments in last 7 days
    - total unique patients
    - today’s schedule list
    - recent activity feed from audit logs

### 4.6 Data Access Models

- `User.js`:
  - `create`, `findByUsername`
- `AuditLog.js`:
  - `log(...)`
- `Records.js`:
  - `createFullVisit(...)` transactional insert
  - `updateVisitHash(...)`
  - `getFullVisitById(...)`
  - `getVisitsByPatient(...)`
- `Blockchain.js`:
  - File-backed blockchain singleton
  - Genesis block creation
  - Block append with previous-hash linking
  - Chain validation (`isChainValid`)
  - Stats (`getChainStats`)

## 5) Blockchain Design in This Project

The chain is a local append-only JSON ledger:

- Storage file: `server/blockchain_data.json`
- Block fields:
  - `index`
  - `timestamp`
  - `recordId` (MySQL visit ID)
  - `dataHash` (SHA-256 hash of canonical record content)
  - `previousHash`
  - `currentHash`

Integrity strategy:

- DB is source of truth for record data
- Blockchain stores immutable hash snapshots
- Verification recomputes hash from DB and compares with chain hash

## 6) Database Schema Summary

Defined in `server/database_schema.sql`.

### Core tables

- `users`
- `audit_logs`
- `patients`
- `doctors`

### Clinical record model

- `visits`
- `vitals`
- `diagnoses`
- `prescriptions`

### Scheduling

- `appointments`

### Legacy compatibility

- `health_records` (retained old table)

## 7) Frontend Architecture

### 7.1 Entry and Routing

- `client/src/main.jsx`
  - BrowserRouter + App mount

- `client/src/App.jsx`
  - Central app state:
    - auth token/user in localStorage
    - patient/record lists
    - verification status map
  - Route gating by role
  - Unauthenticated routes:
    - `/login`
    - `/register`
  - Authenticated routes:
    - `/` dashboard
    - `/clinical`
    - `/patients`
    - `/patients/:id`
    - `/scheduler`
    - `/blockchain`
    - `/audit`

### 7.2 Main Pages

- `AuthPage.jsx`: login/register UI with password toggle
- `DashboardHome.jsx`: greeting, doctor stats, schedule, recent activity
- `ClinicalWorkstation.jsx`: multi-tab SOAP entry + live hash preview + records panel
- `PatientProfile.jsx`: full profile, timeline tabs, inline quick actions
- `BlockchainExplorer.jsx`: chain visualization + single/all verification
- `AuditLogs.jsx`: searchable/filterable audit log table

### 7.3 Key Components

- `Sidebar.jsx`: role-aware nav, collapsible
- `Scheduler.jsx`: list + calendar modes, status actions, booking modal
- `CalendarView.jsx`: month grid with appointment dots/details
- `PatientDirectory.jsx`: searchable/paginated patient cards
- `RecordsList.jsx`: rendered visit cards + verification action
- `PatientSearch.jsx`: reusable searchable patient combobox
- `Pagination.jsx`: shared pagination control

### 7.4 Utilities

- `utils/soap.js`
  - `initialSoapForm`
  - multiple quick templates
- `utils/hashPreview.js`
  - UI-only hash-like preview (not real SHA-256)
  - server remains source for true SHA-256

### 7.5 API Client Constant

- `constants/api.js`
  - `API_URL = 'http://localhost:3000/api'`

## 8) Functional Workflows

### 8.1 Registration

1. User submits username/password/role
2. Backend creates auth row in `users`
3. Backend auto-creates profile row:
   - `doctors` or `patients`
4. Frontend auto-logs in and stores token/user in localStorage

### 8.2 Create Medical Record (Doctor/Admin)

1. Select patient + fill SOAP data
2. POST `/records`
3. Backend inserts normalized visit data (transaction)
4. Deterministic hash computed and saved on visit row
5. Hash pushed as new blockchain block
6. Audit entry logged

### 8.3 Verify Integrity

1. User clicks verify on visit (or verify-all in explorer)
2. GET `/verify/:id`
3. Backend rebuilds deterministic SOAP string from DB
4. SHA-256 rehash compared with blockchain `dataHash`
5. UI marks `SECURE` or `TAMPERED`

### 8.4 Appointment Lifecycle

1. Doctor books appointment
2. Conflict detection checks +/- 30 min window
3. Appointment appears in:
   - Scheduler list view
   - Scheduler calendar view
   - Dashboard stats/schedule
4. Status updated to `Completed`, `Cancelled`, or `No-Show`

### 8.5 Audit Trail

Key actions logged:

- `ADD_RECORD`
- `VERIFY_INTEGRITY`
- `VIEW_HISTORY`

Visible in Audit Logs page with pagination, search, and action filter.

## 9) Scripts and Supporting Files

### Backend scripts

- `npm run start` -> starts API
- `npm run dev` -> watch mode start

Other scripts/files:

- `generateDemo.js`
  - registers demo users
  - creates records/appointments
  - resets blockchain file for sync
- `seed_data.sql`
  - updates profiles to named demo identities
- `test_verify.js`
  - quick API verification script for integrity routes

### Frontend scripts

- `npm run dev` -> Vite dev server
- `npm run build` -> production build
- `npm run preview` -> preview build
- `npm run lint` -> ESLint

## 10) Environment + Runtime Expectations

- Backend API expects MySQL running locally with `healthchain_db`
- Frontend expects backend at `http://localhost:3000/api`
- JWT and DB credentials are currently hardcoded in source
- Blockchain data is persisted in `server/blockchain_data.json`

## 11) Current Known Gaps / Risks

1. Security hardcoding:
   - DB credentials and JWT secret are in source code
2. `GET /api/blockchain` is not protected (debug endpoint exposure)
3. DB connection uses single `createConnection` (not pooled)
4. Some project artifacts are stale/experimental:
   - `server/sys,json` (large PostScript artifact)
   - `summa.txt`, `server/summa.js`
5. Empty/unwired frontend files:
   - `client/src/pages/Dashboard.jsx`
   - `client/src/components/VerifyButton.jsx`
6. `hashPreview.js` is intentionally non-cryptographic and cosmetic

## 12) End-to-End Feature Coverage Snapshot

- Auth + role-based access: implemented
- Patient profile auto-provision on register: implemented
- SOAP record entry with normalized persistence: implemented
- SHA-256 record hashing (server): implemented
- Hash-chain append + chain validation: implemented
- Per-record integrity verification API: implemented
- Patient directory + profile timeline: implemented
- Appointment scheduler (list/calendar, filters, status updates): implemented
- Dashboard analytics for doctor/admin: implemented
- Audit log UI + backend querying: implemented

---

If you want, I can also generate:

1. an API reference table (request/response examples for each endpoint),
2. a setup/runbook (`SETUP.md`) with exact commands,
3. a production-hardening checklist mapped to this codebase.
