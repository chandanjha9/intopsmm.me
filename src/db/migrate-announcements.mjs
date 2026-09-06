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

async function main() {
  console.log(`Connecting to SQL Server [${server}:${port}/${database}]...`);
  const pool = await new sql.ConnectionPool(config).connect();
  console.log('Connected successfully!');

  console.log('Ensuring announcements table exists...');
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'announcements')
    BEGIN
      CREATE TABLE announcements (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        category NVARCHAR(100) DEFAULT 'General',
        post_type NVARCHAR(50) NOT NULL DEFAULT 'news',
        badge NVARCHAR(100) NULL,
        is_popup BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
      );
      CREATE INDEX idx_announcements_active ON announcements(is_active, created_at DESC);
      CREATE INDEX idx_announcements_popup ON announcements(is_popup, is_active);
      PRINT 'Created announcements table';
    END
    ELSE
    BEGIN
      PRINT 'Announcements table already exists';
    END
  `);

  // Seed sample announcements if empty
  const count = await pool.request().query('SELECT COUNT(*) as count FROM announcements');
  if (count.recordset[0].count === 0) {
    console.log('Seeding initial announcements...');
    await pool.request().query(`
      INSERT INTO announcements (title, description, category, post_type, badge, is_popup, is_active)
      VALUES 
      (
        'Instagram Real Indian Followers — Speed & Non-Drop Upgrade',
        'Delivery speed upgraded to 100K/day. Non-drop algorithm improved with instant 0-5 mins start time.',
        'Instagram - Followers',
        'improvement',
        '⚡ Speed Upgraded',
        0,
        1
      ),
      (
        '⚠️ Critical Payment System Upgrade Notice',
        'Instant Auto UPI QR code payment gateway is fully active with 0% extra fee. Add funds instantly 24/7 without delays.',
        'Billing & Wallet',
        'alert',
        '🚨 Important Alert',
        1,
        1
      ),
      (
        'Massive Price Drop on YouTube Watch Time (4000 Hours)',
        'Direct server route activated — rates reduced by over 23% with lifetime non-drop warranty.',
        'YouTube - Watch Time',
        'price_drop',
        '🔥 Price Drop -23%',
        0,
        1
      )
    `);
    console.log('Seeded sample announcements!');
  }

  await pool.close();
  console.log('✅ Announcements migration completed successfully!');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
