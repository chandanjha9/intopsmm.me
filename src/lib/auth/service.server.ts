import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { hashPassword, verifyPassword } from "./password";
import { signToken } from "./jwt";
import crypto from "crypto";

export type UserProfile = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  wallet_balance: number;
  role: "admin" | "moderator" | "user";
  created_at?: string;
};

export type AuthResult = {
  user: {
    id: string;
    email: string;
    role: "admin" | "moderator" | "user";
    username: string | null;
  };
  profile: UserProfile;
  token: string;
};

/** Live availability check used by the signup form. */
export async function checkAvailability(input: { email?: string; username?: string }) {
  const db = await poolConnect;
  const result: {
    emailAvailable: boolean | null;
    usernameAvailable: boolean | null;
    message: string | null;
  } = { emailAvailable: null, usernameAvailable: null, message: null };

  const email = input.email?.trim().toLowerCase();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const row = await db
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT TOP 1 id FROM users WHERE LOWER(email) = LOWER(@email)");
    result.emailAvailable = row.recordset.length === 0;
    if (!result.emailAvailable) {
      result.message = "An account with this email already exists. Please login instead.";
    }
  }

  const username = input.username?.trim();
  if (username && /^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    const row = await db
      .request()
      .input("username", sql.NVarChar, username)
      .query("SELECT TOP 1 id FROM profiles WHERE LOWER(username) = LOWER(@username)");
    result.usernameAvailable = row.recordset.length === 0;
    if (!result.usernameAvailable && !result.message) {
      result.message = "This username is already taken.";
    }
  }

  return result;
}


export async function registerUser(input: {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
}): Promise<AuthResult> {
  const db = await poolConnect;
  const email = input.email.trim().toLowerCase();

  // Check if email already exists
  const cleanEmail = email.trim().toLowerCase();
  const rawUsername = input.username?.trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  // Check duplicate email
  const existingUser = await db
    .request()
    .input("email", sql.NVarChar, cleanEmail)
    .query("SELECT id FROM users WHERE LOWER(email) = LOWER(@email)");

  if (existingUser.recordset.length > 0) {
    throw new Error("An account with this email address already exists. Please login instead.");
  }

  // Validate and check duplicate username
  let derivedUsername: string;
  if (rawUsername) {
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(rawUsername)) {
      throw new Error("Username must be 3-30 characters long and contain only letters, numbers, and underscores.");
    }
    const existingUsername = await db
      .request()
      .input("username", sql.NVarChar, rawUsername)
      .query("SELECT id FROM profiles WHERE LOWER(username) = LOWER(@username)");

    if (existingUsername.recordset.length > 0) {
      throw new Error("This username is already taken. Please choose another username.");
    }
    derivedUsername = rawUsername;
  } else {
    derivedUsername = `${cleanEmail.split("@")[0]}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const passwordHash = await hashPassword(input.password);
  const fullName = input.fullName?.trim() || null;

  // Determine initial role
  const isAdmin =
    cleanEmail.startsWith("admin") ||
    cleanEmail === "admin@growmesmm.in" ||
    derivedUsername.toLowerCase() === "admin";
  const role: "admin" | "moderator" | "user" = isAdmin ? "admin" : "user";
  const finalUsername = derivedUsername;

  const result = await db
    .request()
    .input("email", sql.NVarChar, email)
    .input("passwordHash", sql.NVarChar, passwordHash)
    .input("username", sql.NVarChar, finalUsername)
    .input("fullName", sql.NVarChar, fullName)
    .input("role", sql.NVarChar, role)
    .query(`
      BEGIN TRANSACTION;

      DECLARE @newUserId UNIQUEIDENTIFIER = NEWID();

      INSERT INTO users (id, email, password_hash, email_confirmed_at)
      VALUES (@newUserId, @email, @passwordHash, SYSDATETIMEOFFSET());

      INSERT INTO profiles (id, username, full_name, wallet_balance)
      VALUES (@newUserId, @username, @fullName, 0.0000);

      INSERT INTO user_roles (user_id, role)
      VALUES (@newUserId, @role);

      COMMIT TRANSACTION;

      SELECT 
        u.id, 
        u.email, 
        u.created_at, 
        p.username, 
        p.full_name, 
        p.avatar_url, 
        p.wallet_balance
      FROM users u
      JOIN profiles p ON u.id = p.id
      WHERE u.id = @newUserId;
    `);

  const profileRow = result.recordset[0];
  if (!profileRow) {
    throw new Error("Failed to create user profile");
  }

  const profile: UserProfile = {
    id: profileRow.id,
    email: profileRow.email,
    username: profileRow.username,
    full_name: profileRow.full_name,
    avatar_url: profileRow.avatar_url,
    wallet_balance: Number(profileRow.wallet_balance) || 0,
    role,
    created_at: profileRow.created_at,
  };

  const token = signToken({
    sub: profile.id,
    email: profile.email,
    role,
    username: profile.username,
  });

  return {
    user: {
      id: profile.id,
      email: profile.email,
      role,
      username: profile.username,
    },
    profile,
    token,
  };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const db = await poolConnect;
  const email = input.email.trim().toLowerCase();

  const userResult = await db
    .request()
    .input("email", sql.NVarChar, email)
    .query(`
      SELECT 
        u.id, 
        u.email, 
        u.password_hash, 
        u.created_at,
        p.username, 
        p.full_name, 
        p.avatar_url, 
        p.wallet_balance,
        ur.role
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.email = @email
    `);

  const row = userResult.recordset[0];
  if (!row || !row.password_hash) {
    throw new Error("Invalid email or password");
  }

  const passwordValid = await verifyPassword(input.password, row.password_hash);
  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }

  const role: "admin" | "moderator" | "user" =
    row.role === "admin" || row.role === "moderator" ? row.role : "user";

  const profile: UserProfile = {
    id: row.id,
    email: row.email,
    username: row.username,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    wallet_balance: Number(row.wallet_balance) || 0,
    role,
    created_at: row.created_at,
  };

  const token = signToken({
    sub: profile.id,
    email: profile.email,
    role,
    username: profile.username,
  });

  return {
    user: {
      id: profile.id,
      email: profile.email,
      role,
      username: profile.username,
    },
    profile,
    token,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = await poolConnect;

  const result = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .query(`
      SELECT 
        u.id, 
        u.email, 
        u.created_at,
        p.username, 
        p.full_name, 
        p.avatar_url, 
        p.wallet_balance,
        ur.role
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = @userId
    `);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    wallet_balance: Number(row.wallet_balance) || 0,
    role: row.role === "admin" || row.role === "moderator" ? row.role : "user",
    created_at: row.created_at,
  };
}

export async function checkUserRole(userId: string, role: string): Promise<boolean> {
  const db = await poolConnect;
  const result = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("role", sql.NVarChar, role)
    .query("SELECT 1 FROM user_roles WHERE user_id = @userId AND role = @role");

  return result.recordset.length > 0;
}

// ── Forgot Password ──────────────────────────────────────────────────────────

/**
 * Generates a secure reset token, stores a hashed copy in DB, and returns
 * the plain token (to be sent via email) plus the user's email.
 */
export async function createPasswordResetToken(
  email: string,
): Promise<{ token: string; email: string }> {
  const db = await poolConnect;
  const cleanEmail = email.trim().toLowerCase();

  // Look up the user
  const userResult = await db
    .request()
    .input("email", sql.NVarChar, cleanEmail)
    .query("SELECT id, email FROM users WHERE LOWER(email) = LOWER(@email)");

  // For security: never reveal whether the email exists
  const row = userResult.recordset[0];
  if (!row) {
    // Silently succeed — don't leak account existence
    return { token: "", email: cleanEmail };
  }

  // Invalidate any existing unused tokens for this user
  await db
    .request()
    .input("userId", sql.UniqueIdentifier, row.id)
    .query("UPDATE password_reset_tokens SET used = 1 WHERE user_id = @userId AND used = 0");

  // Generate a cryptographically secure token
  const plainToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");

  // Token expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db
    .request()
    .input("userId", sql.UniqueIdentifier, row.id)
    .input("tokenHash", sql.NVarChar, tokenHash)
    .input("expiresAt", sql.DateTimeOffset, expiresAt)
    .query(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (@userId, @tokenHash, @expiresAt)
    `);

  return { token: plainToken, email: cleanEmail };
}

/**
 * Verifies a reset token and updates the user's password.
 */
export async function resetUserPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  if (!token || token.length < 32) throw new Error("Invalid or expired reset link.");

  const db = await poolConnect;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const result = await db
    .request()
    .input("tokenHash", sql.NVarChar, tokenHash)
    .query(`
      SELECT t.id, t.user_id, t.expires_at, t.used
      FROM password_reset_tokens t
      WHERE t.token_hash = @tokenHash
    `);

  const row = result.recordset[0];
  if (!row || row.used) throw new Error("This reset link has already been used or is invalid.");
  if (new Date(row.expires_at) < new Date()) throw new Error("This reset link has expired. Please request a new one.");

  const passwordHash = await hashPassword(newPassword);

  await db
    .request()
    .input("userId", sql.UniqueIdentifier, row.user_id)
    .input("passwordHash", sql.NVarChar, passwordHash)
    .input("tokenId", sql.UniqueIdentifier, row.id)
    .query(`
      UPDATE users SET password_hash = @passwordHash, updated_at = SYSDATETIMEOFFSET()
      WHERE id = @userId;
      UPDATE password_reset_tokens SET used = 1 WHERE id = @tokenId;
    `);
}

// ── Google OAuth (upsert user) ────────────────────────────────────────────────

/**
 * Given a verified Google profile, find or create the SQL user and return auth result.
 */
export async function upsertGoogleUser(input: {
  googleId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}): Promise<AuthResult> {
  const db = await poolConnect;
  const cleanEmail = input.email.trim().toLowerCase();

  // Check if user already exists
  const existing = await db
    .request()
    .input("email", sql.NVarChar, cleanEmail)
    .query(`
      SELECT u.id, u.email, p.username, p.full_name, p.avatar_url, p.wallet_balance, ur.role
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE LOWER(u.email) = LOWER(@email)
    `);

  if (existing.recordset[0]) {
    const row = existing.recordset[0];
    const role: "admin" | "moderator" | "user" =
      row.role === "admin" || row.role === "moderator" ? row.role : "user";

    // Update avatar if changed
    if (input.avatarUrl && row.avatar_url !== input.avatarUrl) {
      await db
        .request()
        .input("userId", sql.UniqueIdentifier, row.id)
        .input("avatarUrl", sql.NVarChar, input.avatarUrl)
        .query("UPDATE profiles SET avatar_url = @avatarUrl WHERE id = @userId");
    }

    const profile: UserProfile = {
      id: row.id,
      email: row.email,
      username: row.username,
      full_name: row.full_name,
      avatar_url: input.avatarUrl ?? row.avatar_url,
      wallet_balance: Number(row.wallet_balance) || 0,
      role,
    };

    await linkGoogleId(db, row.id, input.googleId);

    const token = signToken({ sub: profile.id, email: profile.email, role, username: profile.username });
    return { user: { id: profile.id, email: profile.email, role, username: profile.username }, profile, token };
  }

  // Create new user (no password — Google accounts have NULL password_hash)
  const derivedUsername = `${cleanEmail.split("@")[0]}_${Math.random().toString(36).substring(2, 7)}`;
  const role: "admin" | "moderator" | "user" = "user";

  const createResult = await db
    .request()
    .input("email", sql.NVarChar, cleanEmail)
    .input("username", sql.NVarChar, derivedUsername)
    .input("fullName", sql.NVarChar, input.fullName ?? null)
    .input("avatarUrl", sql.NVarChar, input.avatarUrl ?? null)
    .input("role", sql.NVarChar, role)
    .query(`
      BEGIN TRANSACTION;
      DECLARE @newId UNIQUEIDENTIFIER = NEWID();
      INSERT INTO users (id, email, password_hash, email_confirmed_at)
      VALUES (@newId, @email, '', SYSDATETIMEOFFSET());
      INSERT INTO profiles (id, username, full_name, avatar_url, wallet_balance)
      VALUES (@newId, @username, @fullName, @avatarUrl, 0.0000);
      INSERT INTO user_roles (user_id, role) VALUES (@newId, @role);
      COMMIT TRANSACTION;
      SELECT u.id, u.email, p.username, p.full_name, p.avatar_url, p.wallet_balance
      FROM users u JOIN profiles p ON u.id = p.id WHERE u.id = @newId;
    `);

  const newRow = createResult.recordset[0];
  if (!newRow) throw new Error("Failed to create Google-authenticated user.");

  await linkGoogleId(db, newRow.id, input.googleId);

  const profile: UserProfile = {
    id: newRow.id,
    email: newRow.email,
    username: newRow.username,
    full_name: newRow.full_name,
    avatar_url: newRow.avatar_url,
    wallet_balance: 0,
    role,
  };

  const token = signToken({ sub: profile.id, email: profile.email, role, username: profile.username });
  return { user: { id: profile.id, email: profile.email, role, username: profile.username }, profile, token };
}

/**
 * Store the Google/Firebase uid on the user row. Tolerates databases where the
 * 003_google_auth migration has not been applied yet.
 */
async function linkGoogleId(
  db: Awaited<typeof poolConnect>,
  userId: string,
  googleId: string,
): Promise<void> {
  try {
    await db
      .request()
      .input("userId", sql.UniqueIdentifier, userId)
      .input("googleId", sql.NVarChar, googleId)
      .query(`
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'google_id')
        BEGIN
          UPDATE users SET google_id = @googleId, updated_at = SYSDATETIMEOFFSET()
          WHERE id = @userId AND (google_id IS NULL OR google_id <> @googleId);
        END
      `);
  } catch (err) {
    console.warn("Could not persist google_id for user", userId, err);
  }
}
