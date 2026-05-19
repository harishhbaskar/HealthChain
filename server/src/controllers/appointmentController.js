// =========================================================
// Appointment Controller – Phase 2: Scheduler
// =========================================================

// 1. BOOK APPOINTMENT
exports.bookAppointment = async (req, res) => {
    const { patient_id, appointment_date, appointment_time, reason_for_visit } = req.body;

    if (!patient_id || !appointment_date || !appointment_time) {
        return res.status(400).json({ error: 'patient_id, appointment_date, and appointment_time are required.' });
    }

    try {
        const db = require('../config/db');
        const promiseDb = db.promise();

        // Look up the doctor profile from the logged-in user
        const [docRows] = await promiseDb.execute(
            'SELECT id FROM doctors WHERE user_id = ?',
            [req.userId]
        );

        if (docRows.length === 0) {
            return res.status(403).json({
                error: 'Profile Error: Your user account is not linked to a Doctor profile.',
            });
        }
        const doctorId = docRows[0].id;

        // ── Conflict detection: check for overlapping slots (±30 min) ──
        const [conflicts] = await promiseDb.execute(
            `SELECT a.id, a.appointment_time,
                    CONCAT(p.first_name, ' ', p.last_name) AS patient_name
             FROM appointments a
             JOIN patients p ON p.id = a.patient_id
             WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status = 'Scheduled'
               AND ABS(TIME_TO_SEC(TIMEDIFF(a.appointment_time, ?))) < 1800`,
            [doctorId, appointment_date, appointment_time]
        );

        if (conflicts.length > 0) {
            const c = conflicts[0];
            return res.status(409).json({
                error: `Scheduling conflict: you already have an appointment with ${c.patient_name} at ${c.appointment_time} on that date.`,
                conflict: c,
            });
        }

        const [result] = await promiseDb.execute(
            `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit)
             VALUES (?, ?, ?, ?, ?)`,
            [patient_id, doctorId, appointment_date, appointment_time, reason_for_visit || null]
        );

        res.status(201).json({
            message: 'Appointment booked successfully!',
            appointmentId: result.insertId,
        });
    } catch (err) {
        console.error('bookAppointment error:', err);
        res.status(500).json({ error: 'Failed to book appointment.', details: err.message });
    }
};

// 2. GET APPOINTMENTS  –  Paginated + filterable by status/search
//    Query params: page, limit, search, status
exports.getAppointments = async (req, res) => {
    try {
        const db = require('../config/db');
        const promiseDb = db.promise();

        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 12));
        const search = (req.query.search || '').trim();
        const statusFilter = (req.query.status || '').trim();
        const offset = (page - 1) * limit;

        let baseWhere = '';
        let baseParams = [];

        if (req.userRole === 'doctor' || req.userRole === 'admin') {
            const [docRows] = await promiseDb.execute(
                'SELECT id FROM doctors WHERE user_id = ?',
                [req.userId]
            );
            if (docRows.length === 0) {
                return res.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
            }
            baseWhere = 'WHERE a.doctor_id = ?';
            baseParams = [docRows[0].id];
        } else {
            const [patRows] = await promiseDb.execute(
                'SELECT id FROM patients WHERE user_id = ?',
                [req.userId]
            );
            if (patRows.length === 0) {
                return res.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
            }
            baseWhere = 'WHERE a.patient_id = ?';
            baseParams = [patRows[0].id];
        }

        let extraConditions = [];
        let extraParams = [];
        if (search) {
            extraConditions.push(`(CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR a.reason_for_visit LIKE ?)`);
            extraParams.push(`%${search}%`, `%${search}%`);
        }
        if (statusFilter) {
            extraConditions.push(`a.status = ?`);
            extraParams.push(statusFilter);
        }

        const where = baseWhere + (extraConditions.length ? ' AND ' + extraConditions.join(' AND ') : '');
        const allParams = [...baseParams, ...extraParams];

        const [[{ total }]] = await promiseDb.execute(
            `SELECT COUNT(*) AS total FROM appointments a JOIN patients p ON a.patient_id = p.id ${where}`,
            allParams
        );

        const selectFields = req.userRole === 'doctor' || req.userRole === 'admin'
            ? `a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time,
               a.status, a.reason_for_visit, a.created_at,
               p.first_name AS patient_first_name, p.last_name AS patient_last_name,
               p.phone_number AS patient_phone`
            : `a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time,
               a.status, a.reason_for_visit, a.created_at,
               d.first_name AS doctor_first_name, d.last_name AS doctor_last_name`;

        const joinClause = req.userRole === 'doctor' || req.userRole === 'admin'
            ? 'JOIN patients p ON a.patient_id = p.id'
            : 'JOIN patients p ON a.patient_id = p.id JOIN doctors d ON a.doctor_id = d.id';

        const [rows] = await promiseDb.execute(
            `SELECT ${selectFields}
             FROM appointments a ${joinClause}
             ${where}
             ORDER BY a.appointment_date ASC, a.appointment_time ASC
             LIMIT ${limit} OFFSET ${offset}`,
            allParams
        );

        res.json({
            data: rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error('getAppointments error:', err);
        res.status(500).json({ error: 'Failed to fetch appointments.' });
    }
};

// 3. GET MONTH APPOINTMENTS – Un-paginated list for calendar rendering
//    Query params: year, month (both required)
exports.getMonthAppointments = async (req, res) => {
    try {
        const db = require('../config/db');
        const promiseDb = db.promise();

        const year  = parseInt(req.query.year);
        const month = parseInt(req.query.month); // 1-12
        if (!year || !month || month < 1 || month > 12) {
            return res.status(400).json({ error: 'Valid year and month (1-12) are required.' });
        }

        // Determine doctor ID
        const [docRows] = await promiseDb.execute(
            'SELECT id FROM doctors WHERE user_id = ?',
            [req.userId]
        );
        if (docRows.length === 0) return res.json([]);
        const doctorId = docRows[0].id;

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, '0')}-01`;

        const [rows] = await promiseDb.execute(
            `SELECT
                a.id, a.patient_id, a.appointment_date, a.appointment_time,
                a.status, a.reason_for_visit,
                p.first_name AS patient_first_name,
                p.last_name  AS patient_last_name
             FROM appointments a
             JOIN patients p ON p.id = a.patient_id
             WHERE a.doctor_id = ?
               AND a.appointment_date >= ? AND a.appointment_date < ?
             ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
            [doctorId, startDate, endDate]
        );

        res.json(rows);
    } catch (err) {
        console.error('getMonthAppointments error:', err);
        res.status(500).json({ error: 'Failed to fetch monthly appointments.' });
    }
};

// 4. UPDATE STATUS (with authorization check)
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Scheduled', 'Completed', 'Cancelled', 'No-Show'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    try {
        const db = require('../config/db');
        const promiseDb = db.promise();

        // Get the logged-in doctor's profile ID
        const [docRows] = await promiseDb.execute(
            'SELECT id FROM doctors WHERE user_id = ?',
            [req.userId]
        );

        if (docRows.length === 0) {
            return res.status(403).json({ error: 'Doctor profile not found.' });
        }
        const doctorId = docRows[0].id;

        // Verify the appointment belongs to this doctor before updating
        const [apptRows] = await promiseDb.execute(
            'SELECT doctor_id FROM appointments WHERE id = ?',
            [id]
        );

        if (apptRows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        if (apptRows[0].doctor_id !== doctorId) {
            return res.status(403).json({ error: 'Access denied. You can only update your own appointments.' });
        }

        // Update the appointment status
        await promiseDb.execute(
            'UPDATE appointments SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({ message: `Appointment #${id} updated to "${status}".` });
    } catch (err) {
        console.error('updateStatus error:', err);
        res.status(500).json({ error: 'Failed to update appointment status.' });
    }
};
