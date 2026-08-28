/**
 * Server-side verification of Firebase Google ID tokens.
 *
 * The browser sends the Firebase ID token (never a raw uid/email — those can be
 * spoofed). We verify it with Google's Identity Toolkit endpoint, which returns
 * the authoritative user record only if the token is valid, unexpired and issued
 * for our Firebase project.
 */

const DEFAULT_FIREBASE_API_KEY = process.env["GOOGLE_API_KEY"] || "";
const DEFAULT_FIREBASE_PROJECT_ID = "intopsmm-3ef46";

export type VerifiedGoogleUser = {
  uid: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
};

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  const apiKey = process.env["FIREBASE_API_KEY"] || DEFAULT_FIREBASE_API_KEY;
  const projectId = process.env["FIREBASE_PROJECT_ID"] || DEFAULT_FIREBASE_PROJECT_ID;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!res.ok) {
    throw new Error("Google sign-in failed: invalid or expired session token.");
  }

  const body = (await res.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      emailVerified?: boolean;
      displayName?: string;
      photoUrl?: string;
      providerUserInfo?: Array<{ providerId?: string; displayName?: string; photoUrl?: string }>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    } & Record<string, any>>;
  };

  const user = body.users?.[0];
  if (!user?.localId || !user.email) {
    throw new Error("Google sign-in failed: no verified account found for this token.");
  }

  // Sanity check: token must belong to our Firebase project.
  const claims = decodeJwtPayload(idToken);
  if (claims && claims["aud"] && claims["aud"] !== projectId) {
    throw new Error("Google sign-in failed: token was issued for a different application.");
  }

  const google = user.providerUserInfo?.find((p) => p.providerId === "google.com");

  return {
    uid: user.localId,
    email: user.email,
    fullName: user.displayName || google?.displayName || undefined,
    avatarUrl: user.photoUrl || google?.photoUrl || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
