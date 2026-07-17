// seed.js — Full database reset + admin creation
// Usage:  node seed.js
// Then:   npm run dev   (start the server)
// Then:   node generateDemo.js   (create rich demo data)

require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const TABLES_TO_CLEAR = [
    'appointments',
    'prescriptions',
    'diagnoses',
    'vitals',
    'visits',
    'blockchain_blocks',
    'health_records',
    'audit_logs',
    'patients',
    'doctors',
    'users',
];

async function seed() {
    console.log('\n🌱 HealthChain — Seed Script');
    console.log('══════════════════════════════\n');

    const conn = await mysql.createConnection({
        host:     process.env.DB_HOST     || '127.0.0.1',
        port:     process.env.DB_PORT     || 3307,
        user:     process.env.DB_USER     || 'root',
        password: process.env.DB_PASSWORD || 'root123',
        database: process.env.DB_NAME     || 'healthchain_db',
    });

    // ── 1. Clear all tables ──────────────────────────────
    console.log('── Clearing database ──');
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES_TO_CLEAR) {
        try {
            await conn.execute(`TRUNCATE TABLE \`${table}\``);
            console.log(`  ✅ Cleared ${table}`);
        } catch {
            console.log(`  ⚠️  Skipped ${table} (table may not exist yet)`);
        }
    }
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

    // ── 2. Create blockchain_blocks table if missing ─────
    await conn.execute(`
        CREATE TABLE IF NOT EXISTS blockchain_blocks (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            block_index  INT          NOT NULL,
            timestamp    VARCHAR(50)  NOT NULL,
            record_id    INT          NOT NULL,
            data_hash    VARCHAR(64)  NOT NULL,
            previous_hash VARCHAR(64) NOT NULL,
            current_hash  VARCHAR(64) NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ── 3. Create admin user ─────────────────────────────
    console.log('\n── Creating admin user ──');
    const adminHash = bcrypt.hashSync('admin123', 10);
    await conn.execute(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['admin', adminHash, 'admin']
    );
    console.log('  ✅ admin / admin123');

    await conn.end();

    console.log('\n══════════════════════════════');
    console.log('✅ Database ready.\n');
    console.log('Next steps:');
    console.log('  1. npm run dev          (start the server)');
    console.log('  2. node generateDemo.js (generate rich demo data)');
    console.log('\nDemo logins after generateDemo.js:');
    console.log('  Doctor  →  dr_house    / password123');
    console.log('  Patient →  bruce_wayne / password123');
    console.log('  Admin   →  admin       / admin123');
    console.log('══════════════════════════════\n');
}

seed().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
