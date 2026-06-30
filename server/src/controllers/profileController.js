const { encryptPatientFields, decryptPatientFields } = require('../utils/fieldEncryption');
const AuditLog = require('../models/AuditLog');

exports.getProfile = async (req, res) => {
    const db = require('../config/db');
    const promiseDb = db.promise();
    try {
        const [rows] = await promiseDb.execute(
            'SELECT * FROM patients WHERE user_id = ?',
            [req.userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Patient profile not found.' });
        }
        res.json(decryptPatientFields(rows[0]));
    } catch (err) {
        console.error('getProfile error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.updateProfile = async (req, res) => {
    const db = require('../config/db');
    const promiseDb = db.promise();
    const ip = req.ip || req.connection.remoteAddress;

    const {
        first_name, last_name, date_of_birth, gender, blood_type,
        phone_number, email, address,
        emergency_contact_name, emergency_contact_phone, insurance_provider,
    } = req.body;

    if (!first_name || !last_name) {
        return res.status(400).json({ error: 'First name and last name are required.' });
    }

    try {
        const encrypted = encryptPatientFields({
            email, address, emergency_contact_name, emergency_contact_phone, insurance_provider,
        });

        await promiseDb.execute(
            `UPDATE patients SET
                first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, blood_type = ?,
                phone_number = ?, email = ?, address = ?,
                emergency_contact_name = ?, emergency_contact_phone = ?, insurance_provider = ?
             WHERE user_id = ?`,
            [
                first_name, last_name, date_of_birth || null, gender || null, blood_type || null,
                phone_number || null, encrypted.email, encrypted.address,
                encrypted.emergency_contact_name, encrypted.emergency_contact_phone,
                encrypted.insurance_provider, req.userId,
            ]
        );

        AuditLog.log(req.userId, 'UPDATE_PROFILE', 'Patient updated their profile', ip);
        res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
        console.error('updateProfile error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};
