import sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

const server = process.env.SQLSERVER_HOST || '180.151.91.194';
const port = parseInt(process.env.SQLSERVER_PORT || '50210', 10);
const user = process.env.SQLSERVER_USER || 'wspl';
const password = process.env.SQLSERVER_PASSWORD || 'TE-B}x]u';
const database = process.env.SQLSERVER_DATABASE || 'WaydineQA';

const config = {
  server,
  port,
  user,
  password,
  database,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function inspect() {
  const pool = new sql.ConnectionPool(config);
  await pool.connect();

  const samples = await pool.request().query('SELECT TOP 5 markup_type, markup_value, selling_rate, platform, category FROM services');
  console.log('Sample existing services:', samples.recordset);

  await pool.close();
}

inspect().catch(console.error);
