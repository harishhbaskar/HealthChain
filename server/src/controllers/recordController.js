const Record = require('../models/Records');
const myBlockchain = require('../models/Blockchain');
const { generateHash } = require('../utils/hashUtils');
const AuditLog = require('../models/AuditLog');
const { decryptPatientFields } = require('../utils/fieldEncryption');

// =========================================================
// Helper: build a deterministic string from visit data so
// the SHA-256 hash is always reproducible.
// Format:  S: [...] O: BP [...] HR [...] Temp [...] A: [...] P: [...]
// =========================================================
const buildDeterministicString = ({ subjective, bp, hr, temp, assessment, plan }) => {
    return [
        `S: ${(subjective || '').trim()}`,
        `O: BP ${(bp || '').toString().trim()} HR ${(hr || '').toString().trim()} Temp ${(temp || '').toString().trim()}`,
        `A: ${(assessment || '').trim()}`,
        `P: ${(plan || '').trim()}`
    ].join('\n');
};

// =========================================================
// 1. ADD RECORD  –  Transactional EHR insert + Blockchain
// =========================================================
exports.addRecord = async (req, res) => {
    const { patient_id, subjective = '', vitals = {}, assessment = '', plan = '', severity = 'moderate', allergies = '', followUp = '' } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // --- Validation ---
    if (!assessment || !assessment.trim()) {
        return res.status(400).json({ error: 'Assessment (Diagnosis) is required.' });
    }
    if (!patient_id) {
        return res.status(400).json({ error: 'patient_id is required.' });
    }

    try {
        const db = require('../config/db');
        const promiseDb = db.promise();

        // 🚨 FIX 1: Look up the actual doctor_id from the doctors table using the logged-in user_id
        const [docRows] = await promiseDb.execute('SELECT id FROM doctors WHERE user_id = ?', [req.userId]);
        
        if (docRows.length === 0) {
            // If they are logged in as a Doctor but don't have a profile in the doctors table yet
            return res.status(403).json({ 
                error: 'Profile Error: Your user account is not linked to a Doctor profile in the database. Please run the seed_data.sql script.' 
            });
        }
        const realDoctorId = docRows[0].id;

        // 🚨 FIX 2: Convert empty strings to NULL so MySQL doesn't crash on Number columns
        const { bp = '', hr = '', temp = '', spo2 = '', weight = '' } = vitals;
        const safeHr = hr === '' ? null : parseInt(hr, 10);
        const safeTemp = temp === '' ? null : parseFloat(temp);
        const safeSpo2 = spo2 === '' ? null : parseInt(spo2, 10);
        const safeWeight = weight === '' ? null : parseFloat(weight);

        // A. Transactional insert across 4 tables (Now using realDoctorId)
        const Record = require('../models/Records');
        const visitId = await Record.createFullVisit(
            { patient_id, doctor_id: realDoctorId, chief_complaint: subjective.trim(), allergies: allergies.trim(), follow_up: followUp.trim() },
            { bp, hr: safeHr, temp: safeTemp, spo2: safeSpo2, weight: safeWeight },
            { condition_name: assessment.trim(), severity },
            { medication_name: plan.trim(), instructions: '' }
        );

        // B. Build deterministic string & hash
        const deterministicStr = buildDeterministicString({ subjective, bp, hr, temp, assessment, plan });
        const { generateHash } = require('../utils/hashUtils');
        const recordHash = generateHash(deterministicStr);

        // C. Persist hash back to visits row
        await Record.updateVisitHash(visitId, recordHash);

        // D. Add to Blockchain
        const myBlockchain = require('../models/Blockchain');
        await myBlockchain.addBlock(visitId, recordHash);

        // E. Audit log
        const AuditLog = require('../models/AuditLog');
        AuditLog.log(req.userId, 'ADD_RECORD', `Created Visit #${visitId}`, ip);

        res.status(200).json({
            message: 'Record saved securely!',
            visitId,
            blockchainHash: recordHash
        });
    } catch (err) {
        console.error('addRecord error:', err);
        res.status(500).json({ error: 'Database transaction failed.', details: err.message });
    }
};
// =========================================================
// 2. GET RECORDS  –  All visits for the logged-in patient
// =========================================================
exports.getRecords = async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const db = require('../config/db');
        const promiseDb = db.promise();
        let targetPatientId;

        if (req.userRole === 'doctor' || req.userRole === 'admin') {
            // If Doctor, use the ID sent from the frontend dropdown
            targetPatientId = req.query.patientId;
            if (!targetPatientId) {
                return res.json([]); // Don't load anything until a patient is selected
            }
        } else {
            // If Patient, securely look up their true Patient Profile ID using their Login ID
            const [patientRows] = await promiseDb.execute('SELECT id FROM patients WHERE user_id = ?', [req.userId]);
            if (patientRows.length === 0) {
                return res.json([]); 
            }
            targetPatientId = patientRows[0].id;
        }

        const Record = require('../models/Records');
        const visits = await Record.getVisitsByPatient(targetPatientId);

        // --- COMPLIANCE: LOG THE ACCESS ---
        const AuditLog = require('../models/AuditLog');
        AuditLog.log(req.userId, 'VIEW_HISTORY', `Viewed medical history for Patient ID ${targetPatientId}`, ip);

        res.json(visits);
    } catch (err) {
        console.error('getRecords error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// =========================================================
// 3. VERIFY INTEGRITY  –  Reconstruct hash from JOINed data
//    and compare against the Blockchain ledger.
// =========================================================
exports.verifyIntegrity = async (req, res) => {
    const visitId = req.params.id;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const visit = await Record.getFullVisitById(visitId);

        if (!visit) {
            return res.status(404).json({ error: 'Visit not found' });
        }

        // Reconstruct the EXACT same deterministic string
        const deterministicStr = buildDeterministicString({
            subjective: visit.chief_complaint,
            bp: visit.blood_pressure,
            hr: visit.heart_rate,
            temp: visit.temperature,
            assessment: visit.condition_name,
            plan: visit.medication_name
        });

        const currentHash = generateHash(deterministicStr);
        const block = myBlockchain.getBlockByRecordId(visitId);

        if (!block) {
            return res.json({ status: 'UNKNOWN', message: 'No blockchain record.' });
        }

        const isSecure = currentHash === block.dataHash;

        // --- COMPLIANCE: LOG THE VERIFICATION ---
        const statusLog = isSecure ? 'SUCCESS' : 'FAILED';
        AuditLog.log(req.userId, 'VERIFY_INTEGRITY', `Verified Visit #${visitId}: ${statusLog}`, ip);

        if (isSecure) {
            res.json({ status: 'SECURE', valid: true, message: '✅ Verified Secure' });
        } else {
            res.json({ status: 'TAMPERED', valid: false, message: '❌ TAMPER DETECTED' });
        }
    } catch (err) {
        console.error('verifyIntegrity error:', err);
        res.status(500).json({ error: 'Verification failed.' });
    }
};

// =========================================================
// 4. GET PATIENTS  –  Paginated, searchable, sortable
//    Query params: page, limit, search, sort, order
// =========================================================
exports.getPatients = async (req, res) => {
    const db = require('../config/db');
    const promiseDb = db.promise();
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 12));
        const search = (req.query.search || '').trim();
        const sort   = ['first_name','last_name','date_of_birth','id'].includes(req.query.sort) ? req.query.sort : 'last_name';
        const order  = req.query.order === 'desc' ? 'DESC' : 'ASC';
        const offset = (page - 1) * limit;

        let where = '';
        let params = [];
        if (search) {
            where = `WHERE CONCAT(first_name, ' ', last_name) LIKE ? OR phone_number LIKE ?`;
            params = [`%${search}%`, `%${search}%`];
        }

        const [[{ total }]] = await promiseDb.execute(
            `SELECT COUNT(*) AS total FROM patients ${where}`,
            params
        );

        const [rows] = await promiseDb.execute(
            `SELECT * FROM patients ${where} ORDER BY ${sort} ${order} LIMIT ${limit} OFFSET ${offset}`,
            params
        );

        const decryptedRows = rows.map((row) => decryptPatientFields(row));

        res.json({
            data: decryptedRows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error('getPatients error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// =========================================================
// 4b. GET SINGLE PATIENT  –  Full patient profile by ID
// =========================================================
exports.getPatientById = async (req, res) => {
    const db = require('../config/db');
    const promiseDb = db.promise();
    try {
        const [rows] = await promiseDb.execute(
            'SELECT * FROM patients WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(decryptPatientFields(rows[0]));
    } catch (err) {
        console.error('getPatientById error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// =========================================================
// 5. GET PATIENT TIMELINE – visits + appointments merged
// =========================================================
exports.getPatientTimeline = async (req, res) => {
    const db = require('../config/db');
    const promiseDb = db.promise();
    const patientId = req.params.id;
    try {
        const [visits] = await promiseDb.execute(
            `SELECT
                v.id AS visit_id,
                v.chief_complaint,
                v.allergies,
                v.follow_up,
                v.visit_date,
                v.record_hash,
                CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                vt.blood_pressure,
                vt.heart_rate,
                vt.temperature,
                vt.spo2,
                vt.weight,
                diag.condition_name,
                diag.severity,
                p.medication_name,
                p.instructions
             FROM visits v
             LEFT JOIN doctors       d    ON d.id       = v.doctor_id
             LEFT JOIN vitals        vt   ON vt.visit_id = v.id
             LEFT JOIN diagnoses     diag ON diag.visit_id = v.id
             LEFT JOIN prescriptions p    ON p.visit_id  = v.id
             WHERE v.patient_id = ?
             ORDER BY v.visit_date DESC`,
            [patientId]
        );

        const [appointments] = await promiseDb.execute(
            `SELECT
                a.id AS appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason_for_visit,
                CONCAT(d.first_name, ' ', d.last_name) AS doctor_name
             FROM appointments a
             LEFT JOIN doctors d ON d.id = a.doctor_id
             WHERE a.patient_id = ?
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [patientId]
        );

        res.json({ visits, appointments });
    } catch (err) {
        console.error('getPatientTimeline error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// =========================================================
// 6. GET AUDIT LOGS  –  Paginated + filterable
//    Query params: page, limit, search, action
// =========================================================
exports.getAuditLogs = async (req, res) => {
    const db = require('../config/db');
    const promiseDb = db.promise();
    try {
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const search = (req.query.search || '').trim();
        const action = (req.query.action || '').trim();
        const offset = (page - 1) * limit;

        let conditions = [];
        let params = [];
        if (search) {
            conditions.push(`(u.username LIKE ? OR a.details LIKE ?)`);
            params.push(`%${search}%`, `%${search}%`);
        }
        if (action) {
            conditions.push(`a.action_type = ?`);
            params.push(action);
        }
        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

        const [[{ total }]] = await promiseDb.execute(
            `SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${where}`,
            params
        );

        const [rows] = await promiseDb.execute(
            `SELECT
                a.id,
                a.action_type,
                a.details,
                a.ip_address,
                a.timestamp,
                u.username
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.user_id
             ${where}
             ORDER BY a.timestamp DESC
             LIMIT ${limit} OFFSET ${offset}`,
            params
        );

        res.json({
            data: rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error('getAuditLogs error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};