const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again in 15 minutes.' },
});
const recordController = require('../controllers/recordController');
const appointmentController = require('../controllers/appointmentController');
const dashboardController = require('../controllers/dashboardController');
const adminController = require('../controllers/adminController');
const profileController = require('../controllers/profileController');
const blockchainController = require('../controllers/blockchainController');
const patientDashboardController = require('../controllers/patientDashboardController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const myBlockchain = require('../models/Blockchain');

// Auth Routes
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Patient self-service profile
router.get('/profile',         verifyToken, checkRole(['patient']), profileController.getProfile);
router.put('/profile',         verifyToken, checkRole(['patient']), profileController.updateProfile);
router.get('/patient/dashboard', verifyToken, checkRole(['patient']), patientDashboardController.getPatientDashboard);

// Patient: export all records as JSON
router.get('/patient/export', verifyToken, checkRole(['patient']), async (req, res) => {
    const db = require('../config/db').promise();
    try {
        const [[{ pid }]] = await db.execute(
            'SELECT id AS pid FROM patients WHERE user_id = ?', [req.userId]
        );
        const [visits] = await db.execute(
            `SELECT v.id, v.visit_date, v.chief_complaint, v.allergies, v.follow_up,
                    vt.blood_pressure, vt.heart_rate, vt.temperature, vt.spo2, vt.weight,
                    d.condition_name, d.severity,
                    p.medication_name, p.instructions,
                    CONCAT(doc.first_name,' ',doc.last_name) AS doctor_name,
                    v.record_hash
             FROM visits v
             LEFT JOIN vitals vt ON vt.visit_id = v.id
             LEFT JOIN diagnoses d ON d.visit_id = v.id
             LEFT JOIN prescriptions p ON p.visit_id = v.id
             LEFT JOIN doctors doc ON doc.id = v.doctor_id
             WHERE v.patient_id = ?
             ORDER BY v.visit_date DESC`, [pid]
        );
        require('../models/AuditLog').log(req.userId, 'EXPORT_RECORDS', 'Patient exported their records', req.ip);
        res.json({ exportedAt: new Date().toISOString(), totalRecords: visits.length, records: visits });
    } catch (err) {
        res.status(500).json({ error: 'Export failed.' });
    }
});

// Dashboard (Phase 4)
router.get('/dashboard/stats', verifyToken, checkRole(['doctor', 'admin']), dashboardController.getStats);

// Admin: doctor account management
router.get('/admin/doctors', verifyToken, checkRole(['admin']), adminController.listDoctors);
router.post('/admin/doctors', verifyToken, checkRole(['admin']), adminController.createDoctor);
router.put('/admin/doctors/:doctorId', verifyToken, checkRole(['admin']), adminController.updateDoctor);

// Record Routes (Protected)
router.post('/records', 
    verifyToken, 
    checkRole(['doctor', 'admin']), // <--- RBAC ENFORCED
    recordController.addRecord
);
router.get('/records', 
    verifyToken, 
    checkRole(['patient', 'doctor', 'admin']), 
    recordController.getRecords
);
router.get('/verify/:id', verifyToken, recordController.verifyIntegrity);

// Patient list (for doctor dropdown & patient directory)
router.get('/patients', verifyToken, checkRole(['doctor', 'admin']), recordController.getPatients);
router.get('/patients/:id/timeline', verifyToken, checkRole(['doctor', 'admin']), recordController.getPatientTimeline);
router.get('/patients/:id', verifyToken, checkRole(['doctor', 'admin']), recordController.getPatientById);

// Audit logs (HIPAA compliance)
router.get('/audit-logs', verifyToken, checkRole(['doctor', 'admin']), recordController.getAuditLogs);

// Appointments (Phase 2: Scheduler)
router.post('/appointments', verifyToken, checkRole(['doctor', 'admin']), appointmentController.bookAppointment);
router.get('/appointments/month', verifyToken, checkRole(['doctor', 'admin']), appointmentController.getMonthAppointments);
router.get('/appointments', verifyToken, checkRole(['patient', 'doctor', 'admin']), appointmentController.getAppointments);
router.put('/appointments/:id/status', verifyToken, checkRole(['doctor', 'admin']), appointmentController.updateStatus);

// Blockchain Explorer: chain stats + validation (must come BEFORE /blockchain)
router.get('/blockchain/status', verifyToken, async (req, res) => {
    const myBlockchain = require('../models/Blockchain');
    res.json(await myBlockchain.getChainStats());
});

// Full cross-audit: validates every block's hash against current DB data
router.get('/blockchain/audit', verifyToken, checkRole(['doctor', 'admin']), blockchainController.fullAudit);

// View the full chain (protected)
router.get('/blockchain', verifyToken, checkRole(['doctor', 'admin']), async (req, res) => {
    const myBlockchain = require('../models/Blockchain');
    const stats = await myBlockchain.getChainStats();
    res.json(stats.blocks);
});

// Tamper demo (admin only)
router.post('/admin/tamper/:visitId', verifyToken, checkRole(['admin']), blockchainController.simulateTamper);
router.post('/admin/restore/:visitId', verifyToken, checkRole(['admin']), blockchainController.restoreRecord);
module.exports = router;