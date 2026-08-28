import sql from 'mssql/msnodesqlv8.js';
import * as dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.SQLSERVER_DATABASE || 'GrowMeSMM';
const server = process.env.SQLSERVER_HOST || '(localdb)\\MSSQLLocalDB';

async function ensureDatabaseExists() {
  console.log(`Ensuring database [${dbName}] exists on ${server}...`);

  let connStr = '';
  if (server.includes('(localdb)')) {
    connStr = `Driver={ODBC Driver 18 for SQL Server};Server=${server};Database=master;Trusted_Connection=yes;TrustServerCertificate=yes;`;
  } else {
    const user = process.env.SQLSERVER_USER || '';
    const pass = process.env.SQLSERVER_PASSWORD || '';
    const port = process.env.SQLSERVER_PORT || 1433;
    connStr = `Driver={ODBC Driver 18 for SQL Server};Server=${server},${port};Database=master;Uid=${user};Pwd=${pass};TrustServerCertificate=yes;`;
  }

  const pool = new sql.ConnectionPool({ connectionString: connStr });
  await pool.connect();

  const check = await pool.request().query(`
    SELECT name FROM sys.databases WHERE name = N'${dbName}'
  `);

  if (check.recordset.length === 0) {
    console.log(`Database [${dbName}] does not exist. Creating...`);
    await pool.request().query(`CREATE DATABASE [${dbName}]`);
    console.log(`✅ Database [${dbName}] created successfully!`);
  } else {
    console.log(`✅ Database [${dbName}] already exists. Keeping existing data intact.`);
  }

  await pool.close();
}

ensureDatabaseExists().catch((err) => {
  console.error('Error creating database:', err.message);
  process.exit(1);
});
