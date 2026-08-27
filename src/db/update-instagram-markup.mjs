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

function calculateSellingRate(providerRate, markupType = 'percentage', markupValue = 75, fxRate = 1) {
  const cost = providerRate * fxRate;
  const raw = markupType === 'percentage' ? cost * (1 + markupValue / 100) : cost + markupValue;
  return Math.round(Math.max(raw, 0) * 10000) / 10000;
}

async function updateInstagramMarkup() {
  console.log(`Connecting to SQL Server [${server}:${port}] database [${database}]...`);
  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  console.log('Connected to SQL Server successfully!\n');

  // Find matching services in services table joined with provider_services to get base rate
  const query = `
    SELECT 
      s.id, s.name, s.category, s.platform, s.markup_type, s.markup_value, s.selling_rate,
      ps.rate as base_rate
    FROM services s
    LEFT JOIN provider_services ps 
      ON s.provider_id = ps.provider_id AND s.provider_service_id = ps.provider_service_id
    WHERE (s.platform = 'Instagram' OR s.category LIKE '%Instagram%' OR s.name LIKE '%Instagram%')
      AND (
        LOWER(s.name) LIKE '%like%' OR LOWER(s.category) LIKE '%like%'
        OR LOWER(s.name) LIKE '%view%' OR LOWER(s.category) LIKE '%view%'
        OR LOWER(s.name) LIKE '%repost%' OR LOWER(s.category) LIKE '%repost%'
        OR LOWER(s.name) LIKE '%story%' OR LOWER(s.category) LIKE '%story%'
        OR LOWER(s.name) LIKE '%store%' OR LOWER(s.category) LIKE '%store%'
      )
  `;

  const res = await pool.request().query(query);
  const matched = res.recordset;
  console.log(`Found ${matched.length} Instagram services matching (Like / View / Repost / Story/Store View):`);

  let updatedCount = 0;
  for (const s of matched) {
    const baseRate = Number(s.base_rate) || Number(s.selling_rate) / 1.25; // fallback
    const newSellingRate = calculateSellingRate(baseRate, 'percentage', 75);

    await pool.request()
      .input('id', sql.UniqueIdentifier, s.id)
      .input('markupType', sql.NVarChar, 'percentage')
      .input('markupValue', sql.Decimal(18, 4), 75)
      .input('sellingRate', sql.Decimal(18, 4), newSellingRate)
      .query(`
        UPDATE services
        SET markup_type = @markupType,
            markup_value = @markupValue,
            selling_rate = @sellingRate,
            updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id
      `);

    updatedCount++;
    console.log(`- [Updated] ${s.name} | Base Rate: ₹${baseRate} -> 75% Markup -> New Selling Rate: ₹${newSellingRate}`);
  }

  console.log(`\n✅ Successfully updated ${updatedCount} Instagram services with 75% profit markup!`);
  await pool.close();
}

updateInstagramMarkup().catch((err) => {
  console.error('❌ Update failed:', err);
  process.exit(1);
});
