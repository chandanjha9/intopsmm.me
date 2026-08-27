import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

const server = process.env.SQLSERVER_HOST || '180.151.91.194';
const port = parseInt(process.env.SQLSERVER_PORT || '50210', 10);
const user = process.env.SQLSERVER_USER || 'wspl';
const password = process.env.SQLSERVER_PASSWORD || 'TE-B}x]u';
const dbName = process.env.SQLSERVER_DATABASE || 'WaydineQA';

const baseConfig = {
  server,
  port,
  user,
  password,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function main() {
  console.log(`Connecting to SQL Server ${server}:${port} as ${user}...`);

  // Step 1: Connect to master database to check/create DB
  const masterConfig = { ...baseConfig, database: 'master' };
  let masterPool;
  try {
    masterPool = await new sql.ConnectionPool(masterConfig).connect();
    console.log('Connected to master DB successfully!');
  } catch (err) {
    console.error('Failed to connect to master DB:', err);
    process.exit(1);
  }

  const check = await masterPool.request().query(`
    SELECT name FROM sys.databases WHERE name = N'${dbName}'
  `);

  if (check.recordset.length === 0) {
    console.log(`Database [${dbName}] does not exist. Creating...`);
    await masterPool.request().query(`CREATE DATABASE [${dbName}]`);
    console.log(`✅ Database [${dbName}] created successfully!`);
  } else {
    console.log(`ℹ️ Database [${dbName}] already exists.`);
  }

  await masterPool.close();

  // Step 2: Connect to the target DB and run migrations
  console.log(`Connecting to [${dbName}] to run migrations...`);
  const targetConfig = { ...baseConfig, database: dbName };
  const targetPool = await new sql.ConnectionPool(targetConfig).connect();
  console.log(`Connected to [${dbName}] successfully!`);

  const migrationPath = path.join(process.cwd(), 'src', 'db', 'migrations', '001_initial.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

  // Split by GO statements
  const batches = sqlContent
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  console.log(`Found ${batches.length} SQL batches to execute.`);

  for (let i = 0; i < batches.length; i++) {
    try {
      console.log(`Executing SQL Batch ${i + 1}/${batches.length}...`);
      await targetPool.request().batch(batches[i]);
    } catch (batchErr) {
      console.error(`Error in batch ${i + 1}:`, batchErr.message);
    }
  }

  console.log(`\n✅ Database [${dbName}] setup and migration complete!`);
  await targetPool.close();
}

main().catch((err) => {
  console.error('Migration script error:', err);
  process.exit(1);
});
