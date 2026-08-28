import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'growmesmm_jwt_default_secret_key_change_in_production';

async function runLocalVerification() {
  console.log('--- Running Local Security & Logic Verification ---');

  // 1. Test Password Hashing
  console.log('1. Testing bcrypt password hashing...');
  const plain = 'SecretPassword123!';
  const hash = await bcrypt.hash(plain, 10);
  console.log('   Hash generated:', hash.slice(0, 20) + '...');
  
  if (hash === plain) {
    throw new Error('FAILED: Password was not hashed!');
  }
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
    throw new Error('FAILED: Hash is not a valid bcrypt hash!');
  }

  const matches = await bcrypt.compare(plain, hash);
  if (!matches) {
    throw new Error('FAILED: Valid password comparison failed!');
  }

  const wrongMatches = await bcrypt.compare('WrongPassword', hash);
  if (wrongMatches) {
    throw new Error('FAILED: Invalid password was accepted!');
  }
  console.log('   ✅ Password hashing & bcrypt verification passed.');

  // 2. Test JWT Signing & Verification
  console.log('2. Testing JWT Signing & Verification...');
  const payload = {
    sub: '11111111-2222-3333-4444-555555555555',
    email: 'admin@growmesmm.in',
    role: 'admin',
    username: 'admin',
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  console.log('   Token generated:', token.slice(0, 25) + '...');

  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded || decoded.sub !== payload.sub || decoded.email !== payload.email || decoded.role !== 'admin') {
    throw new Error('FAILED: Decoded JWT payload does not match original!');
  }

  try {
    jwt.verify(token + 'corrupt', JWT_SECRET);
    throw new Error('FAILED: Corrupted token was accepted!');
  } catch (err) {
    if (err.message.includes('FAILED:')) throw err;
  }
  console.log('   ✅ JWT token signing, verification & tampering protection passed.');

  console.log('\n--- All Core Logic Verification Succeeded! ---');
}

runLocalVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
