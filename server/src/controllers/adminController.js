const bcrypt = require('bcryptjs');
const db = require('../config/db');

exports.listDoctors = async (req, res) => {
    try {
        const promiseDb = db.promise();
        const [rows] = await promiseDb.execute(
            `SELECT
                d.id,
                d.first_name,
                d.last_name,
                d.specialty,
                d.created_at,
                u.id AS user_id,
                u.username
             FROM doctors d
             INNER JOIN users u ON d.user_id = u.id
             ORDER BY d.created_at DESC`
        );

        res.json({ data: rows });
    } catch (err) {
        console.error('Error fetching doctors:', err);
        res.status(500).json({ error: 'Failed to fetch doctors.' });
    }
};

exports.createDoctor = async (req, res) => {
    const { username, password, first_name, last_name, specialty } = req.body;

    if (!username || !password || !first_name || !last_name) {
        return res.status(400).json({
            error: 'username, password, first_name, and last_name are required.',
        });
    }

    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        const passwordHash = bcrypt.hashSync(password, 10);

        const [userResult] = await connection.execute(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, passwordHash, 'doctor']
        );

        await connection.execute(
            'INSERT INTO doctors (user_id, first_name, last_name, specialty) VALUES (?, ?, ?, ?)',
            [userResult.insertId, first_name, last_name, specialty || 'General Practice']
        );

        await connection.commit();
        res.status(201).json({ message: 'Doctor account created successfully.' });
    } catch (err) {
        await connection.rollback();
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Username already exists.' });
        }
        console.error('Error creating doctor:', err);
        res.status(500).json({ error: 'Failed to create doctor.' });
    } finally {
        connection.release();
    }
};

exports.updateDoctor = async (req, res) => {
    const { doctorId } = req.params;
    const { username, password, first_name, last_name, specialty } = req.body;

    if (!username || !first_name || !last_name) {
        return res.status(400).json({
            error: 'username, first_name, and last_name are required.',
        });
    }

    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        const [doctorRows] = await connection.execute(
            'SELECT id, user_id FROM doctors WHERE id = ? LIMIT 1',
            [doctorId]
        );

        if (!doctorRows.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Doctor not found.' });
        }

        const { user_id: userId } = doctorRows[0];

        if (password && password.trim()) {
            const passwordHash = bcrypt.hashSync(password, 10);
            await connection.execute(
                'UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ?',
                [username, passwordHash, 'doctor', userId]
            );
        } else {
            await connection.execute(
                'UPDATE users SET username = ?, role = ? WHERE id = ?',
                [username, 'doctor', userId]
            );
        }

        await connection.execute(
            'UPDATE doctors SET first_name = ?, last_name = ?, specialty = ? WHERE id = ?',
            [first_name, last_name, specialty || 'General Practice', doctorId]
        );

        await connection.commit();
        res.json({ message: 'Doctor updated successfully.' });
    } catch (err) {
        await connection.rollback();
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Username already exists.' });
        }
        console.error('Error updating doctor:', err);
        res.status(500).json({ error: 'Failed to update doctor.' });
    } finally {
        connection.release();
    }
};
