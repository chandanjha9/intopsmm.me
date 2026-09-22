import sql from 'mssql';

const config = {
  server: '180.151.91.194',
  port: 50210,
  user: 'wspl',
  password: 'TE-B}x]u',
  database: 'WaydineQA',
  options: { encrypt: false, trustServerCertificate: true }
};

async function main() {
  const pool = await sql.connect(config);
  
  // First check current balance
  const check = await pool.request()
    .query("SELECT u.id, u.email, p.wallet_balance FROM users u INNER JOIN profiles p ON u.id = p.id WHERE u.email = 'testingdivice.ws@gmail.com'");
  
  if (check.recordset.length === 0) {
    console.log('User not found!');
    process.exit(1);
  }
  
  const user = check.recordset[0];
  console.log('Current balance:', user.wallet_balance);
  console.log('User ID:', user.id);
  
  // Set balance to 0
  await pool.request()
    .input('userId', sql.UniqueIdentifier, user.id)
    .query("UPDATE profiles SET wallet_balance = 0, updated_at = SYSDATETIMEOFFSET() WHERE id = @userId");
  
  // Verify
  const verify = await pool.request()
    .query("SELECT p.wallet_balance FROM profiles p INNER JOIN users u ON u.id = p.id WHERE u.email = 'testingdivice.ws@gmail.com'");
  
  console.log('New balance:', verify.recordset[0].wallet_balance);
  console.log('Done!');
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
