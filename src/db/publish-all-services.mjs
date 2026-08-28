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

function calculateSellingRate(providerRate, markupType = 'percentage', markupValue = 25, fxRate = 1) {
  const cost = providerRate * fxRate;
  const raw = markupType === 'percentage' ? cost * (1 + markupValue / 100) : cost + markupValue;
  return Math.round(Math.max(raw, 0) * 10000) / 10000;
}

function getPlatform(category, name) {
  const lowerCat = (category || '').toLowerCase();
  const lowerName = (name || '').toLowerCase();
  
  if (lowerCat.includes('telegram') || lowerName.includes('telegram')) return 'Telegram';
  if (lowerCat.includes('instagram') || lowerName.includes('instagram')) return 'Instagram';
  if (lowerCat.includes('youtube') || lowerName.includes('youtube')) return 'YouTube';
  if (lowerCat.includes('facebook') || lowerName.includes('facebook')) return 'Facebook';
  if (lowerCat.includes('twitter') || lowerCat.includes(' x ') || lowerName.includes('twitter')) return 'Twitter';
  if (lowerCat.includes('tiktok') || lowerName.includes('tiktok')) return 'TikTok';
  if (lowerCat.includes('spotify') || lowerName.includes('spotify')) return 'Spotify';
  if (lowerCat.includes('threads') || lowerName.includes('threads')) return 'Threads';
  if (lowerCat.includes('linkedin') || lowerName.includes('linkedin')) return 'LinkedIn';
  if (lowerCat.includes('website') || lowerCat.includes('traffic')) return 'Traffic';
  if (lowerCat.includes('discord') || lowerName.includes('discord')) return 'Discord';
  
  const firstWord = (category || '').split(' ')[0] || 'Other';
  return firstWord;
}

async function publishAllServices() {
  console.log(`Connecting to SQL Server [${server}:${port}] database [${database}]...`);
  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  console.log('Connected to SQL Server successfully!\n');

  // 1. Activate all currently existing services in `services` table
  const activateExisting = await pool.request().query(`
    UPDATE services
    SET is_active = 1, updated_at = SYSDATETIMEOFFSET()
    WHERE is_active = 0
  `);
  console.log(`Re-activated ${activateExisting.rowsAffected[0] || 0} existing inactive services.`);

  // 2. Fetch all provider_services
  const providerServicesRes = await pool.request().query(`
    SELECT 
      id, provider_id, provider_service_id, name, category, type, rate, 
      min_quantity, max_quantity, refill_supported, cancel_supported, is_available
    FROM provider_services
  `);
  const catalog = providerServicesRes.recordset;
  console.log(`Found ${catalog.length} provider services in catalog.`);

  let newlyPublished = 0;
  let updatedExisting = 0;

  for (const item of catalog) {
    const platform = getPlatform(item.category, item.name);
    const markupType = 'percentage';
    const markupValue = 25;
    const rate = Number(item.rate) || 0;
    const sellingRate = calculateSellingRate(rate, markupType, markupValue);

    // Merge into services table
    const result = await pool.request()
      .input('providerId', sql.UniqueIdentifier, item.provider_id)
      .input('providerServiceId', sql.NVarChar, item.provider_service_id)
      .input('name', sql.NVarChar, item.name)
      .input('category', sql.NVarChar, item.category)
      .input('platform', sql.NVarChar, platform)
      .input('markupType', sql.NVarChar, markupType)
      .input('markupValue', sql.Decimal(18, 4), markupValue)
      .input('sellingRate', sql.Decimal(18, 4), sellingRate)
      .input('minQuantity', sql.Int, item.min_quantity || 1)
      .input('maxQuantity', sql.Int, item.max_quantity || 1000000)
      .input('refillSupported', sql.Bit, item.refill_supported ? 1 : 0)
      .input('cancelSupported', sql.Bit, item.cancel_supported ? 1 : 0)
      .input('isActive', sql.Bit, 1)
      .query(`
        MERGE services AS target
        USING (SELECT @providerId AS provider_id, @providerServiceId AS provider_service_id) AS source
        ON (target.provider_id = source.provider_id AND target.provider_service_id = source.provider_service_id)
        WHEN MATCHED THEN
          UPDATE SET 
            name = @name,
            category = @category,
            platform = @platform,
            min_quantity = @minQuantity,
            max_quantity = @maxQuantity,
            refill_supported = @refillSupported,
            cancel_supported = @cancelSupported,
            is_active = 1,
            updated_at = SYSDATETIMEOFFSET()
        WHEN NOT MATCHED THEN
          INSERT (
            provider_id, provider_service_id, name, category, platform, 
            markup_type, markup_value, selling_rate, min_quantity, max_quantity, 
            refill_supported, cancel_supported, is_active
          )
          VALUES (
            @providerId, @providerServiceId, @name, @category, @platform, 
            @markupType, @markupValue, @sellingRate, @minQuantity, @maxQuantity, 
            @refillSupported, @cancelSupported, @isActive
          );
      `);

    if (result.rowsAffected[0] > 0) {
      newlyPublished++;
    }
  }

  // Check final status
  const finalCount = await pool.request().query(`
    SELECT 
      COUNT(*) AS total_services,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_services,
      COUNT(DISTINCT platform) AS total_platforms,
      COUNT(DISTINCT category) AS total_categories
    FROM services
  `);

  console.log('\n=============================================');
  console.log('✅ ALL SERVICES PUBLISHED SUCCESSFULLY!');
  console.log('Total Sellable Services in DB:', finalCount.recordset[0].total_services);
  console.log('Active (Live) Services:', finalCount.recordset[0].active_services);
  console.log('Platforms:', finalCount.recordset[0].total_platforms);
  console.log('Categories:', finalCount.recordset[0].total_categories);
  console.log('=============================================\n');

  await pool.close();
}

publishAllServices().catch((err) => {
  console.error('❌ Error publishing services:', err);
  process.exit(1);
});
