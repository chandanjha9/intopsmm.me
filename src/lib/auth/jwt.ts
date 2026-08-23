import jwt from "jsonwebtoken";

const DEFAULT_SECRET = "growmesmm_jwt_default_secret_key_change_in_production";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("WARNING: JWT_SECRET environment variable is not set. Using fallback secret.");
}

export type AuthTokenPayload = {
  sub: string; // user id
  email: string;
  role: "admin" | "moderator" | "user";
  username?: string | null;
};

export function signToken(payload: AuthTokenPayload, expiresIn: string = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
