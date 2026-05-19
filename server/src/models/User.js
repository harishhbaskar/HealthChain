const db = require('../config/db');

const User = {
    create: (username, passwordHash, role, callback) => {
        const sql = 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)';
        db.query(sql, [username, passwordHash, role], callback);
    },
    findByUsername: (username, callback) => {
        const sql = 'SELECT * FROM users WHERE username = ?';
        db.query(sql, [username], callback);
    }
};

module.exports = User;