const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const recordController = require('../controllers/recordController');
const appointmentController = require('../controllers/appointmentController');
const dashboardController = require('../controllers/dashboardController');
const adminController = require('../controllers/adminController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const myBlockchain = require('../models/Blockchain');

// Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);

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
router.get('/blockchain/status', verifyToken, (req, res) => {
    const myBlockchain = require('../models/Blockchain');
    res.json(myBlockchain.getChainStats());
});

// Debug Route: View the Blockchain (protected - requires authentication)
router.get('/blockchain', verifyToken, checkRole(['doctor', 'admin']), (req, res) => {
    const myBlockchain = require('../models/Blockchain');
    res.json(myBlockchain.chain);
});
module.exports = router;