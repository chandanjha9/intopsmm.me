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

async function testConnection() {
  console.log('====================================================');
  console.log('  SQL Server Connectivity & Diagnostic Utility');
  console.log('====================================================');
  console.log(`Target Host: ${host}`);
  console.log(`Port:        ${port}`);
  console.log(`Database:    ${database}`);
  console.log(`User:        ${user || '(Integrated Security / Windows Auth)'}`);
  console.log(`Encryption:  ${encrypt ? 'Enabled' : 'Disabled'}`);
  console.log('----------------------------------------------------');
  console.log('Attempting connection to SQL Server...');

  try {
    const pool = new sql.ConnectionPool({ connectionString });
    await pool.connect();
    console.log('✅ Connection established successfully!\n');

    console.log('Querying SQL Server instance info...');
    const versionRes = await pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS current_db, GETDATE() AS server_time');
    console.log(`Server Time: ${versionRes.recordset[0].server_time}`);
    console.log(`Current DB:  ${versionRes.recordset[0].current_db}`);
    console.log(`Version:     ${versionRes.recordset[0].version.split('\n')[0]}\n`);

    console.log('Checking created tables...');
    const tablesRes = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    if (tablesRes.recordset.length === 0) {
      console.log('⚠️ No tables found yet. Run `npm run migrate:sql` to create schema.');
    } else {
      console.log(`Found ${tablesRes.recordset.length} tables:`);
      tablesRes.recordset.forEach((t, i) => console.log(`  ${i + 1}. ${t.TABLE_NAME}`));
    }

    console.log('\nChecking Stored Procedures...');
    const spRes = await pool.request().query(`
      SELECT ROUTINE_NAME 
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_NAME
    `);

    if (spRes.recordset.length > 0) {
      console.log(`Found ${spRes.recordset.length} Stored Procedures:`);
      spRes.recordset.forEach((sp, i) => console.log(`  ${i + 1}. ${sp.ROUTINE_NAME}`));
    }

    await pool.close();
    console.log('\n✅ All checks completed successfully.');
  } catch (err) {
    console.error('\n❌ Connection test failed:');
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

testConnection();
