require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');

async function initRemoteDb() {
    console.log('═══════════════════════════════════════════════');
    console.log('  🛠️  HealthChain — Remote DB Initializer');
    console.log('═══════════════════════════════════════════════\n');

    try {
        console.log('Reading database_schema.sql...');
        const schemaSql = fs.readFileSync(path.join(__dirname, 'database_schema.sql'), 'utf8');
        
        // Split the SQL file by semicolons to execute statements one by one
        // (Since the default pool doesn't have multipleStatements: true)
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`Found ${statements.length} SQL statements. Executing...`);

        // Use the promise wrapper for the pool
        const promisePool = pool.promise();

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            try {
                await promisePool.query(stmt);
                console.log(`  ✅ Statement ${i + 1}/${statements.length} executed successfully.`);
            } catch (err) {
                // Ignore "Table already exists" or "Database already exists" errors
                if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DB_CREATE_EXISTS') {
                    console.log(`  ⏭️  Statement ${i + 1}/${statements.length} skipped (already exists).`);
                } else {
                    console.error(`  ❌ Error on Statement ${i + 1}:`, err.message);
                }
            }
        }

        console.log('\n✅ Database schema initialization complete!');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Fatal error initializing DB:', err);
        process.exit(1);
    }
}

initRemoteDb();
