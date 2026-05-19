const db = require('../config/db');

const AuditLog = {
    log: (userId, actionType, details, ipAddress, callback) => {
        const sql = 'INSERT INTO audit_logs (user_id, action_type, details, ip_address) VALUES (?, ?, ?, ?)';
        db.query(sql, [userId, actionType, details, ipAddress], (err, result) => {
            if (err) console.error("Error writing audit log:", err);
            if (callback) callback(err, result);
        });
    }
};

module.exports = AuditLog;