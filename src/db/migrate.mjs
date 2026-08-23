import fs from 'fs';
import path from 'path';
import sql from 'mssql/msnodesqlv8.js';
import * as dotenv from 'dotenv';

dotenv.config();

const host = process.env.SQLSERVER_HOST || 'localhost';
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

async function runMigration() {
  console.log(`Connecting to SQL Server [${host}] database [${database}]...`);
  const pool = new sql.ConnectionPool({ connectionString });
  await pool.connect();
  console.log('Connected to SQL Server successfully!\n');

  const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', '001_initial.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

  // Split by GO batches
  const batches = sqlContent
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  for (let i = 0; i < batches.length; i++) {
    console.log(`Executing SQL Batch ${i + 1}/${batches.length}...`);
    await pool.request().batch(batches[i]);
  }

  console.log('\n✅ All SQL Server tables, keys, indexes, and stored procedures created successfully!');
  await pool.close();
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
