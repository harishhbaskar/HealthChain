const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { SECRET_KEY } = require('../middleware/authMiddleware');
const { encryptPatientFields } = require('../utils/fieldEncryption');

exports.register = async (req, res) => {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Public registration is patient-only. Doctor accounts are admin-provisioned.
    const userRole = 'patient';
    const hashedPassword = bcrypt.hashSync(password, 8);

    try {
        const db = require('../config/db');
        const promiseDb = db.promise();

        // 1. Create the Auth Account in the `users` table
        const [userResult] = await promiseDb.execute(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hashedPassword, userRole]
        );
        const newUserId = userResult.insertId;

        // 2. Automatically create the matching Medical Profile
        if (userRole === 'doctor') {
            await promiseDb.execute(
                'INSERT INTO doctors (user_id, first_name, last_name, specialty) VALUES (?, ?, ?, ?)',
                [newUserId, username, '', 'General Practice'] 
            );
        } else {
            const encryptedPatient = encryptPatientFields({
                email: `${username}@placeholder.com`,
                address: 'Address not provided',
                emergency_contact_name: 'Not provided',
                emergency_contact_phone: '555-0000',
                insurance_provider: 'Not provided',
            });

            await promiseDb.execute(
                `INSERT INTO patients
                    (user_id, first_name, last_name, date_of_birth, gender, blood_type,
                     phone_number, email, address, emergency_contact_name, emergency_contact_phone, insurance_provider)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [newUserId, 'Patient', username, '1990-01-01', 'other', 'O+',
                 '555-0000', encryptedPatient.email, encryptedPatient.address,
                 encryptedPatient.emergency_contact_name, encryptedPatient.emergency_contact_phone, encryptedPatient.insurance_provider]
            );
        }

        res.status(200).json({ message: 'User and Profile registered successfully!' });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Error registering user and profile.' });
    }
};

exports.login = (req, res) => {
    const { username, password } = req.body;

    User.findByUsername(username, (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'User not found.' });

        const user = results[0];
        const passwordIsValid = bcrypt.compareSync(password, user.password_hash);

        if (!passwordIsValid) return res.status(401).json({ auth: false, token: null });

        // Generate Token
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: 86400 }); 

        res.status(200).json({ auth: true, token: token, user: { id: user.id, username: user.username, role: user.role } });
    });
};