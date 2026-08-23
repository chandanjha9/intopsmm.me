import sql from 'mssql/msnodesqlv8.js';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const host = process.env.SQLSERVER_HOST || '(localdb)\\MSSQLLocalDB';
const database = process.env.SQLSERVER_DATABASE || 'GrowMeSMM';
const user = process.env.SQLSERVER_USER || '';
const password = process.env.SQLSERVER_PASSWORD || '';
const port = process.env.SQLSERVER_PORT || '1433';
const encrypt = process.env.SQLSERVER_ENCRYPT === 'true';

let connectionString = '';
if (host.toLowerCase().includes('(localdb)')) {
  connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${host};Database=${database};Trusted_Connection=yes;TrustServerCertificate=yes;`;
} else if (user && password) {
  connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${host},${port};Database=${database};Uid=${user};Pwd=${password};Encrypt=${encrypt ? 'yes' : 'no'};TrustServerCertificate=yes;`;
} else {
  connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${host},${port};Database=${database};Trusted_Connection=yes;TrustServerCertificate=yes;`;
}

async function createAccount(pool, { email, plainPassword, username, fullName, role, walletBalance }) {
  const hash = await bcrypt.hash(plainPassword, 10);

  // 1. Check if user exists
  const existing = await pool.request()
    .input('email', sql.NVarChar, email)
    .query('SELECT id FROM users WHERE email = @email');

  let userId;
  if (existing.recordset.length > 0) {
    userId = existing.recordset[0].id;
    // Update password hash
    await pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .input('hash', sql.NVarChar, hash)
      .query('UPDATE users SET password_hash = @hash, updated_at = SYSDATETIMEOFFSET() WHERE id = @id');
    console.log(`Updated existing user: ${email}`);
  } else {
    // Insert new user
    const insertRes = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('hash', sql.NVarChar, hash)
      .query(`
        INSERT INTO users (email, password_hash, email_confirmed_at)
        OUTPUT INSERTED.id
        VALUES (@email, @hash, SYSDATETIMEOFFSET())
      `);
    userId = insertRes.recordset[0].id;
    console.log(`Created new user: ${email}`);
  }

  // 2. Ensure profile exists
  await pool.request()
    .input('id', sql.UniqueIdentifier, userId)
    .input('username', sql.NVarChar, username)
    .input('fullName', sql.NVarChar, fullName)
    .input('balance', sql.Decimal(18, 4), walletBalance)
    .query(`
      MERGE profiles AS target
      USING (SELECT @id AS id) AS source
      ON (target.id = source.id)
      WHEN MATCHED THEN
        UPDATE SET username = @username, full_name = @fullName, wallet_balance = @balance, updated_at = SYSDATETIMEOFFSET()
      WHEN NOT MATCHED THEN
        INSERT (id, username, full_name, wallet_balance)
        VALUES (@id, @username, @fullName, @balance);
    `);

  // 3. Ensure role exists
  await pool.request()
    .input('userId', sql.UniqueIdentifier, userId)
    .input('role', sql.NVarChar, role)
    .query(`
      MERGE user_roles AS target
      USING (SELECT @userId AS user_id, @role AS role) AS source
      ON (target.user_id = source.user_id AND target.role = source.role)
      WHEN NOT MATCHED THEN
        INSERT (user_id, role)
        VALUES (@userId, @role);
    `);

  return userId;
}

async function seed() {
  console.log(`Connecting to SQL Server [${host}] database [${database}]...`);
  const pool = new sql.ConnectionPool({ connectionString });
  await pool.connect();
  console.log('Connected to SQL Server successfully!\n');

  // 1. Admin account
  await createAccount(pool, {
    email: 'admin@growmesmm.in',
    plainPassword: 'Admin@12345',
    username: 'admin',
    fullName: 'GrowthPanel Administrator',
    role: 'admin',
    walletBalance: 10000.00,
  });

  // 2. Standard user account
  await createAccount(pool, {
    email: 'user@growmesmm.in',
    plainPassword: 'User@12345',
    username: 'demo_user',
    fullName: 'Demo Customer',
    role: 'user',
    walletBalance: 500.00,
  });

  await pool.close();
  console.log('\n✅ Admin and User credentials seeded successfully!');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
