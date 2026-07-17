const { decryptPatientFields } = require('../utils/fieldEncryption');
const AuditLog = require('../models/AuditLog');

exports.getPatientDashboard = async (req, res) => {
    const db  = require('../config/db').promise();
    const ip  = req.ip || req.connection.remoteAddress;

    try {
        // ── 1. Profile ───────────────────────────────────────
        const [[patient]] = await db.execute(
            'SELECT * FROM patients WHERE user_id = ?',
            [req.userId]
        );
        if (!patient) return res.status(404).json({ error: 'Patient not found.' });

        const patientId = patient.id;
        const profile   = decryptPatientFields(patient);

        // ── 2. Latest visit (vitals + diagnosis + doctor) ────
        const [visitRows] = await db.execute(
            `SELECT
                v.id, v.visit_date, v.chief_complaint, v.follow_up,
                vt.blood_pressure, vt.heart_rate, vt.temperature, vt.spo2, vt.weight,
                d.condition_name, d.severity,
                p.medication_name,
                CONCAT(doc.first_name, ' ', doc.last_name) AS doctor_name
             FROM visits v
             LEFT JOIN vitals        vt  ON vt.visit_id  = v.id
             LEFT JOIN diagnoses     d   ON d.visit_id   = v.id
             LEFT JOIN prescriptions p   ON p.visit_id   = v.id
             LEFT JOIN doctors       doc ON doc.id        = v.doctor_id
             WHERE v.patient_id = ?
             ORDER BY v.visit_date DESC
             LIMIT 1`,
            [patientId]
        );

        // ── 3. Total record count ────────────────────────────
        const [[{ totalRecords }]] = await db.execute(
            'SELECT COUNT(*) AS totalRecords FROM visits WHERE patient_id = ?',
            [patientId]
        );

        // ── 4. Upcoming scheduled appointments (next 3) ──────
        const [upcoming] = await db.execute(
            `SELECT
                a.id, a.appointment_date, a.appointment_time,
                a.reason_for_visit, a.status,
                CONCAT(d.first_name, ' ', d.last_name) AS doctor_name
             FROM appointments a
             LEFT JOIN doctors d ON d.id = a.doctor_id
             WHERE a.patient_id = ?
               AND a.appointment_date >= CURDATE()
               AND a.status = 'Scheduled'
             ORDER BY a.appointment_date ASC, a.appointment_time ASC
             LIMIT 3`,
            [patientId]
        );

        // ── 5. Recent diagnoses (last 5) ─────────────────────
        const [diagnoses] = await db.execute(
            `SELECT d.condition_name, d.severity, v.visit_date
             FROM diagnoses d
             JOIN visits v ON v.id = d.visit_id
             WHERE v.patient_id = ?
             ORDER BY v.visit_date DESC
             LIMIT 5`,
            [patientId]
        );

        // ── 6. Profile completeness check ────────────────────
        const isProfileComplete = !!(
            profile.first_name &&
            profile.first_name !== 'Patient' &&
            profile.date_of_birth &&
            profile.phone_number
        );

        AuditLog.log(req.userId, 'VIEW_DASHBOARD', 'Patient viewed their health dashboard', ip);

        res.json({
            profile,
            latestVisit: visitRows[0] || null,
            totalRecords: Number(totalRecords),
            upcomingAppointments: upcoming,
            recentDiagnoses: diagnoses,
            isProfileComplete,
        });
    } catch (err) {
        console.error('getPatientDashboard error:', err);
        res.status(500).json({ error: 'Failed to load patient dashboard.' });
    }
};
