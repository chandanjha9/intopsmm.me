import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie, getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { loginUser, registerUser, getUserProfile } from "./service.server";
import { requireAuth } from "./auth-middleware";

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
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export const loginServerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const result = await loginUser({
      email: data.email,
      password: data.password,
    });

    // Set secure HttpOnly cookie on the server response
    setCookie(COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return {
      user: result.user,
      profile: result.profile,
    };
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

    // Set secure HttpOnly cookie on the server response
    setCookie(COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return {
      user: result.user,
      profile: result.profile,
    };
  });

export const logoutServerFn = createServerFn({ method: "POST" })
  .handler(async () => {
    deleteCookie(COOKIE_NAME, {
      path: "/",
    });
    return { success: true };
  });

export const getMeServerFn = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const profile = await getUserProfile(context.userId);
    return { profile, user: context.user };
  });
