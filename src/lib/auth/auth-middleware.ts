import { createMiddleware } from "@tanstack/react-start";
import { getRequest, getCookie } from "@tanstack/react-start/server";
import { verifyToken } from "./jwt";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();

  // 1. Try reading the secure HttpOnly cookie
  let token = getCookie("auth_token");

  // 2. Fall back to Authorization Bearer header if passed
  if (!token) {
    const authHeader = request?.headers?.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "").trim();
    }
  }

  if (!token) {
    throw new Response(JSON.stringify({ error: "Unauthorized: Missing authentication credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    throw new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return next({
    context: {
      userId: payload.sub,
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        username: payload.username,
      },
    },
  });
});

/**
 * Non-throwing auth: attaches user context when a valid token exists,
 * otherwise passes through with `userId: null`. Use for "who am I?" checks
 * so unauthenticated visitors get a normal 200 response instead of a 401.
 */
export const optionalAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  let token = getCookie("auth_token");
  if (!token) {
    const authHeader = request?.headers?.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "").trim();
    }
  }

  const payload = token ? verifyToken(token) : null;

  const context: {
    userId: string | null;
    user: {
      id: string;
      email?: string;
      role?: string;
      username?: string | null;
    } | null;
  } =
    payload && payload.sub
      ? {
          userId: payload.sub,
          user: {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            username: payload.username,
          },
        }
      : { userId: null, user: null };

  return next({ context });
});
