import sql from "mssql";
import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  loginUser,
  registerUser,
  getUserProfile,
  createPasswordResetToken,
  resetUserPassword,
  upsertGoogleUser,
  checkAvailability,
} from "./service.server";
import { requireAuth, optionalAuth } from "./auth-middleware";

const availabilitySchema = z.object({
  email: z.string().trim().max(255).optional(),
  username: z.string().trim().max(50).optional(),
});

export const checkAvailabilityServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => availabilitySchema.parse(input))
  .handler(async ({ data }) => checkAvailability({ email: data.email, username: data.username }));


const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().trim().min(3).max(50).optional(),
  fullName: z.string().trim().min(2).max(100).optional(),
});

const COOKIE_NAME = "auth_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — persistent session

function setAuthCookie(token: string) {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export const loginServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const result = await loginUser({
      email: data.email,
      password: data.password,
    });
    setAuthCookie(result.token);
    return { user: result.user, profile: result.profile };
  });

export const registerServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    const result = await registerUser({
      email: data.email,
      password: data.password,
      username: data.username,
      fullName: data.fullName,
    });
    setAuthCookie(result.token);
    return { user: result.user, profile: result.profile };
  });

export const logoutServerFn = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE_NAME, { path: "/" });
  return { success: true };
});

export const getMeServerFn = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .handler(async ({ context }) => {
    if (!context.userId) return { profile: null, user: null };
    const profile = await getUserProfile(context.userId);
    return { profile, user: context.user };
  });

// ── Forgot Password ──────────────────────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export const forgotPasswordServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => forgotPasswordSchema.parse(input))
  .handler(async ({ data }) => {
    const { token, email } = await createPasswordResetToken(data.email);

    if (token) {
      // Send email (uses SMTP env vars; falls back to console.log in dev)
      await sendPasswordResetEmail(email, token);
    }

    // Always return success to prevent account enumeration
    return { success: true };
  });

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const resetPasswordServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => resetPasswordSchema.parse(input))
  .handler(async ({ data }) => {
    await resetUserPassword(data.token, data.password);
    return { success: true };
  });

// ── Google OAuth ─────────────────────────────────────────────────────────────

const googleAuthSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  uid: z.string(),
});

export const googleAuthServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => googleAuthSchema.parse(input))
  .handler(async ({ data }) => {
    const result = await upsertGoogleUser({
      googleId: data.uid,
      email: data.email,
      fullName: data.displayName,
      avatarUrl: data.photoURL,
    });
    setAuthCookie(result.token);
    return { user: result.user, profile: result.profile };
  });

// ── Email Helper ─────────────────────────────────────────────────────────────

async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.APP_URL || "http://localhost:5173";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || "no-reply@intopsmm.me";

  if (!smtpHost || !smtpUser || !smtpPass) {
    // Dev fallback: print to console
    console.log("─────────────────────────────────────────────────");
    console.log("PASSWORD RESET LINK (dev mode — configure SMTP to send real emails):");
    console.log(resetUrl);
    console.log("─────────────────────────────────────────────────");
    return;
  }

  // Lazy-load nodemailer (only if SMTP is configured)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodemailerModule: any = await import("nodemailer" as any);
    const nodemailer = nodemailerModule.default || nodemailerModule;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"Intopsmm" <${smtpFrom}>`,
      to: email,
      subject: "Reset your Intopsmm password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
          <h2 style="color:#6ee7b7;margin-bottom:8px;">Reset your password</h2>
          <p style="margin-bottom:24px;color:#94a3b8;">
            Someone requested a password reset for your Intopsmm account.<br/>
            Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#6ee7b7,#3b82f6);color:#0f172a;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;">
            Reset Password
          </a>
          <p style="margin-top:24px;font-size:12px;color:#475569;">
            If you didn't request this, you can safely ignore this email.<br/>
            Or copy this link: <a href="${resetUrl}" style="color:#6ee7b7;">${resetUrl}</a>
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error("Failed to send reset email:", emailErr);
    console.log("Reset URL (fallback):", resetUrl);
  }
}
