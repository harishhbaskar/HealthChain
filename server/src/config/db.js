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
const dbConfig = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+05:30', // IST (India Standard Time)
    ...(sslConfig ? { ssl: sslConfig } : {}),
};

if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
    const dbUrl = new URL(process.env.MYSQL_URL || process.env.DATABASE_URL);
    dbConfig.host = dbUrl.hostname;
    dbConfig.port = dbUrl.port || 3306;
    dbConfig.user = dbUrl.username;
    dbConfig.password = dbUrl.password;
    dbConfig.database = dbUrl.pathname.replace(/^\//, '');
} else {
    dbConfig.host = process.env.DB_HOST || '127.0.0.1';
    dbConfig.port = process.env.DB_PORT || 3306;
    dbConfig.user = process.env.DB_USER || 'root';
    dbConfig.password = process.env.DB_PASSWORD || 'root123';
    dbConfig.database = process.env.DB_NAME || 'healthchain_db';
}

const pool = mysql.createPool(dbConfig);

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
