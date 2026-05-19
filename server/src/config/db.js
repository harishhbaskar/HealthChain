const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

const dbSslEnabled = process.env.DB_SSL === 'true';
const sslConfig = dbSslEnabled
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ...(process.env.DB_SSL_CA_PATH ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH) } : {}),
        ...(process.env.DB_SSL_CERT_PATH ? { cert: fs.readFileSync(process.env.DB_SSL_CERT_PATH) } : {}),
        ...(process.env.DB_SSL_KEY_PATH ? { key: fs.readFileSync(process.env.DB_SSL_KEY_PATH) } : {}),
    }
    : undefined;

// Use a connection pool instead of single connection
// This allows proper transaction handling and better scalability
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'healthchain_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+05:30', // IST (India Standard Time)
    ...(sslConfig ? { ssl: sslConfig } : {}),
});

// Test the connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ MySQL Connection Failed:', err.message);
        process.exit(1);
    }
    console.log('✅ MySQL Pool Connected Successfully!');
    connection.release();
});

module.exports = pool;
