const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--username') {
      out.username = args[i + 1];
      i += 1;
    } else if (token === '--password') {
      out.password = args[i + 1];
      i += 1;
    }
  }

  return out;
}

async function run() {
  const { username, password } = parseArgs();

  if (!username || !password) {
    console.error('Usage: node createAdmin.js --username <admin_user> --password <strong_password>');
    process.exit(1);
  }

  const promiseDb = db.promise();

  try {
    const [existingRows] = await promiseDb.execute(
      'SELECT id, username, role FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    const passwordHash = bcrypt.hashSync(password, 10);

    if (!existingRows.length) {
      await promiseDb.execute(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, passwordHash, 'admin']
      );
      console.log(`Admin user created: ${username}`);
    } else {
      const existing = existingRows[0];
      await promiseDb.execute(
        'UPDATE users SET password_hash = ?, role = ? WHERE id = ?',
        [passwordHash, 'admin', existing.id]
      );
      console.log(`Admin user updated: ${existing.username}`);
    }

    console.log('You can now log in from the app with this admin account.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create or update admin user:', err.message);
    process.exit(1);
  }
}

run();
