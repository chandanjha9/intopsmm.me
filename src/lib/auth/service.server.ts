import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { hashPassword, verifyPassword } from "./password";
import { signToken, type JWTPayload } from "./jwt";

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

export async function registerUser(input: {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
}): Promise<AuthResult> {
  const db = await poolConnect;
  const email = input.email.trim().toLowerCase();

  // Check if email already exists
  const existingUser = await db
    .request()
    .input("email", sql.NVarChar, email)
    .query("SELECT id FROM users WHERE email = @email");

  if (existingUser.recordset.length > 0) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const derivedUsername =
    input.username?.trim() || `${email.split("@")[0]}_${Math.random().toString(36).substring(2, 7)}`;
  const fullName = input.fullName?.trim() || null;

  // Determine initial role
  const isAdmin =
    email.startsWith("admin") ||
    email === "admin@growmesmm.in" ||
    derivedUsername.toLowerCase() === "admin";
  const role: "admin" | "moderator" | "user" = isAdmin ? "admin" : "user";

  const result = await db
    .request()
    .input("email", sql.NVarChar, email)
    .input("passwordHash", sql.NVarChar, passwordHash)
    .input("username", sql.NVarChar, derivedUsername)
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
