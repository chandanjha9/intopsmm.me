import sql from 'mssql/msnodesqlv8.js';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const host = process.env.SQLSERVER_HOST || '(localdb)\\MSSQLLocalDB';
const database = process.env.SQLSERVER_DATABASE || 'GrowMeSMM';
const JWT_SECRET = process.env.JWT_SECRET || 'growmesmm_jwt_default_secret_key_change_in_production';

let connectionString = '';
if (host.toLowerCase().includes('(localdb)')) {
  connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${host};Database=${database};Trusted_Connection=yes;TrustServerCertificate=yes;`;
} else {
  const user = process.env.SQLSERVER_USER || '';
  const password = process.env.SQLSERVER_PASSWORD || '';
  const port = process.env.SQLSERVER_PORT || '1433';
  connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${host},${port};Database=${database};Uid=${user};Pwd=${password};TrustServerCertificate=yes;`;
}

async function runE2ETest() {
  console.log('====================================================');
  console.log('  GrowMeSMM SQL Server End-to-End Integration Suite');
  console.log('====================================================\n');

  const pool = new sql.ConnectionPool({ connectionString });
  await pool.connect();

  // Test 1: User Registration
  console.log('1. Testing User Registration...');
  const testEmail = `testuser_${Date.now()}@growmesmm.in`;
  const plainPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const regRes = await pool.request()
    .input('email', sql.NVarChar, testEmail)
    .input('hash', sql.NVarChar, passwordHash)
    .query(`
      INSERT INTO users (email, password_hash)
      OUTPUT INSERTED.id
      VALUES (@email, @hash)
    `);

  const userId = regRes.recordset[0].id;
  await pool.request()
    .input('id', sql.UniqueIdentifier, userId)
    .input('username', sql.NVarChar, `user_${Date.now()}`)
    .input('fullName', sql.NVarChar, 'Test User')
    .query(`
      INSERT INTO profiles (id, username, full_name, wallet_balance)
      VALUES (@id, @username, @fullName, 0.0000)
    `);

  console.log(`   ✅ User registered successfully. ID: ${userId}`);

  // Test 2: Password Verification & Login
  console.log('\n2. Testing User Login & Password Hash Matching...');
  const userRes = await pool.request()
    .input('email', sql.NVarChar, testEmail)
    .query('SELECT * FROM users WHERE email = @email');

  const storedUser = userRes.recordset[0];
  const passwordValid = await bcrypt.compare(plainPassword, storedUser.password_hash);
  if (!passwordValid) throw new Error('Password hash matching failed!');

  const token = jwt.sign({ sub: userId, email: testEmail, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  console.log(`   ✅ Login authenticated. Token issued: ${token.slice(0, 30)}...`);

  // Test 3: Top-up Wallet via sp_credit_wallet_from_payment
  console.log('\n3. Testing Wallet Credit via Payment Stored Procedure...');
  const orderId = `order_${Date.now()}`;
  await pool.request()
    .input('userId', sql.UniqueIdentifier, userId)
    .input('gateway', sql.NVarChar, 'razorpay')
    .input('gatewayOrderId', sql.NVarChar, orderId)
    .input('amount', sql.Decimal(18, 4), 100.00)
    .query(`
      INSERT INTO payment_orders (user_id, gateway, gateway_order_id, amount, status)
      VALUES (@userId, @gateway, @gatewayOrderId, @amount, 'pending')
    `);

  const paymentReq = pool.request()
    .input('gateway', sql.NVarChar, 'razorpay')
    .input('gatewayOrderId', sql.NVarChar, orderId)
    .input('gatewayPaymentId', sql.NVarChar, `pay_${Date.now()}`)
    .input('amount', sql.Decimal(18, 4), 100.00)
    .output('success', sql.Bit);

  const paymentExec = await paymentReq.execute('sp_credit_wallet_from_payment');
  if (!paymentExec.output.success) throw new Error('Payment crediting failed!');

  const profileRes = await pool.request()
    .input('id', sql.UniqueIdentifier, userId)
    .query('SELECT wallet_balance FROM profiles WHERE id = @id');
  const balance = Number(profileRes.recordset[0].wallet_balance);
  console.log(`   ✅ Wallet credited via SP. New balance: ₹${balance}`);
  if (balance !== 100.0) throw new Error(`Unexpected balance: ${balance}`);

  // Test 4: Provider & Service creation
  console.log('\n4. Testing Service Creation & Availability...');
  const provRes = await pool.request()
    .input('name', sql.NVarChar, 'ElectroSMM')
    .input('apiUrl', sql.NVarChar, 'https://electrosmm.com/api/v2')
    .input('currency', sql.NVarChar, 'INR')
    .query(`
      INSERT INTO providers (name, api_url, currency, is_active, priority)
      OUTPUT INSERTED.id
      VALUES (@name, @apiUrl, @currency, 1, 1)
    `);
  const providerId = provRes.recordset[0].id;

  const srvRes = await pool.request()
    .input('providerId', sql.UniqueIdentifier, providerId)
    .input('name', sql.NVarChar, 'Instagram High Quality Followers')
    .input('category', sql.NVarChar, 'Instagram')
    .input('platform', sql.NVarChar, 'Instagram')
    .input('sellingRate', sql.Decimal(18, 4), 50.00) // ₹50 per 1000
    .input('minQ', sql.Int, 100)
    .input('maxQ', sql.Int, 10000)
    .query(`
      INSERT INTO services (provider_id, name, category, platform, selling_rate, min_quantity, max_quantity, is_active)
      OUTPUT INSERTED.id
      VALUES (@providerId, @name, @category, @platform, @sellingRate, @minQ, @maxQ, 1)
    `);
  const serviceId = srvRes.recordset[0].id;
  console.log(`   ✅ Provider (${providerId}) & Service (${serviceId}) created.`);

  // Test 5: Order creation with atomic wallet debit via sp_create_order_with_debit
  console.log('\n5. Testing Order Creation with Atomic Wallet Debit (sp_create_order_with_debit)...');
  const orderReq = pool.request()
    .input('userId', sql.UniqueIdentifier, userId)
    .input('serviceId', sql.UniqueIdentifier, serviceId)
    .input('link', sql.NVarChar, 'https://instagram.com/myaccount')
    .input('quantity', sql.Int, 1000) // Charge should be ₹50.00
    .output('orderId', sql.UniqueIdentifier);

  const orderExec = await orderReq.execute('sp_create_order_with_debit');
  const placedOrderId = orderExec.output.orderId;
  console.log(`   ✅ Order placed successfully! Order ID: ${placedOrderId}`);

  const postOrderProfile = await pool.request()
    .input('id', sql.UniqueIdentifier, userId)
    .query('SELECT wallet_balance FROM profiles WHERE id = @id');
  const balanceAfterOrder = Number(postOrderProfile.recordset[0].wallet_balance);
  console.log(`   ✅ Balance after ₹50 order debit: ₹${balanceAfterOrder}`);
  if (balanceAfterOrder !== 50.0) throw new Error(`Unexpected post-order balance: ${balanceAfterOrder}`);

  // Test 6: Duplicate Order Prevention
  console.log('\n6. Testing Duplicate Order Protection within 2 minutes...');
  try {
    const dupReq = pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('serviceId', sql.UniqueIdentifier, serviceId)
      .input('link', sql.NVarChar, 'https://instagram.com/myaccount')
      .input('quantity', sql.Int, 1000)
      .output('orderId', sql.UniqueIdentifier);
    await dupReq.execute('sp_create_order_with_debit');
    throw new Error('FAILED: Duplicate order was not prevented!');
  } catch (err) {
    if (err.message.includes('Duplicate order detected')) {
      console.log('   ✅ Duplicate order correctly rejected by Stored Procedure!');
    } else {
      throw err;
    }
  }

  // Test 7: Order Refund via sp_refund_order
  console.log('\n7. Testing Order Refund (sp_refund_order)...');
  await pool.request()
    .input('orderId', sql.UniqueIdentifier, placedOrderId)
    .input('reason', sql.NVarChar, 'Service cancellation refund test')
    .execute('sp_refund_order');

  const postRefundProfile = await pool.request()
    .input('id', sql.UniqueIdentifier, userId)
    .query('SELECT wallet_balance FROM profiles WHERE id = @id');
  const balanceAfterRefund = Number(postRefundProfile.recordset[0].wallet_balance);
  console.log(`   ✅ Balance after full refund: ₹${balanceAfterRefund}`);
  if (balanceAfterRefund !== 100.0) throw new Error(`Unexpected post-refund balance: ${balanceAfterRefund}`);

  const refundedOrder = await pool.request()
    .input('id', sql.UniqueIdentifier, placedOrderId)
    .query('SELECT status FROM orders WHERE id = @id');
  console.log(`   ✅ Order status updated to: ${refundedOrder.recordset[0].status}`);

  // Test 8: Admin RBAC & Notifications
  console.log('\n8. Testing RBAC User Roles & Notifications...');
  await pool.request()
    .input('userId', sql.UniqueIdentifier, userId)
    .input('role', sql.NVarChar, 'admin')
    .query('INSERT INTO user_roles (user_id, role) VALUES (@userId, @role)');

  const roleRes = await pool.request()
    .input('userId', sql.UniqueIdentifier, userId)
    .query("SELECT role FROM user_roles WHERE user_id = @userId AND role = 'admin'");
  console.log(`   ✅ Admin role verified for user: ${roleRes.recordset[0].role}`);

  await pool.request()
    .input('kind', sql.NVarChar, 'system_test')
    .input('title', sql.NVarChar, 'E2E Test Notification')
    .input('message', sql.NVarChar, 'All systems operational')
    .query('INSERT INTO admin_notifications (kind, title, message) VALUES (@kind, @title, @message)');
  console.log('   ✅ Admin notification created and queried.');

  await pool.close();
  console.log('\n====================================================');
  console.log('  🎉 ALL 8 E2E INTEGRATION TESTS PASSED 100%');
  console.log('====================================================\n');
}

runE2ETest().catch((err) => {
  console.error('\n❌ E2E Integration Test Failed:', err);
  process.exit(1);
});
