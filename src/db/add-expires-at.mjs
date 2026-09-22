import sql from 'mssql';

const config = {
  server: '180.151.91.194',
  port: 50210,
  user: 'wspl',
  password: 'TE-B}x]u',
  database: 'WaydineQA',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function run() {
  const pool = await sql.connect(config);
  console.log('Connected ✅');

  // Add expires_at column if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'announcements' AND COLUMN_NAME = 'expires_at'
    )
    BEGIN
      ALTER TABLE announcements ADD expires_at DATETIMEOFFSET NULL;
      PRINT 'Column expires_at added successfully.';
    END
    ELSE
    BEGIN
      PRINT 'Column expires_at already exists.';
    END
  `);

  console.log('Migration done ✅');
  await pool.close();
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
