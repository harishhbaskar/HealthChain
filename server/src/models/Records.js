const pool = require('../config/db');

// Promise-based pool for async/await
const promisePool = pool.promise();

const Record = {

    // =========================================================
    // Transactional insert across visits, vitals, diagnoses,
    // and prescriptions. Rolls back on ANY failure.
    // =========================================================
    createFullVisit: async (visitData, vitalsData, diagnosisData, prescriptionData) => {
        // Get a dedicated connection from the pool for transaction
        const conn = await promisePool.getConnection();

        try {
            await conn.beginTransaction();

            // 1. Insert visit (record_hash is set to NULL initially, updated after hashing)
            const [visitResult] = await conn.execute(
                `INSERT INTO visits (patient_id, doctor_id, chief_complaint, allergies, follow_up, visit_date)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [visitData.patient_id, visitData.doctor_id, visitData.chief_complaint, visitData.allergies || null, visitData.follow_up || null]
            );
            const visitId = visitResult.insertId;

            // 2. Insert vitals
            await conn.execute(
                `INSERT INTO vitals (visit_id, blood_pressure, heart_rate, temperature, spo2, weight)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [visitId, vitalsData.bp, vitalsData.hr, vitalsData.temp, vitalsData.spo2, vitalsData.weight]
            );

            // 3. Insert diagnosis
            await conn.execute(
                `INSERT INTO diagnoses (visit_id, condition_name, severity) VALUES (?, ?, ?)`,
                [visitId, diagnosisData.condition_name, diagnosisData.severity || 'moderate']
            );

            // 4. Insert prescription
            await conn.execute(
                `INSERT INTO prescriptions (visit_id, medication_name, instructions)
                 VALUES (?, ?, ?)`,
                [visitId, prescriptionData.medication_name, prescriptionData.instructions]
            );

            await conn.commit();
            return visitId;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            // Always release the connection back to the pool
            conn.release();
        }
    },

    // =========================================================
    // Update the record_hash on visits after hashing
    // =========================================================
    updateVisitHash: async (visitId, recordHash) => {
        await promisePool.execute(
            `UPDATE visits SET record_hash = ? WHERE id = ?`,
            [recordHash, visitId]
        );
    },

    // =========================================================
    // JOIN query: single visit with related vitals, diagnosis,
    // and prescription data
    // =========================================================
    getFullVisitById: async (visitId) => {
        const [rows] = await promisePool.execute(
            `SELECT
                v.id            AS visit_id,
                v.patient_id,
                v.doctor_id,
                v.chief_complaint,
                v.allergies,
                v.follow_up,
                v.visit_date,
                v.record_hash,
                vt.blood_pressure,
                vt.heart_rate,
                vt.temperature,
                vt.spo2,
                vt.weight,
                d.condition_name,
                d.severity,
                p.medication_name,
                p.instructions
             FROM visits v
             LEFT JOIN vitals        vt ON vt.visit_id = v.id
             LEFT JOIN diagnoses     d  ON d.visit_id  = v.id
             LEFT JOIN prescriptions p  ON p.visit_id  = v.id
             WHERE v.id = ?`,
            [visitId]
        );
        return rows.length ? rows[0] : null;
    },

    // =========================================================
    // All visits for a given patient (summary + joined detail)
    // =========================================================
    getVisitsByPatient: async (patientId) => {
        const [rows] = await promisePool.execute(
            `SELECT
                v.id            AS visit_id,
                v.patient_id,
                v.doctor_id,
                v.chief_complaint,
                v.allergies,
                v.follow_up,
                v.visit_date,
                v.record_hash,
                vt.blood_pressure,
                vt.heart_rate,
                vt.temperature,
                vt.spo2,
                vt.weight,
                d.condition_name,
                d.severity,
                p.medication_name,
                p.instructions
             FROM visits v
             LEFT JOIN vitals        vt ON vt.visit_id = v.id
             LEFT JOIN diagnoses     d  ON d.visit_id  = v.id
             LEFT JOIN prescriptions p  ON p.visit_id  = v.id
             WHERE v.patient_id = ?
             ORDER BY v.visit_date DESC`,
            [patientId]
        );
        return rows;
    }
};

module.exports = Record;
