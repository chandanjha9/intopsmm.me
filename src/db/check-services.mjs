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

async function check() {
  const pool = new sql.ConnectionPool(config);
  await pool.connect();

  const providers = await pool.request().query('SELECT id, name, is_active FROM providers');
  console.log('Providers in DB:', providers.recordset);

  const providerServicesCount = await pool.request().query('SELECT COUNT(*) as total FROM provider_services');
  console.log('Total Provider Services (Catalog):', providerServicesCount.recordset[0].total);

  const servicesCount = await pool.request().query('SELECT COUNT(*) as total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active, SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive FROM services');
  console.log('Services (Sellable):', servicesCount.recordset[0]);

  // Check how many provider services are NOT yet published into services table
  const unPublished = await pool.request().query(`
    SELECT COUNT(*) as unpublished
    FROM provider_services ps
    WHERE NOT EXISTS (
      SELECT 1 FROM services s 
      WHERE s.provider_id = ps.provider_id AND s.provider_service_id = ps.provider_service_id
    )
  `);
  console.log('Provider Services NOT published yet:', unPublished.recordset[0].unpublished);

  await pool.close();
}

check().catch(console.error);
